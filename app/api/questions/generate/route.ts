import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import { verifyAuth } from '@/lib/auth-server';
import { FieldPath } from 'firebase-admin/firestore';
import { rateLimit, handleRateLimit } from '@/lib/rate-limit';
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
import { z } from 'zod';
import { asyncHandler } from '@/lib/utils/asyncHandler';
import { AppError } from '@/lib/errors/AppError';

// Timeouts for database operations
const DB_TIMEOUT = 5000;

const searchSchema = z.object({
  objectiveId: z.string().min(1, 'Missing objectiveId'),
  subjectId: z.string().nullable().optional(),
  variation: z.coerce.number().int().min(1).max(3).default(1),
  mastery: z.coerce.number().min(0).max(1).default(0.5),
  streak: z.coerce.number().int().min(0).default(0),
  errors: z.coerce.number().int().min(0).default(0),
  useAI: z.coerce.boolean().default(false),
});

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
    if (normalizeOptionKey(options[i] ?? '') === needle) return i;
  }
  return null;
}

interface RawCandidate {
  id?: string;
  questionId?: string;
  options?: string[];
  correctAnswer?: number | string;
  difficulty?: number;
  difficultyWeight?: number;
  contentType?: string;
  distractorSimilarity?: number;
  expectedTime?: number;
  subSkills?: string[];
  question?: string;
  questionText?: string;
  explanation?: string;
  storyElement?: string;
  questionType?: string;
  interactiveData?: Record<string, unknown>;
  topic?: string;
  subjectId?: string;
  subjectName?: string;
  objectiveId?: string;
  [key: string]: unknown;
}

