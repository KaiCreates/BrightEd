'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { useAuth } from '@/lib/auth-context'
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, arrayRemove } from 'firebase/firestore'
import { db, auth } from '@/lib/firebase'
import { updateProfile, updateEmail, sendPasswordResetEmail, signOut } from 'firebase/auth'
import { toast } from 'react-hot-toast'

export default function ProfileSettingsPage({ params }: { params: { username: string } }) {
    const router = useRouter()
    const { user, userData, loading } = useAuth()
    const blockedUsers = userData?.blockedUsers || []
    const [blockedList, setBlockedList] = useState<any[]>([])
    const [loadingBlocked, setLoadingBlocked] = useState(false)

    // Form States
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [bio, setBio] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [email, setEmail] = useState('')

    const [saving, setSaving] = useState(false)

    // Security States
    const [showDangerZone, setShowDangerZone] = useState(false)

    // Redirect if not owner
    useEffect(() => {
        if (!loading && userData && userData.username !== params.username) {
            router.push(`/profile/${params.username}`)
        }
    }, [loading, userData, params.username, router])

    // Initialize Form
    useEffect(() => {
        if (userData) {
            setFirstName(userData.firstName || '')
            setLastName(userData.lastName || '')
            setBio(userData.bio || '')
            setNewUsername(userData.username || '')
            setEmail(user?.email || '')
        }
    }, [userData, user])

    // Fetch blocked users details
    useEffect(() => {
        const fetchBlockedDetails = async () => {
            if (blockedUsers.length === 0) {
                setBlockedList([])
                return
            }

            setLoadingBlocked(true)
            try {
                const details = await Promise.all(blockedUsers.map(async (id) => {
                    const d = await getDoc(doc(db, 'users', id))
                    return d.exists() ? { id: d.id, ...d.data() } : null
                }))
                setBlockedList(details.filter(Boolean))
            } catch (error) {
                console.error("Error fetching blocked users:", error)
            }
            setLoadingBlocked(false)
        }

        fetchBlockedDetails()
    }, [blockedUsers])

    const handleUnblock = async (userId: string) => {
        try {
            if (!user) return
            await updateDoc(doc(db, 'users', user.uid), {
                blockedUsers: arrayRemove(userId)
            })
            toast.success('User unblocked')
        } catch (err) {
            console.error("Failed to unblock:", err)
            toast.error('Failed to unblock')
        }
    }

    const handleSaveProfile = async () => {
        if (!user) return
        setSaving(true)
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                firstName,
                lastName,
                bio
            })
            toast.success('Profile updated!')
        } catch (error) {
            console.error("Error updating profile:", error)
            toast.error('Failed to update profile')
        }
        setSaving(false)
    }

    const handleUsernameChange = async () => {
        if (!user || !userData) return
        if (newUsername === userData.username) return

        const now = Date.now()
        const lastChange = userData.lastUsernameChange || 0
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000

        if (now - lastChange < sevenDaysMs) {
            const daysLeft = Math.ceil((sevenDaysMs - (now - lastChange)) / (24 * 60 * 60 * 1000))
            toast.error(`You can change your username again in ${daysLeft} days.`)
            return
        }

        setSaving(true)
        try {
            // Check Uniqueness
            const usersRef = collection(db, 'users')
            const q = query(usersRef, where('username', '==', newUsername))
            const snapshot = await getDocs(q)

            if (!snapshot.empty) {
                toast.error('Username already taken')
                setSaving(false)
                return
            }

            await updateDoc(doc(db, 'users', user.uid), {
                username: newUsername,
                lastUsernameChange: now
            })
            toast.success('Username updated!')
            router.push(`/profile/${newUsername}/settings`)
        } catch (error) {
            console.error("Error updating username:", error)
            toast.error('Failed to update username')
        }
        setSaving(false)
    }

    const handleChangePassword = async () => {
        if (!email) return
        try {
            await sendPasswordResetEmail(auth, email)
            toast.success('Password reset email sent!')
        } catch (error) {
            toast.error('Failed to send reset email')
        }
    }

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            router.push('/login')
        } catch (error) {
            toast.error('Failed to sign out')
        }
    }

    if (loading || !userData) {
        return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-white">Loading...</div>
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] p-6 pt-24 text-[var(--text-primary)] relative overflow-hidden">
            {/* Background blobs for premium feel */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[var(--brand-primary)]/5 rounded-full blur-[100px] pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-[var(--brand-accent)]/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <div className="flex items-center gap-4 mb-8">
                    <Link href={`/profile/${params.username}`}>
                        <button className="text-[var(--text-secondary)] hover:text-white transition-colors flex items-center gap-2 font-bold px-4 py-2 rounded-xl hover:bg-white/5">
                            <span>←</span> Back to Profile
                        </button>
                    </Link>
                </div>

                <div className="flex items-end justify-between mb-8">
                    <BrightHeading level={1} className="text-5xl">Settings</BrightHeading>
                    <div className="text-[var(--brand-primary)] text-sm font-black uppercase tracking-widest bg-[var(--brand-primary)]/10 px-3 py-1 rounded-full border border-[var(--brand-primary)]/20">
                        User Controls
                    </div>
                </div>

                <div className="grid gap-8">

                    {/* Public Profile */}
                    <section>
                        <BrightLayer variant="glass" padding="lg" className="border-t-4 border-[var(--brand-primary)]">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <span>👤</span> Public Profile
                            </h2>
                            <div className="grid md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">First Name</label>
                                    <input
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 font-bold focus:border-[var(--brand-primary)] outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Last Name</label>
                                    <input
                                        value={lastName}
                                        onChange={(e) => setLastName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 font-bold focus:border-[var(--brand-primary)] outline-none transition-all"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Bio</label>
                                    <textarea
                                        value={bio}
                                        onChange={(e) => setBio(e.target.value)}
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl p-3 font-medium focus:border-[var(--brand-primary)] outline-none transition-all resize-none"
                                    />
                                </div>
                                <div className="md:col-span-2 flex justify-end">
                                    <BrightButton onClick={handleSaveProfile} disabled={saving} size="md">
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </BrightButton>
                                </div>
                            </div>

                            <div className="mt-8 pt-8 border-t border-white/5">
                                <h3 className="text-lg font-black mb-4">Username</h3>
                                <div className="flex gap-4">
                                    <input
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="flex-1 bg-black/20 border border-white/10 rounded-xl p-3 font-mono font-bold focus:border-[var(--brand-primary)] outline-none transition-all"
                                    />
                                    <BrightButton variant="outline" onClick={handleUsernameChange} disabled={saving}>
                                        Change Username
                                    </BrightButton>
                                </div>
                                <p className="text-xs text-[var(--text-muted)] mt-2">
                                    *You can check your username once every 7 days.
                                </p>
                            </div>
                        </BrightLayer>
                    </section>

                    {/* Account Security */}
                    <section>
                        <BrightLayer variant="glass" padding="lg" className="border-t-4 border-emerald-500">
                            <h2 className="text-2xl font-black mb-6 flex items-center gap-3">
                                <span>🛡️</span> Security
                            </h2>

                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-lg">Email Address</div>
                                        <div className="text-[var(--text-muted)]">{email}</div>
                                    </div>
                                    <BrightButton variant="outline" size="sm" disabled>
                                        Change Email
                                    </BrightButton>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                    <div>
                                        <div className="font-bold text-lg">Password</div>
                                        <div className="text-[var(--text-muted)] text-sm">Last changed recently</div>
                                    </div>
                                    <BrightButton variant="outline" size="sm" onClick={handleChangePassword}>
                                        Reset Password
                                    </BrightButton>
                                </div>
                            </div>
                        </BrightLayer>
                    </section>

                    {/* Blocked Users Section */}
                    <section>
                        <BrightLayer variant="glass" padding="lg" className="border-t-4 border-red-400">
                            <h2 className="text-2xl font-black mb-6 text-red-400 flex items-center gap-3">
                                <span>🚫</span> Blocked Users
                            </h2>

                            {loadingBlocked ? (
                                <div className="text-center p-8">Loading...</div>
                            ) : blockedList.length > 0 ? (
                                <div className="space-y-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                                    {blockedList.map(u => (
                                        <div key={u.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden relative">
                                                    <Image
                                                        src={u.avatarUrl || `https://api.dicebear.com/9.x/avataaars/svg?seed=${u.username}`}
                                                        fill
                                                        alt={u.username}
                                                        className="object-cover"
                                                    />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-white">{u.firstName || u.username}</div>
                                                    <div className="text-xs text-[var(--text-muted)]">@{u.username}</div>
                                                </div>
                                            </div>
                                            <BrightButton
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleUnblock(u.id)}
                                                className="text-red-400 border-red-500/20 hover:bg-red-500/10"
                                            >
                                                Unblock
                                            </BrightButton>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-12 bg-white/5 rounded-2xl border-dashed border-2 border-white/10 text-[var(--text-muted)]">
                                    No blocked users.
                                </div>
                            )}
                        </BrightLayer>
                    </section>

                    {/* Danger Zone */}
                    <section>
                        <div className="border border-red-500/30 bg-red-500/5 rounded-3xl p-8">
                            <h2 className="text-2xl font-black mb-2 text-red-500">Danger Zone</h2>
                            <p className="text-[var(--text-muted)] mb-6 text-sm">Be careful with these settings.</p>

                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="font-bold text-white">Sign Out</div>
                                    <div className="text-xs text-[var(--text-muted)]">Log out of your account on this device</div>
                                </div>
                                <button
                                    onClick={handleSignOut}
                                    className="px-6 py-3 rounded-xl bg-red-500 text-white font-black uppercase tracking-widest text-xs hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                                >
                                    Sign Out
                                </button>
                            </div>
                        </div>
                    </section>

                </div>
            </div>
        </div>
    )
}
