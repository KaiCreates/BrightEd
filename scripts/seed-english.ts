import { adminDb } from '../lib/firebase-admin';

const MOCK_QUESTIONS = [
    {
        id: 'ENG-00002_1',
        objectiveId: 'ENG-00002',
        subjectId: 'English',
        variation: 1,
        questionText: 'Which sentence uses the correct subject-verb agreement?',
        options: [
            'The group of students were loud.',
            'The group of students was loud.',
            'The students was loud.',
            'The group were loud.'
        ],
        correctAnswer: 1,
        explanation: 'The subject "group" is singular, so it takes the singular verb "was". The phrase "of students" does not change the number of the subject.',
        storyElement: 'Correct!',
        difficulty: 3,
        createdAt: new Date().toISOString()
    },
    {
        id: 'ENG-00002_2',
        objectiveId: 'ENG-00002',
        subjectId: 'English',
        variation: 2,
        questionText: 'Identify the sentence with the correct punctuation.',
        options: [
            'Its a beautiful day.',
            'It\'s a beautiful day.',
            'Its\' a beautiful day.',
            'It is a beautiful day'
        ],
        correctAnswer: 1,
        explanation: '"It\'s" is the contraction for "it is". "Its" is possessive.',
        storyElement: 'Nice job!',
        difficulty: 2,
        createdAt: new Date().toISOString()
    },
    {
        id: 'ENG-00002_3',
        objectiveId: 'ENG-00002',
        subjectId: 'English',
        variation: 3,
        questionText: 'Choose the correct form of the verb to complete the sentence: She _____ to the store yesterday.',
        options: [
            'go',
            'gone',
            'went',
            'going'
        ],
        correctAnswer: 2,
        explanation: '"Yesterday" indicates past tense, so "went" is the correct past tense form of "go".',
        storyElement: 'Perfect!',
        difficulty: 1,
        createdAt: new Date().toISOString()
    },
    {
        id: 'ENG-00002_4',
        objectiveId: 'ENG-00002',
        subjectId: 'English',
        variation: 4,
        questionText: 'Which word is a synonym for "happy"?',
        options: [
            'Sad',
            'Angry',
            'Joyful',
            'Tired'
        ],
        correctAnswer: 2,
        explanation: '"Joyful" means feeling or expressing great happiness.',
        storyElement: 'You got it!',
        difficulty: 1,
        createdAt: new Date().toISOString()
    },
    {
        id: 'ENG-00002_5',
        objectiveId: 'ENG-00002',
        subjectId: 'English',
        variation: 5,
        questionText: 'Identify the adjective in the sentence: The quick brown fox jumps over the lazy dog.',
        options: [
            'Fox',
            'Jumps',
            'Quick',
            'The'
        ],
        correctAnswer: 2,
        explanation: '"Quick" describes the noun "fox", making it an adjective.',
        storyElement: 'Great work!',
        difficulty: 2,
        createdAt: new Date().toISOString()
    }
];

async function seed() {
    console.log('Seeding mock English questions...');

    const batch = adminDb.batch();

    for (const q of MOCK_QUESTIONS) {
        const ref = adminDb.collection('questions').doc(q.id);
        batch.set(ref, q, { merge: true });
    }

    await batch.commit();
    console.log(`Seeded ${MOCK_QUESTIONS.length} questions for ENG-00002.`);
}

seed();
