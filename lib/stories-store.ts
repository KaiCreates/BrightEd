/**
 * BrightEd Stories Engine - Firestore Data Layer
 * Migrated from SQLite to Firestore for consistency and scalability
 */

import { adminDb } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';

// Helper for Firestore timestamp conversion
function convertTimestamp(data: any): any {
  if (!data) return data;
  
  const converted = { ...data };
  
  // Convert Firestore Timestamps to ISO strings
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && 'toDate' in converted[key]) {
      converted[key] = converted[key].toDate().toISOString();
    }
  });
  
  return converted;
}

// ----- Types -----

export interface Story {
    id: string;
    slug: string;
    name: string;
    subject: string;
    config: Record<string, any>;
    createdAt: string;
    updatedAt: string;
}

export async function getAllStories(): Promise<Story[]> {
    try {
        const storiesRef = adminDb.collection('stories');
        const q = storiesRef.orderBy('name', 'asc');
        const snapshot = await q.get();
        
        return snapshot.docs.map((doc) => {
            const data = convertTimestamp(doc.data());
            return {
                id: doc.id,
                ...data,
                config: data.config || {}
            } as Story;
        });
    } catch (error) {
        console.error('Error fetching stories:', error);
        return [];
    }
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
    try {
        const storiesRef = adminDb.collection('stories');
        const q = storiesRef.where('slug', '==', slug);
        const snapshot = await q.get();
        
        if (snapshot.empty) return null;
        
        const doc = snapshot.docs[0];
        const data = convertTimestamp(doc.data());
        
        return {
            id: doc.id,
            ...data,
            config: data.config || {}
        } as Story;
    } catch (error) {
        console.error('Error fetching story by slug:', error);
        return null;
    }
}

