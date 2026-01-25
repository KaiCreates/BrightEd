import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyAuth } from '@/lib/auth-server';

 export const dynamic = 'force-dynamic';

interface SyllabusObjective {
  id: string;
  section: string;
  subsection: string;
  objective: string;
  content: string;
  specific_objectives: string[];
  content_items: string[];
  difficulty: number;
  page_number: number;
  keywords: string[];
  hash: string;
  source_file: string;
  extraction_date: string;
}

const mockData: SyllabusObjective[] = [
  {
    id: "OBJ-00001",
    objective: "Algebra Fundamentals",
    section: "Mathematics",
    subsection: "Unknown",
    difficulty: 1,
    content: "Understanding variables and equations.",
    specific_objectives: [],
    content_items: [],
    page_number: 1,
    keywords: [],
    hash: "",
    source_file: "Mathematics.pdf",
    extraction_date: ""
  }
];

export async function GET(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { searchParams } = new URL(request.url);
    const subject = searchParams.get('subject');
    const difficulty = searchParams.get('difficulty');

    const filePath = path.join(process.cwd(), 'syllabuses', 'output', 'combined_syllabuses.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json(mockData);
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    let data: SyllabusObjective[] = JSON.parse(fileContents);

    // Filter by subject if provided
    if (subject) {
      data = data.filter(obj =>
        obj.source_file.toLowerCase().includes(subject.toLowerCase()) ||
        obj.section.toLowerCase().includes(subject.toLowerCase())
      );
    }

    // Filter by difficulty if provided
    if (difficulty) {
      const diffNum = parseInt(difficulty);
      data = data.filter(obj => obj.difficulty === diffNum);
    }

    // Limit results for performance
    return NextResponse.json(data.slice(0, 1000));
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error loading syllabus:', error);
    return NextResponse.json({ error: 'Failed to load syllabus data' }, { status: 500 });
  }
}
