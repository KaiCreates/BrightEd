/**
 * Content cleaning utilities
 * Works with or without Ollama/Llama 3
 */

export interface CleanResult {
  original: string;
  cleaned: string;
  wasMangled: boolean;
  method: 'ai' | 'fallback' | 'none';
}

/**
 * Check if content appears to be mangled from PDF parsing
 */
export function isMangled(content: string): boolean {
  if (!content || content.length < 3) return false;

  // Patterns that indicate mangled text
  const patterns = [
    /\d+x\d+/,           // 3x2 instead of 3x²
    /[a-z]\d+[a-z]/,     // x2y instead of x²y
    /\d+\^\d+/,          // 3^2 instead of 3²
    /\d+\s*[a-z]\s*\d+/, // 3 x 2 instead of 3x²
  ];

  return patterns.some(pattern => pattern.test(content));
}

/**
 * Fallback cleaning (rule-based, no AI needed)
 */
export function cleanContentFallback(content: string): string {
  if (!content) return content;

  return content
    // Fix superscripts: 3x2 -> 3x²
    .replace(/(\d+)x(\d+)/g, (match, base, exp) => {
      const superscripts: { [key: string]: string } = {
        '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
        '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
      };
      return `${base}x${superscripts[exp] || exp}`;
    })
    // Fix variable superscripts: x2 -> x²
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
    // Fix fractions
    .replace(/\b1\/2\b/g, '½')
    .replace(/\b1\/4\b/g, '¼')
    .replace(/\b3\/4\b/g, '¾')
    // Fix multiplication
    .replace(/x\s*\*\s*x/g, '×')
    // Clean spaces
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean content using AI (Ollama) with fallback
 */
export async function cleanContentWithAI(content: string): Promise<CleanResult> {
  if (!content) {
    return {
      original: content,
      cleaned: content,
      wasMangled: false,
      method: 'none'
    };
  }

  const wasMangled = isMangled(content);

  if (!wasMangled) {
    return {
      original: content,
      cleaned: content,
      wasMangled: false,
      method: 'none'
    };
  }

  // Try AI cleaning first
  try {
    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3',
        prompt: `Fix this mangled PDF text into proper mathematical notation or clean readable text. Only return the cleaned text, no explanations.

Original: "${content}"

Cleaned:`,
        stream: false,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const cleaned = data.response?.trim() || content;

      return {
        original: content,
        cleaned,
        wasMangled: true,
        method: 'ai'
      };
    }
  } catch (error) {
    console.warn('Ollama not available, using fallback:', error);
  }

  // Fallback to rule-based cleaning
  return {
    original: content,
    cleaned: cleanContentFallback(content),
    wasMangled: true,
    method: 'fallback'
  };
}

/**
 * Clean content using API endpoint (recommended)
 */
export async function cleanContentViaAPI(content: string, useAI: boolean = false): Promise<CleanResult> {
  try {
    const response = await fetch('/api/content/clean', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content, useAI }),
    });

    if (response.ok) {
      return await response.json();
    }
  } catch (error) {
    console.error('Error cleaning content via API:', error);
  }

  // Fallback to local cleaning
  return {
    original: content,
    cleaned: cleanContentFallback(content),
    wasMangled: isMangled(content),
    method: 'fallback'
  };
}
