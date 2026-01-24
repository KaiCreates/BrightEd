'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BrightLayer } from '@/components/system';
import BusinessAccessGate from '@/components/business/BusinessAccessGate';

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

export default function StoriesPage() {
  const { user, userData, loading: authLoading } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasBusiness = userData?.hasBusiness || false;

  useEffect(() => {
    async function fetchData() {
      if (!user) return; // Wait for auth

      try {
        setLoading(true);
        setError(null);
        const [storiesRes, sessionsRes] = await Promise.all([
          fetch('/api/stories/stories'),
          fetch(`/api/stories/sessions?userId=${user.uid}`)
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
      setLoading(false); // No user, stop loading (middleware handles protection usually, but good for safety)
    }
  }, [user, authLoading]);

  if (authLoading || (loading && user)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy-soft to-teal-deep flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
          <p className="text-xl font-semibold">Loading Stories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-navy-dark via-navy-soft to-teal-deep flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-3xl p-8 shadow-2xl max-w-md text-center"
        >
          <h2 className="text-2xl font-heading font-bold text-navy-dark mb-4">{error}</h2>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-teal-light text-white font-semibold rounded-xl hover:bg-teal-medium transition-all"
          >
            Return home
          </Link>
        </motion.div>
      </div>
    );
  }

  const activeSessions = sessions.filter((s) => s.state === 'active');
  const completedSessions = sessions.filter((s) => s.state === 'completed' || s.state === 'failed');

  return (
    <div className="min-h-screen relative overflow-hidden bg-navy-dark">
      {/* City Background */}
      <div
        className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-60"
        style={{ backgroundImage: 'url("/backgrounds/city.png")' }}
      />
      {/* Gradient Overlay for Readability */}
      <div className="fixed inset-0 z-0 bg-gradient-to-b from-navy-dark/80 via-navy-dark/40 to-navy-dark/80" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 pt-28 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 text-center sm:text-left"
        >
          <h1 className="text-5xl font-heading font-bold text-white mb-2 drop-shadow-md">Stories</h1>
          <p className="text-white text-lg font-medium drop-shadow-md">
            Consequence-based simulations. Your choices shape outcomes. Time and resources matter.
          </p>
        </motion.div>

        {activeSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-10"
          >
            <h2 className="text-xl font-heading font-semibold text-yellow-warm mb-4">
              Continue your story
            </h2>
            <div className="space-y-4">
              {activeSessions.map((s) => (
                <Link key={s.id} href={`/stories/business?sessionId=${s.id}`}>
                  <BrightLayer
                    variant="glass"
                    padding="md"
                    className="border-b-4 border-[var(--brand-accent)] hover:border-[var(--brand-primary)] transition-all group"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-bold text-xl text-[var(--text-primary)] group-hover:text-[var(--brand-primary)] transition-colors">
                          {s.story?.name ?? 'Business & Financial Literacy'}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] mt-1">
                          Last played {new Date(s.lastPlayedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-[var(--brand-accent)]/20 text-[var(--brand-accent)] text-sm font-medium rounded-full">
                        Active
                      </span>
                    </div>
                  </BrightLayer>
                </Link>
              ))}
            </div>
          </motion.section>
        )}

        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-xl font-heading font-semibold text-white mb-4">
            Start a new story
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {stories.map((story, i) => {
              const requiresBusiness = story.subject?.toLowerCase().includes('business') ||
                story.subject?.toLowerCase().includes('principles of business') ||
                story.subject?.toLowerCase().includes('accounts') ||
                story.subject?.toLowerCase().includes('accounting');
              const isLocked = requiresBusiness && !hasBusiness;

              return (
                <motion.div
                  key={story.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * (i + 1) }}
                >
                  {isLocked ? (
                    <BrightLayer
                      variant="glass"
                      padding="md"
                      className="h-full flex flex-col border-b-4 border-[var(--border-subtle)] opacity-60 relative"
                    >
                      <div className="absolute inset-0 bg-[var(--bg-primary)]/50 backdrop-blur-sm rounded-xl flex items-center justify-center z-10">
                        <div className="text-center">
                          <div className="text-4xl mb-2">🔒</div>
                          <p className="text-sm font-bold text-[var(--text-muted)] mb-2">Business Required</p>
                          <Link href="/stories/business">
                            <button className="text-xs text-[var(--brand-primary)] hover:underline">
                              Register →
                            </button>
                          </Link>
                        </div>
                      </div>
                      <span className="inline-block px-3 py-1 bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)] text-sm font-bold rounded-full mb-4 w-fit">
                        {story.subject}
                      </span>
                      <h3 className="text-2xl font-heading font-bold text-navy-dark mb-2">
                        {story.name}
                      </h3>
                      <p className="text-gray-dark text-sm flex-1 font-medium">
                        Register a business to unlock this simulation.
                      </p>
                    </BrightLayer>
                  ) : (
                    <Link
                      href={
                        story.slug === 'business-financial-literacy'
                          ? '/stories/business'
                          : `/stories/${story.slug}`
                      }
                    >
                      <BrightLayer
                        variant="glass"
                        padding="md"
                        className="h-full flex flex-col border-b-4 border-[var(--brand-secondary)] hover:border-[var(--brand-primary)] transition-all group card-pop"
                      >
                        <span className="inline-block px-3 py-1 bg-[var(--brand-secondary)]/20 text-[var(--brand-secondary)] text-sm font-bold rounded-full mb-4 w-fit">
                          {story.subject}
                        </span>
                        <h3 className="text-2xl font-heading font-bold text-navy-dark mb-2 group-hover:text-purple-medium transition-colors">
                          {story.name}
                        </h3>
                        <p className="text-gray-dark text-sm flex-1 font-medium">
                          {story.slug === 'business-financial-literacy'
                            ? 'Start a small business, register, manage cash flow, pay taxes, take loans. Fail realistically.'
                            : 'Immersive simulation.'}
                        </p>
                        <span className="mt-4 inline-block text-[var(--brand-secondary)] font-bold text-sm group-hover:translate-x-1 transition-transform">
                          Start story →
                        </span>
                      </BrightLayer>
                    </Link>
                  )}
                </motion.div>
              );
            })}
          </div>
        </motion.section>

        {completedSessions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-10"
          >
            <h2 className="text-xl font-heading font-semibold text-white/80 mb-4">
              Past stories
            </h2>
            <div className="space-y-3">
              {completedSessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="bg-white/10 rounded-xl p-4 flex justify-between items-center"
                >
                  <span className="text-white font-medium">
                    {s.story?.name ?? 'Simulation'}
                  </span>
                  <span
                    className={
                      s.state === 'completed'
                        ? 'text-green-400 text-sm'
                        : 'text-red-error/90 text-sm'
                    }
                  >
                    {s.state === 'completed' ? 'Completed' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}
