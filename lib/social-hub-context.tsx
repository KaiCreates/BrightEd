'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './auth-context';
import { db, realtimeDb } from './firebase';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    getDocs,
    onSnapshot,
    addDoc,
    updateDoc,
    arrayUnion,
    arrayRemove,
    deleteDoc,
    serverTimestamp,
    Timestamp
} from 'firebase/firestore';
import { ref, onDisconnect, set, onValue, off } from 'firebase/database';

const SUBJECT_LOUNGES = [
    { name: 'Principles of Business', subject: 'Principles of Business', icon: '💼' },
    { name: 'Mathematics', subject: 'Mathematics', icon: '📐' },
    { name: 'English A', subject: 'English A', icon: '📝' },
    { name: 'Information Technology', subject: 'Information Technology', icon: '💻' },
    { name: 'Chemistry', subject: 'Chemistry', icon: '🔬' }
];

interface Room {
    id: string;
    name: string;
    type: 'public' | 'private';
    code?: string;
    subject?: string;
    members: string[];
    ownerId?: string;
    createdAt: Timestamp | null;
}

interface Message {
    id: string;
    text: string;
    senderId: string;
    senderName?: string;
    businessPrestige?: number;
    timestamp: Timestamp | null;
    fileUrl?: string;
    reactions?: { [emoji: string]: string[] };
    threadId?: string;
    parentMessageId?: string;
}

interface DMWindow {
    userId: string;
    userName: string;
    roomId: string;
    isOpen: boolean;
    isMinimized: boolean;
}

interface SocialHubContextType {
    activeRoom: Room | null;
    rooms: Room[];
    messages: Message[];
    onlineUsers: { [uid: string]: { name: string; lastSeen: number } };
    dmWindows: DMWindow[];
    blockedUsers: string[];
    setActiveRoom: (room: Room | null) => Promise<void>;
    createPrivateRoom: () => Promise<string>;
    joinRoom: (code: string) => Promise<boolean>;
    sendMessage: (text: string, fileUrl?: string) => Promise<void>;
    sendDM: (userId: string, text: string) => Promise<void>;
    addReaction: (messageId: string, emoji: string) => Promise<void>;
    openDM: (userId: string, userName: string) => void;
    closeDM: (userId: string) => void;
    toggleDMMinimize: (userId: string) => void;
    blockUser: (userId: string) => Promise<void>;
    reportMessage: (messageId: string, reason: string) => Promise<void>;
    leaveRoom: (roomId: string) => Promise<void>;
    deleteRoom: (roomId: string) => Promise<void>;
    reportRoom: (roomId: string, reason: string) => Promise<void>;
    loading: boolean;
}

const SocialHubContext = createContext<SocialHubContextType | undefined>(undefined);

