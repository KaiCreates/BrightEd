/**
 * BrightEd Cinematic UI — Business Meeting Scenes
 * Tablet/Zoom-style meetings for business simulation.
 */

import { Scene } from './scene-types';

export interface MeetingDefinition {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    participants: string[];
    urgency: 'review' | 'crisis' | 'conflict';
    scene: Scene;
}

const MEETING_WEEKLY_REVIEW: Scene = {
    id: 'meeting_weekly_review',
    name: 'Weekly Review',
    description: 'A calm review of metrics and operational momentum.',
    background: 'meeting_room',
    ambience: 'neutral',
    characters: [
        { characterId: 'luka', initialPosition: 'left', initialEmotion: 'neutral', entranceDelay: 150 },
        { characterId: 'andre', initialPosition: 'right', initialEmotion: 'concerned', entranceDelay: 350 },
    ],
    dialogue: [
        {
            id: 'review_1',
            characterId: 'luka',
            text: "Let's look at your latest numbers. You're moving, but we can sharpen the flow.",
            emotion: 'neutral',
            nextNodeId: 'review_2',
        },
        {
            id: 'review_2',
            characterId: 'andre',
            text: 'Supply costs nudged up this week. We need a smarter reorder rhythm.',
            emotion: 'concerned',
            choices: [
                {
                    id: 'review_focus_ops',
                    text: 'We tighten operations and reduce waste.',
                    tone: 'polite',
                    nextNodeId: 'review_ops',
                },
                {
                    id: 'review_focus_growth',
                    text: 'I want to push growth and accept higher costs.',
                    tone: 'neutral',
                    nextNodeId: 'review_growth',
                },
                {
                    id: 'review_focus_data',
                    text: 'Show me the data breakdown first.',
                    tone: 'neutral',
                    nextNodeId: 'review_data',
                },
            ],
        },
        {
            id: 'review_ops',
            characterId: 'luka',
            text: 'Lean operations will protect your cash runway. I will set new efficiency milestones.',
            emotion: 'impressed',
        },
        {
            id: 'review_growth',
            characterId: 'andre',
            text: "Growth is good, but let's lock supplier stability so demand doesn't outpace you.",
            emotion: 'neutral',
        },
        {
            id: 'review_data',
            characterId: 'luka',
            text: 'Fair. I will send a detailed dashboard after this call.',
            emotion: 'happy',
        },
    ],
    startNodeId: 'review_1',
    canSkip: true,
    pauseGameTime: false,
    screenEffect: 'none',
};

const MEETING_CASH_CRISIS: Scene = {
    id: 'meeting_cash_crisis',
    name: 'Liquidity Crisis',
    description: 'Emergency call when cash is tight and obligations stack up.',
    background: 'meeting_room',
    ambience: 'urgent',
    characters: [
        { characterId: 'marcus', initialPosition: 'left', initialEmotion: 'urgent', entranceDelay: 150 },
        { characterId: 'keisha', initialPosition: 'right', initialEmotion: 'concerned', entranceDelay: 250 },
    ],
    dialogue: [
        {
            id: 'crisis_1',
            characterId: 'marcus',
            text: 'Your liquidity buffer is below safe levels. If we do nothing, vendors will feel it first.',
            emotion: 'urgent',
            nextNodeId: 'crisis_2',
        },
        {
            id: 'crisis_2',
            characterId: 'keisha',
            text: 'The team is anxious too. We need clarity on payroll and priorities.',
            emotion: 'concerned',
            choices: [
                {
                    id: 'crisis_cut_costs',
                    text: 'Freeze non-essential spending immediately.',
                    tone: 'neutral',
                    nextNodeId: 'crisis_costs',
                },
                {
                    id: 'crisis_short_term',
                    text: 'Take a short-term credit line to stabilize.',
                    tone: 'polite',
                    nextNodeId: 'crisis_credit',
                },
                {
                    id: 'crisis_push_sales',
                    text: 'We sprint on sales and fulfill the fastest orders.',
                    tone: 'aggressive',
                    nextNodeId: 'crisis_sales',
                },
            ],
        },
        {
            id: 'crisis_costs',
            characterId: 'marcus',
            text: 'That will preserve runway. I will flag urgent obligations only.',
            emotion: 'neutral',
        },
        {
            id: 'crisis_credit',
            characterId: 'marcus',
            text: 'I can approve a bridge line, but interest will be elevated until cash stabilizes.',
            emotion: 'concerned',
        },
        {
            id: 'crisis_sales',
            characterId: 'keisha',
            text: 'I will rally the team. We will push speed and keep the clients updated.',
            emotion: 'impressed',
        },
    ],
    startNodeId: 'crisis_1',
    canSkip: false,
    pauseGameTime: true,
    screenEffect: 'blur-edges',
};

