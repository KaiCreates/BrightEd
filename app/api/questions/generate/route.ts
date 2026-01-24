import { NextRequest, NextResponse } from 'next/server';
import { getQuestionsDb } from '@/lib/db';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import {
  recommend,
  loadState,
  createInitialState,
  NABLEState,
  ContentItem
} from '@/lib/nable';

// Timeouts for database operations
const DB_TIMEOUT = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Operation timed out')), timeoutMs)
    ),
  ]);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const objectiveId = searchParams.get('objectiveId');
    const subjectId = searchParams.get('subjectId');
    const variation = parseInt(searchParams.get('variation') || '1');
    const masteryParam = parseFloat(searchParams.get('mastery') || '0.5');

    if (!objectiveId) {
      return NextResponse.json({ error: 'Missing objectiveId' }, { status: 400 });
    }

    // 1. Authenticate & Load NABLE State
    let nableState: NABLEState | null = null;
    let userId: string | null = null;

    try {
      // Pass the actual request to verifyAuth
      const decodedToken = await verifyAuth(request);
      userId = decodedToken.uid;

      const nableRef = adminDb.collection('users').doc(userId).collection('nable').doc('state');
      const nableDoc = await nableRef.get();

      nableState = nableDoc.exists
        ? loadState(userId, nableDoc.data() as Partial<NABLEState>)
        : createInitialState(userId);
    } catch (e) {
      console.warn('Proceeding in Legacy Mode: Auth failed or missing');
    }

    // 2. Fetch Candidates with Target Difficulty
    // Variation 1 = Easy, 2 = Medium, 3 = Hard
    const targetDifficulty = variation === 1 ? 3 : variation === 2 ? 6 : 9;

    const candidates = await withTimeout(
      fetchCandidatesFromDB(objectiveId, targetDifficulty),
      DB_TIMEOUT
    );

    if (!candidates || candidates.length === 0) {
      return NextResponse.json(createFallbackResponse(objectiveId, subjectId), { status: 200 });
    }

    // 3. Recommendation Logic
    let selectedQuestion: any = null;

    if (nableState && userId) {
      const result = recommend(
        nableState,
        {
          userId,
          subject: subjectId || 'General',
          excludeQuestionIds: [] // Can be populated from state.sessionQuestions
        },
        candidates as ContentItem[]
      );
      selectedQuestion = result.question;
    }

    // 4. Fallback: Closest Difficulty Match
    if (!selectedQuestion) {
      const idealDifficulty = nableState
        ? (nableState.lastDifficulty || targetDifficulty)
        : targetDifficulty;

      selectedQuestion = candidates.sort((a, b) =>
        Math.abs((a.difficulty || 5) - idealDifficulty) - Math.abs((b.difficulty || 5) - idealDifficulty)
      )[0];
    }

    return NextResponse.json(formatResponse(selectedQuestion, objectiveId, subjectId));

  } catch (error: any) {
    console.error('Generation API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

async function fetchCandidatesFromDB(objectiveId: string, targetDifficulty: number) {
  try {
    const db = getQuestionsDb();

    // Query using correct column names (camelCase to match schema)
    const query = `
      SELECT id, objectiveId, subjectId, questionText, options, correctAnswer, 
             explanation, storyElement, difficulty, question_json
      FROM Questions 
      WHERE objectiveId = ? 
      AND difficulty BETWEEN ? AND ?
      LIMIT 20
    `;

    const stmt = db.prepare(query);
    // Fetch range (e.g., if target is 6, fetch 4-8)
    const rows = stmt.all(objectiveId, targetDifficulty - 2, targetDifficulty + 2) as any[];

    // If no specific difficulty found, broaden search
    if (rows.length === 0) {
      const fallbackStmt = db.prepare(`
        SELECT id, objectiveId, subjectId, questionText, options, correctAnswer, 
               explanation, storyElement, difficulty, question_json
        FROM Questions WHERE objectiveId = ? LIMIT 20
      `);
      const fallbackRows = fallbackStmt.all(objectiveId) as any[];
      return processRows(fallbackRows, objectiveId);
    }

    return processRows(rows, objectiveId);
  } catch (error) {
    console.error('DB Fetch Error:', error);
    return [];
  }
}

function processRows(rows: any[], objectiveId: string) {
  return rows.map(row => {
    try {
      // Try to use question_json first if available
      if (row.question_json) {
        const q = JSON.parse(row.question_json);
        return {
          ...q,
          questionId: q.id || q.questionId || row.id || `${objectiveId}_${Math.random()}`,
          difficulty: q.difficulty || row.difficulty || 5,
          subSkills: q.subSkills || [objectiveId],
        };
      }

      // Fallback: Build question object from individual columns
      const options = row.options ? JSON.parse(row.options) : [];
      return {
        id: row.id || `${objectiveId}_${Math.random()}`,
        questionId: row.id || `${objectiveId}_${Math.random()}`,
        question: row.questionText,
        questionText: row.questionText,
        options,
        correctAnswer: row.correctAnswer ?? 0,
        explanation: row.explanation || '',
        storyElement: row.storyElement || 'Challenge',
        difficulty: row.difficulty || 5,
        subjectId: row.subjectId,
        objectiveId: row.objectiveId,
        subSkills: [objectiveId],
      };
    } catch (e) {
      console.warn('Failed to parse row:', e);
      return null;
    }
  }).filter(Boolean);
}

function formatResponse(question: any, objectiveId: string, subjectId: string | null) {
  return {
    simulationSteps: [
      {
        id: 1,
        type: 'decision',
        content: question.question || question.questionText || "Question text missing",
        options: question.options || [],
        correctAnswer: question.correctAnswer ?? 0,
        storyElement: question.storyElement || 'Challenge',
        questionType: question.questionType || 'multiple-choice',
        interactiveData: question.interactiveData || {}
      },
      {
        id: 2, // The Outcome step expected by your Frontend
        type: 'outcome',
        content: question.explanation || 'Excellent work! You understood the core concept.',
        storyElement: 'Analysis'
      }
    ],
    objective: {
      id: objectiveId,
      subject: subjectId || question.subjectId || 'Subject',
      difficulty: question.difficulty || 5,
      title: question.topic || objectiveId
    }
  };
}

function createFallbackResponse(objectiveId: string, subjectId: string | null) {
  // Exactly matches the frontend's expected structure even on failure
  return {
    simulationSteps: [
      {
        id: 1,
        type: 'decision',
        content: `We're out of new questions for ${objectiveId}. Would you like to review what you've learned?`,
        options: ['Back to Map', 'Try Again'],
        correctAnswer: 0,
        storyElement: 'End of Path',
        questionType: 'multiple-choice'
      }
    ],
    objective: { id: objectiveId, subject: subjectId || 'General', difficulty: 1, title: 'Objective Complete' }
  };
}