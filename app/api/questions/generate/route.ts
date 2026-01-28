import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { FieldPath } from 'firebase-admin/firestore';
import {
  recommend,
  loadState,
  createInitialState,
  NABLEState,
  ContentItem,
  normalizeQuestion,
  padOptions,
  isAllOfAbove,
  isNoneOfAbove,
  isEmptyOption,
  isMarksOnly,
  isLetterOnly
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

function normalizeOptionKey(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\s+/g, ' ');
}

function normalizeSubjectKey(s: string): string {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_]/g, '');
}

function hasDuplicateOptions(options: string[]): boolean {
  const seen = new Set<string>();
  for (const opt of options) {
    const key = normalizeOptionKey(opt);
    if (!key) return true;
    if (seen.has(key)) return true;
    seen.add(key);
  }
  return false;
}

function coerceCorrectAnswerIndex(raw: unknown, optionCount: number): number | null {
  if (optionCount <= 0) return null;

  let idx: number | null = null;
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    idx = Math.trunc(raw);
  } else if (typeof raw === 'string') {
    const t = raw.trim();
    if (/^[A-D]$/i.test(t)) {
      idx = t.toUpperCase().charCodeAt(0) - 65;
    } else if (/^\d+$/.test(t)) {
      idx = parseInt(t, 10);
    }
  }

  if (idx === null) return null;

  if (idx >= 0 && idx < optionCount) return idx;
  if (idx >= 1 && idx <= optionCount) return idx - 1;
  return null;
}

function coerceCorrectAnswerFromText(raw: unknown, options: string[]): number | null {
  if (typeof raw !== 'string') return null;
  const needle = normalizeOptionKey(raw);
  if (!needle) return null;

  for (let i = 0; i < options.length; i++) {
    if (normalizeOptionKey(options[i]) === needle) return i;
  }
  return null;
}

