import { getQuestionsDb } from './db';
import { randomUUID } from 'crypto';

export interface StoredQuestion {
    id: string;
    objectiveId: string;
    subjectId: string;
    variation: number;
    questionText: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    storyElement: string;
    createdAt: string;
    updatedAt?: string;
}

// --- Question Access ---

export async function getQuestionFromStore(
    objectiveId: string,
    variation: number
): Promise<StoredQuestion | undefined> {
    const db = getQuestionsDb();
    const row = db.prepare('SELECT * FROM Questions WHERE objectiveId = ? AND variation = ?').get(objectiveId, variation);
    if (!row) return undefined;

    return {
        ...row,
        options: JSON.parse(row.options)
    };
}

export async function getQuestionsByObjective(objectiveId: string): Promise<StoredQuestion[]> {
    const db = getQuestionsDb();
    const rows = db.prepare('SELECT * FROM Questions WHERE objectiveId = ?').all(objectiveId);
    return rows.map((r: any) => ({
        ...r,
        options: JSON.parse(r.options)
    }));
}

export async function getQuestionsBySubject(subjectId: string): Promise<StoredQuestion[]> {
    const db = getQuestionsDb();
    const rows = db.prepare('SELECT * FROM Questions WHERE subjectId = ?').all(subjectId);
    return rows.map((r: any) => ({
        ...r,
        options: JSON.parse(r.options)
    }));
}

export async function getAllQuestions(): Promise<StoredQuestion[]> {
    const db = getQuestionsDb();
    const rows = db.prepare('SELECT * FROM Questions').all();
    return rows.map((r: any) => ({
        ...r,
        options: JSON.parse(r.options)
    }));
}

export async function saveQuestionToStore(question: StoredQuestion): Promise<boolean> {
    const db = getQuestionsDb();
    const now = new Date().toISOString();

    const data = {
        ...question,
        id: question.id || randomUUID(),
        options: JSON.stringify(question.options),
        updatedAt: now,
        createdAt: question.createdAt || now
    };

    const stmt = db.prepare(`
        INSERT INTO Questions (id, objectiveId, subjectId, variation, questionText, options, correctAnswer, explanation, storyElement, createdAt, updatedAt)
        VALUES (@id, @objectiveId, @subjectId, @variation, @questionText, @options, @correctAnswer, @explanation, @storyElement, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
            objectiveId=excluded.objectiveId,
            subjectId=excluded.subjectId,
            variation=excluded.variation,
            questionText=excluded.questionText,
            options=excluded.options,
            correctAnswer=excluded.correctAnswer,
            explanation=excluded.explanation,
            storyElement=excluded.storyElement,
            updatedAt=excluded.updatedAt
    `);

    stmt.run(data);
    return true;
}

export async function deleteQuestion(objectiveId: string, variation: number): Promise<boolean> {
    const db = getQuestionsDb();
    const result = db.prepare('DELETE FROM Questions WHERE objectiveId = ? AND variation = ?').run(objectiveId, variation);
    return result.changes > 0;
}

export async function batchSaveQuestions(questions: StoredQuestion[]): Promise<boolean> {
    const db = getQuestionsDb();
    const now = new Date().toISOString();

    const insert = db.prepare(`
        INSERT INTO Questions (id, objectiveId, subjectId, variation, questionText, options, correctAnswer, explanation, storyElement, createdAt, updatedAt)
        VALUES (@id, @objectiveId, @subjectId, @variation, @questionText, @options, @correctAnswer, @explanation, @storyElement, @createdAt, @updatedAt)
        ON CONFLICT(id) DO UPDATE SET
            objectiveId=excluded.objectiveId,
            subjectId=excluded.subjectId,
            variation=excluded.variation,
            questionText=excluded.questionText,
            options=excluded.options,
            correctAnswer=excluded.correctAnswer,
            explanation=excluded.explanation,
            storyElement=excluded.storyElement,
            updatedAt=excluded.updatedAt
    `);

    const transaction = db.transaction((qs: StoredQuestion[]) => {
        for (const q of qs) {
            insert.run({
                ...q,
                id: q.id || randomUUID(),
                options: JSON.stringify(q.options),
                updatedAt: now,
                createdAt: q.createdAt || now
            });
        }
    });

    transaction(questions);
    return true;
}