'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/lib/auth-context';

export default function LandingDuolingo() {
    const { user } = useAuth();

    // Custom "Chunky" Button Styles to match reference
    const primaryBtnClass = "bg-[var(--state-success)] hover:bg-[#46a302] text-white border-b-4 border-[#46a302] active:border-b-0 active:translate-y-1 font-extrabold tracking-widest uppercase rounded-2xl px-10 py-4 text-base transition-all w-full sm:w-auto text-center cursor-pointer";
    const secondaryBtnClass = "bg-white hover:bg-slate-50 text-[var(--brand-primary)] border-2 border-slate-200 border-b-4 active:border-b-2 active:translate-y-[2px] font-extrabold tracking-widest uppercase rounded-2xl px-10 py-4 text-base transition-all w-full sm:w-auto text-center cursor-pointer";

    return (
        <div className="min-h-screen bg-white text-[#4b4b4b] font-sans selection:bg-[var(--brand-primary)] selection:text-white overflow-x-hidden">

            {/* 1. Header */}
            <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b-2 border-slate-100 h-[70px] flex items-center justify-center px-4 transition-all">
                <div className="w-full max-w-[980px] flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 group">
                        <div className="w-10 h-10 relative transition-transform group-hover:scale-110">
                            {/* Using owl-happy as a small logo substitute or the actual logo if preferred, 
                        but reference uses mascot head. Let's use the static image if available or sprite. 
                        Using sprite for consistency. */}
                            <div className="owl-sprite owl-happy" style={{ transform: 'scale(0.25)', transformOrigin: 'top left', width: '150px', height: '150px', position: 'absolute', top: 0, left: 0 }} />
                        </div>
                        <span className="font-heading font-extrabold text-3xl text-[var(--state-success)] tracking-tighter ml-8">BrightEd</span>
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
                        <div className="absolute inset-0 bg-[var(--brand-primary)]/10 rounded-full blur-[60px] animate-pulse-slow" />
                        {/* Large Sprite Display */}
                        <div className="owl-sprite owl-happy w-full h-full" style={{ transform: 'scale(2.5)', transformOrigin: 'center' }} />
                    </motion.div>

                    {/* Hero Content */}
                    <div className="flex flex-col items-center lg:items-start text-center lg:text-left max-w-lg">
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-heading font-extrabold text-[#4b4b4b] leading-tight mb-8">
                            The free, fun, and effective way to learn <span className="text-[var(--state-success)]">business & tech</span>.
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
            <section className="py-24 border-t-2 border-slate-100">
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
                        <h2 className="text-[var(--state-success)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            free. fun. effective.
                        </h2>
                        <p className="text-lg text-[#777] font-medium leading-relaxed">
                            Learning with BrightEd is fun, and <span className="text-[var(--brand-primary)] font-bold cursor-pointer underline decoration-2 underline-offset-4">research shows that it works</span>! With quick, bite-sized simulations, you'll earn points and unlock new levels while gaining real-world skills.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature 2: Backed by Science */}
            <section className="py-24 border-t-2 border-slate-100">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 text-center md:text-left">
                        <h2 className="text-[var(--brand-primary)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            backed by science.
                        </h2>
                        <p className="text-lg text-[#777] font-medium leading-relaxed">
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
            <section className="py-24 border-t-2 border-slate-100">
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
                        <p className="text-lg text-[#777] font-medium leading-relaxed">
                            We make it easy to form a habit of learning with game-like features, fun challenges, and reminders from our friendly mascot, Professor Bright.
                        </p>
                    </div>
                </div>
            </section>

            {/* Feature 4: Personalized Learning */}
            <section className="py-24 border-t-2 border-slate-100">
                <div className="w-full max-w-[980px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
                    <div className="order-1 text-center md:text-left">
                        <h2 className="text-[var(--brand-secondary)] font-heading font-extrabold text-3xl md:text-5xl mb-6">
                            personalized learning.
                        </h2>
                        <p className="text-lg text-[#777] font-medium leading-relaxed">
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

            {/* 4. Learn Anytime Section */}
            <section className="py-32 bg-[#f0f9ff] border-t-2 border-slate-100 flex justify-center items-center text-center px-4">
                <div className="max-w-4xl">
                    <h2 className="text-[var(--brand-primary)] font-heading font-extrabold text-4xl md:text-6xl mb-12">
                        learn anytime, anywhere.
                    </h2>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                        <button className="bg-black text-white hover:bg-slate-800 transition-colors px-8 py-3 rounded-xl flex items-center gap-3 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 w-[200px]">
                            <span className="text-2xl">🍎</span>
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-bold tracking-wider">Download on the</div>
                                <div className="text-lg font-bold leading-none">App Store</div>
                            </div>
                        </button>
                        <button className="bg-black text-white hover:bg-slate-800 transition-colors px-8 py-3 rounded-xl flex items-center gap-3 border-b-4 border-slate-700 active:border-b-0 active:translate-y-1 w-[200px]">
                            <span className="text-2xl">🤖</span>
                            <div className="text-left">
                                <div className="text-[10px] uppercase font-bold tracking-wider">Get it on</div>
                                <div className="text-lg font-bold leading-none">Google Play</div>
                            </div>
                        </button>
                    </div>
                </div>
            </section>

            {/* 5. Footer */}
            <footer className="bg-[var(--brand-primary)] text-white py-20 px-4">
                <div className="max-w-[980px] mx-auto text-center">
                    <div className="font-heading font-extrabold text-3xl mb-8">BrightEd</div>
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
