import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Define paths
const SQLITE_DATA_DIR = path.join(process.cwd(), 'data');
const QUESTIONS_DB_PATH = path.join(SQLITE_DATA_DIR, 'questions.db');
const STORIES_DB_PATH = path.join(process.cwd(), 'prisma', 'dev.db');

// Ensure data directory exists
if (!fs.existsSync(SQLITE_DATA_DIR)) {
    fs.mkdirSync(SQLITE_DATA_DIR, { recursive: true });
}

// Singleton instances
let questionsDbInstance: Database.Database | null = null;
let storiesDbInstance: Database.Database | null = null;

/**
 * Get a singleton connection to the questions database.
 */
export function getQuestionsDb() {
    if (questionsDbInstance) return questionsDbInstance;

    // Check if it was incorrectly initialized as JSON []
    if (fs.existsSync(QUESTIONS_DB_PATH)) {
        const content = fs.readFileSync(QUESTIONS_DB_PATH, 'utf8');
        if (content.trim() === '[]') {
            console.log("Removing legacy JSON-formatted questions.db to allow SQLite initialization.");
            fs.unlinkSync(QUESTIONS_DB_PATH);
        }
    }

    questionsDbInstance = new Database(QUESTIONS_DB_PATH);

    // Enable WAL mode for better concurrency in production
    questionsDbInstance.pragma('journal_mode = WAL');

    // Initialize schema if needed
    questionsDbInstance.exec(`
        CREATE TABLE IF NOT EXISTS Questions (
            id TEXT PRIMARY KEY,
            objectiveId TEXT,
            subjectId TEXT,
            variation INTEGER,
            questionText TEXT,
            options TEXT, -- JSON string
            correctAnswer INTEGER,
            explanation TEXT,
            storyElement TEXT,
            difficulty INTEGER DEFAULT 5,
            question_json TEXT,
            createdAt TEXT,
            updatedAt TEXT
        );
        CREATE INDEX IF NOT EXISTS idx_questions_objective ON Questions(objectiveId);
    `);

    // Migration: Add columns if they don't exist (for existing databases)
    try { questionsDbInstance.exec(`ALTER TABLE Questions ADD COLUMN difficulty INTEGER DEFAULT 5`); } catch (e) { /* Column exists */ }
    try { questionsDbInstance.exec(`ALTER TABLE Questions ADD COLUMN question_json TEXT`); } catch (e) { /* Column exists */ }

    return questionsDbInstance;
}

/**
 * Get a singleton connection to the stories database (dev.db).
 */
export function getStoriesDb() {
    if (storiesDbInstance) return storiesDbInstance;

    if (!fs.existsSync(STORIES_DB_PATH)) {
        throw new Error(`Stories database file not found at ${STORIES_DB_PATH}`);
    }

    storiesDbInstance = new Database(STORIES_DB_PATH);
    storiesDbInstance.pragma('journal_mode = WAL');

    return storiesDbInstance;
}

/**
 * Close all database connections gracefully.
 */
export function closeDatabases() {
    if (questionsDbInstance) {
        questionsDbInstance.close();
        questionsDbInstance = null;
    }
    if (storiesDbInstance) {
        storiesDbInstance.close();
        storiesDbInstance = null;
    }
}