export async function ensureDefaultStory() {
    try {
        const existing = await getStoryBySlug('business-financial-literacy');
        if (existing) return;

        const defaultStory = {
            slug: 'business-financial-literacy',
            name: 'Business & Financial Literacy',
            subject: 'business',
            config: {
                timeMultiplier: 1,
                registrationDelayMinutes: 0.5, // 30 seconds
                loanApprovalDelayMinutes: 5,
            },
            createdAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        const storiesRef = adminDb.collection('stories');
        await storiesRef.add(defaultStory);
    } catch (error) {
        console.error('Error ensuring default story:', error);
    }
}

// ----- Profiles -----

export async function getPlayerProfile(userId: string) {
    try {
        const profileRef = adminDb.collection('storiesPlayerProfiles').doc(userId);
        const profileDoc = await profileRef.get();
        
        if (!profileDoc.exists) {
            // Create default profile
            const defaultProfile = {
                userId,
                skills: {
                    financialLiteracy: 50,
                    businessStrategy: 50,
                    riskManagement: 50
                },
                reputation: {
                    overall: 50,
                    reliability: 50,
                    innovation: 50
                },
                inventory: {},
                bCoins: 1000,
                timeUnits: 100,
                energy: 100,
                activeConsequences: [],
                financialData: {
                    totalRevenue: 0,
                    totalExpenses: 0,
                    netProfit: 0
                },
                createdAt: admin.firestore.Timestamp.now(),
                updatedAt: admin.firestore.Timestamp.now()
            };
            
            await profileRef.set(defaultProfile);
            return defaultProfile;
        }
        
        return convertTimestamp(profileDoc.data());
    } catch (error) {
        console.error('Error getting player profile:', error);
        throw error;
    }
}

export async function updatePlayerProfile(userId: string, data: Record<string, any>) {
    try {
        const profileRef = adminDb.collection('storiesPlayerProfiles').doc(userId);
        await profileRef.set(
            {
                ...data,
                updatedAt: admin.firestore.Timestamp.now()
            },
            { merge: true }
        );
    } catch (error) {
        console.error('Error updating player profile:', error);
        throw error;
    }
}

// ----- Sessions -----

export async function getSessions(userId: string, filters: { storyId?: string; state?: string } = {}): Promise<any[]> {
    try {
        // NOTE: Firestore requires a composite index for (where userId == X) + (orderBy lastPlayedAt)
        // and even more for additional where clauses. To keep local/dev environments working without
        // requiring console index creation, we fetch by userId only and then filter/sort in memory.
        const snapshot = await adminDb
            .collection('storySessions')
            .where('userId', '==', userId)
            .get();

        let sessionDocs = snapshot.docs;

        if (filters.storyId) {
            sessionDocs = sessionDocs.filter((d) => d.get('storyId') === filters.storyId);
        }

        if (filters.state) {
            sessionDocs = sessionDocs.filter((d) => d.get('state') === filters.state);
        }

        sessionDocs.sort((a, b) => {
            const aVal = a.get('lastPlayedAt');
            const bVal = b.get('lastPlayedAt');
            const aMs = aVal && typeof aVal.toDate === 'function' ? aVal.toDate().getTime() : new Date(aVal || 0).getTime();
            const bMs = bVal && typeof bVal.toDate === 'function' ? bVal.toDate().getTime() : new Date(bVal || 0).getTime();
            return bMs - aMs;
        });

        return Promise.all(sessionDocs.map(async (snap) => {
            const data = convertTimestamp(snap.data());
            
            // Get story details
            let story = null;
            if (data.storyId) {
                const storyDoc = await adminDb.collection('stories').doc(data.storyId).get();
                if (storyDoc.exists) {
                    const storyData = convertTimestamp(storyDoc.data());
                    story = {
                        id: storyDoc.id,
                        name: storyData.name,
                        slug: storyData.slug,
                        config: storyData.config || {}
                    };
                }
            }
            
            return {
                id: snap.id,
                ...data,
                story
            };
        }));
    } catch (error) {
        console.error('Error getting sessions:', error);
        return [];
    }
}

export async function createSession(data: {
    userId: string;
    storyId: string;
    state: string;
    snapshot: any;
    businessState?: any;
    difficultyContext: any;
}) {
    try {
        const sessionData = {
            ...data,
            startedAt: admin.firestore.Timestamp.now(),
            lastPlayedAt: admin.firestore.Timestamp.now()
        };

        const docRef = await adminDb.collection('storySessions').add(sessionData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating session:', error);
        throw error;
    }
}

export async function updateSession(id: string, data: Record<string, any>) {
    try {
        const sessionRef = adminDb.collection('storySessions').doc(id);
        await sessionRef.set(
            {
                ...data,
                lastPlayedAt: admin.firestore.Timestamp.now()
            },
            { merge: true }
        );
    } catch (error) {
        console.error('Error updating session:', error);
        throw error;
    }
}

export async function getSessionById(id: string) {
    try {
        const sessionDoc = await adminDb.collection('storySessions').doc(id).get();

        if (!sessionDoc.exists) return null;

        const data = convertTimestamp(sessionDoc.data());
        
        // Get story details
        let story = null;
        if (data.storyId) {
            const storyDoc = await adminDb.collection('stories').doc(data.storyId).get();
            if (storyDoc.exists) {
                const storyData = convertTimestamp(storyDoc.data());
                story = {
                    id: storyDoc.id,
                    name: storyData.name,
                    slug: storyData.slug,
                    config: storyData.config || {}
                };
            }
        }
        
        return {
            id: sessionDoc.id,
            ...data,
            story
        };
    } catch (error) {
        console.error('Error getting session by ID:', error);
        return null;
    }
}

// ----- Consequences -----

export async function createConsequence(data: {
    decisionId?: string;
    sessionId: string;
    type: string;
    scheduledAt?: string | null;
    ruleId: string;
    effects: any[];
}) {
    try {
        const consequenceData = {
            ...data,
            appliedAt: null,
            createdAt: admin.firestore.Timestamp.now()
        };

        const docRef = await adminDb.collection('consequences').add(consequenceData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating consequence:', error);
        throw error;
    }
}

export async function getDueConsequences(sessionId: string) {
    try {
        const snapshot = await adminDb
            .collection('consequences')
            .where('sessionId', '==', sessionId)
            .where('type', '==', 'delayed')
            .where('appliedAt', '==', null)
            .get();

        return snapshot.docs.map((snap) => {
            const data = convertTimestamp(snap.data());
            return {
                id: snap.id,
                ...data,
                effects: data.effects || []
            };
        });
    } catch (error) {
        console.error('Error getting due consequences:', error);
        return [];
    }
}

export async function updateConsequence(id: string, data: Record<string, any>) {
    try {
        await adminDb.collection('consequences').doc(id).set(data, { merge: true });
    } catch (error) {
        console.error('Error updating consequence:', error);
        throw error;
    }
}

// ----- Decision Log -----

export async function createDecisionLog(data: {
    sessionId: string;
    choiceId: string;
    payload: any;
    resolved: boolean;
}) {
    try {
        const decisionData = {
            ...data,
            at: admin.firestore.Timestamp.now()
        };

        const docRef = await adminDb.collection('decisionLogs').add(decisionData);
        return docRef.id;
    } catch (error) {
        console.error('Error creating decision log:', error);
        throw error;
    }
}

// ----- NPCs & Memory -----

export async function getNPCMemory(userId: string, npcId: string) {
    try {
        const memoryDoc = await adminDb.collection('npcMemories').doc(`${userId}_${npcId}`).get();

        if (!memoryDoc.exists) return null;

        const data = convertTimestamp(memoryDoc.data());
        
        // Get NPC details
        let npc = null;
        const npcDoc = await adminDb.collection('npcs').doc(npcId).get();
        if (npcDoc.exists) {
            const npcData = convertTimestamp(npcDoc.data());
            npc = {
                id: npcDoc.id,
                name: npcData.name,
                role: npcData.role,
                config: npcData.config || {}
            };
        }
        
        return {
            ...data,
            npc,
            interactions: data.interactions || []
        };
    } catch (error) {
        console.error('Error getting NPC memory:', error);
        return null;
    }
}

export async function recordNPCInteraction(userId: string, npcId: string, interactions: any, sentiment: number) {
    try {
        const interactionData = {
            userId,
            npcId,
            interactions,
            sentiment,
            lastInteractionAt: admin.firestore.Timestamp.now(),
            updatedAt: admin.firestore.Timestamp.now()
        };

        await adminDb.collection('npcMemories').doc(`${userId}_${npcId}`).set(interactionData, { merge: true });
    } catch (error) {
        console.error('Error recording NPC interaction:', error);
        throw error;
    }
}
