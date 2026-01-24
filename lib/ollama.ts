export interface OllamaResponse {
    model: string;
    created_at: string;
    response: string;
    done: boolean;
    context?: number[];
    total_duration?: number;
    load_duration?: number;
    prompt_eval_count?: number;
    prompt_eval_duration?: number;
    eval_count?: number;
    eval_duration?: number;
}

export interface GenerationOptions {
    model?: string;
    temperature?: number;
    system?: string;
    format?: 'json';
}

const OLLAMA_HOST = process.env.OLLAMA_HOST || 'http://127.0.0.1:11434';
const DEFAULT_MODEL = 'llama3';

export async function generateWithOllama(prompt: string, options: GenerationOptions = {}): Promise<string> {
    const model = options.model || DEFAULT_MODEL;

    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60s timeout

        const response = await fetch(`${OLLAMA_HOST}/api/generate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                prompt,
                system: options.system || "You are a helpful education assistant. Respond only with valid JSON.",
                stream: false,
                temperature: options.temperature || 0.7,
                format: options.format
            }),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama API error: ${response.statusText}`);
        }

        const data = (await response.json()) as OllamaResponse;
        return data.response;
    } catch (error) {
        console.error('Error generating with Ollama:', error);
        throw error;
    }
}

export interface Objective {
    id: string;
    objective: string;
    difficulty: number;
    content?: string;
    specific_objectives?: string[];
}

export async function generateQuestionPrompt(objective: Objective, subject: string, variation: number): Promise<string> {
    // Create a structured prompt for CSEC style questions
    const difficulty = objective.difficulty === 1 ? 'easy, knowledge-based' :
        objective.difficulty === 2 ? 'medium, application-based' : 'hard, analysis-based';

    return `
    Create a CSEC (Caribbean Secondary Education Certificate) style multiple-choice question for the subject "${subject}".
    
    Topic: ${objective.objective}
    Details: ${objective.content || objective.specific_objectives?.[0] || 'General understanding'}
    Difficulty: ${difficulty}
    Variation: ${variation} (Ensure this is unique/randomized)

    Return the result consistently as a JSON object with this EXACT structure:
    {
      "question": "The question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": 0, // Index of correct option (0-3)
      "explanation": "Brief explanation of why the answer is correct.",
      "storyElement": "A short, encouraging phrase (e.g. 'Spot on!', 'Great analysis!')"
    }
    
    IMPORTANT: 
    - The question must be educational and relevant to the Caribbean context.
    - Ensure strictly valid JSON.
    - Do not include markdown formatting (like \`\`\`json). Just the raw JSON string.
  `;
}
