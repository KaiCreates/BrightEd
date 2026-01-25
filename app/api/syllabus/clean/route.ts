import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { verifyAuth } from '@/lib/auth-server';

function aiCleaningEnabled() {
  return process.env.ALLOW_LOCAL_AI_CLEANING === 'true';
}

// Batch clean syllabus content
export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const { useAI = false, limit = 100 } = await request.json();

    const filePath = path.join(process.cwd(), 'syllabuses', 'output', 'combined_syllabuses.json');

    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Syllabus file not found' }, { status: 404 });
    }

    const fileContents = fs.readFileSync(filePath, 'utf8');
    const objectives = JSON.parse(fileContents);

    const cleaned = [];
    const toClean = objectives.slice(0, limit);

    for (const obj of toClean) {
      if (!obj.content || obj.content.trim().length === 0) {
        cleaned.push({ ...obj, cleanedContent: obj.content });
        continue;
      }

      // Check if content needs cleaning
      const needsCleaning = /(\d+)x(\d+)|([a-z])(\d+)|(\d+)\^(\d+)/.test(obj.content);

      if (needsCleaning) {
        let cleanedContent = obj.content;

        if (useAI && aiCleaningEnabled()) {
          try {
            // Try Ollama API
            const response = await fetch('http://localhost:11434/api/generate', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'llama3',
                prompt: `Fix this mangled PDF text into proper mathematical notation: "${obj.content}"\n\nCleaned:`,
                stream: false,
              }),
            });

            if (response.ok) {
              const data = await response.json();
              cleanedContent = data.response?.trim() || obj.content;
            }
          } catch (error) {
            // Fallback to rule-based
            cleanedContent = cleanContentFallback(obj.content);
          }
        } else {
          cleanedContent = cleanContentFallback(obj.content);
        }

        cleaned.push({
          ...obj,
          cleanedContent,
          wasCleaned: true
        });
      } else {
        cleaned.push({
          ...obj,
          cleanedContent: obj.content,
          wasCleaned: false
        });
      }
    }

    return NextResponse.json({
      cleaned,
      total: cleaned.length,
      cleanedCount: cleaned.filter(c => c.wasCleaned).length
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error cleaning syllabus:', error);
    return NextResponse.json(
      { error: 'Failed to clean syllabus' },
      { status: 500 }
    );
  }
}

function cleanContentFallback(content: string): string {
  return content
    .replace(/(\d+)x(\d+)/g, (match, base, exp) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return `${base}x${superscripts[exp] || exp}`;
    })
    .replace(/([a-z])2/g, '$1²')
    .replace(/([a-z])3/g, '$1³')
    .replace(/\s+/g, ' ')
    .trim();
}
