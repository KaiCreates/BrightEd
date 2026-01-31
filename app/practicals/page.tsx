
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

import { getAllMissionCompletions, getMissionCompletion } from '@/lib/brightos/mission-progress';
import { getLiveSessions, type BrightOSLiveSession } from '@/lib/brightos/live-sessions';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';
import { ProfessorBrightMascot } from '@/components/learning';
import { FeedbackResponse } from '@/lib/professor-bright';

export default function PracticalsPage() {
  const [malwareCompletion, setMalwareCompletion] = useState<ReturnType<typeof getMissionCompletion> | null>(null);
  const [sessions, setSessions] = useState<BrightOSLiveSession[]>([]);
  const [csecProgress, setCsecProgress] = useState<{ completed: number; xp: number }>({ completed: 0, xp: 0 });
  const [mascotFeedback, setMascotFeedback] = useState<FeedbackResponse | null>(null);

  useEffect(() => {
    setMalwareCompletion(getMissionCompletion('brightos:malware-incident'));
    setSessions(getLiveSessions());

    const comps = getAllMissionCompletions();
    const csec = comps.filter((c) => c.objectiveId.startsWith('brightos:csec:'));
    const xp = csec.reduce((sum, c) => sum + (c.xpEarned || 0), 0);
    setCsecProgress({ completed: csec.length, xp });

    // Mascot Greeting
    setTimeout(() => {
      setMascotFeedback({
        tone: 'supportive',
        message: "Practical sessions are where you apply your knowledge! Ready to break and fix some systems? 💻",
        emoji: '👋',
        spriteClass: 'owl-neutral'
      });
    }, 1000);
  }, []);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[var(--bg-primary)] pb-24 safe-padding overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[var(--brand-primary)] opacity-[0.03] rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] right-[-5%] w-[30%] h-[30%] bg-[var(--brand-accent)] opacity-[0.03] rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-8 py-12 pt-24 md:pt-32">
        {/* Hero Section */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-12 mb-16">
          <div className="max-w-2xl text-center lg:text-left">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] text-xs font-black uppercase tracking-widest mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--brand-primary)] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--brand-primary)]"></span>
              </span>
              Hands-On Experience
            </motion.div>
            <BrightHeading level={1} className="mb-6">
              Learn by <span className="text-[var(--brand-primary)]">breaking</span>.<br />
              Fix by <span className="text-[var(--brand-accent)] text-shadow-glow">thinking</span>.
            </BrightHeading>
            <p className="text-[var(--text-secondary)] text-lg md:text-xl font-medium leading-relaxed mb-8">
              Step into high-fidelity simulations where every click reacts to the system state. You aren&apos;t just reading—you&apos;re the technician.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="shrink-0 w-full lg:w-96"
          >
            <BrightLayer variant="glass" padding="md" className="border-b-[8px] border-[var(--brand-primary)]">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 rounded-xl bg-[var(--brand-primary)] flex items-center justify-center text-2xl shadow-lg shadow-[var(--brand-primary)]/20 text-white">
                  📈
                </div>
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Global Progress</div>
                  <div className="text-xl font-black text-[var(--text-primary)]">Practicals Clear</div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                    <span>Missions Completed</span>
                    <span className="text-[var(--brand-primary)]">{csecProgress.completed}/50</span>
                  </div>
                  <div className="w-full bg-[var(--bg-secondary)] rounded-full h-3 border border-[var(--border-subtle)] p-0.5">
                    <div
                      className="h-full bg-[var(--brand-primary)] rounded-full shadow-lg"
                      style={{ width: `${(csecProgress.completed / 50) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="pt-2 flex justify-between items-center">
                  <div className="text-sm font-black text-[var(--text-primary)]">
                    Total XP Earned
                  </div>
                  <div className="text-xl font-black text-[var(--brand-primary)]">
                    +{csecProgress.xp + (malwareCompletion?.xpEarned || 0)} XP
                  </div>
                </div>
              </div>
            </BrightLayer>
          </motion.div>
        </div>

        {/* Section: IT & Technology */}
        <section className="mb-20">
          <div className="flex items-center gap-6 mb-10 pl-2">
            <span className="text-3xl bg-[var(--bg-elevated)] p-3 rounded-2xl shadow-xl border border-[var(--border-subtle)]">💻</span>
            <div>
              <BrightHeading level={2}>Technology & BrightOS</BrightHeading>
              <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Master the terminal and beyond</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            {/* Malware Incident Card */}
            <Link href="/practicals/technology-practicality/malware-incident" className="block group">
              <BrightLayer
                variant="elevated"
                padding="md"
                className="h-full border-b-[8px] border-teal-700 hover:border-teal-500 active:border-b-0 active:translate-y-[8px] transition-all cursor-pointer overflow-hidden relative bg-gradient-to-br from-teal-500/5 to-transparent"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-teal-500 opacity-[0.05] group-hover:opacity-[0.1] rounded-full blur-3xl transition-opacity" />
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-3">
                      <div className="inline-block px-3 py-1 rounded-lg bg-teal-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20">Practical • Level 1</div>
                      <BrightHeading level={3} className="text-3xl group-hover:text-teal-400 transition-colors tracking-tight">Malware Incident</BrightHeading>
                      <p className="text-[var(--text-secondary)] font-medium max-w-sm leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        Unknown process consuming CPU. Diagnose, attempt a quick fix, then eliminate persistence.
                      </p>
                    </div>
                    <div className="w-24 h-24 rounded-3xl bg-teal-500 flex items-center justify-center text-5xl shadow-2xl shadow-teal-500/30 text-white transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      💻
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                    {malwareCompletion ? (
                      <div className="px-4 py-2 rounded-xl bg-teal-500/20 text-teal-400 text-xs font-black uppercase tracking-widest border border-teal-500/30">
                        COMPLETED +{malwareCompletion.xpEarned} XP
                      </div>
                    ) : (
                      <div className="bg-teal-500 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-teal-500/20 hover:scale-105 active:scale-95 transition-all">
                        START MISSION
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Live System</span>
                    </div>
                  </div>
                </div>
              </BrightLayer>
            </Link>

            {/* CSEC Roadmap Card */}
            <Link href="/practicals/technology-practicality/csec-roadmap" className="block group">
              <BrightLayer
                variant="elevated"
                padding="md"
                className="h-full border-b-[8px] border-emerald-700 hover:border-emerald-500 active:border-b-0 active:translate-y-[8px] transition-all cursor-pointer overflow-hidden relative bg-gradient-to-br from-emerald-500/5 to-transparent"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-emerald-500 opacity-[0.05] group-hover:opacity-[0.1] rounded-full blur-3xl transition-opacity" />
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-3">
                      <div className="inline-block px-3 py-1 rounded-lg bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20">Library • 50 Missions</div>
                      <BrightHeading level={3} className="text-3xl group-hover:text-emerald-400 transition-colors tracking-tight">CSEC Roadmap</BrightHeading>
                      <p className="text-[var(--text-secondary)] font-medium max-w-sm leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        Full mission library JSON aligned to CSEC. Dive into randomized challenges from the syllabus.
                      </p>
                    </div>
                    <div className="w-24 h-24 rounded-3xl bg-emerald-500 flex items-center justify-center text-5xl shadow-2xl shadow-emerald-500/30 text-white transform group-hover:rotate-6 group-hover:scale-110 transition-all duration-500">
                      🧭
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="px-4 py-2 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-widest border border-emerald-500/30">
                      {csecProgress.completed}/50 CLEAR
                    </div>
                    <div className="bg-emerald-500 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all">
                      OPEN LIBRARY
                    </div>
                  </div>
                </div>
              </BrightLayer>
            </Link>
          </div>
        </section>

        {/* Section: Business Literacy */}
        <section className="mb-20">
          <div className="flex items-center gap-6 mb-10 pl-2">
            <span className="text-3xl bg-[var(--bg-elevated)] p-3 rounded-2xl shadow-xl border border-[var(--border-subtle)]">🏢</span>
            <div>
              <BrightHeading level={2}>Business & Finance</BrightHeading>
              <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest">Build empires, manage literal wealth</p>
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Link href="/practicals/business/register" className="block group">
              <BrightLayer
                variant="elevated"
                padding="md"
                className="h-full border-b-[8px] border-amber-700 hover:border-amber-500 active:border-b-0 active:translate-y-[8px] transition-all cursor-pointer overflow-hidden relative bg-gradient-to-br from-amber-500/5 to-transparent"
              >
                <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500 opacity-[0.05] group-hover:opacity-[0.1] rounded-full blur-3xl transition-opacity" />
                <div className="flex flex-col h-full relative z-10">
                  <div className="flex items-start justify-between mb-8">
                    <div className="space-y-3">
                      <div className="inline-block px-3 py-1 rounded-lg bg-amber-500 text-white text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20">Legal • Onboarding</div>
                      <BrightHeading level={3} className="text-3xl group-hover:text-amber-400 transition-colors tracking-tight">Register Business</BrightHeading>
                      <p className="text-[var(--text-secondary)] font-medium max-w-sm leading-relaxed opacity-80 group-hover:opacity-100 transition-opacity">
                        Start the legal entity process and unlock the operations dashboard.
                      </p>
                    </div>
                    <div className="w-24 h-24 rounded-3xl bg-amber-500 flex items-center justify-center text-5xl shadow-2xl shadow-amber-500/30 text-white transform group-hover:scale-110 transition-all duration-500">
                      💼
                    </div>
                  </div>

                  <div className="mt-auto flex items-center justify-between pt-6 border-t border-white/5">
                    <div className="bg-amber-500 text-white px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all">
                      ESTABLISH ENTITY
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Operations</span>
                    </div>
                  </div>
                </div>
              </BrightLayer>
            </Link>

            <BrightLayer variant="glass" padding="md" className="border-b-[8px] border-[var(--border-subtle)] bg-[var(--bg-secondary)]/50">
              <div className="flex flex-col items-center justify-center h-full text-center py-10 opacity-60">
                <span className="text-5xl mb-4">🚀</span>
                <BrightHeading level={3} className="text-xl mb-2">Coming Soon</BrightHeading>
                <p className="text-sm font-bold text-[var(--text-muted)] uppercase tracking-widest max-w-xs">
                  Customer Requests, Ethics Challenges, and Market Simulations.
                </p>
              </div>
            </BrightLayer>
          </div>
        </section>

        {/* Section: Practice Sessions (Recent Activity) */}
        <section className="mb-20 px-2">
          <div className="flex items-center justify-between mb-8">
            <div>
              <BrightHeading level={2}>Recent Activity</BrightHeading>
              <p className="text-[var(--text-muted)] text-sm font-bold ml-1">Your BrightOS Live History</p>
            </div>
          </div>

          <BrightLayer variant="glass" padding="none" className="border-b-[8px] border-[var(--border-subtle)]">
            <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
              {sessions.length === 0 ? (
                <div className="p-10 text-center text-[var(--text-muted)] font-black uppercase tracking-widest text-xs">
                  No active history found. Start a mission to track progress.
                </div>
              ) : (
                sessions.slice(0, 10).map((s) => (
                  <div key={s.id} className="p-6 hover:bg-white/[0.02] transition-colors group">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-inner ${s.status === 'completed' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
                          {s.mode === 'csec' ? '🧭' : '💻'}
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
                            {s.mode === 'csec' ? `CSEC • ${s.missionId}` : 'Practical Simulation'}
                          </div>
                          <div className="text-base font-black text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                            {s.status === 'completed' ? 'Mission Success' : s.status === 'abandoned' ? 'Terminated' : 'Actively Running'}
                          </div>
                          <div className="text-[10px] font-bold text-[var(--text-muted)]">
                            {new Date(s.startedAt).toLocaleDateString()} at {new Date(s.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        {s.xpEarned && (
                          <div className="text-lg font-black text-emerald-500">+{s.xpEarned} XP</div>
                        )}
                        <div className="text-[9px] font-mono text-[var(--text-muted)]">ID: {s.id.slice(-8).toUpperCase()}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </BrightLayer>
        </section>

        {/* Explorer Section */}
        <section>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              { title: 'Financial Literacy', desc: 'Reports, market shifts, and delayed consequences.', icon: '📊' },
              { title: 'Science Labs', desc: 'Variable-state experiments with earned outcomes.', icon: '🧪' },
              { title: 'Career Paths', desc: 'Real professional simulations with higher stakes.', icon: '🎯' }
            ].map((item, i) => (
              <BrightLayer key={i} variant="elevated" padding="sm" className="bg-[var(--bg-secondary)]/30 border-b-[6px] border-[var(--border-subtle)] opacity-70">
                <div className="text-2xl mb-2">{item.icon}</div>
                <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] mb-1">Coming Soon</div>
                <div className="font-black text-[var(--text-primary)] mb-1">{item.title}</div>
                <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">{item.desc}</p>
              </BrightLayer>
            ))}
          </div>
        </section>
      </div>

      {/* Professor Bright Mascot */}
      <ProfessorBrightMascot feedback={mascotFeedback} />
    </div>
  );
}