function sanitizeQuestionCandidate(row: RawCandidate, objectiveId: string) {
  const rawOptions = Array.isArray(row?.options)
    ? row.options
    : typeof row?.options === 'string'
      ? (() => {
        try {
          return JSON.parse(row.options) as string[];
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

export const GET = asyncHandler(async (request: NextRequest) => {
  const limiter = rateLimit(request, 60, 60000, 'questions:generate');
  if (!limiter.success) return handleRateLimit(limiter.retryAfter!);

  const { searchParams } = new URL(request.url);
  const queryParams = Object.fromEntries(searchParams.entries());

  const result = searchSchema.safeParse(queryParams);
  if (!result.success) {
    throw new AppError(result.error.errors[0]?.message || 'Invalid parameters', 400, 'VALIDATION_ERROR');
  }

  const { objectiveId, variation, streak, errors, useAI } = result.data;
  const subjectId = result.data.subjectId ?? null;

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
  let targetDifficulty = variation === 1 ? 3 : variation === 2 ? 6 : 9;

  // Apply real-time adaptation
  if (streak >= 3) targetDifficulty = Math.min(10, targetDifficulty + 2);
  if (errors >= 2) targetDifficulty = Math.max(1, targetDifficulty - 2);

  let candidates: RawCandidate[] = await withTimeout<RawCandidate[]>(
    fetchCandidatesFromDB(objectiveId, targetDifficulty, subjectId || null),
    DB_TIMEOUT
  );

  const sanitizedCandidates = (candidates || [])
    .map((q: RawCandidate) => sanitizeQuestionCandidate(q, objectiveId))
    .filter((q): q is NonNullable<ReturnType<typeof sanitizeQuestionCandidate>> => q !== null);

  if ((candidates || []).length > 0 && sanitizedCandidates.length === 0) {
    console.warn('[questions/generate] All candidates rejected by sanitization', {
      objectiveId,
      subjectId,
      fetched: (candidates || []).length,
    });
  }

  candidates = sanitizedCandidates;

  // Exclude already-correct questions using state-based tracking
  if (userId && candidates && candidates.length > 0 && nableState.completedQuestionIds) {
    const completedSet = new Set(nableState.completedQuestionIds);

    // Priority 1: Questions never answered correctly
    const withoutCorrect = candidates.filter((q: RawCandidate) => {
      const qid = q?.questionId || q?.id;
      return !(typeof qid === 'string' && completedSet.has(qid));
    });

    if (withoutCorrect.length > 0) {
      candidates = withoutCorrect;
    } else {
      // Filter out the most recently completed question to avoid immediate repeats
      if (nableState.completedQuestionIds.length > 0) {
        const lastQid = nableState.completedQuestionIds[nableState.completedQuestionIds.length - 1];
        const notLast = candidates.filter((q: RawCandidate) => (q.questionId || q.id) !== lastQid);
        if (notLast.length > 0) candidates = notLast;
      }
    }
  }

  if (!candidates || candidates.length === 0) {
    // Try AI generation as fallback when DB is empty
    if (useAI) {
      console.warn('[questions/generate] No DB questions found, attempting AI generation for:', objectiveId);
      const aiQuestion = await generateAIQuestion(objectiveId, subjectId || null, targetDifficulty);
      if (aiQuestion) {
        console.warn('[questions/generate] AI question generated successfully');
        return NextResponse.json(formatResponse(aiQuestion, objectiveId, subjectId || null));
      }
    }
    console.warn('[questions/generate] No questions available for objective:', { objectiveId, subjectId, useAI });
    return NextResponse.json(createFallbackResponse(objectiveId, subjectId || null), { status: 200 });
  }

  // 3. Recommendation Logic
  let selectedQuestion: RawCandidate | null = null;

  if (nableState && userId) {
    const exclude: string[] = [];
    for (let i = 0; i < Math.min(5, candidates.length); i++) {
      const recResult = recommend(
        nableState,
        {
          userId,
          subject: subjectId || 'General',
          excludeQuestionIds: exclude
        },
        candidates as unknown as ContentItem[]
      );
      const qid = (recResult.question as unknown as RawCandidate)?.questionId;
      const match = qid ? candidates.find((c: RawCandidate) => (c.questionId || c.id) === qid) : null;
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

    selectedQuestion = candidates.sort((a: RawCandidate, b: RawCandidate) =>
      Math.abs((a.difficultyWeight || a.difficulty || 5) - idealDifficulty) - Math.abs((b.difficultyWeight || b.difficulty || 5) - idealDifficulty)
    )[0] || null;
  }

  if (!selectedQuestion) {
    return NextResponse.json(createFallbackResponse(objectiveId, subjectId || null), { status: 200 });
  }

  return NextResponse.json(formatResponse(selectedQuestion, objectiveId, subjectId || null));
});

async function fetchCandidatesFromDB(objectiveId: string, targetDifficulty: number, subjectId: string | null): Promise<RawCandidate[]> {
  try {
    const questionsRef = adminDb.collection('questions');
    let usedSubjectFallback = false;
    const subjectKey = subjectId ? normalizeSubjectKey(subjectId) : null;

    // 1. Try querying by 'objectiveId' field
    let snapshot = await questionsRef
      .where('objectiveId', '==', objectiveId)
      .limit(10)
      .get();

    // 2. Fallback: Query by Document ID prefix
    if (snapshot.empty && objectiveId) {
      const startId = objectiveId;
      const endId = objectiveId + '\uf8ff';

      snapshot = await questionsRef
        .where(FieldPath.documentId(), '>=', startId)
        .where(FieldPath.documentId(), '<', endId)
        .limit(10)
        .get();
    }

    // 3. Fallback: Query by Subject ID
    if (snapshot.empty && (subjectId || subjectKey)) {
      usedSubjectFallback = true;
      if (subjectKey) {
        snapshot = await questionsRef
          .where('subjectId', '==', subjectKey)
          .limit(10)
          .get();
      }

      if (snapshot.empty && subjectId) {
        snapshot = await questionsRef
          .where('subjectName', '==', subjectId)
          .limit(10)
          .get();
      }
    }

    if (snapshot.empty) return [];

    const rows = snapshot.docs.map((doc): RawCandidate => ({ id: doc.id, ...doc.data() as RawCandidate }));

    if (usedSubjectFallback) {
      const objectiveFiltered = rows.filter((q: RawCandidate) => {
        const qObj = String(q?.objectiveId || '');
        const docId = String(q?.id || '');
        return qObj === objectiveId || docId.startsWith(`${objectiveId}_`) || docId.startsWith(objectiveId);
      });

      if (objectiveFiltered.length === 0) return [];
      return processRows(objectiveFiltered, objectiveId);
    }

    let subjectFiltered = rows;

    if (subjectKey) {
      const filteredBySubject = rows.filter((q: RawCandidate) => {
        if (!q?.subjectId && !q?.subjectName) return true;
        const qSubjectIdKey = q?.subjectId ? normalizeSubjectKey(String(q.subjectId)) : '';
        const qSubjectNameKey = q?.subjectName ? normalizeSubjectKey(String(q.subjectName)) : '';
        return qSubjectIdKey === subjectKey || qSubjectNameKey === subjectKey;
      });

      if (filteredBySubject.length > 0) {
        subjectFiltered = filteredBySubject;
      }
    }

    const base = typeof targetDifficulty === 'number' && Number.isFinite(targetDifficulty) ? targetDifficulty : 5;
    const minDiff = Math.max(1, base - 5);
    const maxDiff = Math.min(10, base + 5);

    const filtered = subjectFiltered.filter((q: RawCandidate) => {
      const d = (q?.difficultyWeight as number | undefined) ?? (q?.difficulty as number | undefined) ?? 5;
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

function processRows(rows: RawCandidate[], objectiveId: string): RawCandidate[] {
  return rows.map((row) => {
    try {
      return {
        ...row,
        questionId: row.id || row.questionId || `${objectiveId}_${Math.random()}`,
        objectiveId: row.objectiveId || objectiveId,
        difficulty: (row.difficulty as number | undefined) || (row.difficultyWeight as number | undefined) || 5,
        difficultyWeight: (row.difficultyWeight as number | undefined) || (row.difficulty as number | undefined) || 5,
        contentType: row.contentType || 'standard',
        distractorSimilarity: (row.distractorSimilarity as number | undefined) ?? 0.5,
        expectedTime: (row.expectedTime as number | undefined) ?? 45,
        subSkills: row.subSkills || [objectiveId],
        options: Array.isArray(row.options) ? row.options : typeof row.options === 'string' ? JSON.parse(row.options) : [],
      } as RawCandidate;
    } catch (e) {
      console.warn('Failed to parse question row:', e);
      return null;
    }
  }).filter((r): r is RawCandidate => r !== null);
}

function formatResponse(question: RawCandidate, objectiveId: string, subjectId: string | null) {
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
        id: 2,
        type: 'outcome',
        content: question.explanation || 'Excellent work! You understood the core concept.',
        storyElement: 'Analysis'
      }
    ],
    objective: {
      id: objectiveId,
      subject: subjectId || question.subjectId || 'Subject',
      difficulty: question.difficultyWeight || question.difficulty || 5,
      title: (question.topic as string | undefined) || objectiveId
    }
  };
}

function createFallbackResponse(objectiveId: string, subjectId: string | null) {
  return {
    simulationSteps: [
      {
        id: 1,
        type: 'decision',
        content: `You've reached the end of the available questions for this module! We're constantly adding more content to BrightEd.`,
        options: ['Back to Map', 'Try Again'],
        correctAnswer: 0,
        storyElement: 'End of Path',
        questionType: 'multiple-choice'
      }
    ],
    objective: { id: objectiveId, subject: subjectId || 'General', difficulty: 1, title: 'Objective Complete' }
  };
}

interface AIResponse {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
}

async function generateAIQuestion(objectiveId: string, subjectId: string | null, difficulty: number): Promise<RawCandidate | null> {
  try {
    const ollamaCheck = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000)
    }).catch(() => null);

    if (!ollamaCheck?.ok) {
      console.warn('[questions/generate] Ollama not available, skipping AI generation');
      return null;
    }

    const prompt = `Generate a multiple choice question for a Caribbean secondary school student.

Subject: ${subjectId || 'General'}
Topic/Objective: ${objectiveId}
Difficulty Level: ${difficulty}/10 (1=easy, 10=hard)

Generate a JSON object with this exact structure:
{
  "question": "The question text (clear, concise, one sentence)",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctAnswer": 0,
  "explanation": "Brief explanation of why the answer is correct"
}

Rules:
- Only output valid JSON, no markdown formatting
- Options should be plausible but only one is correct
- Question should test understanding of the topic
- Keep it appropriate for CSEC/Caribbean high school level`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2:latest',
        prompt: prompt,
        stream: false,
        options: {
          temperature: 0.7,
          num_predict: 500
        }
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!response.ok) {
      console.error('[questions/generate] Ollama API error:', response.status);
      return null;
    }

    const result = await response.json() as { response: string };
    const responseText = result.response || '';

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[questions/generate] No JSON found in AI response');
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]) as AIResponse;

    if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length < 2) {
      console.error('[questions/generate] Invalid AI response structure');
      return null;
    }

    while (parsed.options.length < 4) {
      parsed.options.push(`Option ${String.fromCharCode(65 + parsed.options.length)}`);
    }
    const finalOptions = parsed.options.slice(0, 4);

    return {
      question: parsed.question,
      questionText: parsed.question,
      options: finalOptions,
      correctAnswer: typeof parsed.correctAnswer === 'number' ? parsed.correctAnswer : 0,
      explanation: parsed.explanation || 'Great job! You understood the concept correctly.',
      difficulty: difficulty,
      difficultyWeight: difficulty,
      questionId: `ai-${objectiveId}-${Date.now()}`,
      objectiveId: objectiveId,
      subjectId: subjectId || undefined,
      contentType: 'ai-generated',
      distractorSimilarity: 0.5,
      expectedTime: 45,
      subSkills: [objectiveId],
      storyElement: 'AI Challenge'
    };
  } catch (error) {
    console.error('[questions/generate] AI generation error:', error);
    return null;
  }
}