'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrightLayer, BrightButton } from '@/components/system';

interface Story {
  id: string;
  slug: string;
  name: string;
  subject: string;
  config: Record<string, unknown>;
}

interface Session {
  id: string;
  userId: string;
  storyId: string;
  state: string;
  snapshot: Record<string, unknown>;
  businessState: Record<string, unknown> | null;
  startedAt: string;
  lastPlayedAt: string;
  completedAt: string | null;
  story: { id: string; slug: string; name: string } | null;
}

import { useAuth } from '@/lib/auth-context';

const fadeIn = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function StoriesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasBusiness = userData?.hasBusiness || false;

  useEffect(() => {
    async function fetchData() {
      if (!user) return;

      try {
        setLoading(true);
        setError(null);
        const token = await user.getIdToken();
        const headers = { 'Authorization': `Bearer ${token}` };

        const [storiesRes, sessionsRes] = await Promise.all([
          fetch('/api/stories/stories', { headers }),
          fetch(`/api/stories/sessions?userId=${user.uid}`, { headers })
        ]);

        if (!storiesRes.ok) throw new Error('Failed to fetch stories');
        if (!sessionsRes.ok) throw new Error('Failed to fetch sessions');

        const storiesData = await storiesRes.json();
        const sessionsData = await sessionsRes.json();

        setStories(storiesData.stories ?? []);
        setSessions(sessionsData.sessions ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading && user) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading]);

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="relative w-20 h-20 mx-auto mb-8">
            <div className="absolute inset-0 rounded-full border-t-2 border-[var(--brand-primary)] animate-spin" />
            <div className="absolute inset-4 rounded-full border-b-2 border-teal-400 animate-spin-reverse opacity-60" />
          </div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand-primary)] animate-pulse">Initializing Multiverse</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#050B14] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-white/10 rounded-3xl p-8 shadow-2xl max-w-md text-center"
        >
          <h2 className="text-2xl font-black text-white mb-4 italic">{error}</h2>
          <Link
            href="/"
            className="inline-block px-8 py-3 bg-[var(--brand-primary)] text-white font-black rounded-xl hover:opacity-90 transition-all uppercase tracking-widest text-xs"
          >
            Return to orbit
          </Link>
        </motion.div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.state === 'active');
  const completedSessions = sessions.filter((s) => s.state === 'completed' || s.state === 'failed');

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#050B14] font-sans">
      {/* Immersive Cinematic Background */}
      <motion.div
        initial={{ scale: 1.1, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.4 }}
        transition={{ duration: 2 }}
        className="fixed inset-0 z-0 bg-cover bg-center pointer-events-none"
        style={{ backgroundImage: 'url("/backgrounds/vibrant_city.png")' }}
      />

      {/* Dynamic Glow Overlays */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-[#050B14] via-transparent to-[#050B14]" />
      <div className="fixed inset-0 z-0 bg-gradient-to-r from-[#050B14] via-transparent to-[#050B14]" />
      <div className="fixed top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-[var(--brand-primary)]/10 to-transparent mix-blend-screen" />

      <div className="max-w-6xl mx-auto px-6 py-12 pt-40 relative z-10">

        {/* Cinematic Header */}
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="mb-20 text-center"
        >
          <div className="inline-block mb-4 px-4 py-1 rounded-full border border-[var(--brand-primary)]/30 bg-[var(--brand-primary)]/5 backdrop-blur-md">
            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)]">Infinite Possibilities</span>
          </div>
          <h1 className="text-7xl font-black text-white mb-6 tracking-tight leading-none">
            The <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--brand-primary)] via-teal-400 to-emerald-400">Multiverse</span>
          </h1>
          <p className="text-zinc-400 text-xl font-medium max-w-2xl mx-auto leading-relaxed">
            Enter hyper-realistic simulations where every choice defines your legacy.
            Time is your only limited resource—waste it wisely.
          </p>
        </motion.div>

        {/* ACTIVE SESSIONS: Continuation Section */}
        {activeSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="mb-24"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="h-px flex-1 bg-zinc-800" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
                Continue Simulation
              </h2>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <div className="grid gap-6">
              {activeSessions.map((s) => (
                <Link key={s.id} href={`/stories/business/operations?sessionId=${s.id}`}>
                  <motion.div
                    whileHover={{ scale: 1.01, x: 10 }}
                    whileTap={{ scale: 0.99 }}
                    className="group"
                  >
                    <BrightLayer
                      variant="glass"
                      padding="lg"
                      className="border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 w-32 h-full bg-gradient-to-l from-[var(--brand-primary)]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                            ⚡
                          </div>
                          <div>
                            <p className="font-black text-2xl text-white group-hover:text-[var(--brand-primary)] transition-colors">
                              {s.story?.name ?? 'Business & Financial Literacy'}
                            </p>
                            <p className="text-xs text-zinc-500 mt-1 uppercase font-black tracking-widest">
                              Last checkpoint: {new Date(s.lastPlayedAt).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="px-5 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-[10px] font-black uppercase tracking-widest shadow-[0_10px_20px_-5px_rgba(var(--brand-primary-rgb),0.4)]">
                            Resume Session
                          </div>
                        </div>
                      </div>
                    </BrightLayer>
                  </motion.div>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        {/* NEW STORIES: Grid Section */}
        <section className="mb-24">
          <div className="flex items-center gap-4 mb-12">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 whitespace-nowrap">
              Available Dimensions
            </h2>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>

          <motion.div
            variants={stagger}
            initial="initial"
            animate="animate"
            className="grid gap-8 sm:grid-cols-2 lg:grid-cols-2"
          >
            {stories.map((story, i) => {
              const requiresBusiness = story.subject?.toLowerCase().includes('business') ||
                story.subject?.toLowerCase().includes('principles of business') ||
                story.subject?.toLowerCase().includes('accounts');
              const isLocked = requiresBusiness && !hasBusiness;

              return (
                <motion.div
                  key={story.id}
                  variants={fadeIn}
                  whileHover={{ y: -10, scale: 1.02 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="relative group"
                >
                  <Link
                    href={
                      isLocked ? '/stories/business/register' :
                        story.slug === 'business-financial-literacy'
                          ? '/stories/business/operations'
                          : `/stories/${story.slug}`
                    }
                  >
                    <BrightLayer
                      variant="glass"
                      padding="none"
                      className={`h-full flex flex-col border border-white/5 bg-white/[0.02] overflow-hidden rounded-[2rem] transition-all ${isLocked ? 'grayscale opacity-75' : 'group-hover:border-[var(--brand-primary)]/50 shadow-2xl group-hover:shadow-[var(--brand-primary)]/10'}`}
                    >
                      {/* Card Preview Image */}
                      <div className="relative h-64 overflow-hidden">
                        <div
                          className="absolute inset-0 bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                          style={{ backgroundImage: `url(${story.slug === 'business-financial-literacy' ? "/backgrounds/business_cover.png" : "/backgrounds/vibrant_city.png"})` }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        <div className="absolute bottom-6 left-6">
                          <span className="px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-[9px] font-black tracking-widest text-white uppercase border border-white/20">
                            {story.subject}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-8 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-3xl font-black text-white mb-4 tracking-tight group-hover:text-teal-400 transition-colors">
                            {story.name}
                          </h3>
                          <p className="text-zinc-400 text-sm leading-relaxed font-medium">
                            {story.slug === 'business-financial-literacy'
                              ? 'Architect your path to wealth. Manage a full-scale legal entity, navigate market crashes, and build a global empire.'
                              : 'An ultra-immersive simulation designed to challenge your moral and logical edge.'}
                          </p>
                        </div>

                        <div className="mt-8 flex items-center justify-between">
                          {isLocked ? (
                            <div className="flex items-center gap-2 text-red-400 text-xs font-black uppercase tracking-widest">
                              <span>🔒 LOCKED (Needs Business)</span>
                            </div>
                          ) : (
                            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand-primary)] group-hover:translate-x-2 transition-transform duration-300">
                              Initialize Simulation →
                            </div>
                          )}
                          {!isLocked && (
                            <div className="flex gap-1">
                              {[1, 2, 3].map(i => <div key={i} className="w-1 h-1 rounded-full bg-teal-400/40" />)}
                            </div>
                          )}
                        </div>
                      </div>
                    </BrightLayer>
                  </Link>

                  {/* Locked Overlay Link if needed */}
                  {isLocked && (
                    <Link
                      href="/stories/business/register"
                      className="absolute inset-0 bg-black/40 backdrop-blur-[2px] rounded-[2rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <BrightButton variant="primary" size="sm">Register Business</BrightButton>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </motion.div>
        </section>

        {/* FOOTER: Stats or Past Stories */}
        {completedSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="pt-20 border-t border-white/5"
          >
            <div className="flex items-center gap-4 mb-8">
              <h2 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600 whitespace-nowrap">
                Legacy Archive
              </h2>
            </div>
            <div className="grid gap-3 opacity-60">
              {completedSessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex justify-between items-center"
                >
                  <span className="text-zinc-400 text-sm font-bold">
                    {s.story?.name ?? 'Simulation Log'}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[10px] font-mono text-zinc-600 uppercase">{new Date(s.completedAt!).toLocaleDateString()}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md ${s.state === 'completed' ? 'text-teal-400 bg-teal-400/10' : 'text-red-400 bg-red-400/10'}`}>
                      {s.state === 'completed' ? 'SUCCEEDED' : 'FAILED'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </motion.section>
        )}

      </div>

      {/* Visual Accents */}
      <div className="fixed bottom-0 left-0 w-full h-[50vh] bg-gradient-to-t from-teal-500/5 to-transparent pointer-events-none" />
    </div>
  );
}
