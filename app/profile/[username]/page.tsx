'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, limit } from 'firebase/firestore';
import { ProfessorBrightMascot } from '@/components/learning';
import { ALL_ACHIEVEMENTS, checkAchievement } from '@/lib/achievements';
import { createAvatar } from '@dicebear/core';
import { avataaars } from '@dicebear/collection';

export default function UserProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData: currentUserData, loading: authLoading } = useAuth();
    const [profileData, setProfileData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [isOwner, setIsOwner] = useState(false);
    const [showSearch, setShowSearch] = useState(false);

    const username = params?.username as string;

    useEffect(() => {
        if (authLoading) return;

        const fetchProfile = async () => {
            setLoading(true);
            try {
                // If it's the current user, use local data for speed
                if (currentUserData?.username === username) {
                    setProfileData(currentUserData);
                    setIsOwner(true);
                    setLoading(false);
                    return;
                }

                // Otherwise search Firestore by username
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('username', '==', username));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    // Handle 404
                    setLoading(false);
                    return;
                }

                const data = snapshot.docs[0].data();
                setProfileData({ ...data, id: snapshot.docs[0].id });
                setIsOwner(user?.uid === snapshot.docs[0].id);
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
            setLoading(false);
        };

        fetchProfile();
    }, [username, currentUserData, authLoading, user]);

    const [socialTab, setSocialTab] = useState<'following' | 'followers'>('following');
    const [socialList, setSocialList] = useState<any[]>([]);
    const [socialLoading, setSocialLoading] = useState(false);
    const [bizValuation, setBizValuation] = useState(0);

    useEffect(() => {
        const fetchSocialDetails = async () => {
            if (!profileData) return;

            // Fetch business if exists
            if (profileData.businessID) {
                try {
                    const bizSnap = await getDoc(doc(db, 'businesses', profileData.businessID));
                    if (bizSnap.exists()) {
                        setBizValuation(bizSnap.data().valuation || 0);
                    }
                } catch (e) {
                    console.error("Error fetching biz:", e);
                }
            }

            const ids = socialTab === 'following' ? (profileData.following || []) : (profileData.followers || []);

            if (ids.length === 0) {
                setSocialList([]);
                return;
            }

            setSocialLoading(true);
            try {
                const details = await Promise.all(ids.slice(0, 5).map(async (id: string) => {
                    const d = await getDoc(doc(db, 'users', id));
                    return d.exists() ? { id: d.id, ...d.data() } : null;
                }));
                setSocialList(details.filter(Boolean));
            } catch (error) {
                console.error("Error fetching social details:", error);
            }
            setSocialLoading(false);
        };

        fetchSocialDetails();
    }, [profileData, socialTab]);

    const isFollowing = currentUserData?.following?.includes(profileData?.id);

    const handleFollowToggle = async () => {
        if (!user || !profileData || !currentUserData) return;

        const currentUserId = user.uid;
        const profileUserId = profileData.id;

        try {
            if (isFollowing) {
                // Unfollow
                await updateDoc(doc(db, 'users', currentUserId), {
                    following: arrayRemove(profileUserId)
                });
                await updateDoc(doc(db, 'users', profileUserId), {
                    followers: arrayRemove(currentUserId)
                });
            } else {
                // Follow
                await updateDoc(doc(db, 'users', currentUserId), {
                    following: arrayUnion(profileUserId)
                });
                await updateDoc(doc(db, 'users', profileUserId), {
                    followers: arrayUnion(currentUserId)
                });
            }
        } catch (error) {
            console.error("Error toggling follow:", error);
        }
    };

    // Local SVG Generation for Profile - Moved UP to fix Rules of Hooks
    const avatarSvg = React.useMemo(() => {
        if (profileData?.avatarCustomization) {
            const c = profileData.avatarCustomization;
            const avatar = createAvatar(avataaars, {
                seed: username,
                backgroundColor: [c.backgroundColor || 'FF8A8A'],
                top: [c.top || 'shortFlat'],
                hairColor: [c.hairColor || '2c1b18'],
                clothing: [c.clothing || 'blazerAndShirt'],
                clothesColor: [c.clothesColor || '262e33'],
                accessories: [c.accessories || 'blank'],
                eyes: [c.eyes || 'default'],
                mouth: [c.mouth || 'smile'],
                skinColor: [c.skinColor || 'ffdbb4'],
                facialHair: [c.facialHair || 'blank'],
                backgroundType: ['solid']
            });
            return avatar.toString();
        }
        return null;
    }, [profileData?.avatarCustomization, username]);

    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        );
    }

    if (!profileData) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
                <div className="text-6xl mb-6">🏜️</div>
                <BrightHeading level={1} className="mb-4">User Not Found</BrightHeading>
                <p className="text-[var(--text-muted)] mb-8">The explorer &quot;{username}&quot; hasn&apos;t joined BrightEd yet.</p>
                <BrightButton onClick={() => router.push('/')}>Back to Safety</BrightButton>
            </div>
        );
    }

    const JOIN_DATE = profileData.createdAt
        ? new Date(profileData.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
        : 'November 2023';

    const fallbackAvatarUrl = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundType=solid&backgroundColor=FF8A8A`;

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-24 pt-20 safe-padding">
            <div className="max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* Main Profile Info */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* Identity Header */}
                        <section className="relative group">
                            <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                {/* Avatar */}
                                <div className="relative">
                                    <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-[var(--brand-primary)] shadow-2xl relative bg-white/5">
                                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--brand-primary)]/20 to-transparent pointer-events-none" />
                                        {avatarSvg ? (
                                            <div
                                                className="w-full h-full"
                                                dangerouslySetInnerHTML={{ __html: avatarSvg }}
                                            />
                                        ) : (
                                            <Image
                                                src={profileData.avatarUrl || fallbackAvatarUrl}
                                                alt={username}
                                                fill
                                                sizes="(max-width: 768px) 160px, 208px"
                                                className="object-cover"
                                            />
                                        )}
                                    </div>
                                    {isOwner && (
                                        <Link href={`/profile/${username}/avatar`}>
                                            <button className="absolute bottom-2 right-2 bg-[var(--brand-primary)] text-white p-2 rounded-full shadow-lg border-2 border-[var(--bg-primary)] hover:scale-110 transition-transform">
                                                ✏️
                                            </button>
                                        </Link>
                                    )}
                                </div>

                                {/* Names & Social */}
                                <div className="flex-1 text-center md:text-left pt-4">
                                    <BrightHeading level={1} className="text-4xl md:text-5xl mb-2">
                                        {profileData.firstName || username} {profileData.lastName || ''}
                                    </BrightHeading>
                                    <p className="text-xl font-bold text-[var(--text-muted)] mb-4">@{username}</p>

                                    <div className="flex items-center justify-center md:justify-start gap-2 mb-2 text-[var(--text-secondary)] font-medium">
                                        <span>📅 Joined {JOIN_DATE}</span>
                                    </div>

                                    {(profileData.school || profileData.country) && (
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-6 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                                            {profileData.formLevel && (
                                                <span className="bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] px-2 py-1 rounded border border-[var(--brand-primary)]/20">
                                                    Form {profileData.formLevel}
                                                </span>
                                            )}
                                            {profileData.school && (
                                                <span className="flex items-center gap-1">
                                                    🏫 {profileData.school}
                                                </span>
                                            )}
                                            {profileData.country && (
                                                <span className="flex items-center gap-1 opacity-70">
                                                    📍 {profileData.country}
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center justify-center md:justify-start gap-4 mb-6">
                                        <div className="flex items-center gap-6">
                                            <div className="cursor-pointer group">
                                                <span className="text-[var(--brand-primary)] font-black text-xl group-hover:underline">{profileData.following?.length || 0}</span>
                                                <span className="text-[var(--text-muted)] font-bold ml-1 uppercase text-xs tracking-widest">Following</span>
                                            </div>
                                            <div className="cursor-pointer group">
                                                <span className="text-[var(--brand-accent)] font-black text-xl group-hover:underline">{profileData.followers?.length || 0}</span>
                                                <span className="text-[var(--text-muted)] font-bold ml-1 uppercase text-xs tracking-widest">Followers</span>
                                            </div>
                                        </div>

                                        {!isOwner && user && (
                                            <BrightButton
                                                variant={isFollowing ? "outline" : "primary"}
                                                size="sm"
                                                onClick={handleFollowToggle}
                                                className="ml-4"
                                            >
                                                {isFollowing ? "Unfollow" : "Follow"}
                                            </BrightButton>
                                        )}
                                    </div>

                                    {/* Owner-Only Action Buttons */}
                                    {isOwner && (
                                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                                            <Link href={`/profile/${username}/avatar`}>
                                                <BrightButton variant="outline" size="sm" className="gap-2">
                                                    ✏️ Edit Avatar
                                                </BrightButton>
                                            </Link>
                                            <Link href={`/profile/${username}/settings`}>
                                                <BrightButton variant="outline" size="sm" className="gap-2">
                                                    ⚙️ Settings
                                                </BrightButton>
                                            </Link>
                                            {profileData.hasBusiness && (
                                                <Link href="/business">
                                                    <BrightButton variant="primary" size="sm" className="gap-2">
                                                        🏢 My Business
                                                    </BrightButton>
                                                </Link>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </section>

                        <hr className="border-white/5" />

                        {/* Statistics Grid - Expanded for Owners */}
                        <section>
                            <BrightHeading level={2} className="mb-6">Statistics</BrightHeading>
                            <div className={`grid gap-4 ${isOwner ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-2'}`}>
                                <StatCard icon="🔥" label="Day Streak" value={profileData.streak || 0} color="text-orange-500" />
                                <StatCard icon="⚡" label="Total XP" value={profileData.xp?.toLocaleString() || 0} color="text-yellow-500" />
                                {isOwner && (
                                    <>
                                        <StatCard icon="💰" label="B-Coins" value={profileData.bCoins?.toLocaleString() || 0} color="text-green-500" />
                                        <StatCard icon="🧠" label="Mastery" value={`${Math.round((profileData.globalMastery || 0) * 100)}%`} color="text-purple-500" />
                                    </>
                                )}
                            </div>
                        </section>

                        <hr className="border-white/5" />

                        {/* Trophy Case */}
                        <section>
                            <div className="flex justify-between items-end mb-6">
                                <BrightHeading level={2}>Trophy Case</BrightHeading>
                                <Link href="/achievements" className="text-[var(--brand-primary)] font-black uppercase text-xs tracking-widest hover:underline">View All</Link>
                            </div>
                            <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                                {ALL_ACHIEVEMENTS.map((ach) => {
                                    const isUnlocked = checkAchievement(ach, profileData, bizValuation);
                                    return (
                                        <div key={ach.id} className="flex flex-col items-center group">
                                            <div className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl bg-white/5 border-2 flex items-center justify-center text-4xl mb-2 transition-all duration-500 ${isUnlocked ? 'border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 shadow-lg shadow-[var(--brand-primary)]/20' : 'border-white/5 grayscale opacity-30 group-hover:opacity-50'}`}>
                                                {ach.icon}
                                            </div>
                                            <span className={`text-[10px] font-black uppercase tracking-wider text-center ${isUnlocked ? 'text-white' : 'text-[var(--text-muted)]'}`}>
                                                {ach.name}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>

                    </div>

                    {/* Sidebar */}
                    <div className="lg:col-span-1 space-y-8">
                        {/* Friends/Following Sections */}
                        <BrightLayer variant="glass" padding="none" className="overflow-hidden">
                            <div className="p-4 border-b border-white/5 flex gap-4">
                                <button
                                    onClick={() => setSocialTab('following')}
                                    className={`flex-1 pb-2 transition-all text-sm font-black uppercase tracking-widest ${socialTab === 'following' ? 'border-b-2 border-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                                >
                                    Following
                                </button>
                                <button
                                    onClick={() => setSocialTab('followers')}
                                    className={`flex-1 pb-2 transition-all text-sm font-black uppercase tracking-widest ${socialTab === 'followers' ? 'border-b-2 border-[var(--brand-primary)] text-white' : 'text-[var(--text-muted)] hover:text-white'}`}
                                >
                                    Followers
                                </button>
                            </div>
                            <div className="divide-y divide-white/5">
                                {socialLoading ? (
                                    <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[var(--brand-primary)]" /></div>
                                ) : socialList.length > 0 ? (
                                    socialList.map(friend => (
                                        <FriendRow
                                            key={friend.id}
                                            name={friend.firstName || friend.username || 'Explorer'}
                                            username={friend.username}
                                            sub={friend.streak ? `${friend.streak} day streak` : `${friend.xp || 0} XP`}
                                            xp={friend.xp}
                                        />
                                    ))
                                ) : (
                                    <div className="p-8 text-center text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">No {socialTab} yet</div>
                                )}
                            </div>
                            {socialList.length > 0 && (
                                <div className="p-4 bg-white/5 border-t border-white/5">
                                    <button className="w-full text-center text-xs font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] hover:underline">View All</button>
                                </div>
                            )}
                        </BrightLayer>


                        {/* Add Friends */}
                        <BrightLayer variant="glass" padding="md" className="space-y-4">
                            <BrightHeading level={3} className="text-lg">Add Friends</BrightHeading>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setShowSearch(true)}
                                    className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">🔍</span>
                                        <span className="font-bold text-sm">Find friends</span>
                                    </div>
                                    <span className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform">›</span>
                                </button>
                                <button className="w-full flex items-center justify-between p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xl">✉️</span>
                                        <span className="font-bold text-sm">Invite friends</span>
                                    </div>
                                    <span className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform">›</span>
                                </button>
                            </div>
                        </BrightLayer>
                    </div>

                </div>
            </div>

            {/* User Search Modal */}
            <AnimatePresence>
                {showSearch && (
                    <UserSearchModal
                        isOpen={showSearch}
                        onClose={() => setShowSearch(false)}
                        currentUser={currentUserData}
                        onFollow={handleFollowToggle}
                    />
                )}
            </AnimatePresence>

            {/* Mascot */}
            <ProfessorBrightMascot
                feedback={{
                    tone: 'encouraging',
                    message: isOwner ? "Your profile is looking sharp! Keep it up." : `Checking out ${username}'s progress? They're doing great!`,
                    emoji: '🦉',
                    spriteClass: 'owl-magic'
                }}
            />
        </div>
    );
}

function StatCard({ icon, label, value, subtext, color }: { icon: string, label: string, value: string | number, subtext?: string, color: string }) {
    return (
        <BrightLayer variant="elevated" padding="md" className="flex items-center gap-4 border-b-[6px] border-black/10 hover:border-white/10 transition-colors">
            <div className={`text-4xl ${color} bg-white/5 p-3 rounded-2xl shadow-inner`}>{icon}</div>
            <div>
                <div className="text-2xl font-black">{value}</div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{label}</div>
                {subtext && <div className="text-[10px] font-bold text-green-500 uppercase mt-0.5">{subtext}</div>}
            </div>
        </BrightLayer>
    );
}

function FriendRow({ name, username, sub, xp }: { name: string, username: string, sub: string, xp?: number }) {
    return (
        <Link href={`/profile/${username}`} className="block">
            <div className="p-4 flex items-center justify-between group hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-white/10 shadow-lg overflow-hidden flex items-center justify-center bg-white/5 group-hover:scale-105 transition-transform">
                        <div className="relative w-full h-full">
                            <Image
                                src={`https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(username)}&backgroundType=solid&backgroundColor=FF8A8A`}
                                alt={username}
                                fill
                                sizes="40px"
                                className="object-cover"
                            />
                        </div>
                    </div>
                    <div>
                        <div className="font-black text-sm group-hover:text-[var(--brand-primary)] transition-colors">{name}</div>
                        <div className="text-[10px] text-[var(--text-muted)] font-bold tracking-tight">{sub}</div>
                    </div>
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    View
                </div>
            </div>
        </Link>
    );
}
function UserSearchModal({ isOpen, onClose, currentUser, onFollow }: { isOpen: boolean, onClose: () => void, currentUser: any, onFollow: () => void }) {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const searchUsers = async () => {
            setLoading(true);
            try {
                const usersRef = collection(db, 'users');
                let q;

                if (searchTerm.length < 2) {
                    // Show suggested users when search is empty
                    q = query(usersRef, limit(6));
                } else {
                    // prefix search
                    q = query(
                        usersRef,
                        where('username', '>=', searchTerm.toLowerCase()),
                        where('username', '<=', searchTerm.toLowerCase() + '\uf8ff'),
                        limit(6)
                    );
                }

                const snap = await getDocs(q);
                const users = snap.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(u => u.id !== currentUser?.id);
                setResults(users);
            } catch (e) {
                console.error("Search error:", e);
            }
            setLoading(false);
        };

        const timer = setTimeout(searchUsers, searchTerm.length < 2 ? 0 : 300);
        return () => clearTimeout(timer);
    }, [searchTerm, currentUser]);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="relative w-full max-w-xl bg-[var(--bg-glass)] rounded-[3rem] border border-white/10 shadow-2xl overflow-hidden nebula-stroke"
            >
                <div className="p-8">
                    <div className="flex items-center justify-between mb-8">
                        <BrightHeading level={2}>Find Friends</BrightHeading>
                        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-white text-2xl">✕</button>
                    </div>

                    <div className="relative mb-8">
                        <div className="absolute left-5 top-1/2 -translate-y-1/2 text-xl opacity-40">🔍</div>
                        <input
                            autoFocus
                            type="text"
                            placeholder="Search by username..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border-2 border-white/10 rounded-2xl py-4 pl-14 pr-6 font-bold focus:border-[var(--brand-primary)] focus:bg-white/[0.08] outline-none transition-all"
                        />
                    </div>

                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                        {loading ? (
                            <div className="p-8 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" /></div>
                        ) : results.length > 0 ? (
                            results.map(u => (
                                <Link key={u.id} href={`/profile/${u.username}`} onClick={onClose}>
                                    <div className="flex items-center justify-between p-4 rounded-3xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/10 group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-full border-2 border-[var(--brand-primary)] p-0.5 overflow-hidden">
                                                <div className="relative w-full h-full rounded-full bg-white/10 overflow-hidden">
                                                    <Image
                                                        src={u.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(u.username)}&backgroundType=solid&backgroundColor=FF8A8A`}
                                                        alt={u.username}
                                                        fill
                                                        sizes="48px"
                                                        className="object-cover"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="font-black text-sm group-hover:text-[var(--brand-primary)] transition-colors">{u.firstName || u.username}</div>
                                                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-widest">@{u.username}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                                            View Profile ›
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <div className="text-center p-8 text-[var(--text-muted)] font-black uppercase tracking-widest text-xs opacity-40">No users found</div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white/5 border-t border-white/5 flex justify-center">
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Search results are updated live</p>
                </div>
            </motion.div>
        </div>
    );
}
