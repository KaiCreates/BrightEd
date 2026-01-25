import Link from 'next/link';

export default function PracticalsPage() {
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
