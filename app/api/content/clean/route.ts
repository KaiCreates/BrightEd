import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth-server';

interface CleanRequest {
  content: string;
  useAI?: boolean;
}

// Pattern detection for mangled PDF text
const MANGLE_PATTERNS = [
  /(\d+)x(\d+)/g, // 3x2 -> 3x²
  /(\d+)\^(\d+)/g, // 3^2 -> 3²
  /([a-z])(\d+)/g, // x2 -> x²
  /(\d+)\s*([a-z])\s*(\d+)/g, // 3 x 2 -> 3x²
];

// Fallback cleaning function (works without AI)
function cleanContentFallback(content: string): string {
  if (!content || content.trim().length === 0) {
    return content;
  }

  let cleaned = content;

  // Fix common PDF parsing issues
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
    // Fix subscripts: H2O -> H₂O
    .replace(/([A-Z])(\d+)/g, (match, letter, num) => {
      const subscripts: { [key: string]: string } = {
        '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄',
        '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉'
      };
      return letter + num.split('').map((n: string) => subscripts[n] || n).join('');
    })
    // Fix fractions: 1/2 -> ½
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    // Fix common math symbols
    .replace(/x\s*\*\s*x/g, '×')
    .replace(/\.\.\./g, '…')
    // Clean up extra spaces
    .replace(/\s+/g, ' ')
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

  return hasManglePattern || (hasMultipleNumbers && hasNoSpacesBetweenNumbers);
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
        prompt: `You are a text cleaning assistant. Fix this mangled PDF text into proper mathematical notation or clean text that students can read. Only return the cleaned text, no explanations.

Original: "${content}"

Cleaned:`,
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
    if (useAI) {
      try {
        cleaned = await cleanWithAI(content);
        method = 'ai';
      } catch (error) {
        // Fallback to rule-based cleaning
        cleaned = cleanContentFallback(content);
        method = 'fallback';
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
