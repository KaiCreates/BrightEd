'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import VanillaTilt from 'vanilla-tilt';
import { BrightHeading, BrightButton, BrightLayer } from '@/components/system';
import Image from 'next/image';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const tiltRef1 = useRef<HTMLDivElement>(null);
  const tiltRef2 = useRef<HTMLDivElement>(null);
  const missionTiltRef = useRef<HTMLDivElement>(null);

  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/home');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (tiltRef1.current) {
      VanillaTilt.init(tiltRef1.current, { max: 10, speed: 400, glare: true, 'max-glare': 0.2 });
    }
    if (tiltRef2.current) {
      VanillaTilt.init(tiltRef2.current, { max: 10, speed: 400, glare: true, 'max-glare': 0.2 });
    }
    if (missionTiltRef.current) {
      VanillaTilt.init(missionTiltRef.current, { max: 5, speed: 400, glare: true, 'max-glare': 0.1 });
    }
  }, []);

  const badges = [
    { id: 'streak', name: 'Streak King', icon: '🔥', description: 'Maintain a 30-day streak' },
    { id: 'million', name: 'First Million', icon: '💰', description: 'Reach $1M valuation' },
    { id: 'math', name: 'Math Wizard', icon: '📐', description: 'Master all Math units' },
  ];

  return (
    <div className="min-h-screen bg-[#0a0b1e] text-white overflow-x-hidden">

      {/* 1. HERO SECTION */}
      <section className="relative min-h-[90vh] flex flex-col items-center justify-center text-center px-4 overflow-hidden">
        {/* Modern Radial Gradient Background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_50%_50%,_#1e293b_0%,_#0a0b1e_100%)]" />

        {/* Pulsing Atmosphere / Radial Glow - Reduced opacity and simplified animation */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] bg-[radial-gradient(circle,_rgba(56,189,248,0.05)_0%,_transparent_60%)] animate-pulse pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="z-10 max-w-5xl"
        >
          <div className="mb-6 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-[var(--brand-primary)]/30 backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <span className="text-cyan-400 font-bold tracking-wider text-[10px] uppercase">New: Revolutionizing CSEC & CAPE Prep</span>
          </div>

          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black mb-6 tracking-tighter leading-[0.9] uppercase italic">
            Master the Market.<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 animate-gradient-x">
              Ace the Exam.
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto font-medium leading-relaxed">
            The first adaptive learning ecosystem built <span className="text-white border-b-2 border-cyan-500/50">by Caribbean students, for Caribbean students.</span> Revolutionizing prep through adaptive tech and gamified economics.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-12">
            <Link href="/signup">
              <BrightButton variant="primary" size="lg" className="min-w-[220px] py-6 text-lg font-black uppercase tracking-tighter italic shadow-[0_0_20px_rgba(34,211,238,0.3)]">
                Start Your Journey
              </BrightButton>
            </Link>
            <Link href="/login">
              <BrightButton variant="outline" size="lg" className="min-w-[220px] py-6 text-lg font-black uppercase tracking-tighter italic backdrop-blur-sm border-white/20 hover:border-white/40">
                Login
              </BrightButton>
            </Link>
          </div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1, duration: 1 }}
            className="text-cyan-400/60 font-serif italic text-lg tracking-wide select-none"
          >
            &quot;Our Future is in the Bookbags of children.&quot;
          </motion.p>
        </motion.div>
      </section>

      {/* 2. THE MISSION SECTION */}
      <section className="py-20 md:py-32 px-4 md:px-8 relative z-10 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 md:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div ref={missionTiltRef} className="relative rounded-[32px] md:rounded-[40px] overflow-hidden border border-white/10 shadow-2xl shadow-cyan-500/10">
              <Image
                src="/assets/mission-graphic.png"
                alt="BrightEd Mission"
                width={800}
                height={800}
                className="w-full h-auto"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b1e] via-transparent to-transparent opacity-60" />
            </div>
            {/* High-tech overlays */}
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-cyan-500/20 blur-[80px] rounded-full animate-pulse" />
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/20 blur-[100px] rounded-full animate-pulse" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter leading-tight">
                Built by Students, <br />
                <span className="text-cyan-400">for Students.</span>
              </h2>
              <div className="h-1.5 w-20 bg-gradient-to-r from-cyan-400 to-transparent rounded-full" />
            </div>

            <div className="space-y-6 text-gray-300 text-lg leading-relaxed font-medium">
              <p>
                Founded by <span className="text-white font-bold">Kylon Thomas</span> and <span className="text-white font-bold">Malachi Senhouse</span>, BrightEd started with a simple realization: the traditional education system wasn&apos;t evolving fast enough for the digital age.
              </p>
              <p>
                We are two students on a mission to revolutionize Caribbean education. By understanding the unique challenges of the CSEC and CAPE learning paths, we&apos;ve built a system that turns passive reading into active mastery.
              </p>
              <p>
                We spent months identifying the &quot;sticking points&quot; in the Caribbean syllabus, building an AI-driven path that makes complex subjects like POB and Accounts intuitive and impossible to forget.
              </p>
            </div>

            <div className="pt-4 flex gap-8 border-t border-white/5">
              <div>
                <p className="text-cyan-400 font-black text-2xl tracking-tighter">1st</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Adaptive Hub</p>
              </div>
              <div>
                <p className="text-purple-400 font-black text-2xl tracking-tighter">2,000+</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Syllabus Points</p>
              </div>
              <div>
                <p className="text-white font-black text-2xl tracking-tighter">Real-Time</p>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-widest leading-none">Market Sim</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 3. THE ECOSYSTEM SECTION */}
      <section className="py-32 px-4 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 md:mb-20 space-y-4">
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter uppercase italic">The BrightEd Ecosystem</h2>
            <p className="text-gray-400 text-base md:text-lg max-w-2xl mx-auto font-medium">A unified platform where learning and enterprise collide.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 md:gap-6">
            {/* NABLE AI */}
            <BrightLayer variant="glass" padding="lg" className="border-white/5 hover:border-cyan-400/40 transition-all duration-300 group flex flex-col items-center text-center col-span-1 lg:col-span-2">
              <div className="text-5xl mb-8 group-hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_0_8px_rgba(34,211,238,0.3)]">🧠</div>
              <h3 className="text-2xl font-black tracking-tight mb-4 uppercase">NABLE AI</h3>
              <p className="text-gray-400 font-medium leading-relaxed">
                Our intelligent algorithm understands your weak points before you do. It re-routes your path in real-time to ensure no student is left behind.
              </p>
            </BrightLayer>

            {/* Live Biz Sim */}
            <BrightLayer variant="glass" padding="lg" className="border-white/5 hover:border-purple-400/40 transition-all duration-300 group flex flex-col items-center text-center col-span-1">
              <div className="text-5xl mb-8 group-hover:scale-105 transition-transform duration-300 filter drop-shadow-[0_0_8px_rgba(192,132,252,0.3)]">📈</div>
              <h3 className="text-2xl font-black tracking-tight mb-4 uppercase">Live Sim</h3>
              <p className="text-gray-400 font-medium leading-relaxed">
                Don&apos;t just read about &quot;sole traders&quot;—become one. Register your business and manage real cash flow.
              </p>
            </BrightLayer>

            {/* Social Hub */}
            <BrightLayer variant="glass" padding="lg" className="border-white/5 hover:border-blue-400/40 transition-all group flex flex-col items-center text-center col-span-1">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform duration-500 filter drop-shadow-[0_0_10px_rgba(96,165,250,0.5)]">🌐</div>
              <h3 className="text-2xl font-black tracking-tight mb-4 uppercase">Social Hub</h3>
              <p className="text-gray-400 font-medium leading-relaxed">
                Collaborative lounges and DMs. The &quot;Campus Square&quot; where the brightest minds in the Caribbean meet.
              </p>
            </BrightLayer>

            {/* CXC Aligned */}
            <BrightLayer variant="glass" padding="lg" className="border-white/5 hover:border-yellow-400/40 transition-all group flex flex-col items-center text-center col-span-1">
              <div className="text-5xl mb-8 group-hover:scale-110 transition-transform duration-500 filter drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]">📜</div>
              <h3 className="text-2xl font-black tracking-tight mb-4 uppercase">Syllabus</h3>
              <p className="text-gray-400 font-medium leading-relaxed">
                Every question and story is mapped directly to the official CXC CSEC/CAPE syllabuses.
              </p>
            </BrightLayer>
          </div>
        </div>
      </section>

      {/* 4. THE LOCKER ROOM PREVIEW */}
      <section className="py-32 px-4 relative z-10 bg-white/[0.02]">
        <div className="max-w-5xl mx-auto text-center">
          <h3 className="text-4xl font-black tracking-tighter uppercase italic mb-16">Unlock Your Potential</h3>

          <div className="flex flex-wrap justify-center gap-12 lg:gap-24">
            {badges.map((badge) => (
              <div key={badge.id} className="group relative flex flex-col items-center">
                <div className="w-32 h-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-5xl grayscale group-hover:grayscale-0 group-hover:scale-110 group-hover:border-[var(--brand-primary)] group-hover:shadow-[0_0_30px_rgba(56,189,248,0.3)] transition-all duration-500 cursor-help">
                  {badge.icon}
                </div>
                <div className="mt-6 space-y-1">
                  <p className="font-black text-xs uppercase tracking-[0.2em] text-gray-500 group-hover:text-[var(--brand-primary)] transition-colors">{badge.name}</p>
                  <p className="text-[10px] font-bold text-gray-600 group-hover:text-gray-400 transition-colors opacity-0 group-hover:opacity-100">{badge.description}</p>
                </div>
                {/* Hover Indicator */}
                <div className="absolute -top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-[10px] font-black bg-[var(--brand-primary)] text-white px-2 py-0.5 rounded">LOCKED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 5. THE VISIONARIES (Refinement) */}
      <section className="py-40 px-4 text-center relative overflow-hidden bg-black/40">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_center,_rgba(56,189,248,0.03)_0%,_transparent_70%)]" />

        <div className="max-w-4xl mx-auto mb-20 text-center">
          <h2 className="text-5xl font-black italic tracking-tighter uppercase leading-none mb-4">Meet the Visionaries</h2>
          <p className="text-gray-500 font-bold uppercase tracking-[0.3em] text-xs">Architects of the Student Empire</p>
        </div>

        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 relative z-10 h-full">
          {/* Founder 1 - Kylon */}
          <div ref={tiltRef1} className="relative group perspective-1000">
            <div className="absolute -inset-0.5 bg-cyan-500 opacity-10 group-hover:opacity-30 rounded-[32px] md:rounded-[40px] blur-xl transition duration-1000 group-hover:duration-200"></div>
            <BrightLayer variant="glass" padding="lg" className="relative h-full border-white/5 group-hover:border-cyan-500/30 group-hover:golden-aura transition-all duration-500 backdrop-blur-2xl rounded-[32px] md:rounded-[40px]">
              {/* Founder Badge */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-black border border-cyan-500 rounded-full flex items-center justify-center text-xl shadow-lg z-20 group-hover:scale-110 transition-transform">
                👑
              </div>

              <div className="relative w-40 h-40 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-cyan-400 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-blue-700 to-cyan-500 rounded-2xl -rotate-3 group-hover:-rotate-6 transition-transform duration-500" />
                <div className="relative w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-5xl font-black text-white border border-white/10 overflow-hidden">
                  <span className="relative z-10">KT</span>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(34,211,238,0.2),transparent)]" />
                </div>
              </div>

              <h3 className="text-3xl font-black text-white mb-2 tracking-tighter group-hover:text-cyan-400 transition-colors">KYLON THOMAS</h3>
              <div className="inline-block px-4 py-1.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-cyan-500/20">
                Lead Visionary & Architect
              </div>
              <p className="text-lg text-gray-400 italic font-medium leading-relaxed">
                &quot;We&apos;re not just building an app, we&apos;re building a legacy of Caribbean intelligence.&quot;
              </p>
            </BrightLayer>
          </div>

          {/* Founder 2 - Malachi */}
          <div ref={tiltRef2} className="relative group perspective-1000">
            <div className="absolute -inset-0.5 bg-purple-500 opacity-10 group-hover:opacity-30 rounded-[32px] md:rounded-[40px] blur-xl transition duration-1000 group-hover:duration-200"></div>
            <BrightLayer variant="glass" padding="lg" className="relative h-full border-white/5 group-hover:border-purple-500/30 group-hover:golden-aura transition-all duration-500 backdrop-blur-2xl rounded-[32px] md:rounded-[40px]">
              {/* Founder Badge */}
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-black border border-purple-500 rounded-full flex items-center justify-center text-xl shadow-lg z-20 group-hover:scale-110 transition-transform">
                🦾
              </div>

              <div className="relative w-40 h-40 mx-auto mb-8">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-400 rounded-2xl rotate-6 group-hover:rotate-12 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-r from-purple-700 to-pink-500 rounded-2xl -rotate-3 group-hover:-rotate-6 transition-transform duration-500" />
                <div className="relative w-full h-full bg-slate-900 rounded-2xl flex items-center justify-center text-5xl font-black text-white border border-white/10 overflow-hidden">
                  <span className="relative z-10">MS</span>
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,_rgba(168,85,247,0.2),transparent)]" />
                </div>
              </div>

              <h3 className="text-3xl font-black text-white mb-2 tracking-tighter group-hover:text-purple-400 transition-colors">MALACHI SENHOUSE</h3>
              <div className="inline-block px-4 py-1.5 rounded-full bg-purple-500/10 text-purple-400 text-[10px] font-black uppercase tracking-[0.2em] mb-8 border border-purple-500/20">
                Co-Founder & Strategist
              </div>
              <p className="text-lg text-gray-400 italic font-medium leading-relaxed">
                &quot;Empowering the next generation to own the markets they study.&quot;
              </p>
            </BrightLayer>
          </div>
        </div>
      </section>

      {/* 6. FINAL CTA SECTION */}
      <section className="py-32 px-4 relative overflow-hidden bg-gradient-to-b from-black/0 to-[var(--bg-primary)]">
        <div className="max-w-4xl mx-auto text-center space-y-12">
          <h2 className="text-5xl md:text-7xl font-black tracking-tighter leading-none italic uppercase">
            The Market is <span className="text-cyan-400">Waiting.</span>
          </h2>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <Link href="/signup">
              <BrightButton variant="primary" size="lg" className="px-12 py-8 text-xl font-black italic shadow-[0_10px_40px_rgba(34,211,238,0.4)] hover:shadow-[0_20px_60px_rgba(34,211,238,0.6)] transition-all">
                JOIN THE EMPIRE
              </BrightButton>
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-16 border-t border-white/5 bg-black/80 relative z-10 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-500 to-purple-600 shadow-[0_0_30px_rgba(34,211,238,0.4)] flex items-center justify-center font-black text-2xl">B</div>
            <div className="text-left">
              <span className="font-black text-3xl tracking-tighter text-white block leading-none">BRIGHTED</span>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.3em]">Caribbean Evolution</span>
            </div>
          </div>
          <div className="flex gap-8 text-xs font-black uppercase tracking-widest text-gray-500">
            <Link href="#" className="hover:text-cyan-400 transition-colors">Privacy</Link>
            <Link href="#" className="hover:text-cyan-400 transition-colors">Terms</Link>
            <Link href="#" className="hover:text-cyan-400 transition-colors">Contact</Link>
          </div>
          <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest text-center md:text-right">
            &copy; 2026 BrightEd Caribbean. <br />
            <span className="text-cyan-500/50">Built with 💙 for the region.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
