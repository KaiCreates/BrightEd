
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { getAllMissionCompletions, getMissionCompletion } from '@/lib/brightos/mission-progress';
import { getLiveSessions, type BrightOSLiveSession } from '@/lib/brightos/live-sessions';

export default function PracticalsPage() {
  const [malwareCompletion, setMalwareCompletion] = useState<ReturnType<typeof getMissionCompletion> | null>(null);
  const [sessions, setSessions] = useState<BrightOSLiveSession[]>([]);
  const [csecProgress, setCsecProgress] = useState<{ completed: number; xp: number }>({ completed: 0, xp: 0 });

  useEffect(() => {
    setMalwareCompletion(getMissionCompletion('brightos:malware-incident'));
    setSessions(getLiveSessions());

    const comps = getAllMissionCompletions();
    const csec = comps.filter((c) => c.objectiveId.startsWith('brightos:csec:'));
    const xp = csec.reduce((sum, c) => sum + (c.xpEarned || 0), 0);
    setCsecProgress({ completed: csec.length, xp });
  }, []);

  return (
    <div className="min-h-screen bg-[#050B14] relative overflow-hidden">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--brand-primary)]/10 via-transparent to-[#050B14]" />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12 pt-32">
        <div className="mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-primary)]">Practicals</span>
          </div>
          <h1 className="mt-6 text-5xl md:text-6xl font-black text-white tracking-tight leading-none">
            Learn by breaking.
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] via-teal-400 to-emerald-400">
              Fix by thinking.
            </span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-2xl">
            High-fidelity simulations where the interface reacts to system state. You are the technician.
          </p>
        </div>

        <section className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              IT Section
            </div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Link
              href="/practicals/technology-practicality/malware-incident"
              className="group block rounded-[2rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">BrightOS / Technology Practicality</div>
                    <div className="mt-3 text-3xl font-black text-white group-hover:text-teal-300 transition-colors">
                      Malware Incident (Level 1)
                    </div>
                    <div className="mt-2 text-zinc-400 text-sm">
                      Unknown process consuming CPU. Diagnose, attempt a quick fix, then eliminate persistence.
                    </div>
                    {malwareCompletion && (
                      <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-black/30">
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">Completed</div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">+{malwareCompletion.xpEarned} XP</div>
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-2xl">
                    💻
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">
                    Enter Practical →
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400/70" />
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Live System</div>
                  </div>
                </div>
              </div>
            </Link>

            <Link
              href="/practicals/technology-practicality/csec-roadmap"
              className="group block rounded-[2rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">BrightOS / Technology Practicality</div>
                    <div className="mt-3 text-3xl font-black text-white group-hover:text-emerald-300 transition-colors">
                      CSEC Roadmap (50 Missions)
                    </div>
                    <div className="mt-2 text-zinc-400 text-sm">
                      Full mission library JSON aligned to CSEC. Randomized wallpapers from your BrightOS Wallpapers.
                    </div>
                    <div className="mt-4 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-black/30">
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                        {csecProgress.completed}/50 Completed
                      </div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">+{csecProgress.xp} XP</div>
                    </div>
                  </div>
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-2xl">
                    🧭
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">
                    Open Library →
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-400/70" />
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Mission Data</div>
                  </div>
                </div>
              </div>
            </Link>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Coming soon</div>
              <div className="mt-3 text-2xl font-black text-white">Diagnostics & Networking</div>
              <div className="mt-2 text-zinc-400 text-sm">
                Unstable network, failing RAM, firewall configuration, automation rules.
              </div>
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              Practice Sessions
            </div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Your BrightOS Live System runs</div>
              <div className="mt-2 text-sm text-zinc-400">Recent sessions across CSEC missions and Malware Incident.</div>
            </div>

            <div className="max-h-[420px] overflow-auto">
              {sessions.length === 0 ? (
                <div className="p-6 text-sm text-zinc-400">No sessions yet. Launch a practical to start tracking.</div>
              ) : (
                sessions.slice(0, 20).map((s) => (
                  <div key={s.id} className="px-6 py-4 border-b border-white/5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">
                          {s.mode === 'csec' ? `CSEC • ${s.missionId}` : 'Malware Incident'}
                        </div>
                        <div className="mt-1 text-white font-black">
                          {s.status === 'completed' ? 'Completed' : s.status === 'abandoned' ? 'Abandoned' : 'In progress'}
                        </div>
                        <div className="mt-1 text-xs text-zinc-400">
                          Started {new Date(s.startedAt).toLocaleString()}
                          {s.endedAt ? ` • Ended ${new Date(s.endedAt).toLocaleString()}` : ''}
                        </div>
                        {typeof s.xpEarned === 'number' && (
                          <div className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">+{s.xpEarned} XP</div>
                        )}
                      </div>
                      <div className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">#{s.id.slice(-6)}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>

        <section className="mb-14">
          <div className="flex items-center gap-4 mb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              Business Literacy
            </div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid gap-8 lg:grid-cols-2">
            <Link
              href="/stories/business/register"
              className="group block rounded-[2rem] border border-white/10 bg-white/[0.03] hover:bg-white/[0.05] transition-all overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center justify-between gap-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Business & Financial Literacy</div>
                    <div className="mt-3 text-3xl font-black text-white group-hover:text-amber-200 transition-colors">
                      Register Your Business
                    </div>
                    <div className="mt-2 text-zinc-400 text-sm">
                      Start the legal entity process and unlock the operations dashboard.
                    </div>
                  </div>
                  <div className="shrink-0 w-14 h-14 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-2xl">
                    🏢
                  </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">
                    Start Registration →
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-amber-300/70" />
                    <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Onboarding</div>
                  </div>
                </div>
              </div>
            </Link>

            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Coming soon</div>
              <div className="mt-3 text-2xl font-black text-white">Customer Requests</div>
              <div className="mt-2 text-zinc-400 text-sm">
                Vague requirements, stakeholder conflicts, ethics, and consequences.
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="flex items-center gap-4 mb-6">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              Other Sections
            </div>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          <div className="grid gap-8 lg:grid-cols-3">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Coming soon</div>
              <div className="mt-3 text-2xl font-black text-white">Financial Literacy</div>
              <div className="mt-2 text-zinc-400 text-sm">Budgets, reports, delayed consequences, market shifts.</div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Coming soon</div>
              <div className="mt-3 text-2xl font-black text-white">Science Practicals</div>
              <div className="mt-2 text-zinc-400 text-sm">Labs where variables change state and outcomes are earned.</div>
            </div>
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-8">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Coming soon</div>
              <div className="mt-3 text-2xl font-black text-white">Career Simulations</div>
              <div className="mt-2 text-zinc-400 text-sm">Real roles, fewer hints, higher stakes.</div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