export function SocialHubProvider({ children }: { children: React.ReactNode }) {
    const { user, userData } = useAuth();
    const [activeRoom, setActiveRoomState] = useState<Room | null>(null);
    const [rooms, setRooms] = useState<Room[]>([]);
    const [messages, setMessages] = useState<Message[]>([]);
    const [onlineUsers, setOnlineUsers] = useState<{ [uid: string]: { name: string; lastSeen: number } }>({});
    const [dmWindows, setDmWindows] = useState<DMWindow[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastMessageTime, setLastMessageTime] = useState<number>(0);

    // Initialize subject lounges
    useEffect(() => {
        if (!user) return;

        const subjectLounges = [
            { name: 'Principles of Business', subject: 'Principles of Business' },
            { name: 'Mathematics', subject: 'Mathematics' },
            { name: 'English A', subject: 'English A' },
            { name: 'Information Technology', subject: 'Information Technology' },
            { name: 'Chemistry', subject: 'Chemistry' }
        ];

        const initializeRooms = async () => {
            try {
                for (const lounge of subjectLounges) {
                    const roomRef = doc(db, 'rooms', lounge.name);
                    const roomSnap = await getDoc(roomRef);

                    if (!roomSnap.exists()) {
                        await setDoc(roomRef, {
                            name: lounge.name,
                            type: 'public',
                            subject: lounge.subject,
                            members: [],
                            createdAt: serverTimestamp()
                        });
                    }
                }
            } catch (error: any) {
                if (error.code === 'failed-precondition' || error.message.includes('terminated')) {
                    console.warn('Firestore client terminated, skipping room init');
                } else {
                    console.error('Error initializing rooms:', error);
                }
            }
        };

        initializeRooms();
    }, [user]);

    // Load user's blocked list
    useEffect(() => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        const unsubscribe = onSnapshot(userRef, (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                setBlockedUsers(data.blockedUsers || []);
            }
        });

        return () => unsubscribe();
    }, [user]);

    // Load user's private rooms (subject lounges are always available, so we only load private rooms)
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'rooms'),
            where('type', '==', 'private'),
            where('members', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const privateRooms: Room[] = [];
                snapshot.forEach((doc) => {
                    privateRooms.push({ id: doc.id, ...doc.data() } as Room);
                });
                setRooms(privateRooms);
                setLoading(false);
            },
            (error) => {
                console.error('Error loading rooms:', error);
                setRooms([]);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, [user]);

    // Load messages for active room
    useEffect(() => {
        if (!activeRoom || !user) {
            setMessages([]);
            return;
        }

        try {
            const messagesRef = collection(db, 'rooms', activeRoom.id, 'messages');
            // Get all messages ordered by timestamp
            const q = query(messagesRef, orderBy('timestamp', 'asc'));

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    const msgs: Message[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        // Only show main messages (no threadId or parentMessageId)
                        if (!data.threadId && !data.parentMessageId) {
                            // Filter out messages from blocked users
                            if (!blockedUsers.includes(data.senderId)) {
                                msgs.push({ id: doc.id, ...data } as Message);
                            }
                        }
                    });
                    setMessages(msgs);
                },
                (error) => {
                    console.error('Error loading messages:', error);
                    setMessages([]);
                }
            );

            return () => unsubscribe();
        } catch (error) {
            console.error('Error setting up message listener:', error);
            setMessages([]);
        }
    }, [activeRoom, user, blockedUsers]);

    // Presence system with Realtime Database using .info/connected
    useEffect(() => {
        if (!user || !userData) return;

        const userName = userData.firstName || 'User';
        const presenceRef = ref(realtimeDb, `presence/${user.uid}`);
        const connectedRef = ref(realtimeDb, '.info/connected');

        // Monitor connection status
        const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                // User is connected - set online status
                set(presenceRef, {
                    name: userName,
                    lastSeen: Date.now(),
                    online: true
                });

                // Set offline when disconnected
                onDisconnect(presenceRef).set({
                    name: userName,
                    lastSeen: Date.now(),
                    online: false
                });
            }
        });

        // Listen to all online users (including current user)
        const onlineRef = ref(realtimeDb, 'presence');
        const unsubscribeOnline = onValue(onlineRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const online: { [uid: string]: { name: string; lastSeen: number } } = {};
                Object.keys(data).forEach((uid) => {
                    if (data[uid]?.online === true) {
                        online[uid] = {
                            name: data[uid].name || 'User',
                            lastSeen: data[uid].lastSeen || Date.now()
                        };
                    }
                });
                setOnlineUsers(online);
            } else {
                setOnlineUsers({});
            }
        });

        return () => {
            unsubscribeConnected();
            unsubscribeOnline();
            // Clean up on disconnect
            set(presenceRef, {
                name: userName,
                lastSeen: Date.now(),
                online: false
            }).catch(() => { });
        };
    }, [user, userData]);

    // Restore previous room or default on mount
    useEffect(() => {
        const savedRoom = localStorage.getItem('brighted_active_room');
        if (savedRoom) {
            try {
                const parsed = JSON.parse(savedRoom);
                setActiveRoomState(parsed);
            } catch (e) {
                const defaultLounge = SUBJECT_LOUNGES[0];
                setActiveRoomState({
                    id: defaultLounge.name,
                    name: defaultLounge.name,
                    type: 'public',
                    subject: defaultLounge.subject,
                    members: [],
                    createdAt: null
                });
            }
        } else {
            const defaultLounge = SUBJECT_LOUNGES[0];
            setActiveRoomState({
                id: defaultLounge.name,
                name: defaultLounge.name,
                type: 'public',
                subject: defaultLounge.subject,
                members: [],
                createdAt: null
            });
        }
    }, []);

    const setActiveRoom = useCallback(async (room: Room | null) => {
        if (!room) {
            setActiveRoomState(null);
            localStorage.removeItem('brighted_active_room');
            setMessages([]);
            return;
        }

        // If it's a subject lounge, ensure it exists in Firestore
        if (room.type === 'public') {
            const roomRef = doc(db, 'rooms', room.id);
            const roomSnap = await getDoc(roomRef);

            if (!roomSnap.exists()) {
                await setDoc(roomRef, {
                    name: room.name,
                    type: 'public',
                    subject: room.subject,
                    members: [],
                    createdAt: serverTimestamp()
                });
            }
        }

        setActiveRoomState(room);
        localStorage.setItem('brighted_active_room', JSON.stringify(room));
        setMessages([]);
    }, []);

    const createPrivateRoom = useCallback(async (): Promise<string> => {
        if (!user) throw new Error('Not authenticated');

        const code = Math.floor(100000 + Math.random() * 900000).toString();
        const roomRef = doc(collection(db, 'rooms'));

        await setDoc(roomRef, {
            name: `Study Den #${code}`,
            type: 'private',
            code,
            members: [user.uid],
            ownerId: user.uid,
            createdAt: serverTimestamp()
        });

        return code;
    }, [user]);

    const joinRoom = useCallback(async (code: string): Promise<boolean> => {
        if (!user) return false;

        const q = query(collection(db, 'rooms'), where('code', '==', code));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return false;

        const roomDoc = snapshot.docs[0];
        const roomData = roomDoc.data();

        if (!roomData.members.includes(user.uid)) {
            await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(user.uid)
            });
        }

        const roomToJoin = { id: roomDoc.id, ...roomData } as Room;
        setActiveRoom(roomToJoin);
        return true;
    }, [user, setActiveRoom]);

    const sendMessage = useCallback(async (text: string, fileUrl?: string) => {
        if (!user || !activeRoom) return;

        // Rate limiting: 1 message per 2 seconds
        const now = Date.now();
        if (now - lastMessageTime < 2000) {
            throw new Error('Please wait before sending another message');
        }
        setLastMessageTime(now);

        // Get business valuation for prestige
        let businessPrestige = 0;
        if (userData?.businessID) {
            const bizRef = doc(db, 'businesses', userData.businessID);
            const bizSnap = await getDoc(bizRef);
            if (bizSnap.exists()) {
                businessPrestige = bizSnap.data().valuation || 0;
            }
        }

        await addDoc(collection(db, 'rooms', activeRoom.id, 'messages'), {
            text,
            senderId: user.uid,
            senderName: userData?.firstName || 'User',
            businessPrestige,
            timestamp: serverTimestamp(),
            fileUrl: fileUrl || null,
            reactions: {}
        });
    }, [user, activeRoom, userData, lastMessageTime]);

    const sendDM = useCallback(async (userId: string, text: string) => {
        if (!user) return;

        const roomId = [user.uid, userId].sort().join('_');
        const dmRef = doc(db, 'dms', roomId);

        // Ensure DM room exists
        const dmSnap = await getDoc(dmRef);
        if (!dmSnap.exists()) {
            await setDoc(dmRef, {
                participants: [user.uid, userId],
                createdAt: serverTimestamp()
            });
        }

        await addDoc(collection(db, 'dms', roomId, 'messages'), {
            text,
            senderId: user.uid,
            senderName: userData?.firstName || 'User',
            timestamp: serverTimestamp()
        });
    }, [user, userData?.firstName]);

    const addReaction = useCallback(async (messageId: string, emoji: string) => {
        if (!user || !activeRoom) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const messageSnap = await getDoc(messageRef);

        if (!messageSnap.exists()) return;

        const reactions = messageSnap.data().reactions || {};
        const emojiReactions = reactions[emoji] || [];

        if (emojiReactions.includes(user.uid)) {
            // Remove reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: emojiReactions.filter((uid: string) => uid !== user.uid)
            });
        } else {
            // Add reaction
            await updateDoc(messageRef, {
                [`reactions.${emoji}`]: arrayUnion(user.uid)
            });
        }
    }, [user, activeRoom]);

    const openDM = useCallback((userId: string, userName: string) => {
        setDmWindows((prev) => {
            const existing = prev.find((dm) => dm.userId === userId);
            if (existing) {
                return prev.map((dm) =>
                    dm.userId === userId ? { ...dm, isOpen: true, isMinimized: false } : dm
                );
            }
            const roomId = [user?.uid, userId].sort().join('_');
            return [...prev, { userId, userName, roomId, isOpen: true, isMinimized: false }];
        });
    }, [user]);

    const closeDM = useCallback((userId: string) => {
        setDmWindows((prev) => prev.filter((dm) => dm.userId !== userId));
    }, []);

    const toggleDMMinimize = useCallback((userId: string) => {
        setDmWindows((prev) =>
            prev.map((dm) =>
                dm.userId === userId ? { ...dm, isMinimized: !dm.isMinimized } : dm
            )
        );
    }, []);

    const blockUser = useCallback(async (userId: string) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            blockedUsers: arrayUnion(userId)
        });
    }, [user]);

    const reportMessage = useCallback(async (messageId: string, reason: string) => {
        if (!user || !activeRoom) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const messageSnap = await getDoc(messageRef);

        if (!messageSnap.exists()) return;

        const messageData = messageSnap.data();
        await addDoc(collection(db, 'moderation_queue'), {
            messageId,
            messageSnapshot: messageData,
            senderId: messageData.senderId,
            reporterId: user.uid,
            reason,
            timestamp: serverTimestamp(),
            status: 'pending'
        });
    }, [user, activeRoom]);

    const leaveRoom = useCallback(async (roomId: string) => {
        if (!user) return;
        const roomRef = doc(db, 'rooms', roomId);

        await updateDoc(roomRef, {
            members: arrayRemove(user.uid)
        });

        if (activeRoom?.id === roomId) {
            setActiveRoom(null);
        }
    }, [user, activeRoom, setActiveRoom]);

    const deleteRoom = useCallback(async (roomId: string) => {
        if (!user) return;
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);

        if (roomSnap.exists()) {
            const data = roomSnap.data();
            if (data.ownerId === user.uid) {
                await deleteDoc(roomRef);
                if (activeRoom?.id === roomId) {
                    setActiveRoom(null);
                }
            } else {
                throw new Error("Only the owner can delete this room");
            }
        }
    }, [user, activeRoom, setActiveRoom]);

    const reportRoom = useCallback(async (roomId: string, reason: string) => {
        if (!user) return;

        await addDoc(collection(db, 'moderation_queue'), {
            type: 'room_report',
            targetId: roomId,
            reporterId: user.uid,
            reason,
            timestamp: serverTimestamp(),
            status: 'pending'
        });
    }, [user]);

    return (
        <SocialHubContext.Provider
            value={{
                activeRoom,
                rooms,
                messages,
                onlineUsers,
                dmWindows,
                blockedUsers,
                setActiveRoom,
                createPrivateRoom,
                joinRoom,
                sendMessage,
                sendDM,
                addReaction,
                openDM,
                closeDM,
                toggleDMMinimize,
                blockUser,
                reportMessage,
                leaveRoom,
                deleteRoom,
                reportRoom,
                loading
            }}
        >
            {children}
        </SocialHubContext.Provider>
    );
}

export function useSocialHub() {
    const context = useContext(SocialHubContext);
    if (context === undefined) {
        throw new Error('useSocialHub must be used within a SocialHubProvider');
    }
    return context;
}
