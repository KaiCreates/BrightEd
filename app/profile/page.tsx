'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
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
import { doc, onSnapshot } from 'firebase/firestore'

export default function ProfilePage() {
  const { user, userData, loading: authLoading } = useAuth()
  const { business } = useBusiness()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [stats, setStats] = useState([
    { label: 'Mastery', value: '-', unit: '/ 10', icon: '🧠' },
    { label: 'Consistency', value: '-', unit: '%', icon: '📈' },
    { label: 'Streak', value: '-', unit: 'Days', icon: '🔥' },
    { label: 'XP', value: '-', unit: 'Total', icon: '⚡' },
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
      // Primary source: Firestore
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

      // robustness: handle mastery if it's an object (map) or a number
      const getMasteryValue = (val: any): number => {
        if (typeof val === 'number') return val;
        if (typeof val === 'object' && val !== null) {
          // If it's a map of subject/objective mastery, calculate average
          const values = Object.values(val).filter(v => typeof v === 'number') as number[];
          if (values.length === 0) return 0.1;
          const sum = values.reduce((a, b) => a + b, 0);
          return sum / values.length;
        }
        return 0.1;
      };

      const masteryScore = getMasteryValue(userData.mastery);

      setStats([
        { label: 'Mastery', value: masteryScore.toFixed(1), unit: '/ 10', icon: '🧠' },
        { label: 'Consistency', value: userData.streak > 0 ? Math.min(100, userData.streak * 10).toString() : '0', unit: '%', icon: '📈' },
        { label: 'Streak', value: (userData.streak || 0).toString(), unit: 'Days', icon: '🔥' },
        { label: 'XP', value: userData.xp >= 1000 ? (userData.xp / 1000).toFixed(1) + 'k' : (userData.xp || 0).toString(), unit: 'Total', icon: '⚡' },
      ]);
    } else {
      // Fallback: LocalStorage (during onboarding or offline)
      const localProfile = localStorage.getItem('brighted_onboarding')
      if (localProfile) {
        setProfile(JSON.parse(localProfile))
      }
    }
  }, [user, userData, authLoading])

  // Sync business context to local state
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
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]"></div>
          <p className="text-[var(--text-muted)] font-bold text-xs uppercase tracking-widest animate-pulse">Loading Profile...</p>
        </div>
      </div>
    )
  }

  // Ensure profile is at least a default if userData hasn't fully propagated yet
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
    <div className="min-h-screen py-12 px-6 pt-24 bg-[var(--bg-primary)]">
      <div className="max-w-6xl mx-auto">

        {/* Top Section: Profile Header & BCoin Card */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-12 mb-16 items-start">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 mb-8">
              <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-secondary)] p-1 shadow-lg shadow-[var(--brand-primary)]/20">
                <div className="w-full h-full bg-[var(--bg-elevated)] rounded-[1.8rem] flex items-center justify-center text-4xl font-black text-[var(--text-primary)]">
                  {displayProfile.firstName.charAt(0)}
                </div>
              </div>
              <div>
                <BrightHeading level={1} className="mb-2">
                  {displayProfile.firstName} <span className="opacity-30">{displayProfile.lastName}</span>
                </BrightHeading>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] rounded-full text-[10px] font-black uppercase tracking-widest border border-[var(--brand-primary)]/20">
                    Student
                  </span>
                  <p className="text-[var(--brand-secondary)] font-bold text-xs uppercase tracking-widest">
                    {displayProfile.school} • {displayProfile.currentForm}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-3">
              {displayProfile.subjects.map((sub: string) => (
                <span key={sub} className="px-4 py-2 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] hover:border-[var(--brand-primary)] transition-colors cursor-default">
                  {sub}
                </span>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex justify-center lg:justify-end"
          >
            <div className="scale-90 lg:scale-100 origin-top-right">
              <BCoinCard
                balance={(businessData?.balance || 0) + (userData?.bCoins || 0)}
                tier="Platinum"
                cardHolder={`${displayProfile.firstName} ${displayProfile.lastName || ''}`.trim() || 'Student'}
              />
            </div>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
          {stats.map((stat, i) => (
            <BrightLayer
              key={stat.label}
              variant="elevated"
              padding="sm"
              className="hover:border-[var(--brand-primary)]/50 transition-all cursor-default group"
            >
              <div className="text-3xl mb-4 flex items-center justify-between">
                <span className="group-hover:scale-110 transition-transform">{stat.icon}</span>
                <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">{stat.unit}</span>
              </div>
              <div className="text-3xl font-black text-[var(--text-primary)] mb-1">{stat.value}</div>
              <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest group-hover:text-[var(--brand-primary)] transition-colors">{stat.label}</div>
            </BrightLayer>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Active Business Widget */}
          <div className="lg:col-span-2">
            <div className="flex justify-between items-end mb-6 px-2">
              <BrightHeading level={4}>Active Enterprise</BrightHeading>
              {businessData && <span className="text-xs font-bold text-[var(--state-success)] flex items-center gap-1">● Live Market Data</span>}
            </div>

            <BrightLayer variant="glass" padding="lg" className="relative overflow-hidden group border-[var(--border-strong)]">
              {/* Conditional Rendering: Show Locked State or Active State */}
              {!businessData ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[var(--bg-elevated)] rounded-full flex items-center justify-center mx-auto mb-6 text-4xl grayscale opacity-50">
                    🏢
                  </div>
                  <h3 className="text-2xl font-bold text-[var(--text-muted)] mb-2">No Active Venture</h3>
                  <p className="text-[var(--text-secondary)] mb-8 max-w-md mx-auto">
                    Register your business to unlock Principles of Business and Accounts simulations.
                  </p>
                  <Link href="/practicals/business/register">
                    <BrightButton variant="primary">Start Your Venture 🚀</BrightButton>
                  </Link>
                </div>
              ) : (
                <>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand-accent)] opacity-5 blur-[80px] group-hover:opacity-10 transition-opacity" />
                  <div className="relative z-10">
                    <div className="grid md:grid-cols-2 gap-12 mb-10">
                      <div>
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <h3 className="text-3xl font-black mb-2 italic text-[var(--text-primary)] tracking-tight">{businessData.name}</h3>
                            <p className="text-[var(--text-secondary)] font-medium text-sm">Global Ecommerce • Startup Phase</p>
                          </div>
                          <div className="px-3 py-1 bg-[var(--brand-accent)]/10 border border-[var(--brand-accent)]/20 text-[var(--brand-accent)] rounded-full text-[10px] font-black uppercase tracking-widest">
                            Active
                          </div>
                        </div>

                        <div className="space-y-6">
                          <div>
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Valuation</p>
                            <div className="flex items-center gap-1 text-3xl font-black text-[var(--text-primary)]">
                              <BCoinIcon size={24} /> {businessData.valuation.toLocaleString()}
                            </div>
                            <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mt-2">B-Coins Balance</p>
                            <div className="flex items-center gap-1 text-xl font-black text-[var(--brand-accent)]">
                              <BCoinIcon size={20} /> {(userData?.bCoins || 0).toLocaleString()}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Cashflow</p>
                              <div className="flex items-center gap-1 text-xl font-black text-[var(--state-success)] text-glow-cyan">
                                +<BCoinIcon size={16} /> {businessData.cashflow.toLocaleString()}
                              </div>
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-1">Employees</p>
                              <p className="text-xl font-black text-[var(--text-primary)]">{businessData.employees}</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 3D Business Card */}
                      <div className="flex items-center justify-center -rotate-2 hover:rotate-0 transition-transform duration-500 overflow-hidden w-full max-w-[400px] mx-auto">
                        <BusinessCard3D businessName={businessData.name} />
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      <Link href="/stories/business/operations" className="flex-1">
                        <BrightButton variant="primary" className="w-full">
                          Enter Dashboard
                        </BrightButton>
                      </Link>
                      <BrightButton variant="secondary" className="w-full flex-1">
                        View Reports
                      </BrightButton>
                    </div>
                  </div>
                </>
              )}
            </BrightLayer>
          </div>

          {/* Side Panel: Recent Achievements */}
          <div>
            <BrightHeading level={4} className="mb-6 px-2">Recent Badges</BrightHeading>
            <BrightLayer variant="elevated" padding="md" className="space-y-6 h-fit bg-[var(--bg-elevated)]/50 backdrop-blur-sm">
              {[
                { name: 'Seed Founder', icon: '🌱', date: '2 days ago', rare: false },
                { name: 'Profit First', icon: '💰', date: 'Yesterday', rare: true },
                { name: 'Market Entry', icon: '🗺️', date: '6h ago', rare: false },
              ].map((badge, i) => (
                <div key={i} className="flex items-center gap-4 group cursor-default">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border transition-all ${badge.rare
                    ? 'bg-[var(--brand-primary)]/10 border-[var(--brand-primary)]/50 neon-glow-primary'
                    : 'bg-[var(--bg-secondary)] border-[var(--border-subtle)]'
                    }`}>
                    {badge.icon}
                  </div>
                  <div>
                    <p className={`font-bold transition-colors ${badge.rare ? 'text-[var(--brand-primary)]' : 'text-[var(--text-primary)]'}`}>
                      {badge.name}
                    </p>
                    <p className="text-[10px] font-black text-[var(--text-muted)] uppercase">{badge.date}</p>
                  </div>
                </div>
              ))}

              <div className="pt-4 border-t border-[var(--border-subtle)]">
                <Link href="/achievements">
                  <p className="text-center text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest hover:text-[var(--brand-primary)] cursor-pointer transition-colors">View All Achievements →</p>
                </Link>
              </div>
            </BrightLayer>
          </div>
        </div>

        <div className="mt-12 text-center border-t border-[var(--border-subtle)] pt-8 pb-4">
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
            className="text-xs text-[var(--text-muted)] hover:text-[var(--state-error)] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 mx-auto"
          >
            <span>🗑️</span> Reset App Data (Fix Cache Errors)
          </button>
        </div>

      </div>
    </div>
  )
}
