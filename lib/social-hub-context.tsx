'use client';

import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './auth-context';
import { db, realtimeDb, isFirebaseReady } from './firebase';
import { FirebaseMonitor } from './firebase-monitor';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    query,
    where,
    orderBy,
    limit,
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
import { ref, onDisconnect, set, onValue, query as rtdbQuery, orderByChild, limitToLast } from 'firebase/database';

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
    senderAvatarUrl?: string;
    senderAvatarCustomization?: any;
    businessPrestige?: number;
    timestamp: Timestamp | null;
    fileUrl?: string;
    kind?: 'text' | 'bounty' | 'whiteboard';
    bountyPoints?: number;
    whiteboardId?: string;
    whiteboardName?: string;
    whiteboardThumbnailUrl?: string;
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
    onlineUsers: { [uid: string]: { name: string; avatarUrl: string | null; avatarCustomization: any | null; lastSeen: number } };
    typingUsers: Array<{ uid: string; name: string }>;
    dmWindows: DMWindow[];
    blockedUsers: string[];
    mutedUsers: string[];
    setActiveRoom: (room: Room | null) => Promise<void>;
    createPrivateRoom: () => Promise<string>;
    joinRoom: (code: string) => Promise<boolean>;
    sendMessage: (text: string, fileUrl?: string, options?: Partial<Pick<Message, 'kind' | 'bountyPoints' | 'whiteboardId' | 'whiteboardName' | 'whiteboardThumbnailUrl'>>) => Promise<void>;
    sendDM: (userId: string, text: string) => Promise<void>;
    setTyping: (isTyping: boolean) => Promise<void>;
    addReaction: (messageId: string, emoji: string) => Promise<void>;
    editMessage: (messageId: string, newText: string) => Promise<void>;
    deleteMessage: (messageId: string) => Promise<void>;
    openDM: (userId: string, userName: string) => void;
    closeDM: (userId: string) => void;
    toggleDMMinimize: (userId: string) => void;
    blockUser: (userId: string) => Promise<void>;
    unblockUser: (userId: string) => Promise<void>;
    muteUser: (userId: string) => Promise<void>;
    unmuteUser: (userId: string) => Promise<void>;
    reportMessage: (messageId: string, reason: string) => Promise<void>;
    reportUser: (userId: string, reason: string) => Promise<void>;
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
    const [onlineUsers, setOnlineUsers] = useState<{ [uid: string]: { name: string; avatarUrl: string | null; avatarCustomization: any | null; lastSeen: number } }>({});
    const [typingUsers, setTypingUsers] = useState<Array<{ uid: string; name: string }>>([]);
    const [dmWindows, setDmWindows] = useState<DMWindow[]>([]);
    const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
    const [mutedUsers, setMutedUsers] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const lastMessageTimeRef = useRef<number>(0);
    const typingWriteRef = useRef<{ lastAt: number; lastState: boolean }>({ lastAt: 0, lastState: false });
    const ensuredRoomIdsRef = useRef<Set<string>>(new Set());
    const businessPrestigeRef = useRef<number>(0);

    useEffect(() => {
        if (!user) {
            setBlockedUsers([]);
            setMutedUsers([]);
            return;
        }
        setBlockedUsers(userData?.blockedUsers || []);
        setMutedUsers(userData?.mutedUsers || []);
    }, [user, userData?.blockedUsers, userData?.mutedUsers]);

    useEffect(() => {
        if (!user || !userData?.businessID || !isFirebaseReady || !db) {
            businessPrestigeRef.current = 0;
            return;
        }

        let cancelled = false;
        getDoc(doc(db, 'businesses', userData.businessID))
            .then((snap) => {
                if (cancelled) return;
                businessPrestigeRef.current = snap.exists() ? (snap.data().valuation || 0) : 0;
            })
            .catch(() => {
                if (cancelled) return;
                businessPrestigeRef.current = 0;
            });

        return () => {
            cancelled = true;
        };
    }, [user, userData?.businessID]);

    // Load user's private rooms (subject lounges are always available, so we only load private rooms)
    useEffect(() => {
        if (!user || !isFirebaseReady || !db) {
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, 'rooms'),
            where('type', '==', 'private'),
            where('members', 'array-contains', user.uid)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                FirebaseMonitor.trackRead('rooms', snapshot.docChanges().length || snapshot.size);
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
        if (!activeRoom || !user || !isFirebaseReady || !db) {
            setMessages([]);
            setTypingUsers([]);
            return;
        }

        try {
            const messagesRef = collection(db, 'rooms', activeRoom.id, 'messages');
            // Cost control: only subscribe to recent messages
            const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(80));

            const unsubscribe = onSnapshot(
                q,
                (snapshot) => {
                    FirebaseMonitor.trackRead('room_messages', snapshot.docChanges().length || snapshot.size);
                    const msgs: Message[] = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        // Only show main messages (no threadId or parentMessageId)
                        if (!data.threadId && !data.parentMessageId) {
                            // Filter out messages from blocked users
                            if (!blockedUsers.includes(data.senderId) && !mutedUsers.includes(data.senderId)) {
                                msgs.push({ id: doc.id, ...data } as Message);
                            }
                        }
                    });
                    setMessages(msgs.reverse());
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
    }, [activeRoom, user, blockedUsers, mutedUsers]);

    // Typing indicator (Realtime DB)
    useEffect(() => {
        if (!activeRoom || !user || !userData || !isFirebaseReady || !realtimeDb) {
            setTypingUsers([]);
            return;
        }

        const typingRoomRef = ref(realtimeDb, `typing/${activeRoom.id}`);
        const unsubscribeTyping = onValue(typingRoomRef, (snapshot) => {
            const val = snapshot.val() || {};
            const now = Date.now();

            const next: Array<{ uid: string; name: string }> = [];
            Object.keys(val).forEach((uid) => {
                if (uid === user.uid) return;
                const entry = val[uid];
                const ts = typeof entry?.ts === 'number' ? entry.ts : 0;
                if (now - ts > 5000) return;
                next.push({ uid, name: entry?.name || 'Student' });
            });

            setTypingUsers(next);
        });

        return () => {
            unsubscribeTyping();
        };
    }, [activeRoom, user, userData]);

    const setTyping = useCallback(async (isTyping: boolean) => {
        if (!activeRoom || !user || !userData || !isFirebaseReady || !realtimeDb) return;

        const typingRef = ref(realtimeDb, `typing/${activeRoom.id}/${user.uid}`);

        const now = Date.now();
        const minIntervalMs = 2500;
        const prev = typingWriteRef.current;
        const sameState = prev.lastState === isTyping;
        const tooSoon = now - prev.lastAt < minIntervalMs;

        if (!isTyping) {
            if (prev.lastState === false) return;
            typingWriteRef.current = { lastAt: now, lastState: false };
            await set(typingRef, null);
            return;
        }

        if (sameState && tooSoon) return;
        typingWriteRef.current = { lastAt: now, lastState: true };

        await set(typingRef, {
            name: userData.firstName || userData.displayName || 'Student',
            ts: Date.now(),
        });

        onDisconnect(typingRef).set(null);
    }, [activeRoom, user, userData]);

    // Presence system with Realtime Database using .info/connected
    useEffect(() => {
        if (!user || !userData || !isFirebaseReady || !realtimeDb) return;

        const userName = userData.firstName || 'User';
        const presenceRef = ref(realtimeDb, `presence/${user.uid}`);
        const connectedRef = ref(realtimeDb, '.info/connected');

        // Monitor connection status
        const unsubscribeConnected = onValue(connectedRef, (snapshot) => {
            if (snapshot.val() === true) {
                // User is connected - set online status
                set(presenceRef, {
                    name: userName,
                    avatarUrl: userData?.avatarUrl || null,
                    avatarCustomization: userData?.avatarCustomization || null,
                    lastSeen: Date.now(),
                    online: true
                });

                // Set offline when disconnected
                onDisconnect(presenceRef).set({
                    name: userName,
                    avatarUrl: userData?.avatarUrl || null,
                    avatarCustomization: userData?.avatarCustomization || null,
                    lastSeen: Date.now(),
                    online: false
                });
            }
        });

        // Cost control: only listen to the most recently active users
        const onlineRef = ref(realtimeDb, 'presence');
        const onlineQuery = rtdbQuery(onlineRef, orderByChild('lastSeen'), limitToLast(50));

        const unsubscribeOnline = onValue(onlineQuery, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                const online: { [uid: string]: { name: string; avatarUrl: string | null; avatarCustomization: any | null; lastSeen: number } } = {};
                Object.keys(data).forEach((uid) => {
                    if (data[uid]?.online === true) {
                        online[uid] = {
                            name: data[uid].name || 'User',
                            avatarUrl: data[uid].avatarUrl || null,
                            avatarCustomization: data[uid].avatarCustomization || null,
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
                avatarUrl: userData?.avatarUrl || null,
                avatarCustomization: userData?.avatarCustomization || null,
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
        if (!room || !isFirebaseReady || !db) {
            setActiveRoomState(null);
            localStorage.removeItem('brighted_active_room');
            setMessages([]);
            return;
        }

        // If it's a subject lounge, ensure it exists in Firestore
        if (room.type === 'public') {
            if (!ensuredRoomIdsRef.current.has(room.id)) {
                ensuredRoomIdsRef.current.add(room.id);
                const roomRef = doc(db, 'rooms', room.id);
                const roomSnap = await getDoc(roomRef);
                FirebaseMonitor.trackRead('rooms', 1);

                if (!roomSnap.exists()) {
                    await setDoc(roomRef, {
                        name: room.name,
                        type: 'public',
                        subject: room.subject,
                        members: [],
                        createdAt: serverTimestamp()
                    });
                    FirebaseMonitor.trackWrite('rooms', 1);
                }
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
        FirebaseMonitor.trackRead('rooms', snapshot.size);

        if (snapshot.empty) return false;

        const roomDoc = snapshot.docs[0];
        const roomData = roomDoc.data();

        if (!roomData.members.includes(user.uid)) {
            await updateDoc(doc(db, 'rooms', roomDoc.id), {
                members: arrayUnion(user.uid)
            });
            FirebaseMonitor.trackWrite('rooms', 1);
        }

        const roomToJoin = { id: roomDoc.id, ...roomData } as Room;
        setActiveRoom(roomToJoin);
        return true;
    }, [user, setActiveRoom]);

    const sendMessage = useCallback(async (
        text: string,
        fileUrl?: string,
        options?: Partial<Pick<Message, 'kind' | 'bountyPoints' | 'whiteboardId' | 'whiteboardName' | 'whiteboardThumbnailUrl'>>
    ) => {
        if (!user || !activeRoom) return;

        // Rate limiting: 1 message per 2 seconds
        const now = Date.now();
        if (now - lastMessageTimeRef.current < 2000) {
            throw new Error('Please wait before sending another message');
        }
        lastMessageTimeRef.current = now;

        const businessPrestige = businessPrestigeRef.current || 0;

        await addDoc(collection(db, 'rooms', activeRoom.id, 'messages'), {
            text,
            senderId: user.uid,
            senderName: userData?.firstName || 'User',
            senderAvatarUrl: userData?.avatarUrl || null,
            senderAvatarCustomization: userData?.avatarCustomization || null,
            businessPrestige,
            timestamp: serverTimestamp(),
            fileUrl: fileUrl || null,
            kind: options?.kind || 'text',
            bountyPoints: options?.bountyPoints || null,
            whiteboardId: options?.whiteboardId || null,
            whiteboardName: options?.whiteboardName || null,
            whiteboardThumbnailUrl: options?.whiteboardThumbnailUrl || null,
            reactions: {}
        });
        FirebaseMonitor.trackWrite('room_messages', 1);
    }, [user, activeRoom, userData]);

    const sendDM = useCallback(async (userId: string, text: string) => {
        if (!user) return;

        const roomId = [user.uid, userId].sort().join('_');
        const dmRef = doc(db, 'dms', roomId);

        // Ensure DM room exists
        const dmSnap = await getDoc(dmRef);
        FirebaseMonitor.trackRead('dms', 1);
        if (!dmSnap.exists()) {
            await setDoc(dmRef, {
                participants: [user.uid, userId],
                createdAt: serverTimestamp()
            });
            FirebaseMonitor.trackWrite('dms', 1);
        }

        await addDoc(collection(db, 'dms', roomId, 'messages'), {
            text,
            senderId: user.uid,
            senderName: userData?.firstName || 'User',
            senderAvatarUrl: userData?.avatarUrl || null,
            senderAvatarCustomization: userData?.avatarCustomization || null,
            timestamp: serverTimestamp()
        });
        FirebaseMonitor.trackWrite('dm_messages', 1);
    }, [user, userData?.firstName, userData?.avatarUrl]);

    const addReaction = useCallback(async (messageId: string, emoji: string) => {
        if (!user || !activeRoom) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const msg = messages.find((m) => m.id === messageId);
        const emojiReactions = (msg?.reactions?.[emoji] || []) as string[];
        const hasReacted = emojiReactions.includes(user.uid);

        await updateDoc(messageRef, {
            [`reactions.${emoji}`]: hasReacted ? arrayRemove(user.uid) : arrayUnion(user.uid)
        });
        FirebaseMonitor.trackWrite('room_messages', 1);
    }, [user, activeRoom, messages]);

    const editMessage = useCallback(async (messageId: string, newText: string) => {
        if (!user || !activeRoom || !newText.trim()) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const msg = messages.find((m) => m.id === messageId);
        if (msg && msg.senderId !== user.uid) {
            throw new Error('You can only edit your own messages');
        }
        await updateDoc(messageRef, {
            text: newText,
        });
        FirebaseMonitor.trackWrite('room_messages', 1);
    }, [user, activeRoom, messages]);

    const deleteMessage = useCallback(async (messageId: string) => {
        if (!user || !activeRoom) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const msg = messages.find((m) => m.id === messageId);
        if (msg && msg.senderId !== user.uid) {
            throw new Error('You can only delete your own messages');
        }
        await deleteDoc(messageRef);
        FirebaseMonitor.trackDelete('room_messages', 1);
    }, [user, activeRoom, messages]);

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
        FirebaseMonitor.trackWrite('users', 1);
    }, [user]);

    const unblockUser = useCallback(async (userId: string) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            blockedUsers: arrayRemove(userId)
        });
        FirebaseMonitor.trackWrite('users', 1);
    }, [user]);

    const muteUser = useCallback(async (userId: string) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            mutedUsers: arrayUnion(userId)
        });
        FirebaseMonitor.trackWrite('users', 1);
    }, [user]);

    const unmuteUser = useCallback(async (userId: string) => {
        if (!user) return;

        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
            mutedUsers: arrayRemove(userId)
        });
        FirebaseMonitor.trackWrite('users', 1);
    }, [user]);

    const reportMessage = useCallback(async (messageId: string, reason: string) => {
        if (!user || !activeRoom) return;

        const messageRef = doc(db, 'rooms', activeRoom.id, 'messages', messageId);
        const messageSnap = await getDoc(messageRef);
        FirebaseMonitor.trackRead('room_messages', 1);

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
        FirebaseMonitor.trackWrite('moderation_queue', 1);
    }, [user, activeRoom]);

    const reportUser = useCallback(async (userId: string, reason: string) => {
        if (!user) return;

        await addDoc(collection(db, 'moderation_queue'), {
            type: 'user_report',
            targetId: userId,
            reporterId: user.uid,
            reason,
            timestamp: serverTimestamp(),
            status: 'pending'
        });
        FirebaseMonitor.trackWrite('moderation_queue', 1);
    }, [user]);

    const leaveRoom = useCallback(async (roomId: string) => {
        if (!user) return;
        const roomRef = doc(db, 'rooms', roomId);

        await updateDoc(roomRef, {
            members: arrayRemove(user.uid)
        });
        FirebaseMonitor.trackWrite('rooms', 1);

        if (activeRoom?.id === roomId) {
            setActiveRoom(null);
        }
    }, [user, activeRoom, setActiveRoom]);

    const deleteRoom = useCallback(async (roomId: string) => {
        if (!user) return;
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnap = await getDoc(roomRef);
        FirebaseMonitor.trackRead('rooms', 1);

        if (roomSnap.exists()) {
            const data = roomSnap.data();
            if (data.ownerId === user.uid) {
                await deleteDoc(roomRef);
                FirebaseMonitor.trackDelete('rooms', 1);
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
        FirebaseMonitor.trackWrite('moderation_queue', 1);
    }, [user]);

    return (
        <SocialHubContext.Provider
            value={{
                activeRoom,
                rooms,
                messages,
                onlineUsers,
                typingUsers,
                dmWindows,
                blockedUsers,
                mutedUsers,
                setActiveRoom,
                createPrivateRoom,
                joinRoom,
                sendMessage,
                sendDM,
                setTyping,
                addReaction,
                editMessage,
                deleteMessage,
                openDM,
                closeDM,
                toggleDMMinimize,
                blockUser,
                unblockUser,
                muteUser,
                unmuteUser,
                reportMessage,
                reportUser,
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
