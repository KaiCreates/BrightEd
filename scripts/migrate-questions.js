const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const admin = require('firebase-admin');

function loadServiceAccount() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  if (explicitPath && fs.existsSync(explicitPath)) {
    return JSON.parse(fs.readFileSync(explicitPath, 'utf8'));
  }

  const rootDir = process.cwd();
  const files = fs.readdirSync(rootDir);
  const serviceAccountFile = files.find((f) => f.includes('firebase-adminsdk') && f.endsWith('.json'));
  if (!serviceAccountFile) {
    throw new Error('No Firebase Service Account key file (*firebase-adminsdk*.json) found in project root, and FIREBASE_SERVICE_ACCOUNT_PATH is not set.');
  }

  const serviceAccountPath = path.join(rootDir, serviceAccountFile);
  return JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
}

function getAdminDb() {
  if (admin.apps.length > 0) return admin.firestore();
  const serviceAccount = loadServiceAccount();
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`,
  });
  return admin.firestore();
}

function tableExists(db, tableName) {
  const row = db
    .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name = ?")
    .get(tableName);
  return !!row;
}

function getTableRowCount(db, tableName) {
  try {
    const row = db.prepare(`SELECT COUNT(*) as c FROM "${tableName}"`).get();
    return Number(row?.c ?? 0);
  } catch {
    return 0;
  }
}

function safeJsonParse(value, fallback) {
  try {
    if (typeof value === 'string') return JSON.parse(value);
    return value ?? fallback;
  } catch {
    return fallback;
  }
}

function normalizeQuestionRow(row, sourceTable) {
  const nowIso = new Date().toISOString();

  if (sourceTable === 'json') {
    return {
      id: row.id,
      data: {
        id: row.id,
        objectiveId: row.objectiveId,
        subjectId: row.subjectId,
        variation: Number(row.variation ?? 1),
        questionText: row.questionText || '',
        options: typeof row.options === 'string' ? safeJsonParse(row.options, []) : (row.options || []),
        correctAnswer: Number(row.correctAnswer ?? 0),
        explanation: row.explanation || '',
        storyElement: row.storyElement || 'Challenge',
        difficulty: Number(row.difficulty ?? 5),
        topic: row.topic || null,
        createdAt: row.createdAt || nowIso,
        updatedAt: row.updatedAt || nowIso,
        migratedAt: nowIso,
      },
    };
  }

  if (sourceTable === 'Questions') {
    const questionJson = safeJsonParse(row.question_json, null);

    const questionText = row.questionText || questionJson?.question || '';
    const options = Array.isArray(row.options) ? row.options : safeJsonParse(row.options, questionJson?.options || []);

    return {
      id: row.id,
      data: {
        id: row.id,
        objectiveId: row.objectiveId,
        subjectId: row.subjectId,
        variation: Number(row.variation ?? 1),
        questionText,
        options,
        correctAnswer: Number(row.correctAnswer ?? questionJson?.correctAnswer ?? 0),
        explanation: row.explanation || questionJson?.explanation || '',
        storyElement: row.storyElement || questionJson?.storyElement || 'Challenge',
        difficulty: Number(row.difficulty ?? 5),
        topic: row.topic || null,
        createdAt: row.createdAt || nowIso,
        updatedAt: row.updatedAt || nowIso,
        migratedAt: nowIso,
      },
    };
  }

  // Legacy generator schema (generate_questions.py)
  // columns: id, subject_id, objective_id, topic, difficulty, variation, question_json, created_at
  const qJson = safeJsonParse(row.question_json, {});
  const options = Array.isArray(qJson.options) ? qJson.options : [];

  return {
    id: row.id,
    data: {
      id: row.id,
      objectiveId: row.objective_id,
      subjectId: row.subject_id,
      variation: Number(row.variation ?? 1),
      topic: row.topic || null,
      difficulty: Number(row.difficulty ?? 5),
      questionText: qJson.question || '',
      options,
      correctAnswer: Number(qJson.correctAnswer ?? 0),
      explanation: qJson.explanation || '',
      storyElement: qJson.storyElement || 'Challenge',
      createdAt: row.created_at || nowIso,
      migratedAt: nowIso,
    },
  };
}

async function migrate() {
  const adminDb = getAdminDb();

  const dbPath = path.join(process.cwd(), 'data', 'questions.db');
  if (!fs.existsSync(dbPath)) {
    throw new Error(`SQLite DB not found at ${dbPath}`);
  }

  const sqlite = new Database(dbPath, { readonly: true });

  const candidates = ['Questions', 'questions'].filter((t) => tableExists(sqlite, t));
  if (candidates.length === 0) {
    throw new Error('No recognized questions table found. Expected "Questions" or "questions".');
  }

  const counts = candidates.map((t) => ({ table: t, count: getTableRowCount(sqlite, t) }));
  counts.sort((a, b) => b.count - a.count);
  const sourceTable = counts[0].table;

  console.log('Detected question tables:', counts);
  console.log(`Starting migration from SQLite table: ${sourceTable}`);

  let rows = sqlite.prepare(`SELECT * FROM "${sourceTable}"`).all();

  // If DB is empty, fallback to JSON file (useful for early dev seeding)
  if (!rows || rows.length === 0) {
    const jsonPath = path.join(process.cwd(), 'data', 'questions.json');
    if (fs.existsSync(jsonPath)) {
      try {
        const fileContent = fs.readFileSync(jsonPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        if (Array.isArray(parsed) && parsed.length > 0) {
          console.log(`SQLite has 0 rows. Falling back to JSON: ${jsonPath}`);
          rows = parsed;
          // Use a synthetic sourceTable marker so normalizeQuestionRow can adapt.
          // eslint-disable-next-line no-var
          var sourceTable = 'json';
        }
      } catch (e) {
        console.warn('Failed to read/parse questions.json fallback:', e?.message || e);
      }
    }
  }

  console.log(`Found ${rows.length} rows in SQLite.`);
  if (rows.length === 0) {
    console.log('No questions to migrate.');
    return;
  }

  const batchSize = 400; // Firestore batch limit is 500
  let totalMigrated = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    const batch = adminDb.batch();

    for (const row of slice) {
      const normalized = normalizeQuestionRow(row, sourceTable);
      if (!normalized.id) continue;

      // Sanity: require objectiveId + subjectId
      if (!normalized.data.objectiveId || !normalized.data.subjectId) continue;

      const ref = adminDb.collection('questions').doc(String(normalized.id));
      batch.set(ref, normalized.data, { merge: true });
    }

    await batch.commit();
    totalMigrated += slice.length;
    console.log(`Migrated ~${totalMigrated}/${rows.length}...`);
  }

  console.log(`Migration complete. Total rows processed: ${rows.length}`);
}

migrate().catch((err) => {
  console.error('Migration failed:', err);
  process.exitCode = 1;
});