function sanitizeQuestionCandidate(row: any, objectiveId: string) {
  const rawOptions = Array.isArray(row?.options)
    ? row.options
    : typeof row?.options === 'string'
      ? (() => {
        try {
          return JSON.parse(row.options);
        } catch {
          return [];
        }
      })()
      : [];

  const padded = padOptions(rawOptions, 4);
  const normalized = normalizeQuestion(padded);

  const normalizedOptions = normalized.normalizedOptions;
  const hasMeta = normalizedOptions.some((opt) => isAllOfAbove(opt) || isNoneOfAbove(opt));
  if (!normalized.isValid || hasMeta) return null;

  if (hasDuplicateOptions(normalizedOptions)) return null;
  if (normalizedOptions.some((opt) => isEmptyOption(opt) || isMarksOnly(opt) || isLetterOnly(opt))) return null;
  if (normalizedOptions.some((opt) => /^\[Option\s+[A-D]\s+-\s+/i.test(opt))) return null;

  const coercedCorrect =
    coerceCorrectAnswerIndex(row?.correctAnswer, normalizedOptions.length) ??
    coerceCorrectAnswerFromText(row?.correctAnswer, normalizedOptions);
  if (coercedCorrect === null) return null;
  const correctText = normalizedOptions[coercedCorrect] || '';
  if (/^\[Option\s+[A-D]\s+-\s+/i.test(correctText)) return null;

  const rawDifficulty = typeof row?.difficulty === 'number' && Number.isFinite(row.difficulty)
    ? row.difficulty
    : (typeof row?.difficultyWeight === 'number' && Number.isFinite(row.difficultyWeight)
      ? row.difficultyWeight
      : 5);

  const difficulty = (!('difficultyWeight' in (row || {})) && rawDifficulty >= 1 && rawDifficulty <= 3)
    ? rawDifficulty * 3
    : rawDifficulty;

  return {
    ...row,
    objectiveId: row.objectiveId || objectiveId,
    questionId: row.questionId || row.id || `${objectiveId}_${Math.random()}`,
    options: normalizedOptions,
    correctAnswer: coercedCorrect,
    difficulty,
    difficultyWeight: typeof row?.difficultyWeight === 'number' && Number.isFinite(row.difficultyWeight)
      ? row.difficultyWeight
      : difficulty,
    contentType: row.contentType || 'standard',
    distractorSimilarity: typeof row?.distractorSimilarity === 'number' && Number.isFinite(row.distractorSimilarity)
      ? row.distractorSimilarity
      : 0.5,
    expectedTime: typeof row?.expectedTime === 'number' && Number.isFinite(row.expectedTime)
      ? row.expectedTime
      : 45,
    subSkills: Array.isArray(row?.subSkills) && row.subSkills.length > 0 ? row.subSkills : [objectiveId],
  };
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
    const decodedToken = await verifyAuth(request);
    const userId = decodedToken.uid;

    const nableRef = adminDb.collection('users').doc(userId).collection('nable').doc('state');
    const nableDoc = await nableRef.get();

    const nableState: NABLEState = nableDoc.exists
      ? loadState(userId, nableDoc.data() as Partial<NABLEState>)
      : createInitialState(userId);

    // 2. Fetch Candidates with Target Difficulty
    // Variation 1 = Easy, 2 = Medium, 3 = Hard
    const targetDifficulty = variation === 1 ? 3 : variation === 2 ? 6 : 9;

    let candidates: any[] = await withTimeout<any[]>(
      fetchCandidatesFromDB(objectiveId, targetDifficulty, subjectId),
      DB_TIMEOUT
    );

    const sanitizedCandidates = (candidates || [])
      .map((q: any) => sanitizeQuestionCandidate(q, objectiveId))
      .filter(Boolean);

    candidates = sanitizedCandidates;

    // Exclude already-correct questions (and very recently attempted ones) so users don't see repeats.
    // However, if we run out of new questions, we MUST repeat them rather than showing an error.
    let isReviewMode = false;

    if (userId && candidates && candidates.length > 0) {
      const correctIds = new Set<string>();
      const attemptIds = new Set<string>();

      try {
        const correctSnap = await adminDb
          .collection('users')
          .doc(userId)
          .collection('correct_questions')
          .limit(500)
          .get();

        correctSnap.docs.forEach((d) => correctIds.add(d.id));
      } catch (e) {
        // ignore (no index / no permissions)
      }

      let attemptsSnap: FirebaseFirestore.QuerySnapshot | null = null;
      try {
        attemptsSnap = await adminDb
          .collection('users')
          .doc(userId)
          .collection('question_attempts')
          .orderBy('timestamp', 'desc')
          .limit(20)
          .get();

        attemptsSnap.docs.forEach((d) => {
          const qid = d.get('questionId');
          if (typeof qid === 'string' && qid) attemptIds.add(qid);
        });
      } catch (e) {
        // ignore
      }

      // Priority 1: Questions never answered correctly
      const withoutCorrect = candidates.filter((q: any) => {
        const qid = q?.questionId || q?.id;
        return !(typeof qid === 'string' && correctIds.has(qid));
      });

      // Priority 2: Questions never attempted at all (fresh)
      const withoutAttempts = withoutCorrect.filter((q: any) => {
        const qid = q?.questionId || q?.id;
        return !(typeof qid === 'string' && attemptIds.has(qid));
      });

      if (withoutAttempts.length > 0) {
        candidates = withoutAttempts;
      } else if (withoutCorrect.length > 0) {
        candidates = withoutCorrect; // Retry wrong answers
      } else {
        // Priority 3: Review Mode (Repeat correct questions if that's all we have)
        // We do strictly nothing here to candidates, effectively resetting the pool to full
        // but we flag it for the UI/Evaluation logic if needed.
        isReviewMode = true;

        // Filter out the *immediately* previous question to avoid back-to-back repeats if possible
        if (attemptsSnap && !attemptsSnap.empty) {
          const lastAttemptDoc = attemptsSnap.docs[0];
          const lastQid = lastAttemptDoc.get('questionId');
          if (lastQid) {
            const notLast = candidates.filter((q: any) => (q.questionId || q.id) !== lastQid);
            if (notLast.length > 0) candidates = notLast;
          }
        }
      }
    }

    if (!candidates || candidates.length === 0) {
      // This only happens if the DB is truly empty for this objective
      return NextResponse.json(createFallbackResponse(objectiveId, subjectId), { status: 200 });
    }

    // 3. Recommendation Logic
    let selectedQuestion: any = null;

    if (nableState && userId) {
      const exclude: string[] = [];
      for (let i = 0; i < Math.min(5, candidates.length); i++) {
        const result = recommend(
          nableState,
          {
            userId,
            subject: subjectId || 'General',
            excludeQuestionIds: exclude
          },
          candidates as ContentItem[]
        );
        const qid = (result.question as any)?.questionId;
        const match = qid ? candidates.find((c: any) => (c.questionId || c.id) === qid) : null;
        if (match) {
          selectedQuestion = match;
          break;
        }
        if (qid) exclude.push(qid);
        else break;
      }
    }

    // 4. Fallback: Closest Difficulty Match
    if (!selectedQuestion) {
      const idealDifficulty = nableState
        ? (nableState.lastDifficulty || targetDifficulty)
        : targetDifficulty;

      selectedQuestion = candidates.sort((a: any, b: any) =>
        Math.abs((a.difficultyWeight || a.difficulty || 5) - idealDifficulty) - Math.abs((b.difficultyWeight || b.difficulty || 5) - idealDifficulty)
      )[0];
    }

    return NextResponse.json(formatResponse(selectedQuestion, objectiveId, subjectId));
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (process.env.NODE_ENV === 'development') console.error('Generation API Error');
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

async function fetchCandidatesFromDB(objectiveId: string, targetDifficulty: number, subjectId: string | null) {
  try {
    const questionsRef = adminDb.collection('questions');
    let usedSubjectFallback = false;
    const subjectKey = subjectId ? normalizeSubjectKey(subjectId) : null;

    // 1. Try querying by 'objectiveId' field
    let snapshot = await questionsRef
      .where('objectiveId', '==', objectiveId)
      .limit(50)
      .get();

    // 2. Fallback: Query by Document ID prefix
    if (snapshot.empty && objectiveId) {
      const startId = objectiveId;
      const endId = objectiveId + '\uf8ff';

      snapshot = await questionsRef
        .where(FieldPath.documentId(), '>=', startId)
        .where(FieldPath.documentId(), '<', endId)
        .limit(50)
        .get();
    }

    // 3. Fallback: Query by Subject ID (we will NOT serve cross-objective questions)
    if (snapshot.empty && subjectId) {
      usedSubjectFallback = true;
      snapshot = await questionsRef
        .where('subjectId', '==', subjectId)
        .limit(50)
        .get();
    }

    if (snapshot.empty) return [];

    const rows = snapshot.docs.map((doc): any => ({ id: doc.id, ...doc.data() }));

    // Avoid serving cross-objective questions (misaligned with learning path)
    if (usedSubjectFallback) return [];

    let subjectFiltered = rows;

    if (subjectKey) {
      const filteredBySubject = rows.filter((q: any) => {
        if (!q?.subjectId && !q?.subjectName) return true;
        const qSubjectIdKey = q?.subjectId ? normalizeSubjectKey(String(q.subjectId)) : '';
        const qSubjectNameKey = q?.subjectName ? normalizeSubjectKey(String(q.subjectName)) : '';
        return qSubjectIdKey === subjectKey || qSubjectNameKey === subjectKey;
      });

      // If objectiveId matched but subject key didn't, do NOT wipe the pool.
      // This happens when the client sends subject display-name (e.g. "Principles of Business")
      // but Firestore stores a slug (e.g. "principles_of_business").
      if (filteredBySubject.length > 0) {
        subjectFiltered = filteredBySubject;
      }
    }

    const base = typeof targetDifficulty === 'number' && Number.isFinite(targetDifficulty) ? targetDifficulty : 5;
    const minDiff = Math.max(1, base - 5);
    const maxDiff = Math.min(10, base + 5);

    const filtered = subjectFiltered.filter((q: any) => {
      const d = q?.difficultyWeight ?? q?.difficulty ?? 5;
      return d >= minDiff && d <= maxDiff;
    });

    if (filtered.length === 0) {
      return processRows(subjectFiltered, objectiveId);
    }

    return processRows(filtered, objectiveId);
  } catch (error) {
    console.error('Firestore Fetch Error:', error);
    return [];
  }
}

function processRows(rows: any[], objectiveId: string) {
  return rows.map((row) => {
    try {
      return {
        ...row,
        questionId: row.id || row.questionId || `${objectiveId}_${Math.random()}`,
        objectiveId: row.objectiveId || objectiveId,
        difficulty: row.difficulty || row.difficultyWeight || 5,
        difficultyWeight: row.difficultyWeight || row.difficulty || 5,
        contentType: row.contentType || 'standard',
        distractorSimilarity: row.distractorSimilarity ?? 0.5,
        expectedTime: row.expectedTime ?? 45,
        subSkills: row.subSkills || [objectiveId],
        options: typeof row.options === 'string' ? JSON.parse(row.options) : (row.options || []),
      };
    } catch (e) {
      console.warn('Failed to parse question row:', e);
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
        questionId: question.questionId || question.id || null,
        content: question.question || question.questionText || "Question text missing",
        options: question.options || [],
        correctAnswer: question.correctAnswer ?? 0,
        subSkills: question.subSkills || [objectiveId],
        questionDifficulty: question.difficultyWeight || question.difficulty || 5,
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
      difficulty: question.difficultyWeight || question.difficulty || 5,
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