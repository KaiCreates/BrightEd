/**
 * NABLE Story Analyzer
 * 
 * Analyzes story plots to identify skill application points.
 * Stories are "Application Tests" - where theoretical knowledge meets practice.
 */

import {
    SkillApplication,
    StoryAnalysis,
    PostStoryQuestion
} from './types';

/**
 * Skill patterns to detect in story content
 */
const SKILL_PATTERNS: Record<string, { keywords: string[]; contexts: string[] }> = {
    'revenue': {
        keywords: ['revenue', 'sales', 'income', 'earnings', 'money coming in'],
        contexts: ['selling products', 'customer payments', 'business income']
    },
    'profit': {
        keywords: ['profit', 'margin', 'net income', 'bottom line'],
        contexts: ['after costs', 'what remains', 'earnings after expenses']
    },
    'registration': {
        keywords: ['register', 'registration', 'license', 'permit', 'incorporation'],
        contexts: ['starting a business', 'legal requirements', 'government forms']
    },
    'taxes': {
        keywords: ['tax', 'taxes', 'VAT', 'income tax', 'tax return', 'IRD'],
        contexts: ['paying government', 'filing returns', 'tax obligations']
    },
    'budgeting': {
        keywords: ['budget', 'budgeting', 'planning', 'allocation', 'spending plan'],
        contexts: ['managing money', 'planning expenses', 'financial planning']
    },
    'loans': {
        keywords: ['loan', 'borrow', 'credit', 'interest', 'debt', 'repayment'],
        contexts: ['getting money from bank', 'borrowing funds', 'financing']
    },
    'inventory': {
        keywords: ['inventory', 'stock', 'products', 'goods', 'merchandise'],
        contexts: ['managing products', 'tracking stock', 'storage']
    },
    'pricing': {
        keywords: ['price', 'pricing', 'cost', 'markup', 'discount'],
        contexts: ['setting prices', 'pricing strategy', 'competitive pricing']
    },
    'employees': {
        keywords: ['employee', 'staff', 'workers', 'payroll', 'wages', 'salary'],
        contexts: ['hiring', 'paying workers', 'managing staff']
    },
    'marketing': {
        keywords: ['marketing', 'advertising', 'promotion', 'brand', 'customers'],
        contexts: ['attracting customers', 'promoting business', 'building brand']
    }
};

/**
 * Story character definitions
 */
export const STORY_CHARACTERS = {
    'Luka': {
        personality: 'Cautious and analytical',
        businessType: 'Tech startup',
        commonChallenges: ['budgeting', 'pricing', 'marketing']
    },
    'Mendy': {
        personality: 'Bold risk-taker',
        businessType: 'Food truck',
        commonChallenges: ['inventory', 'employees', 'permits']
    },
    'Malchi': {
        personality: 'Community-focused',
        businessType: 'Tutoring service',
        commonChallenges: ['pricing', 'taxes', 'growth']
    }
} as const;

/**
 * Analyze story text for skill application points
 */
export function analyzeStoryText(
    storyId: string,
    storyText: string
): SkillApplication[] {
    const applications: SkillApplication[] = [];
    const textLower = storyText.toLowerCase();

    // Split into sentences for context extraction
    const sentences = storyText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (const [skillId, patterns] of Object.entries(SKILL_PATTERNS)) {
        // Check for keyword matches
        for (const keyword of patterns.keywords) {
            if (textLower.includes(keyword.toLowerCase())) {
                // Find the sentence containing the keyword
                const matchingSentence = sentences.find(s =>
                    s.toLowerCase().includes(keyword.toLowerCase())
                );

                // Detect character mention
                let character: 'Luka' | 'Mendy' | 'Malchi' | null = null;
                if (matchingSentence) {
                    if (matchingSentence.includes('Luka')) character = 'Luka';
                    else if (matchingSentence.includes('Mendy')) character = 'Mendy';
                    else if (matchingSentence.includes('Malchi')) character = 'Malchi';
                }

                applications.push({
                    skillId,
                    storyMoment: matchingSentence?.trim() || `Found "${keyword}" in story`,
                    character,
                    applicationContext: patterns.contexts[0]
                });

                break; // One detection per skill
            }
        }
    }

    return applications;
}

/**
 * Analyze a story for skill applications
 */
export function analyzeStory(
    storyId: string,
    storyContent: {
        title: string;
        description: string;
        scenes: Array<{ content: string; character?: string }>;
    }
): StoryAnalysis {
    const allText = [
        storyContent.title,
        storyContent.description,
        ...storyContent.scenes.map(s => s.content)
    ].join(' ');

    const applications = analyzeStoryText(storyId, allText);

    // Generate recommended assessments based on found skills
    const recommendedAssessments = applications
        .map(a => a.skillId)
        .filter((skill, index, self) => self.indexOf(skill) === index); // Unique

    return {
        storyId,
        skillApplications: applications,
        recommendedAssessments
    };
}

/**
 * Generate a post-story question for a specific skill
 */