const MEETING_CREATIVE_CONFLICT: Scene = {
    id: 'meeting_creative_conflict',
    name: 'Creative Conflict',
    description: 'A tense discussion about quality vs deadlines.',
    background: 'meeting_room',
    ambience: 'tense',
    characters: [
        { characterId: 'keisha', initialPosition: 'left', initialEmotion: 'disappointed', entranceDelay: 150 },
        { characterId: 'andre', initialPosition: 'right', initialEmotion: 'suspicious', entranceDelay: 300 },
    ],
    dialogue: [
        {
            id: 'conflict_1',
            characterId: 'keisha',
            text: 'We keep shipping rushed work. The crew is proud, but morale is slipping.',
            emotion: 'disappointed',
            nextNodeId: 'conflict_2',
        },
        {
            id: 'conflict_2',
            characterId: 'andre',
            text: 'Client expectations are rising. If quality drops, suppliers lose trust too.',
            emotion: 'concerned',
            choices: [
                {
                    id: 'conflict_quality',
                    text: 'We slow down and protect quality.',
                    tone: 'polite',
                    nextNodeId: 'conflict_quality_result',
                },
                {
                    id: 'conflict_speed',
                    text: 'We maintain speed but tighten checks.',
                    tone: 'neutral',
                    nextNodeId: 'conflict_speed_result',
                },
                {
                    id: 'conflict_push',
                    text: 'We push faster and deal with fallout later.',
                    tone: 'aggressive',
                    nextNodeId: 'conflict_push_result',
                },
            ],
        },
        {
            id: 'conflict_quality_result',
            characterId: 'keisha',
            text: 'Thank you. I will make sure the team aligns with the new pace.',
            emotion: 'happy',
        },
        {
            id: 'conflict_speed_result',
            characterId: 'andre',
            text: 'Balanced approach. I will reinforce supplier expectations.',
            emotion: 'neutral',
        },
        {
            id: 'conflict_push_result',
            characterId: 'keisha',
            text: 'Understood. I hope the team can keep up without burnout.',
            emotion: 'concerned',
        },
    ],
    startNodeId: 'conflict_1',
    canSkip: true,
    pauseGameTime: true,
    screenEffect: 'vignette',
};

export const BUSINESS_MEETINGS: MeetingDefinition[] = [
    {
        id: 'weekly_review',
        title: 'Weekly Review',
        subtitle: 'Operations + Supplier Pulse',
        description: 'Review metrics and align on the next growth sprint.',
        participants: ['luka', 'andre'],
        urgency: 'review',
        scene: MEETING_WEEKLY_REVIEW,
    },
    {
        id: 'cash_crisis',
        title: 'Liquidity Crisis Call',
        subtitle: 'Finance + Team Stability',
        description: 'Emergency alignment to protect payroll and runway.',
        participants: ['marcus', 'keisha'],
        urgency: 'crisis',
        scene: MEETING_CASH_CRISIS,
    },
    {
        id: 'creative_conflict',
        title: 'Creative Conflict',
        subtitle: 'Quality vs Deadlines',
        description: 'Resolve tension between quality standards and delivery speed.',
        participants: ['keisha', 'andre'],
        urgency: 'conflict',
        scene: MEETING_CREATIVE_CONFLICT,
    },
];

export const BUSINESS_MEETING_SCENES = BUSINESS_MEETINGS.reduce<Record<string, Scene>>((acc, meeting) => {
    acc[meeting.id] = meeting.scene;
    return acc;
}, {});

export function getMeetingDefinition(id: string): MeetingDefinition | undefined {
    return BUSINESS_MEETINGS.find((meeting) => meeting.id === id);
}
