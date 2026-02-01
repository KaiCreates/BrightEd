export type BiologyLab = {
    id: string;
    title: string;
    section: 'Section A' | 'Section B' | 'Section C';
    skills: Array<'ORR' | 'Dr' | 'MM' | 'AI' | 'PD'>;
    objectives: string[];
    description: string;
    xpReward: number;
    featured?: boolean;
};

export const BIOLOGY_LABS: BiologyLab[] = [
    {
        id: 'bio-photosynthesis',
        title: 'Testing a Leaf for Starch',
        section: 'Section B',
        skills: ['AI', 'ORR'],
        objectives: [
            'Demonstrate that green leaves produce starch',
            'Safely decolorize a leaf using ethanol',
            'Use iodine to test for the presence of starch'
        ],
        description: 'Kill a leaf, remove its chlorophyll in an ethanol water bath, and test for starch using iodine solution.',
        xpReward: 150,
        featured: true
    },
    {
        id: 'bio-classification',
        title: 'Classification of Organisms',
        section: 'Section A',
        skills: ['Dr', 'ORR'],
        objectives: [
            'Observe features of various organisms',
            'Categorize organisms into distinct groups',
            'Identify visible differences between monocots and dicots'
        ],
        description: 'Explore the virtual garden to collect specimens and classify them based on their biological traits.',
        xpReward: 150
    },
    {
        id: 'bio-soil-water',
        title: 'Soil Water Capacity',
        section: 'Section A',
        skills: ['MM', 'AI'],
        objectives: [
            'Measure water retention in different soil types',
            'Compare drainage rates of clay, loam, and sand'
        ],
        description: 'Set up funnels with different soil samples to determine which soil is best for agriculture.',
        xpReward: 200
    },
    {
        id: 'bio-diffusion',
        title: 'Diffusion in Liquids',
        section: 'Section B',
        skills: ['ORR'],
        objectives: [
            'Observe the movement of particles in water',
            'Record the rate of diffusion over time'
        ],
        description: 'Place potassium permanganate crystals in water and observe the resulting concentration gradient.',
        xpReward: 150
    },
    {
        id: 'bio-osmosis-potato',
        title: 'Osmosis: Potato Strip Experiment',
        section: 'Section B',
        skills: ['MM', 'AI'],
        objectives: [
            'Observe changes in potato strips in varying salt concentrations',
            'Determine the effect of osmosis on cell turgidity'
        ],
        description: 'Measure the length and texture of potato strips after immersion in distilled water vs. concentrated brine.',
        xpReward: 250,
        featured: true
    },
    {
        id: 'bio-enzymes-temp',
        title: 'Effect of Temperature on Enzymes',
        section: 'Section B',
        skills: ['MM', 'AI'],
        objectives: [
            'Investigate enzyme activity at different temperatures',
            'Explain why enzymes denature at high temperatures'
        ],
        description: 'Set up water baths at 0°C, 30°C, and 100°C, then test amylase activity using the iodine test.',
        xpReward: 300
    },
    {
        id: 'bio-quadrat',
        title: 'Estimating Population with a Quadrat',
        section: 'Section A',
        skills: ['MM', 'AI', 'PD'],
        objectives: [
            'Use a quadrat to sample a population',
            'Calculate population density',
            'Understand the importance of random sampling'
        ],
        description: 'Explore a virtual field and throw a quadrat to estimate the population of a weed species.',
        xpReward: 200,
        featured: true
    }
];
