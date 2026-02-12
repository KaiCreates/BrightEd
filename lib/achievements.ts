export interface Achievement {
    id: string;
    name: string;
    description: string;
    icon: string;
    category: 'streak' | 'business' | 'mastery' | 'social';
    requirement: string;
    unlocked: boolean;
    unlockedAt?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
}

export const ALL_ACHIEVEMENTS: Achievement[] = [
    {
        id: 'streak-king',
        name: 'Streak King',
        description: 'Maintain a 30-day learning streak',
        icon: '🔥',
        category: 'streak',
        requirement: 'streak >= 30',
        unlocked: false,
        rarity: 'epic'
    },
    {
        id: 'week-warrior',
        name: 'Week Warrior',
        description: 'Maintain a 7-day learning streak',
        icon: '⚔️',
        category: 'streak',
        requirement: 'streak >= 7',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'first-million',
        name: 'First Million',
        description: 'Reach $1M business valuation',
        icon: '👑',
        category: 'business',
        requirement: 'valuation >= 1000000',
        unlocked: false,
        rarity: 'legendary'
    },
    {
        id: 'polymath',
        name: 'The Polymath',
        description: 'Achieve 90%+ mastery in 3 subjects',
        icon: '🧠',
        category: 'mastery',
        requirement: 'count(subjectProgress >= 9) >= 3',
        unlocked: false,
        rarity: 'legendary'
    },
    {
        id: 'master-pob',
        name: 'Master of POB',
        description: 'Achieve 90%+ mastery in Principles of Business',
        icon: '💼',
        category: 'mastery',
        requirement: 'subjectProgress["Principles of Business"] >= 9.0',
        unlocked: false,
        rarity: 'rare'
    },
    {
        id: 'math-master',
        name: 'Mathematics Master',
        description: 'Achieve 90%+ mastery in Mathematics',
        icon: '📐',
        category: 'mastery',
        requirement: 'subjectProgress["Mathematics"] >= 9.0',
        unlocked: false,
        rarity: 'rare'
    },
    {
        id: 'centurion',
        name: 'Centurion',
        description: 'Answer 100 questions correctly',
        icon: '💯',
        category: 'mastery',
        requirement: 'questionsCorrect >= 100',
        unlocked: false,
        rarity: 'rare'
    },
    {
        id: 'community-leader',
        name: 'Community Leader',
        description: 'Help 50+ students in the Live Campus',
        icon: '🌟',
        category: 'social',
        requirement: 'helpCount >= 50',
        unlocked: false,
        rarity: 'epic'
    },
    {
        id: 'seed-founder',
        name: 'Seed Founder',
        description: 'Register your first business',
        icon: '🌱',
        category: 'business',
        requirement: 'hasBusiness === true',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'profit-first',
        name: 'Profit First',
        description: 'Earn your first 1000 B-Coins',
        icon: '💰',
        category: 'business',
        requirement: 'bCoins >= 1000',
        unlocked: false,
        rarity: 'common'
    },
    {
        id: 'market-entry',
        name: 'Market Entry',
        description: 'Reach $10k business valuation',
        icon: '📈',
        category: 'business',
        requirement: 'valuation >= 10000',
        unlocked: false,
        rarity: 'common'
    }
];

export function checkAchievement(achievement: Achievement, userData: Record<string, unknown>, businessValuation: number = 0): boolean {
    if (!userData) return false;

    try {
        if (achievement.id === 'streak-king') return Number(userData.streak || 0) >= 30;
        if (achievement.id === 'week-warrior') return Number(userData.streak || 0) >= 7;
        if (achievement.id === 'first-million') return businessValuation >= 1000000;
        if (achievement.id === 'polymath') {
            const progress = (userData.subjectProgress as Record<string, unknown>) || {};
            const highMasteryCount = Object.values(progress).filter((v: unknown) => (Number(v) || 0) >= 9).length;
            return highMasteryCount >= 3;
        }
        if (achievement.id === 'master-pob') return Number((userData.subjectProgress as Record<string, unknown>)?.['Principles of Business'] || 0) >= 9.0;
        if (achievement.id === 'math-master') return Number((userData.subjectProgress as Record<string, unknown>)?.['Mathematics'] || 0) >= 9.0;
        if (achievement.id === 'centurion') return Number(userData.questionsCorrect || 0) >= 100;
        if (achievement.id === 'community-leader') return Number(userData.helpCount || 0) >= 50;
        if (achievement.id === 'seed-founder') return userData.hasBusiness === true;
        if (achievement.id === 'profit-first') return Number(userData.bCoins || 0) >= 1000;
        if (achievement.id === 'market-entry') return businessValuation >= 10000;
    } catch (e) {
        console.error(`Error checking achievement ${achievement.id}:`, e);
    }

    return false;
}
