import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, collection, addDoc, increment } from 'firebase/firestore';
import { GlobalLearningStats, LearningEvent, SubSkillGlobalStats } from './types';

// Cache for global stats to avoid hitting DB on every request
let globalStatsCache: GlobalLearningStats | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 60; // 1 hour

/**
 * Default priors if no global data exists
 */
const DEFAULT_SUB_SKILL_STATS: SubSkillGlobalStats = {
    avgInitialMastery: 0.3, // Assume novice but not zero
    avgTimeToMastery: 5,
    commonErrorTypes: {},
    decayRate: 0.1,
    totalLearners: 0
};

/**
 * NABLE Global Intelligence Service
 * Manages the "Platform Memory"
 */
export const GlobalIntelligence = {

    /**
     * Fetch global stats from Firestore (or cache)
     */
    async fetchGlobalStats(): Promise<GlobalLearningStats> {
        const now = Date.now();
        if (globalStatsCache && (now - lastFetchTime < CACHE_TTL)) {
            return globalStatsCache;
        }

        try {
            const docRef = doc(db, 'global-learning', 'main');
            const snap = await getDoc(docRef);

            if (snap.exists()) {
                globalStatsCache = snap.data() as GlobalLearningStats;
            } else {
                // Initialize if missing
                globalStatsCache = {
                    subSkills: {},
                    difficultyStats: {},
                    interventions: {}
                };
            }
            lastFetchTime = now;
            return globalStatsCache;
        } catch (error) {
            console.warn("Failed to fetch global stats, using defaults:", error);
            return {
                subSkills: {},
                difficultyStats: {},
                interventions: {}
            };
        }
    },

    /**
     * Get prior mastery for a specific sub-skill
     * Returns the global average if available, otherwise default
     */
    async getPriorMastery(subSkillId: string): Promise<number> {
        const stats = await this.fetchGlobalStats();
        // If we have data and enough samples (>50 users), use it.
        // Otherwise use default prior (0.3)
        const skillStats = stats.subSkills[subSkillId];
        if (skillStats && skillStats.totalLearners > 50) {
            return skillStats.avgInitialMastery;
        }
        return DEFAULT_SUB_SKILL_STATS.avgInitialMastery;
    },

    /**
     * Emit a learning event to the pipeline
     * This pushes data to 'learning-events' collection and aggregates it
     */
    async emitLearningEvent(event: LearningEvent): Promise<void> {
        try {
            // 1. Log raw event for data warehouse/BigQuery later
            await addDoc(collection(db, 'learning-events'), event);

            // 2. Aggregate into global stats (Simplified for real-time)
            // In a massive scale app, this would be a background job/cloud function.
            // For now, we update specific counters carefully.

            const statsRef = doc(db, 'global-learning', 'main');
            // Note: We don't await this strictly to avoid blocking the user
            // But we ideally want to update average mastery
            // Doing a true average update in Firestore is hard without transaction.
            // We will just increment a 'totalLearners' counter or 'totalEvents' for now
            // and separate the heavy math to a scheduled job.

            // Example: Just tracking difficulty success rates
            const difficultyKey = `difficultyStats.${event.difficulty}`;
            // We can't easily upsert deeply nested fields without Dot notation and known existence.
            // So we might skip real-time aggregation here and rely on the background job "Super Boot".

        } catch (error) {
            console.error("Failed to emit learning event:", error);
        }
    }
};
