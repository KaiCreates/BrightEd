'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import Image from 'next/image'
import BCoinCard from '@/components/premium/BCoinCard'
import { BCoinIcon } from '@/components/BCoinIcon'
import { BrightLayer, BrightButton, BrightHeading } from '@/components/system'
import { getTotalXP } from '@/lib/xp-tracker'
import BusinessCard3D from '@/components/business/BusinessCard3D'
import Link from 'next/link'

interface UserProfile {
  firstName: string
  lastName: string
  school: string
  examTrack: string
  currentForm: string
  subjects: string[]
  learningGoal: string
  intent: string
}

import { useAuth } from '@/lib/auth-context'
import { useBusiness } from '@/lib/business-context'
import { db } from '@/lib/firebase'
import { doc, onSnapshot, updateDoc } from 'firebase/firestore'

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth()
  const { business } = useBusiness()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [settings, setSettings] = useState<{ displayName: string; username: string }>({ displayName: '', username: '' })
  const [savingSettings, setSavingSettings] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [avatarProgress, setAvatarProgress] = useState<number>(0)
  const [stats, setStats] = useState([
    { label: 'Mastery', value: '-', unit: '%', icon: '🧠', color: 'text-purple-500' },
    { label: 'Consistency', value: '-', unit: '%', icon: '📈', color: 'text-blue-500' },
    { label: 'Streak', value: '-', unit: 'Days', icon: '🔥', color: 'text-orange-500' },
    { label: 'XP', value: '-', unit: 'Total', icon: '⚡', color: 'text-yellow-500' },
  ])

  const [businessData, setBusinessData] = useState<{
    name: string;
    valuation: number;
    cashflow: number;
    employees: number;
    trend: 'up' | 'down' | 'flat';
    balance: number;
  } | null>(null);

  // Sync Profile Data from userData or LocalStorage
  useEffect(() => {
    if (authLoading) return;

    if (userData) {
      setProfile({
        firstName: userData.firstName || 'Student',
        lastName: userData.lastName || '',
        school: userData.school || 'BrightEd Academy',
        examTrack: userData.examTrack || 'CSEC',
        currentForm: userData.form ? `Form ${userData.form}` : 'Form 5',
        subjects: userData.subjects || ['Principles of Business', 'Mathematics'],
        learningGoal: userData.learningGoal || 'Mastery',
        intent: userData.intent || 'learner'
      });

      const getMasteryValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null) {
          const values = Object.values(val).filter(v => typeof v === 'number') as number[];
          if (values.length === 0) return 0.1;
          const sum = values.reduce((a, b) => a + b, 0);
          return sum / values.length;
        }
        return 0.1;
      };

      const masteryScore = getMasteryValue(userData.mastery);
      const globalMastery = typeof userData.globalMastery === 'number' ? userData.globalMastery : masteryScore;
      const consistency = typeof userData.consistency === 'number' ? userData.consistency : 0;

      setStats([
        { label: 'Mastery', value: Math.round(globalMastery * 100).toString(), unit: '%', icon: '🧠', color: 'text-purple-500' },
        { label: 'Consistency', value: Math.round(consistency).toString(), unit: '%', icon: '📈', color: 'text-blue-500' },
        { label: 'Streak', value: (userData.streak || 0).toString(), unit: 'Days', icon: '🔥', color: 'text-orange-500' },
        { label: 'XP', value: userData.xp >= 1000 ? (userData.xp / 1000).toFixed(1) + 'k' : (userData.xp || 0).toString(), unit: 'Total', icon: '⚡', color: 'text-yellow-500' },
      ]);
    } else {
      const localProfile = localStorage.getItem('brighted_onboarding')
      if (localProfile) {
        setProfile(JSON.parse(localProfile))
      }
    }
  }, [user, userData, authLoading])

  useEffect(() => {
    if (!userData) return
    setSettings({
      displayName: userData.displayName || userData.username || userData.firstName || 'Student',
      username: userData.username || '',
    })
  }, [userData])

  const canSaveSettings = Boolean(
    user?.uid &&
    userData &&
    !savingSettings &&
    (settings.displayName !== (userData.displayName || userData.username || userData.firstName || 'Student') ||
      settings.username !== (userData.username || ''))
  )

  const handleSaveSettings = async () => {
    if (!user?.uid || !userData) return

    const username = settings.username.trim().toLowerCase()
    const displayName = settings.displayName.trim()

    if (displayName.length < 2) {
      alert('Display name must be at least 2 characters.')
      return
    }
    if (username && !/^[a-z0-9_]{3,20}$/.test(username)) {
      alert('Username must be 3-20 chars and only contain letters, numbers, and underscores.')
      return
    }

    setSavingSettings(true)
    try {
      const token = await user.getIdToken()
      const res = await fetch('/api/user/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ displayName, username }),
      })

      if (res.status === 409) {
        alert('Username already taken')
        return
      }

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to save settings')
      }
    } catch (e: any) {
      console.error('Failed to save settings:', e)
      alert(e?.message || 'Failed to save settings')
    } finally {
      setSavingSettings(false)
    }
  }

  const compressToWebp = async (file: File, maxSize = 512): Promise<Blob> => {
    const img = await createImageBitmap(file)
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
    const w = Math.max(1, Math.round(img.width * scale))
    const h = Math.max(1, Math.round(img.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas not supported')
    ctx.drawImage(img, 0, 0, w, h)
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (!b) reject(new Error('Failed to encode image'))
          else resolve(b)
        },
        'image/webp',
        0.86
      )
    })
    return blob
  }

  const handleAvatarFile = async (file: File) => {
    if (!user?.uid) return
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file.')
      return
    }
    if (file.size > 6 * 1024 * 1024) {
      alert('Please upload an image under 6MB.')
      return
    }

    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
    if (!cloudName) {
      alert('Cloudinary is not configured (missing env vars).')
      return
    }

    setAvatarUploading(true)
    setAvatarProgress(0)
    try {
      let blob: Blob
      try {
        blob = await compressToWebp(file, 512)
      } catch {
        blob = file
      }

      const token = await user.getIdToken()
      const signRes = await fetch('/api/cloudinary/sign', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      if (!signRes.ok) {
        const payload = await signRes.json().catch(() => ({}))
        throw new Error(payload?.error || 'Failed to prepare upload')
      }

      const sign = await signRes.json()
      const apiKey = sign?.apiKey as string | undefined
      const timestamp = sign?.timestamp as number | undefined
      const signature = sign?.signature as string | undefined
      const signedPublicId = sign?.publicId as string | undefined
      const folder = sign?.folder as string | undefined
      const overwrite = sign?.overwrite as boolean | undefined

      if (!apiKey || !timestamp || !signature || !signedPublicId || !folder) {
        throw new Error('Invalid signing response')
      }

      const form = new FormData()
      form.append('file', blob, 'avatar.webp')
      form.append('api_key', apiKey)
      form.append('timestamp', String(timestamp))
      form.append('signature', signature)
      form.append('folder', folder)
      form.append('public_id', signedPublicId)
      if (overwrite) form.append('overwrite', 'true')

      const xhr = new XMLHttpRequest()
      const url = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`

      const result = await new Promise<any>((resolve, reject) => {
        xhr.upload.onprogress = (evt) => {
          if (!evt.lengthComputable) return
          const pct = Math.round((evt.loaded / evt.total) * 100)
          setAvatarProgress(pct)
        }
        xhr.onreadystatechange = () => {
          if (xhr.readyState !== 4) return
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              resolve(JSON.parse(xhr.responseText))
            } catch (e) {
              reject(e)
            }
          } else {
            reject(new Error(xhr.responseText || 'Upload failed'))
          }
        }
        xhr.open('POST', url)
        xhr.send(form)
      })

      const secureUrl = result?.secure_url as string | undefined
      const uploadedPublicId = result?.public_id as string | undefined
      if (!secureUrl || !uploadedPublicId) throw new Error('Upload response missing URL')

      const userRef = doc(db, 'users', user.uid)
      await updateDoc(userRef, {
        avatarUrl: secureUrl,
        avatarProvider: 'cloudinary',
        avatarPublicId: uploadedPublicId,
        avatarMeta: {
          width: result?.width,
          height: result?.height,
          bytes: result?.bytes,
          format: result?.format,
          contentType: blob.type || file.type,
        },
        avatarUpdatedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
    } catch (e: any) {
      console.error('Avatar upload failed:', e)
      alert(e?.message || 'Failed to upload avatar')
    } finally {
      setAvatarUploading(false)
      setAvatarProgress(0)
    }
  }

  // Sync business context
  useEffect(() => {
    if (business) {
      setBusinessData({
        name: business.name || 'My Business',
        valuation: business.valuation || 0,
        cashflow: business.cashflow || 0,
        employees: Array.isArray(business.employees) ? business.employees.length : (business.staffCount || 0),
        trend: 'up',
        balance: business.balance || 0
      });
    } else if (userData?.hasBusiness && userData?.businessID) {
      const bizRef = doc(db, 'businesses', userData.businessID);
      const unsubBiz = onSnapshot(bizRef, (snap: any) => {
        if (snap.exists()) {
          const b = snap.data();
          setBusinessData({
            name: b.name || 'My Business',
            valuation: b.valuation || 0,
            cashflow: b.cashflow || 0,
            employees: Array.isArray(b.employees) ? b.employees.length : (b.staffCount || 0),
            trend: 'up',
            balance: b.balance !== undefined ? b.balance : (b.cashBalance || 0)
          });
        }
      });
      return () => unsubBiz();
    }
  }, [business, userData])

  if (authLoading || (!profile && !userData)) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
      </div>
    )
  }

  const displayProfile = profile || {
    firstName: userData?.firstName || 'Student',
    lastName: userData?.lastName || '',
    school: userData?.school || 'BrightEd Academy',
    examTrack: userData?.examTrack || 'CSEC',
    currentForm: userData?.form ? `Form ${userData?.form}` : 'Form 5',
    subjects: userData?.subjects || ['Principles of Business'],
    learningGoal: userData?.learningGoal || 'Mastery',
    intent: userData?.intent || 'learner'
  };

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] safe-padding pb-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 pt-20">

        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-8 mb-12 items-center md:items-start text-center md:text-left">
          <div className="relative w-32 h-32 rounded-full border-[6px] border-[var(--brand-primary)] bg-[var(--bg-secondary)] overflow-hidden">
            {userData?.avatarUrl ? (
              <Image
                src={userData.avatarUrl}
                alt="Avatar"
                fill
                sizes="128px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-5xl font-black text-[var(--brand-primary)]">
                {displayProfile.firstName.charAt(0)}
              </div>
            )}

            <label className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-[var(--bg-glass)] border border-white/10 backdrop-blur-xl flex items-center justify-center cursor-pointer nebula-stroke">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={avatarUploading}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleAvatarFile(f)
                  e.currentTarget.value = ''
                }}
              />
              <span className="text-sm font-black text-[var(--text-primary)]">✎</span>
            </label>
          </div>
          <div className="flex-1">
            <BrightHeading level={1} className="mb-2 text-4xl">
              {displayProfile.firstName} {displayProfile.lastName}
            </BrightHeading>
            <p className="text-[var(--text-secondary)] font-bold text-lg mb-4">
              {displayProfile.school} • {displayProfile.currentForm}
            </p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4">
              <span className="px-3 py-1 bg-[var(--brand-accent)]/10 text-[var(--brand-accent)] rounded-lg font-black uppercase text-xs tracking-widest border border-[var(--brand-accent)]/30">
                {displayProfile.examTrack} Scholar
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg font-black uppercase text-xs tracking-widest">
                Joined 2024
              </span>
            </div>
          </div>

          <div className="flex-shrink-0">
            <BCoinCard
              balance={(businessData?.balance || 0) + (userData?.bCoins || 0)}
              tier="Platinum"
              cardHolder={`${displayProfile.firstName}`}
            />
          </div>
        </div>

        <div className="mb-10">
          <BrightHeading level={2} className="mb-4">Profile Settings</BrightHeading>

          <div className="duo-card p-6">
            {avatarUploading ? (
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">Uploading avatar</span>
                  <span className="text-xs font-black text-[var(--brand-primary)]">{avatarProgress}%</span>
                </div>
                <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                  <div className="h-full bg-[var(--brand-primary)]" style={{ width: `${avatarProgress}%` }} />
                </div>
              </div>
            ) : null}

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Display name</div>
                <input
                  value={settings.displayName}
                  onChange={(e) => setSettings((s) => ({ ...s, displayName: e.target.value }))}
                  className="w-full px-4 py-3 rounded-[var(--radius-main)] bg-white/[0.03] border border-white/10 focus:outline-none focus:border-[var(--hero)]"
                  placeholder="Your name"
                />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-2">Username</div>
                <input
                  value={settings.username}
                  onChange={(e) => setSettings((s) => ({ ...s, username: e.target.value }))}
                  className="w-full px-4 py-3 rounded-[var(--radius-main)] bg-white/[0.03] border border-white/10 focus:outline-none focus:border-[var(--hero)]"
                  placeholder="username"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <BrightButton
                variant="primary"
                size="sm"
                disabled={!canSaveSettings}
                onClick={handleSaveSettings}
              >
                {savingSettings ? 'Saving…' : 'Save'}
              </BrightButton>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
          {stats.map((stat, i) => (
            <div key={i} className="duo-card p-6 flex flex-col items-center">
              <span className={`text-3xl mb-2 ${stat.color}`}>{stat.icon}</span>
              <span className="text-2xl font-black text-[var(--text-primary)]">{stat.value}</span>
              <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{stat.label}</span>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* Main Column: Business or Learning Path */}
          <div className="lg:col-span-2 space-y-8">
            <BrightHeading level={2}>Your Enterprise</BrightHeading>

            {!businessData ? (
              <div className="duo-card bg-gray-100 border-dashed border-4 border-gray-300 p-12 text-center">
                <div className="text-6xl grayscale opacity-30 mb-4">🏢</div>
                <h3 className="text-xl font-black text-gray-400 mb-2">No Active Business</h3>
                <p className="text-gray-500 font-bold mb-8">Start a venture to unlock the Simulation map.</p>
                <Link href="/practicals/business/register">
                  <button className="duo-btn duo-btn-primary px-8 py-4">Register New Biz</button>
                </Link>
              </div>
            ) : (
              <div className="duo-card border-[3px] border-[#1F7A85] bg-[#e0f2f1] overflow-hidden relative p-0">
                {/* Header Strip */}
                <div className="bg-[#1F7A85] p-4 flex justify-between items-center border-b-[3px] border-[#155d66]">
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-2xl">🏢</span>
                    <span className="font-black uppercase tracking-widest text-sm">Global Enterprise</span>
                  </div>
                  <div className="bg-white/20 px-3 py-1 rounded-full text-white font-bold text-xs backdrop-blur-sm">
                    ● LIVE MARKET
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Left: 3D Card / Visual */}
                    <div className="w-full md:w-1/3 flex justify-center">
                      <div className="transform -rotate-6 hover:rotate-0 transition-transform duration-300 w-full max-w-[220px] filter drop-shadow-xl">
                        <BusinessCard3D businessName={businessData.name} />
                      </div>
                    </div>

                    {/* Right: Stats */}
                    <div className="flex-1 w-full">
                      <div className="mb-6">
                        <h3 className="text-3xl font-black text-[#0f4c54] mb-1 italic tracking-tight">{businessData.name}</h3>
                        <p className="text-sm font-bold text-[#4a8891]">Valuation: ${businessData.valuation.toLocaleString()}</p>
                      </div>

                      <div className="space-y-3">
                        <div className="bg-white border-2 border-[#1F7A85]/20 rounded-xl p-4 flex justify-between items-center shadow-sm">
                          <span className="text-xs font-black uppercase text-[#4a8891] tracking-wider">Monthly Cashflow</span>
                          <span className="text-xl font-black text-[#1F7A85] flex items-center gap-2">
                            +<BCoinIcon size={24} /> {businessData.cashflow.toLocaleString()}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-3 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Team Size</span>
                            <span className="text-lg font-black text-gray-700">{businessData.employees} <span className="text-xs text-gray-400">Staff</span></span>
                          </div>
                          <div className="bg-white border-2 border-gray-200 rounded-xl p-3 shadow-sm">
                            <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Trend</span>
                            <span className="text-lg font-black text-green-500">↗ Growth</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-8 grid grid-cols-2 gap-4">
                    <Link href="/practicals/business/operations" className="col-span-2 md:col-span-1">
                      <button className="duo-btn duo-btn-primary w-full py-4 text-lg border-b-[6px] active:border-b-0">
                        Enter HQ
                      </button>
                    </Link>
                    <button className="duo-btn bg-white border-2 border-gray-200 border-b-[6px] hover:bg-gray-50 text-gray-600 font-bold w-full py-4 col-span-2 md:col-span-1 active:border-b-2 active:translate-y-[4px] transition-all">
                      Financials
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar: Achievements */}
          <div>
            <BrightHeading level={2} className="mb-6">Badges</BrightHeading>
            <div className="duo-card bg-[var(--bg-secondary)] p-0 overflow-hidden">
              {[
                { name: 'Seed Founder', icon: '🌱', date: '2 days ago', rare: false },
                { name: 'Profit First', icon: '💰', date: 'Yesterday', rare: true },
                { name: 'Market Entry', icon: '🗺️', date: '6h ago', rare: false },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border-b border-[var(--border-subtle)] last:border-0 hover:bg-white/50 transition-colors">
                  <div className="text-3xl">{badge.icon}</div>
                  <div>
                    <p className="font-black text-sm">{badge.name}</p>
                    <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase">{badge.date}</p>
                  </div>
                </div>
              ))}
              <Link href="/achievements" className="block p-4 text-center font-black text-xs uppercase text-[var(--brand-primary)] hover:bg-[var(--brand-primary)]/5 transition-colors">
                View All Badges
              </Link>
            </div>

            <div className="mt-8 text-center">
              <button
                onClick={async () => {
                  if (confirm('This will clear local cache and reload. Continue?')) {
                    try {
                      const { clearIndexedDbPersistence, terminate } = await import('firebase/firestore');
                      const { db } = await import('@/lib/firebase');
                      await terminate(db);
                      await clearIndexedDbPersistence(db);
                      window.location.reload();
                    } catch (e) {
                      console.error('Failed to clear persistence:', e);
                      alert('Could not clear cache. Please manually clear site data.');
                    }
                  }
                }}
                className="text-[10px] text-gray-400 font-black uppercase hover:text-red-500 transition-colors"
              >
                Reset Application Data
              </button>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
