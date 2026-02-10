'use client'

import { motion } from 'framer-motion'

export type MascotEmotion =
    | 'happy' | 'relieved' | 'shocked' | 'sad-rain'
    | 'thinking' | 'sad-cloud' | 'idea' | 'smart'
    | 'wink' | 'confused' | 'reading' | 'studying'
    | 'sleeping' | 'magic' | 'zzz' | 'bored'

interface MascotIllustrationProps {
    emotion: MascotEmotion
    scale?: number
    className?: string
    float?: boolean
}

const EMOTIONS: Record<MascotEmotion, string> = {
    'happy': 'owl-happy',
    'relieved': 'owl-relieved',
    'shocked': 'owl-shocked',
    'sad-rain': 'owl-sad-rain',
    'thinking': 'owl-thinking',
    'sad-cloud': 'owl-sad-cloud',
    'idea': 'owl-idea',
    'smart': 'owl-smart',
    'wink': 'owl-wink',
    'confused': 'owl-confused',
    'reading': 'owl-reading',
    'studying': 'owl-studying',
    'sleeping': 'owl-sleeping',
    'magic': 'owl-magic',
    'zzz': 'owl-zzz',
    'bored': 'owl-bored'
}

export default function MascotIllustration({
    emotion,
    scale = 1,
    className = '',
    float = true
}: MascotIllustrationProps) {
    const spriteClass = EMOTIONS[emotion] || 'owl-happy'

    return (
        <motion.div
            className={`relative flex items-center justify-center ${className}`}
            animate={float ? {
                y: [0, -8, 0],
            } : {}}
            transition={float ? {
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut"
            } : {}}
        >
            {/* Base platform/shadow */}
            <div className="absolute bottom-2 w-24 h-6 bg-black/5 rounded-[100%] blur-md -z-10" />

            <div
                className={`owl-sprite ${spriteClass}`}
                style={{
                    transform: `scale(${scale})`,
                    transformOrigin: 'bottom center'
                }}
            />
        </motion.div>
    )
}
