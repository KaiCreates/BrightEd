/**
 * BrightEd Economy Engine — Employee Skill Progression
 * Manages employee skill development, specialization, and performance bonuses
 */

import { Employee, SkillProgress, Specialization } from './economy-types';

/**
 * XP required for each skill level
 */
const XP_THRESHOLDS = [
    0,      // Level 1
    100,    // Level 2
    300,    // Level 3 (specialization unlocks)
    600,    // Level 4
    1000,   // Level 5 (max)
];

/**
 * Calculate XP award based on task difficulty and relevance
 */
export function calculateXPAward(
    taskDifficulty: 'easy' | 'medium' | 'hard',
    skillRelevance: 'primary' | 'secondary' | 'minor'
): number {
    const difficultyMultiplier = {
        easy: 1.0,
        medium: 1.5,
        hard: 2.0,
    };

    const relevanceMultiplier = {
        primary: 1.0,
        secondary: 0.5,
        minor: 0.25,
    };

    const baseXP = 20;
    return Math.round(baseXP * difficultyMultiplier[taskDifficulty] * relevanceMultiplier[skillRelevance]);
}

/**
 * Award experience to an employee skill
 */
export function awardSkillExperience(
    skill: SkillProgress,
    xpAmount: number
): {
    updatedSkill: SkillProgress;
    leveledUp: boolean;
    newLevel?: number;
} {
    const newExperience = skill.experience + xpAmount;
    const newTotalExperience = (skill.totalExperience || 0) + xpAmount;
    let currentLevel = skill.level;
    let leveledUp = false;

    // Check for level up
    while (currentLevel < 5 && newExperience >= XP_THRESHOLDS[currentLevel]) {
        currentLevel++;
        leveledUp = true;
    }

    // Calculate XP to next level
    const experienceToNext = currentLevel < 5
        ? XP_THRESHOLDS[currentLevel] - newExperience
        : 0;

    return {
        updatedSkill: {
            level: currentLevel,
            experience: newExperience,
            experienceToNext,
            totalExperience: newTotalExperience,
        },
        leveledUp,
        newLevel: leveledUp ? currentLevel : undefined,
    };
}

/**
 * Check if employee can unlock specialization
 */
export function canUnlockSpecialization(skill: SkillProgress): boolean {
    return skill.level >= 3;
}

/**
 * Get available specializations for a skill
 */
export function getAvailableSpecializations(skillName: string): Specialization[] {
    const specializationMap: Record<string, Specialization[]> = {
        speed: ['speed_specialist'],
        quality: ['quality_master'],
        customer_service: ['customer_relations'],
        inventory: ['inventory_expert'],
        multitasking: ['multitasker'],
    };

    return specializationMap[skillName] || [];
}

/**
 * Calculate performance modifier based on employee stats and specialization
 */
export function calculatePerformanceModifier(
    employee: Employee,
    taskType: string,
    taskRequiresSpecialization?: Specialization
): {
    modifier: number;
    breakdown: string[];
} {
    const breakdown: string[] = [];
    let modifier = 1.0;

    // Base stats impact
    const avgStats = (employee.stats.speed + employee.stats.quality + employee.stats.morale) / 300;
    modifier *= (0.7 + avgStats * 0.6); // 0.7 to 1.3 range
    breakdown.push(`Base stats: ${Math.round((modifier - 1) * 100)}%`);

    // Specialization bonus/penalty
    if (taskRequiresSpecialization) {
        if (employee.specialization === taskRequiresSpecialization) {
            modifier *= 1.25; // 25% bonus for matching specialization
            breakdown.push(`Specialization match: +25%`);
        } else if (employee.specialization && employee.specialization !== taskRequiresSpecialization) {
            modifier *= 0.85; // 15% penalty for wrong specialization
            breakdown.push(`Wrong specialization: -15%`);
        }
    }

    // Morale impact
    if (employee.stats.morale < 50) {
        const moralePenalty = (50 - employee.stats.morale) / 100;
        modifier *= (1 - moralePenalty);
        breakdown.push(`Low morale: -${Math.round(moralePenalty * 100)}%`);
    }

    return { modifier, breakdown };
}

/**
 * Update employee after completing a task
 */
export function updateEmployeeAfterTask(
    employee: Employee,
    taskDifficulty: 'easy' | 'medium' | 'hard',
    primarySkill: string,
    secondarySkills: string[] = []
): {
    updatedEmployee: Employee;
    skillUps: Array<{ skill: string; newLevel: number }>;
    specializationsUnlocked: string[];
} {
    const updatedEmployee = { ...employee };
    const skillUps: Array<{ skill: string; newLevel: number }> = [];
    const specializationsUnlocked: string[] = [];

    // Award XP to primary skill
    if (updatedEmployee.skills[primarySkill]) {
        const xp = calculateXPAward(taskDifficulty, 'primary');
        const result = awardSkillExperience(updatedEmployee.skills[primarySkill], xp);
        updatedEmployee.skills[primarySkill] = result.updatedSkill;

        if (result.leveledUp && result.newLevel) {
            skillUps.push({ skill: primarySkill, newLevel: result.newLevel });

            // Check for specialization unlock
            if (result.newLevel === 3 && !employee.specialization) {
                specializationsUnlocked.push(primarySkill);
            }
        }
    }

    // Award XP to secondary skills
    for (const skill of secondarySkills) {
        if (updatedEmployee.skills[skill]) {
            const xp = calculateXPAward(taskDifficulty, 'secondary');
            const result = awardSkillExperience(updatedEmployee.skills[skill], xp);
            updatedEmployee.skills[skill] = result.updatedSkill;

            if (result.leveledUp && result.newLevel) {
                skillUps.push({ skill, newLevel: result.newLevel });
            }
        }
    }

    // Increment tasks completed
    updatedEmployee.tasksCompleted = (employee.tasksCompleted || 0) + 1;

    return {
        updatedEmployee,
        skillUps,
        specializationsUnlocked,
    };
}

/**
 * Assign specialization to employee
 */
export function assignSpecialization(
    employee: Employee,
    specialization: Specialization
): Employee {
    return {
        ...employee,
        specialization,
        specializationUnlockedAt: new Date().toISOString(),
    };
}

/**
 * Initialize default skills for new employee
 */
export function initializeEmployeeSkills(role: string): Record<string, SkillProgress> {
    const baseSkills: Record<string, SkillProgress> = {
        speed: { level: 1, experience: 0, experienceToNext: 100, totalExperience: 0 },
        quality: { level: 1, experience: 0, experienceToNext: 100, totalExperience: 0 },
        customer_service: { level: 1, experience: 0, experienceToNext: 100, totalExperience: 0 },
    };

    // Role-specific starting bonuses
    if (role === 'specialist') {
        baseSkills.quality.level = 2;
        baseSkills.quality.experience = 100;
    } else if (role === 'speedster') {
        baseSkills.speed.level = 2;
        baseSkills.speed.experience = 100;
    }

    return baseSkills;
}

/**
 * Calculate employee value/salary based on skills
 */
export function calculateEmployeeValue(employee: Employee): number {
    const baseSalary = 100;

    // Sum skill levels
    const totalSkillLevels = Object.values(employee.skills).reduce(
        (sum, skill) => sum + skill.level,
        0
    );

    // Specialization bonus
    const specializationBonus = employee.specialization ? 50 : 0;

    return baseSalary + (totalSkillLevels * 20) + specializationBonus;
}
