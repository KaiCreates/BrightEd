'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function ProfileSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { user, userData, loading: authLoading } = useAuth();
    const username = params?.username as string;

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [bio, setBio] = useState('');
    const [school, setSchool] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    useEffect(() => {
        if (!authLoading && userData) {
            // Check if this is the owner
            if (userData.username !== username) {
                router.push(`/profile/${username}`);
                return;
            }
            setFirstName(userData.firstName || '');
            setLastName(userData.lastName || '');
            setBio(userData.bio || '');
            setSchool(userData.school || '');
        }
    }, [userData, authLoading, username, router]);

    const handleSave = async () => {
        if (!user) return;
        setSaving(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                bio: bio.trim().slice(0, 500),
                school: school.trim(),
                updatedAt: new Date().toISOString()
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
        }
        setSaving(false);
    };

    const handleLogout = async () => {
        try {
            await signOut(auth);
            router.push('/');
        } catch (error) {
            console.error('Error signing out:', error);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
            </div>
        );
    }

    if (!user || userData?.username !== username) {
        return (
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4">
                <BrightHeading level={1} className="mb-4">Access Denied</BrightHeading>
                <p className="text-[var(--text-muted)] mb-8">You can only edit your own profile.</p>
                <BrightButton onClick={() => router.push('/')}>Go Home</BrightButton>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] pb-24 pt-20 safe-padding">
            <div className="max-w-2xl mx-auto px-4">
                <div className="flex items-center justify-between mb-8">
                    <BrightHeading level={1}>Settings</BrightHeading>
                    <BrightButton variant="ghost" size="sm" onClick={() => router.push(`/profile/${username}`)}>
                        ← Back to Profile
                    </BrightButton>
                </div>

                {/* Profile Information */}
                <BrightLayer variant="glass" padding="lg" className="mb-6">
                    <BrightHeading level={2} className="mb-6">Profile Information</BrightHeading>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
                                placeholder="Your first name"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
                                placeholder="Your last name"
                            />
                        </div>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">Bio</label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            rows={3}
                            maxLength={500}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--brand-primary)] focus:outline-none transition-colors resize-none"
                            placeholder="Tell us about yourself..."
                        />
                        <p className="text-xs text-[var(--text-muted)] mt-1">{bio.length}/500 characters</p>
                    </div>

                    <div className="mb-6">
                        <label className="block text-sm font-bold text-[var(--text-muted)] mb-2">School</label>
                        <input
                            type="text"
                            value={school}
                            onChange={(e) => setSchool(e.target.value)}
                            className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[var(--brand-primary)] focus:outline-none transition-colors"
                            placeholder="Your school name"
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <BrightButton onClick={handleSave} disabled={saving}>
                            {saving ? 'Saving...' : saved ? '✓ Saved!' : 'Save Changes'}
                        </BrightButton>
                        {saved && <span className="text-green-400 text-sm font-medium">Profile updated successfully!</span>}
                    </div>
                </BrightLayer>

                {/* Account Section */}
                <BrightLayer variant="glass" padding="lg" className="mb-6">
                    <BrightHeading level={2} className="mb-4">Account</BrightHeading>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div>
                                <p className="font-bold text-white">Username</p>
                                <p className="text-sm text-[var(--text-muted)]">@{username}</p>
                            </div>
                            <span className="text-xs text-[var(--text-muted)] bg-white/5 px-3 py-1 rounded-full">Cannot change</span>
                        </div>
                        <div className="flex items-center justify-between py-3 border-b border-white/5">
                            <div>
                                <p className="font-bold text-white">Email</p>
                                <p className="text-sm text-[var(--text-muted)]">{user.email}</p>
                            </div>
                        </div>
                    </div>
                </BrightLayer>

                {/* Danger Zone */}
                <BrightLayer variant="glass" padding="lg" className="border-red-500/30">
                    <BrightHeading level={2} className="mb-4 text-red-400">Danger Zone</BrightHeading>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="font-bold text-white">Sign Out</p>
                            <p className="text-sm text-[var(--text-muted)]">Sign out of your account on this device</p>
                        </div>
                        <BrightButton variant="outline" onClick={handleLogout} className="border-red-500/50 text-red-400 hover:bg-red-500/10">
                            Sign Out
                        </BrightButton>
                    </div>
                </BrightLayer>
            </div>
        </div>
    );
}
