'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { BrightButton, BrightLayer } from '@/components/system';

type BetaRole = 'Student' | 'Teacher' | 'Parent' | 'School';

export default function LandingV2() {
  const [betaForm, setBetaForm] = useState({
    fullName: '',
    email: '',
    role: 'Student' as BetaRole,
    subjects: '',
    motivation: '',
  });
  const [betaSubmitting, setBetaSubmitting] = useState(false);
  const [betaSubmitted, setBetaSubmitted] = useState(false);
  const [betaError, setBetaError] = useState<string | null>(null);

  const subjectsArray = useMemo(() => {
    return betaForm.subjects
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [betaForm.subjects]);

  const submitBeta = async () => {
    if (betaSubmitting || betaSubmitted) return;
    setBetaSubmitting(true);
    setBetaError(null);

    try {
      const res = await fetch('/api/beta/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: betaForm.fullName,
          email: betaForm.email,
          role: betaForm.role,
          subjects: subjectsArray,
          motivation: betaForm.motivation,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = typeof data?.error === 'string' ? data.error : 'Signup failed';
        setBetaError(msg);
        return;
      }

      setBetaSubmitted(true);
    } catch {
      setBetaError('Signup failed');
    } finally {
      setBetaSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white overflow-x-hidden">
      <section className="relative min-h-[calc(100vh-6rem)] flex items-center justify-center px-4 py-16 md:py-20">
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_40%,_#1e293b_0%,_#0a0b1e_70%)]" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_20%_10%,_rgba(34,211,238,0.12)_0%,_transparent_55%)]" />
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.12)_0%,_transparent_60%)]" />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-full max-w-6xl"
        >
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] font-black tracking-[0.25em] uppercase text-zinc-300">Caribbean-built • CXC-aligned</span>
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[0.95]">
              Learn by Doing.
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-300 to-purple-400">
                Lead Before Adulthood.
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg md:text-xl text-gray-300 max-w-3xl mx-auto font-medium leading-relaxed">
              BrightEd is a practical-first learning platform where students run businesses, fix systems, and master CSEC & CAPE subjects through real-world simulations.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center w-full">
              <a href="#beta" className="w-full sm:w-auto">
                <BrightButton variant="primary" size="lg" className="w-full sm:min-w-[220px] py-4 sm:py-6 text-lg font-black tracking-tight">
                  Join the Beta
                </BrightButton>
              </a>
              <a href="#product" className="w-full sm:w-auto">
                <BrightButton variant="outline" size="lg" className="w-full sm:min-w-[220px] py-4 sm:py-6 text-lg font-black border-white/20 hover:border-white/40">
                  Watch It in Action
                </BrightButton>
              </a>
            </div>
          </div>

          <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-6 items-end">
            <div className="hidden lg:block lg:col-span-3">
              <div className="rounded-[2.25rem] border border-white/10 bg-black/30 p-4 shadow-2xl">
                <div className="rounded-[1.75rem] overflow-hidden border border-white/10 bg-black">
                  <Image src="/screenshots/BrightOS%20DashBordHome.png" alt="Practicals preview" width={900} height={650} className="w-full h-auto opacity-90" />
                </div>
              </div>
            </div>

            <div className="lg:col-span-6">
              <div className="rounded-[2.5rem] border border-white/10 bg-black/30 p-5 shadow-2xl">
                <div className="rounded-[1.75rem] overflow-hidden border border-white/10 bg-black">
                  <Image src="/screenshots/BrightOS%20Learning%20Path.png" alt="BrightEd dashboard preview" width={1400} height={900} className="w-full h-auto opacity-90" />
                </div>
              </div>
            </div>

            <div className="hidden lg:block lg:col-span-3">
              <div className="rounded-[2.25rem] border border-white/10 bg-black/30 p-4 shadow-2xl">
                <div className="rounded-[1.75rem] overflow-hidden border border-white/10 bg-black">
                  <Image src="/screenshots/ProfileSystem.png" alt="Business dashboard preview" width={700} height={900} className="w-full h-auto opacity-90" />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-wrap justify-center gap-6 text-xs font-black uppercase tracking-[0.25em] text-zinc-500">
            <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5">Business Practical</div>
            <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5">Technology Practicals</div>
            <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5">Adaptive Learning Paths</div>
            <div className="px-4 py-2 rounded-full border border-white/10 bg-white/5">CXC-aligned Content</div>
          </div>
        </motion.div>
      </section>

      <section id="product" className="scroll-mt-28 py-24 md:py-32 px-4 md:px-8 relative z-10 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-3xl">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Product in Action</div>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">One Platform. Any Device. Real Learning Everywhere.</h2>
            <p className="mt-4 text-gray-300 text-lg leading-relaxed font-medium">
              BrightEd adapts seamlessly across desktop, tablet, and mobile—whether you’re managing a business, solving a practical, or reviewing progress.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: 'BrightOS Practical', img: '/screenshots/BrightOS%20DashBordHome.png' },
              { title: 'Learning Dashboard', img: '/screenshots/BrightOS%20Learning%20Path.png' },
              { title: 'Business Operations', img: '/screenshots/ProfileSystem.png' },
            ].map((card) => (
              <BrightLayer key={card.title} variant="glass" padding="lg" className="border-white/10">
                <div className="text-xs font-black uppercase tracking-[0.25em] text-zinc-400">{card.title}</div>
                <div className="mt-4 rounded-2xl overflow-hidden border border-white/10 bg-black">
                  <Image src={card.img} alt={card.title} width={1200} height={800} className="w-full h-auto opacity-90" />
                </div>
              </BrightLayer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 relative z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Why BrightEd Works</div>
            <h2 className="mt-4 text-4xl md:text-5xl font-black tracking-tight">Practical skill, measured mastery</h2>
            <p className="mt-4 text-gray-300 text-lg leading-relaxed font-medium">
              Students don’t just memorize. They practice decisions, consequences, and responsibility—before real-world stakes.
            </p>
          </div>

          <div className="lg:col-span-7 grid gap-4">
            {[
              {
                t: 'Practice Before Pressure',
                d: 'BrightEd prepares students for real responsibility early—when it is safe. They build confidence through scenarios that feel like real life.',
              },
              {
                t: 'Built for the Caribbean',
                d: 'Designed around CXC/CAPE syllabuses and regional realities. Students learn with context that matches their world.',
              },
              {
                t: 'Adaptive, not one-size-fits-all',
                d: 'BrightEd adjusts difficulty and direction based on performance and understanding—not just speed.',
              },
            ].map((x) => (
              <BrightLayer key={x.t} variant="glass" padding="lg" className="border-white/10">
                <div className="text-lg font-black text-white">{x.t}</div>
                <div className="mt-2 text-gray-300 font-medium leading-relaxed">{x.d}</div>
              </BrightLayer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 relative z-10 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-10">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">The Ecosystem</div>
            <h3 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">A complete learning environment</h3>
            <p className="mt-3 text-gray-300 font-medium max-w-3xl mx-auto">
              Curriculum, simulation, feedback, and progression—designed to work together.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {[
              {
                k: 'Adaptive Intelligence',
                d: 'Identifies learning gaps and adjusts a student’s path to ensure mastery of core objectives.',
              },
              {
                k: 'Business & Market Simulations',
                d: 'Learn cash flow, scaling, and strategy through a realistic business simulation tied to curriculum outcomes.',
              },
              {
                k: 'Technology Practicals (BrightOS)',
                d: 'A virtual OS where students diagnose issues, fix errors, and build IT competency without breaking real machines.',
              },
              {
                k: 'CXC-aligned Content',
                d: 'Mapped to CSEC and CAPE objectives, with practical tasks and assessment-style reinforcement.',
              },
            ].map((p) => (
              <BrightLayer key={p.k} variant="glass" padding="lg" className="border-white/10">
                <div className="text-xl font-black text-white">{p.k}</div>
                <div className="mt-3 text-gray-300 font-medium leading-relaxed">{p.d}</div>
              </BrightLayer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 relative z-10">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-12 gap-10 items-start">
          <div className="lg:col-span-5">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Practicals Preview</div>
            <h3 className="mt-4 text-4xl font-black tracking-tight">Practicals, not lessons</h3>
            <p className="mt-4 text-gray-300 text-lg leading-relaxed font-medium">
              Students don’t click “Next”. They solve real problems.
            </p>

            <div className="mt-8 grid gap-4">
              <BrightLayer variant="glass" padding="lg" className="border-white/10">
                <div className="text-lg font-black text-white">Business Practical</div>
                <div className="mt-2 text-gray-300 font-medium leading-relaxed">
                  Register a business, hire staff, manage money, and handle growth challenges.
                </div>
              </BrightLayer>
              <BrightLayer variant="glass" padding="lg" className="border-white/10">
                <div className="text-lg font-black text-white">Technology Practical</div>
                <div className="mt-2 text-gray-300 font-medium leading-relaxed">
                  Fix systems inside BrightOS: malware, failures, security issues, and automation logic.
                </div>
              </BrightLayer>
            </div>
          </div>

          <div id="beta" className="lg:col-span-7 scroll-mt-28">
            <BrightLayer variant="glass" padding="lg" className="border-white/10">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Join the BrightEd Beta</div>
              <h3 className="mt-4 text-3xl font-black tracking-tight">Early access</h3>
              <p className="mt-3 text-gray-300 font-medium leading-relaxed">
                We’re opening early access to students, teachers, parents, and schools who want to shape the future of Caribbean education.
              </p>

              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                  value={betaForm.fullName}
                  onChange={(e) => setBetaForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="Full Name"
                  className="h-12 px-4 rounded-xl border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--brand-primary)]/60"
                />
                <input
                  value={betaForm.email}
                  onChange={(e) => setBetaForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="Email"
                  className="h-12 px-4 rounded-xl border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--brand-primary)]/60"
                />

                <select
                  value={betaForm.role}
                  onChange={(e) => setBetaForm((p) => ({ ...p, role: e.target.value as BetaRole }))}
                  className="h-12 px-4 rounded-xl border border-white/10 bg-black/30 text-white outline-none focus:border-[var(--brand-primary)]/60"
                >
                  {(['Student', 'Teacher', 'Parent', 'School'] as BetaRole[]).map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>

                <input
                  value={betaForm.subjects}
                  onChange={(e) => setBetaForm((p) => ({ ...p, subjects: e.target.value }))}
                  placeholder="Subjects of Interest (comma-separated)"
                  className="h-12 px-4 rounded-xl border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--brand-primary)]/60"
                />
              </div>

              <textarea
                value={betaForm.motivation}
                onChange={(e) => setBetaForm((p) => ({ ...p, motivation: e.target.value }))}
                placeholder="Why do you want to join the beta?"
                className="mt-4 w-full min-h-[120px] px-4 py-3 rounded-xl border border-white/10 bg-black/30 text-white placeholder:text-zinc-500 outline-none focus:border-[var(--brand-primary)]/60"
              />

              {betaError && (
                <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
                  {betaError}
                </div>
              )}

              {betaSubmitted ? (
                <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm font-bold text-emerald-200">
                  Application received. We’ll contact you when your beta access is ready.
                </div>
              ) : (
                <div className="mt-6 flex flex-col sm:flex-row gap-4 sm:items-center">
                  <BrightButton
                    variant="primary"
                    size="lg"
                    onClick={submitBeta}
                    className="py-6 text-lg font-black"
                    disabled={betaSubmitting}
                  >
                    {betaSubmitting ? 'Submitting…' : 'Join the Beta'}
                  </BrightButton>
                  <div className="text-xs font-bold text-zinc-500 leading-relaxed">
                    By applying, you agree to be contacted about beta access and feedback sessions.
                  </div>
                </div>
              )}
            </BrightLayer>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 relative z-10 bg-black/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Achievements</div>
            <h3 className="mt-4 text-3xl md:text-4xl font-black tracking-tight">Progress that feels real</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
            {[
              { name: 'Consistency', icon: '🔥', description: 'Build habits through streaks and measured mastery.' },
              { name: 'Competency', icon: '🧠', description: 'Strengthen weak areas with adaptive, targeted practice.' },
              { name: 'Confidence', icon: '🏆', description: 'Earn achievements that reflect real progress and responsibility.' },
            ].map((b) => (
              <BrightLayer key={b.name} variant="glass" padding="lg" className="border-white/10 text-center">
                <div className="text-4xl">{b.icon}</div>
                <div className="mt-5 text-lg font-black">{b.name}</div>
                <div className="mt-2 text-gray-300 font-medium leading-relaxed">{b.description}</div>
              </BrightLayer>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 px-4 text-center relative overflow-hidden bg-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto mb-12">
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500">Meet the Visionaries</div>
            <h3 className="mt-4 text-4xl font-black tracking-tight">Built by students</h3>
            <p className="mt-3 text-gray-300 font-medium leading-relaxed">
              BrightEd started with a simple decision: build a platform that matches Caribbean reality and raises student standards.
            </p>
          </div>

          <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
            <BrightLayer variant="glass" padding="lg" className="border-white/10 text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-cyan-300">Founder</div>
              <div className="mt-4 text-2xl font-black">Kylon Thomas</div>
              <div className="mt-3 text-gray-300 font-medium leading-relaxed">
                “We’re not just building an app. We’re building a culture of mastery, discipline, and Caribbean confidence.”
              </div>
            </BrightLayer>

            <BrightLayer variant="glass" padding="lg" className="border-white/10 text-left">
              <div className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-300">Co-Founder</div>
              <div className="mt-4 text-2xl font-black">Malachi Senhouse</div>
              <div className="mt-3 text-gray-300 font-medium leading-relaxed">
                “Students deserve learning that feels like life. BrightEd makes practice real, structured, and measurable.”
              </div>
            </BrightLayer>
          </div>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup">
              <BrightButton variant="primary" size="lg" className="px-12 py-8 text-xl font-black">
                Create an Account
              </BrightButton>
            </Link>
            <Link href="/login">
              <BrightButton variant="outline" size="lg" className="px-12 py-8 text-xl font-black border-white/20 hover:border-white/40">
                Log In
              </BrightButton>
            </Link>
          </div>
        </div>
      </section>

      <footer className="py-16 border-t border-white/5 bg-black/80 relative z-10 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-[0_0_30px_rgba(34,211,238,0.25)] flex items-center justify-center font-black text-2xl">B</div>
            <div className="text-left">
              <span className="font-black text-3xl tracking-tighter text-white block leading-none">BRIGHTED</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Caribbean Practical Learning</span>
            </div>
          </div>

          <div className="flex gap-8 text-xs font-black uppercase tracking-widest text-gray-500">
            <Link href="#" className="hover:text-cyan-300 transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-cyan-300 transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-cyan-300 transition-colors">
              Contact
            </Link>
          </div>

          <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center md:text-right">
            © 2026 BrightEd Caribbean.
          </div>
        </div>
      </footer>
    </div>
  );
}