export function generatePostStoryQuestion(
    storyId: string,
    character: 'Luka' | 'Mendy' | 'Malchi',
    skillId: string,
    storyContext: string
): PostStoryQuestion {
    const charInfo = STORY_CHARACTERS[character];

    // Generate contextual question based on skill and character
    const questionTemplates = getQuestionTemplates(skillId, character);
    const template = questionTemplates[Math.floor(Math.random() * questionTemplates.length)];

    return {
        questionId: `post-story-${storyId}-${skillId}-${Date.now()}`,
        storyId,
        character,
        skillId,
        question: template.question,
        options: template.options,
        correctAnswer: template.correctAnswer,
        storyContext
    };
}

/**
 * Get question templates for a skill and character combination
 */
function getQuestionTemplates(
    skillId: string,
    character: 'Luka' | 'Mendy' | 'Malchi'
): Array<{ question: string; options: string[]; correctAnswer: number }> {
    const charInfo = STORY_CHARACTERS[character];

    const templates: Record<string, Array<{ question: string; options: string[]; correctAnswer: number }>> = {
        'revenue': [
            {
                question: `${character} sold 50 items at $10 each this week. What was ${character}'s revenue?`,
                options: ['$500', '$50', '$5000', 'Cannot determine'],
                correctAnswer: 0
            },
            {
                question: `In the story, ${character}'s ${charInfo.businessType.toLowerCase()} made money from customers. This money is called:`,
                options: ['Profit', 'Revenue', 'Assets', 'Equity'],
                correctAnswer: 1
            }
        ],
        'profit': [
            {
                question: `${character} had $1000 in revenue and $600 in costs. What was the profit?`,
                options: ['$1000', '$600', '$400', '$1600'],
                correctAnswer: 2
            },
            {
                question: `After paying all expenses, ${character} had money left over. This is called:`,
                options: ['Revenue', 'Profit', 'Budget', 'Credit'],
                correctAnswer: 1
            }
        ],
        'registration': [
            {
                question: `Before ${character} could legally operate, what did they need to get from the government?`,
                options: ['A logo', 'Business registration', 'Social media accounts', 'Office space'],
                correctAnswer: 1
            },
            {
                question: `Why did ${character} need to register their ${charInfo.businessType.toLowerCase()}?`,
                options: ['To get customers', 'To operate legally', 'To get lower prices', 'To hire employees'],
                correctAnswer: 1
            }
        ],
        'taxes': [
            {
                question: `${character} earned $10,000 this year. If the tax rate is 20%, how much tax is owed?`,
                options: ['$200', '$2000', '$8000', '$1000'],
                correctAnswer: 1
            },
            {
                question: `${character} sets aside money each month for:`,
                options: ['Shopping', 'Tax obligations', 'Vacation', 'Decorations'],
                correctAnswer: 1
            }
        ],
        'budgeting': [
            {
                question: `${character} created a spending plan for the month. This is called a:`,
                options: ['Balance sheet', 'Budget', 'Tax return', 'Invoice'],
                correctAnswer: 1
            },
            {
                question: `Why did ${character} budget before starting the ${charInfo.businessType.toLowerCase()}?`,
                options: ['It was required by law', 'To plan expenses and avoid running out of money', 'To impress investors', 'It was not important'],
                correctAnswer: 1
            }
        ],
        'loans': [
            {
                question: `${character} borrowed $5000 at 10% interest. After one year, how much is owed in total?`,
                options: ['$5000', '$5500', '$5100', '$6000'],
                correctAnswer: 1
            },
            {
                question: `When ${character} took a loan, they agreed to pay back the original amount plus:`,
                options: ['Taxes', 'Interest', 'Rent', 'Profit'],
                correctAnswer: 1
            }
        ],
        'inventory': [
            {
                question: `${character}'s ${charInfo.businessType.toLowerCase()} needs to track products. This is called:`,
                options: ['Accounting', 'Inventory management', 'Marketing', 'Budgeting'],
                correctAnswer: 1
            }
        ],
        'pricing': [
            {
                question: `If ${character} buys supplies for $5 and adds a 100% markup, what's the selling price?`,
                options: ['$5', '$10', '$15', '$50'],
                correctAnswer: 1
            }
        ],
        'employees': [
            {
                question: `${character} pays workers $15/hour for 40 hours. What's the weekly wage per employee?`,
                options: ['$15', '$40', '$600', '$550'],
                correctAnswer: 2
            }
        ],
        'marketing': [
            {
                question: `${character} wants more customers. Which activity would help most?`,
                options: ['Reduce quality', 'Advertise the business', 'Raise prices significantly', 'Close on weekends'],
                correctAnswer: 1
            }
        ]
    };

    return templates[skillId] || [{
        question: `Based on the story, what did ${character} learn about ${skillId}?`,
        options: [
            'It was not important',
            'It was critical for business success',
            'It was optional',
            'It only matters for large businesses'
        ],
        correctAnswer: 1
    }];
}

/**
 * Check if user failed a post-story question to mark skill as theoretical-only
 */
export function markSkillAsTheoreticalOnly(
    currentScore: boolean,
    wasPostStoryQuestion: boolean
): boolean {
    // If they failed a post-story question, mark as theoretical-only
    return wasPostStoryQuestion && !currentScore;
}

/**
 * Get recommended simulation frequency for theoretical-only skills
 */
export function getRecommendedSimulationFrequency(
    theoreticalOnly: boolean
): 'normal' | 'increased' | 'intensive' {
    if (theoreticalOnly) {
        return 'intensive';
    }
    return 'normal';
}
