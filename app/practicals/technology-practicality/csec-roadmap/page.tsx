'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { CSEC_ROADMAP_MISSIONS } from '@/lib/brightos/csec-roadmap-missions';
import { getMissionCompletion } from '@/lib/brightos/mission-progress';

export default function CsecRoadmapMissionsPage() {
  const [selectedId, setSelectedId] = useState<string>(CSEC_ROADMAP_MISSIONS[0]?.id || '');

  const selected = useMemo(() => {
    return CSEC_ROADMAP_MISSIONS.find((m) => m.id === selectedId) || null;
  }, [selectedId]);

  return (
    <div className="min-h-screen min-h-[100dvh] bg-[#050B14] relative overflow-hidden safe-padding pb-32">
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[var(--brand-primary)]/12 via-transparent to-[#050B14]" />
      <div className="fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_20%,rgba(45,212,191,0.10),transparent_55%),radial-gradient(circle_at_70%_30%,rgba(56,189,248,0.08),transparent_60%)]" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 md:px-6 py-8 pt-20 md:pt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <Link
            href="/practicals"
            className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400 hover:text-white transition-colors"
          >
            ← Back to Practicals
          </Link>
          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">BrightOS / Technology Practicality</div>
        </div>

        <div className="mb-8 md:mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-white/5 backdrop-blur-md">
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-[var(--brand-primary)]">CSEC Roadmap</span>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-400">50 Missions</span>
          </div>
          <h1 className="mt-6 text-3xl md:text-5xl font-black text-white tracking-tight leading-none heading-responsive">
            BrightOS CSEC Roadmap
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] via-teal-400 to-emerald-400">
              Practical Mission Library
            </span>
          </h1>
          <p className="mt-4 text-zinc-400 max-w-3xl text-sm md:text-base">
            Select a mission and launch the full BrightOS live system. Wallpapers are randomized from your
            <span className="text-zinc-200 font-semibold"> BrightOS Wallpapers</span> folder.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[420px_1fr] grid-responsive">
          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-6 border-b border-white/10">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Mission List</div>
              <div className="mt-2 text-sm text-zinc-400">Click a mission to launch the live system.</div>
            </div>

            <div className="max-h-[70vh] overflow-auto">
              {CSEC_ROADMAP_MISSIONS.map((m) => (
                (() => {
                  const completion = getMissionCompletion(`brightos:csec:${m.id}`);
                  const completed = Boolean(completion);
                  return (
                    <button
                      key={m.id}
                      onClick={() => setSelectedId(m.id)}
                      className={`w-full text-left px-6 py-4 border-b border-white/5 transition-colors ${selectedId === m.id ? 'bg-white/[0.05]' : ''
                        } ${completed ? 'opacity-60 hover:opacity-80' : 'hover:bg-white/[0.04]'}`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">{m.id}</div>
                          <div className="mt-1 text-white font-black">{m.title}</div>
                          <div className="mt-1 text-xs text-zinc-400">Rank {m.rank} • {m.csec_alignment.section}</div>
                          {completed && (
                            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-300">
                              Completed • +{completion?.xpEarned ?? 0} XP
                            </div>
                          )}
                        </div>
                        <div className="shrink-0 text-[10px] font-black uppercase tracking-[0.25em] text-[var(--brand-primary)]">
                          Launch →
                        </div>
                      </div>
                    </button>
                  );
                })()
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/10 bg-white/[0.03] overflow-hidden">
            <div className="p-6 border-b border-white/10 flex items-start justify-between gap-6">
              <div>
                <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Selected Mission</div>
                <div className="mt-1 text-2xl font-black text-white">{selected ? selected.title : 'None'}</div>
                {selected && (
                  <div className="mt-2 text-sm text-zinc-400">
                    <span className="text-zinc-200 font-semibold">{selected.id}</span> • Rank {selected.rank} • {selected.csec_alignment.concept}
                  </div>
                )}
                {selected && (() => {
                  const completion = getMissionCompletion(`brightos:csec:${selected.id}`);
                  if (!completion) return null;
                  return (
                    <div className="mt-3 inline-flex items-center gap-2 px-3 py-2 rounded-2xl border border-white/10 bg-black/30">
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-400">Completed</div>
                      <div className="text-[10px] font-black uppercase tracking-[0.25em] text-emerald-300">+{completion.xpEarned} XP</div>
                    </div>
                  );
                })()}
              </div>

              {selected && (
                <div className="shrink-0 flex items-center gap-2">
                  <Link
                    href={`/practicals/technology-practicality/csec/${selected.id}`}
                    className="h-11 px-5 rounded-2xl border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/15 hover:bg-[var(--brand-primary)]/25 transition-colors text-[10px] font-black uppercase tracking-[0.25em] text-white inline-flex items-center"
                  >
                    Run Mission
                  </Link>
                </div>
              )}
            </div>

            <div className="p-6">
              {selected ? (
                <div className="rounded-2xl border border-white/10 bg-black/30 p-5">
                  <div className="text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Client</div>
                  <div className="mt-2 text-sm text-zinc-200">{selected.client.dialogue_start}</div>

                  <div className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Tools Allowed</div>
                  <div className="mt-2 text-sm text-zinc-200">{selected.tools_allowed.join(', ')}</div>

                  <div className="mt-5 text-[10px] font-black uppercase tracking-[0.25em] text-zinc-500">Run</div>
                  <div className="mt-2 text-sm text-zinc-400">
                    Free-play: use the allowed tools to fix the issue and trigger the mission success check.
                  </div>
                </div>
              ) : (
                <div className="text-zinc-400">Select a mission from the left.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
