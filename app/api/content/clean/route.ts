import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';

interface CleanRequest {
  content: string;
  useAI?: boolean;
}

function aiCleaningEnabled() {
  return process.env.ALLOW_LOCAL_AI_CLEANING === 'true';
}

// Pattern detection for mangled PDF text
const MANGLE_PATTERNS = [
  /(\d+)x(\d+)/g, // 3x2 -> 3x²
  /(\d+)\^(\d+)/g, // 3^2 -> 3²
  /([a-z])(\d+)/g, // x2 -> x²
  /(\d+)\s*([a-z])\s*(\d+)/g, // 3 x 2 -> 3x²
  /\b[A-Za-z]+-\s*\n\s*[A-Za-z]+\b/g, // hyphenated words across lines
];

// Fallback cleaning function (works without AI)
function cleanContentFallback(content: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  let cleaned = content;

  // 1. Fix Broken layout and Hyphenation
  cleaned = cleaned
    // Join words split by hyphenation at line breaks (e.g. "contin-\nued" -> "continued")
    .replace(/([a-z]+)-\s*\n\s*([a-z]+)/gi, '$1$2')
    // Remove excessive newlines that break sentences (simple heuristic: newline not preceded by punctuation)
    .replace(/([^\.\!\?\:])\n+([a-z])/g, '$1 $2');

  // 2. Fix Ligatures and Encoding Artifacts
  cleaned = cleaned
    .replace(/ﬁ/g, 'fi')
    .replace(/ﬂ/g, 'fl')
    .replace(/ﬀ/g, 'ff')
    .replace(/ﬃ/g, 'ffi')
    .replace(/ﬄ/g, 'ffl')
    .replace(/’/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, '-');

  // 3. Mathematical Notation Repair
  cleaned = cleaned
    // Fix superscripts: 3x2 -> 3x², x^2 -> x²
    .replace(/(\d+)x(\d+)/g, (match, base, exp) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return `${base}x${superscripts[exp] || exp}`;
    })
    .replace(/([a-z])2/g, '$1²')
    .replace(/([a-z])3/g, '$1³')
    .replace(/\^(\d+)/g, (match, exp) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return exp.split('').map((n: string) => superscripts[n] || n).join('');
    })
    // Fix subscripts: H2O -> H₂O (chemical or variable indices)
    .replace(/([A-Zn])(\d+)/g, (match, letter, num) => {
      const subscripts: { [key: string]: string } = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
      };
      // Simple heuristic: Assume capital letter + number often equals subscript (H2O, P1)
      // but avoid common algebra like 3X or dates like Y2K unless strictly defined context
      // For safety, we stick to common chemical or variable patterns
      return letter + num.split('').map((n: string) => subscripts[n] || n).join('');
    })
    // Fix standard fractions: 1/2 -> ½
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    // Fix common operators
    .replace(/x\s*\*\s*x/g, '×') // poor man's multiplication check
    .replace(/<=/g, '≤')
    .replace(/>=/g, '≥')
    .replace(/!=/g, '≠')
    .replace(/\+-/g, '±');

  // 4. General Formatting
  cleaned = cleaned
    .replace(/\.\.\./g, '…')
    .replace(/\s+/g, ' ') // Collapse multiple spaces
    .trim();

  return cleaned;
}

// Check if content looks mangled
function isMangled(content: string): boolean {
  if (!content || content.length < 3) return false;

  // Check for common mangling patterns
  const hasManglePattern = MANGLE_PATTERNS.some(pattern => pattern.test(content));
  const hasMultipleNumbers = (content.match(/\d+/g) || []).length > 2;
  const hasNoSpacesBetweenNumbers = /\d+[a-z]\d+/.test(content);
  // Check for broken ligatures or odd spacing
  const hasHyphenation = /\b[a-z]+-\s+/.test(content);

  return hasManglePattern || (hasMultipleNumbers && hasNoSpacesBetweenNumbers) || hasHyphenation;
}

// Call Ollama Llama 3 API
async function cleanWithAI(content: string): Promise<string> {
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `System: You are an expert academic text cleaner. Your goal is to repair text extracted from PDFs that may have encoding issues, broken lines, or mangled mathematical notation.
        
Instructions:
1. Fix broken hyphenation (e.g., "con- tinued" -> "continued").
2. Convert pseudo-math to proper unicode (e.g., "x^2" -> "x²", "1/2" -> "½", "3x2" -> "3x²").
3. Fix chemical formulas if present (e.g., "H2O" -> "H₂O").
4. Remove excessive headers/footers if they interrupt the flow.
5. maintain the original meaning precisely. Do not summarize.

Original Text:
"${content}"

Cleaned Text:`,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error('Ollama API error');
    }

    const data = await response.json();
    return data.response?.trim() || content;
  } catch (error) {
    console.error('Ollama API error:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    await verifyAuth(request);

    const body: CleanRequest = await request.json();
    const { content, useAI = false } = body;

    if (!content) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Check if content needs cleaning
    if (!isMangled(content)) {
      return NextResponse.json({
        cleaned: content,
        wasMangled: false,
        method: 'none'
      });
    }

    let cleaned: string;
    let method: string;

    // Try AI cleaning if requested and available
    if (useAI && aiCleaningEnabled()) {
      try {
        cleaned = await cleanWithAI(content);
        method = 'ai';
      } catch (error) {
        // Fallback to rule-based cleaning
        cleaned = cleanContentFallback(content);
        method = 'fallback (AI failed)';
      }
    } else {
      // Use fallback cleaning
      cleaned = cleanContentFallback(content);
      method = 'fallback';
    }

    return NextResponse.json({
      original: content,
      cleaned,
      wasMangled: true,
      method
    });
  } catch (error: any) {
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    console.error('Error cleaning content:', error);
    return NextResponse.json(
      { error: 'Failed to clean content' },
      { status: 500 }
    );
  }
}
