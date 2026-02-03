'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function LandingDuolingo() {
    const { user } = useAuth();

    // Custom "Chunky" Button Styles to match reference
    const primaryBtnClass = "bg-[var(--brand-secondary)] hover:bg-[#4f46e5] text-white border-b-4 border-[#4338ca] active:border-b-0 active:translate-y-1 font-extrabold tracking-widest uppercase rounded-2xl px-10 py-4 text-base transition-all w-full sm:w-auto text-center cursor-pointer";
    const secondaryBtnClass = "bg-[var(--bg-elevated)] hover:bg-[var(--bg-secondary)] text-[var(--brand-secondary)] border-2 border-[var(--border-subtle)] border-b-4 active:border-b-2 active:translate-y-[2px] font-extrabold tracking-widest uppercase rounded-2xl px-10 py-4 text-base transition-all w-full sm:w-auto text-center cursor-pointer";

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] font-sans selection:bg-[var(--brand-secondary)] selection:text-white overflow-x-hidden transition-colors duration-300">

            {/* 1. Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--bg-primary)]/90 backdrop-blur-md border-b-[2px] border-[var(--border-subtle)] h-[70px] flex items-center justify-center px-4 transition-all">
                <div className="w-full max-w-[980px] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 relative transition-transform group-hover:scale-110">
                            {/* Using owl-happy as a small logo substitute or the actual logo if preferred, 
                        but reference uses mascot head. Let's use the static image if available or sprite. 
                        Using sprite for consistency. */}
                            <div className="owl-sprite owl-happy" style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '150px', height: '150px', position: 'absolute', top: 0, left: 0, paddingLeft: '92px', paddingRight: '92px', paddingTop: 0, paddingBottom: 0, marginLeft: '25px', marginRight: '25px', marginTop: 0, marginBottom: 0 }} />
                        </div>
                        <span className="font-heading font-extrabold text-3xl text-[var(--brand-secondary)] tracking-tighter ml-8">BrightEd</span>
                    </Link>

                    <div className="hidden sm:block text-xs font-bold text-slate-400 uppercase tracking-widest hover:text-slate-600 cursor-pointer transition-colors">
                        Site Language: English
                    </div>
                </div>
            </header>

            {/* 2. Hero Section */}
            <section className="pt-[140px] pb-24 md:pt-[180px] md:pb-32 px-4 flex items-center justify-center bg-[url('/grid-pattern.svg')]">
                <div className="w-full max-w-[980px] flex flex-col lg:flex-row items-center gap-12 lg:gap-24">

                    {/* Hero Visual - Central Mascot */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.5 }}
                        className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px] flex-shrink-0"
                    >
                        <div className="absolute inset-0 bg-[var(--brand-secondary)]/10 rounded-full blur-[60px] animate-pulse-slow" />
                        {/* Large Sprite Display */}
                        <div className="owl-sprite owl-happy w-full h-full text-center align-middle" style={{ transform: 'scale(2.5)', transformOrigin: 'center center', paddingTop: '78px', paddingBottom: '78px', width: '148px', marginTop: '147px', marginBottom: '147px', marginLeft: '142px', marginRight: '142px' }} />
                    </motion.div>

                    {/* Hero Content */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-[var(--text-primary)] leading-tight mb-8">
                            The free, fun, and effective way to ace <span className="text-[var(--brand-secondary)]">CSEC & CAPE</span>.
                        </h1>

                        <div className="flex flex-col gap-4 w-full sm:max-w-xs">
                            <Link href="/welcome" className={primaryBtnClass}>
                                Get Started
                            </Link>
                            <Link href="/login" className={secondaryBtnClass}>
                                I Already Have An Account
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* 3. Feature Sections (Alternating) */}

            {/* Feature 1: Free. Fun. Effective. */}
            <section className="py-24 border-t-2 border-[var(--border-subtle)]">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1">
                        <motion.div
                            whileInView={{ rotate: [0, -5, 5, 0] }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="flex justify-center"
                        >
                            <div className="owl-sprite owl-smart" style={{ transform: 'scale(1.8)' }} />
                        </motion.div>
                    </div>
                    <div className="order-1 md:order-2 text-center md:text-left">
                        <h2 className="text-[var(--brand-secondary)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            free. fun. effective.
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)] font-medium leading-relaxed">
                            Learning with BrightEd is fun, and <span className="text-[var(--brand-secondary)] font-bold cursor-pointer underline decoration-2 underline-offset-4">research shows that it works</span>! With quick, bite-sized simulations, you&apos;ll earn points and unlock new levels while gaining real-world skills.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature 2: Backed by Science */}
            <section className="py-24 border-t-2 border-[var(--border-subtle)]">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 text-center md:text-left">
                        <h2 className="text-[var(--brand-secondary)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            backed by science.
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)] font-medium leading-relaxed">
                            We use a combination of research-backed teaching methods and delightful content to create courses that effectively teach reading, writing, listening, and speaking skills!
                        </p>
                    </div>
                    <div className="order-2">
                        <motion.div
                            whileInView={{ y: [0, -10, 0] }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                            className="flex justify-center"
                        >
                            <div className="owl-sprite owl-reading" style={{ transform: 'scale(1.8)' }} />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Feature 3: Stay Motivated */}
            <section className="py-24 border-t-2 border-[var(--border-subtle)]">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-2 md:order-1">
                        <motion.div
                            whileInView={{ scale: [1, 1.1, 1] }}
                            viewport={{ once: true }}
                            transition={{ duration: 0.4 }}
                            className="flex justify-center"
                        >
                            <div className="owl-sprite owl-shocked" style={{ transform: 'scale(1.8)' }} />
                        </motion.div>
                    </div>
                    <div className="order-1 md:order-2 text-center md:text-left">
                        <h2 className="text-[var(--state-warning)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            stay motivated.
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)] font-medium leading-relaxed">
                            We make it easy to form a habit of learning with game-like features, fun challenges, and reminders from our friendly mascot, Professor Bright.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature 4: Personalized Learning */}
            <section className="py-24 border-t-2 border-[var(--border-subtle)]">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 text-center md:text-left">
                        <h2 className="text-[var(--brand-secondary)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            personalized learning.
                        </h2>
                        <p className="text-lg text-[var(--text-secondary)] font-medium leading-relaxed">
                            Combining the best of AI and business science, lessons are tailored to help you learn at just the right level and pace.
                        </p>
                    </div>
                    <div className="order-2">
                        <motion.div
                            whileInView={{ x: [-5, 5, -5] }}
                            viewport={{ once: true }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="flex justify-center"
                        >
                            <div className="owl-sprite owl-studying" style={{ transform: 'scale(1.8)' }} />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* 4. Learn Anytime Section - Floating 3D style */}
            <section className="relative py-32 overflow-hidden border-t-2 border-[var(--border-subtle)] flex justify-center items-center text-center px-4 min-h-[520px] md:min-h-[580px]" style={{ background: 'linear-gradient(165deg, #E0F2FE 0%, #BAE6FD 35%, #F0F9FF 100%)' }}>
                {/* Floating decorative elements - CSEC/CAPE themed */}
                <div className="absolute inset-0 pointer-events-none" aria-hidden>
                    {/* Floating study cards (device-like) */}
                    <motion.div className="absolute w-14 h-24 md:w-16 md:h-28 rounded-xl border-2 border-slate-300/80 shadow-lg bg-white/90 flex items-center justify-center" style={{ top: '12%', left: '8%', transform: 'rotate(-12deg) perspective(400px) rotateY(-8deg)' }} animate={{ y: [0, -14, 0], rotate: [-12, -8, -12] }} transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}>
                        <span className="text-[var(--brand-secondary)] font-bold text-lg">M</span>
                    </motion.div>
                    <motion.div className="absolute w-14 h-24 md:w-16 md:h-28 rounded-xl border-2 border-slate-300/80 shadow-lg bg-white/90 flex items-center justify-center" style={{ top: '55%', left: '5%', transform: 'rotate(6deg) perspective(400px) rotateY(10deg)' }} animate={{ y: [0, 12, 0], rotate: [6, 10, 6] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}><span className="text-amber-600 font-bold text-lg">★</span></motion.div>
                    <motion.div className="absolute w-14 h-24 md:w-16 md:h-28 rounded-xl border-2 border-slate-300/80 shadow-lg bg-white/90 flex items-center justify-center" style={{ top: '18%', right: '10%', transform: 'rotate(10deg) perspective(400px) rotateY(6deg)' }} animate={{ y: [0, -10, 0], rotate: [10, 14, 10] }} transition={{ duration: 5.2, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}><span className="text-emerald-600 font-bold text-sm">Bio</span></motion.div>
                    <motion.div className="absolute w-14 h-24 md:w-16 md:h-28 rounded-xl border-2 border-slate-300/80 shadow-lg bg-white/90 flex items-center justify-center" style={{ top: '62%', right: '7%', transform: 'rotate(-8deg) perspective(400px) rotateY(-6deg)' }} animate={{ y: [0, 8, 0], rotate: [-8, -4, -8] }} transition={{ duration: 4.8, repeat: Infinity, ease: 'easeInOut', delay: 0.8 }}><span className="text-rose-500 font-bold text-sm">Chem</span></motion.div>
                    <motion.div className="absolute w-12 h-20 rounded-lg border-2 border-slate-300/70 shadow-md bg-white/80 flex items-center justify-center" style={{ bottom: '22%', left: '18%', transform: 'rotate(-5deg)' }} animate={{ y: [0, -8, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut', delay: 1 }}><span className="text-[var(--brand-secondary)] font-extrabold text-xs">π</span></motion.div>
                    <motion.div className="absolute w-12 h-20 rounded-lg border-2 border-slate-300/70 shadow-md bg-white/80 flex items-center justify-center" style={{ bottom: '28%', right: '20%', transform: 'rotate(5deg)' }} animate={{ y: [0, 10, 0] }} transition={{ duration: 4.3, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }}><span className="text-amber-500 font-bold text-sm">🔥</span></motion.div>
                    {/* 3D-style cubes */}
                    <motion.div className="absolute w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-md" style={{ top: '25%', left: '22%', background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)', transform: 'rotate(15deg) rotateX(10deg)' }} animate={{ y: [0, -12, 0], rotate: [15, 20, 15] }} transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }} />
                    <motion.div className="absolute w-8 h-8 md:w-10 md:h-10 rounded-lg shadow-md" style={{ top: '70%', right: '25%', background: 'linear-gradient(135deg, #F59E0B 0%, #FBBF24 100%)', transform: 'rotate(-20deg)' }} animate={{ y: [0, 8, 0], rotate: [-20, -14, -20] }} transition={{ duration: 4.2, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }} />
                    <motion.div className="absolute w-8 h-8 rounded-lg shadow-md" style={{ top: '8%', right: '28%', background: 'linear-gradient(135deg, #10B981 0%, #34D399 100%)', transform: 'rotate(25deg)' }} animate={{ y: [0, -6, 0], rotate: [25, 30, 25] }} transition={{ duration: 4.7, repeat: Infinity, ease: 'easeInOut' }} />
                    <motion.div className="absolute w-7 h-7 rounded-md shadow" style={{ bottom: '35%', left: '28%', background: 'linear-gradient(135deg, #EC4899 0%, #F472B6 100%)', transform: 'rotate(-15deg)' }} animate={{ y: [0, -5, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: 0.7 }} />
                    <motion.div className="absolute w-7 h-7 rounded-md shadow" style={{ bottom: '18%', right: '32%', background: 'linear-gradient(135deg, #6366F1 0%, #A5B4FC 100%)', transform: 'rotate(18deg)' }} animate={{ y: [0, 6, 0] }} transition={{ duration: 4.4, repeat: Infinity, ease: 'easeInOut', delay: 0.25 }} />
                    {/* Diamond shapes (rotated squares) */}
                    <motion.div className="absolute w-6 h-6 md:w-8 md:h-8 bg-[var(--brand-secondary)]/80 shadow-sm" style={{ top: '40%', left: '12%', transform: 'rotate(45deg)' }} animate={{ y: [0, -9, 0], scale: [1, 1.05, 1] }} transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }} />
                    <motion.div className="absolute w-5 h-5 md:w-6 md:h-6 bg-amber-400/90 shadow-sm" style={{ top: '75%', right: '15%', transform: 'rotate(45deg)' }} animate={{ y: [0, 7, 0] }} transition={{ duration: 3.9, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }} />
                    <motion.div className="absolute w-5 h-5 bg-emerald-400/90 shadow-sm" style={{ top: '15%', left: '30%', transform: 'rotate(45deg)' }} animate={{ y: [0, -7, 0] }} transition={{ duration: 4.1, repeat: Infinity, ease: 'easeInOut', delay: 0.35 }} />
                    {/* Subject badges */}
                    <motion.div className="absolute px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200/90 shadow-md font-bold text-[10px] md:text-xs text-[var(--brand-secondary)] uppercase tracking-wide" style={{ top: '48%', left: '6%', transform: 'rotate(-6deg)' }} animate={{ y: [0, -6, 0] }} transition={{ duration: 4.6, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}>CSEC</motion.div>
                    <motion.div className="absolute px-2.5 py-1 rounded-lg bg-white/95 border border-slate-200/90 shadow-md font-bold text-[10px] md:text-xs text-[var(--brand-secondary)] uppercase tracking-wide" style={{ bottom: '38%', right: '6%', transform: 'rotate(4deg)' }} animate={{ y: [0, 6, 0] }} transition={{ duration: 4.3, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}>CAPE</motion.div>
                </div>

                <div className="relative z-10 max-w-4xl">
                    <h2 className="text-navy-soft font-heading font-extrabold text-4xl sm:text-5xl md:text-6xl mb-12 drop-shadow-sm">
                        learn anytime, <span className="block mt-1 md:mt-2">anywhere.</span>
                    </h2>

                    <div className="flex justify-center items-center">
                        <Link href="/welcome" className={primaryBtnClass}>
                            Get Started Today!
                        </Link>
                    </div>
                </div>
            </section>

            {/* 5. Footer */}
            <footer className="bg-[var(--brand-secondary)] text-white py-20 px-4">
                <div className="max-w-[980px] mx-auto text-center">
                    <div className="flex justify-center mb-8">
                        <Image src="/BrightEdLogo.png" alt="BrightEd" width={396} height={313} className="w-[396px] h-[313px] object-contain" priority />
                    </div>
                    <div className="flex flex-wrap justify-center gap-6 md:gap-12 font-bold opacity-80 mb-12">
                        <a href="#" className="hover:opacity-100">About</a>
                        <a href="#" className="hover:opacity-100">Schools</a>
                        <a href="#" className="hover:opacity-100">Apps</a>
                        <a href="#" className="hover:opacity-100">Research</a>
                        <a href="#" className="hover:opacity-100">Careers</a>
                        <a href="#" className="hover:opacity-100">Help</a>
                        <a href="#" className="hover:opacity-100">Privacy</a>
                        <a href="#" className="hover:opacity-100">Terms</a>
                    </div>
                    <div className="opacity-60 text-sm font-medium">
                        © 2026 BrightEd Caribbean. Made with love for the future.
                    </div>
                </div>
            </footer>

        </div>
    );
}
