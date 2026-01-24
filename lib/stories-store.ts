import path from 'path';
import fs from 'fs';
import { randomUUID } from 'crypto';

// Use same DB path logic as questions generator but for dev.db (Prisma's storage)
const DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

import { getStoriesDb } from './db';

function getDb() {
    return getStoriesDb();
}

export function closeDb() {
    // Handled by global utility if needed
}

// Helper for JSON parsing
function parseJson<T>(raw: string | null, fallback: T): T {
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        console.error('Failed to parse JSON:', raw);
        return fallback;
    }
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
    const db = getDb();
    const rows = db.prepare('SELECT * FROM Story ORDER BY name ASC').all();
    return (rows as any[]).map((s: any) => ({
        ...s,
        config: parseJson(s.config, {}),
    })) as Story[];
}

export async function getStoryBySlug(slug: string): Promise<Story | null> {
    const db = getDb();
    const row = db.prepare('SELECT * FROM Story WHERE slug = ?').get(slug) as any;
    if (!row) return null;
    return {
        ...row,
        config: parseJson(row.config, {}),
    } as Story;
}

export async function ensureDefaultStory() {
    const db = getDb();
    const existing = db.prepare('SELECT id FROM Story WHERE slug = ?').get('business-financial-literacy');
    if (existing) return;

    const defaultStory = {
        id: randomUUID(),
        slug: 'business-financial-literacy',
        name: 'Business & Financial Literacy',
        subject: 'business',
        config: JSON.stringify({
            timeMultiplier: 1,
            registrationDelayMinutes: 0.5, // 30 seconds
            loanApprovalDelayMinutes: 5,
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    const insert = db.prepare(`
    INSERT INTO Story (id, slug, name, subject, config, createdAt, updatedAt)
    VALUES (@id, @slug, @name, @subject, @config, @createdAt, @updatedAt)
  `);
    insert.run(defaultStory);
}

// ----- Profiles -----

export async function getPlayerProfile(userId: string) {
    const db = getDb();
    let row = db.prepare('SELECT * FROM StoriesPlayerProfile WHERE userId = ?').get(userId) as any;
    if (!row) {
        // ... (creation logic stays same but typed)
    }
    return {
        ...row,
        skills: parseJson(row.skills, {}),
        reputation: parseJson(row.reputation, {}),
        inventory: parseJson(row.inventory, {}),
        activeConsequences: parseJson(row.activeConsequences, []),
        financialData: parseJson(row.financialData, {}),
    };
}

export async function updatePlayerProfile(userId: string, data: Record<string, any>) {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, any> = { userId };

    for (const [key, value] of Object.entries(data)) {
        if (key === 'userId' || key === 'id') continue;
        sets.push(`${key} = @${key}`);
        params[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }

    sets.push(`updatedAt = @updatedAt`);
    params.updatedAt = new Date().toISOString();

    if (sets.length === 0) return;

    const sql = `UPDATE StoriesPlayerProfile SET ${sets.join(', ')} WHERE userId = @userId`;
    db.prepare(sql).run(params);
}

// ----- Businesses -----

export async function getBusinesses(profileId: string): Promise<any[]> {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM Business WHERE profileId = ? ORDER BY createdAt DESC').all(profileId) as any[];
    return rows.map((b) => ({
        ...b,
        financialHistory: parseJson(b.financialHistory, [])
    }));
}

export async function createBusiness(data: {
    profileId: string;
    name: string;
    category: string;
    description?: string;
    status?: string;
}) {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const business = {
        id,
        profileId: data.profileId,
        name: data.name,
        category: data.category,
        description: data.description || '',
        status: data.status || 'active',
        valuation: 0,
        cashFlow: 0,
        financialHistory: '[]',
        createdAt: now,
        updatedAt: now
    };

    db.prepare(`
        INSERT INTO Business (id, profileId, name, category, description, status, valuation, cashFlow, financialHistory, createdAt, updatedAt)
        VALUES (@id, @profileId, @name, @category, @description, @status, @valuation, @cashFlow, @financialHistory, @createdAt, @updatedAt)
    `).run(business);

    return business;
}

export async function updateBusiness(id: string, data: Record<string, any>) {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, any> = { id };

    for (const [key, value] of Object.entries(data)) {
        if (key === 'id') continue;
        sets.push(`${key} = @${key}`);
        params[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }

    sets.push(`updatedAt = @updatedAt`);
    params.updatedAt = new Date().toISOString();

    if (sets.length === 0) return;

    const sql = `UPDATE Business SET ${sets.join(', ')} WHERE id = @id`;
    db.prepare(sql).run(params);
}

// ----- Sessions -----

export async function getSessions(userId: string, filters: { storyId?: string; state?: string } = {}): Promise<any[]> {
    const db = getDb();
    let sql = 'SELECT s.*, st.name as storyName, st.slug as storySlug FROM StorySession s LEFT JOIN Story st ON s.storyId = st.id WHERE s.userId = ?';
    const params: (string | number)[] = [userId];

    if (filters.storyId) {
        sql += ' AND s.storyId = ?';
        params.push(filters.storyId);
    }
    if (filters.state) {
        sql += ' AND s.state = ?';
        params.push(filters.state);
    }

    sql += ' ORDER BY s.lastPlayedAt DESC';

    const rows = db.prepare(sql).all(...params) as any[];
    return rows.map((s) => ({
        ...s,
        snapshot: parseJson(s.snapshot, {}),
        businessState: parseJson(s.businessState, null),
        difficultyContext: parseJson(s.difficultyContext, {}),
        story: s.storyId ? { id: s.storyId, name: s.storyName, slug: s.storySlug } : null
    }));
}

export async function createSession(data: {
    userId: string;
    storyId: string;
    state: string;
    snapshot: any;
    businessState?: any;
    difficultyContext: any;
}) {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const session = {
        id,
        userId: data.userId,
        storyId: data.storyId,
        state: data.state,
        snapshot: JSON.stringify(data.snapshot),
        businessState: data.businessState ? JSON.stringify(data.businessState) : null,
        difficultyContext: JSON.stringify(data.difficultyContext),
        startedAt: now,
        lastPlayedAt: now
    };

    db.prepare(`
    INSERT INTO StorySession (id, userId, storyId, state, snapshot, businessState, difficultyContext, startedAt, lastPlayedAt)
    VALUES (@id, @userId, @storyId, @state, @snapshot, @businessState, @difficultyContext, @startedAt, @lastPlayedAt)
  `).run(session);

    return id;
}

export async function updateSession(id: string, data: Record<string, any>) {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, any> = { id };

    for (const [key, value] of Object.entries(data)) {
        if (key === 'id') continue;
        sets.push(`${key} = @${key}`);
        params[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }

    sets.push(`lastPlayedAt = @lastPlayedAt`);
    params.lastPlayedAt = new Date().toISOString();

    const sql = `UPDATE StorySession SET ${sets.join(', ')} WHERE id = @id`;
    db.prepare(sql).run(params);
}

export async function getSessionById(id: string) {
    const db = getDb();
    const row = db.prepare('SELECT s.*, st.name as storyName, st.slug as storySlug, st.config as storyConfig FROM StorySession s LEFT JOIN Story st ON s.storyId = st.id WHERE s.id = ?').get(id) as any;
    if (!row) return null;
    return {
        ...row,
        snapshot: parseJson(row.snapshot, {}),
        businessState: parseJson(row.businessState, null),
        difficultyContext: parseJson(row.difficultyContext, {}),
        story: row.storyId ? { id: row.storyId, name: row.storyName, slug: row.storySlug, config: parseJson(row.storyConfig, {}) } : null
    };
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
    const db = getDb();
    const id = randomUUID();
    const consequence = {
        id,
        decisionId: data.decisionId || null,
        sessionId: data.sessionId,
        type: data.type,
        scheduledAt: data.scheduledAt || null,
        ruleId: data.ruleId,
        effects: JSON.stringify(data.effects),
        appliedAt: null
    };

    db.prepare(`
        INSERT INTO Consequence (id, decisionId, sessionId, type, scheduledAt, ruleId, effects, appliedAt)
        VALUES (@id, @decisionId, @sessionId, @type, @scheduledAt, @ruleId, @effects, @appliedAt)
    `).run(consequence);

    return id;
}

export async function getDueConsequences(sessionId: string) {
    const db = getDb();
    const now = new Date().toISOString();
    const rows = db.prepare(`
        SELECT * FROM Consequence 
        WHERE sessionId = ? 
        AND type = 'delayed' 
        AND (scheduledAt IS NULL OR scheduledAt <= ?) 
        AND appliedAt IS NULL
    `).all(sessionId, now);

    return rows.map((c: any) => ({
        ...c,
        effects: parseJson(c.effects, [])
    }));
}

export async function updateConsequence(id: string, data: Record<string, any>) {
    const db = getDb();
    const sets: string[] = [];
    const params: Record<string, any> = { id };

    for (const [key, value] of Object.entries(data)) {
        if (key === 'id') continue;
        sets.push(`${key} = @${key}`);
        params[key] = typeof value === 'object' ? JSON.stringify(value) : value;
    }

    if (sets.length === 0) return;

    const sql = `UPDATE Consequence SET ${sets.join(', ')} WHERE id = @id`;
    db.prepare(sql).run(params);
}

// ----- Decision Log -----

export async function createDecisionLog(data: {
    sessionId: string;
    choiceId: string;
    payload: any;
    resolved: boolean;
}) {
    const db = getDb();
    const id = randomUUID();
    const now = new Date().toISOString();

    const decision = {
        id,
        sessionId: data.sessionId,
        choiceId: data.choiceId,
        payload: JSON.stringify(data.payload),
        resolved: data.resolved ? 1 : 0,
        at: now
    };

    db.prepare(`
        INSERT INTO DecisionLog (id, sessionId, choiceId, payload, resolved, at)
        VALUES (@id, @sessionId, @choiceId, @payload, @resolved, @at)
        `).run(decision);

    return id;
}

// ----- NPCs & Memory -----

export async function getNPCMemory(userId: string, npcId: string) {
    const db = getDb();
    const row = db.prepare(`
    SELECT m.*, n.name as npcName, n.role as npcRole, n.config as npcConfig
    FROM NPCMemory m
    JOIN NPC n ON m.npcId = n.id
    WHERE m.userId = ? AND m.npcId = ?
  `).get(userId, npcId) as any;

    if (!row) return null;

    return {
        ...row,
        interactions: parseJson(row.interactions, []),
        npc: {
            id: row.npcId,
            name: row.npcName,
            role: row.npcRole,
            config: parseJson(row.npcConfig, {})
        }
    };
}

export async function recordNPCInteraction(userId: string, npcId: string, interactions: any, sentiment: number) {
    const db = getDb();
    const now = new Date().toISOString();

    const existing = db.prepare('SELECT id FROM NPCMemory WHERE userId = ? AND npcId = ?').get(userId, npcId);

    if (existing) {
        db.prepare(`
      UPDATE NPCMemory 
      SET interactions = ?, sentiment = ?, lastInteractionAt = ?
      WHERE userId = ? AND npcId = ?
    `).run(JSON.stringify(interactions), sentiment, now, userId, npcId);
    } else {
        const id = randomUUID();
        db.prepare(`
      INSERT INTO NPCMemory (id, userId, npcId, interactions, sentiment, lastInteractionAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userId, npcId, JSON.stringify(interactions), sentiment, now);
    }
}
