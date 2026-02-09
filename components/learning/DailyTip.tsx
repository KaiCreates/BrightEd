'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface DailyTipProps {
    className?: string
}

const DAILY_TIPS = [
    {
        category: "Learning Strategy",
        tip: "Take breaks between lessons to help your brain consolidate information better.",
        emoji: "🧠",
        color: "from-blue-500 to-indigo-600"
    },
    {
        category: "Productivity",
        tip: "Study at the same time each day to build a consistent learning habit.",
        emoji: "⏰",
        color: "from-green-500 to-emerald-600"
    },
    {
        category: "Memory",
        tip: "Review previous topics briefly before starting new ones to strengthen connections.",
        emoji: "🔄",
        color: "from-purple-500 to-violet-600"
    },
    {
        category: "Motivation",
        tip: "Celebrate small wins! Every completed lesson is progress toward your goals.",
        emoji: "🎯",
        color: "from-yellow-500 to-amber-600"
    },
    {
        category: "Focus",
        tip: "Put your phone in another room while studying to minimize distractions.",
        emoji: "📵",
        color: "from-red-500 to-rose-600"
    },
    {
        category: "Understanding",
        tip: "Try explaining concepts in your own words - it's the best way to check understanding.",
        emoji: "💬",
        color: "from-cyan-500 to-teal-600"
    },
    {
        category: "Practice",
        tip: "Apply what you learn immediately through practice problems or real-world examples.",
        emoji: "🛠️",
        color: "from-orange-500 to-red-600"
    },
    {
        category: "Growth Mindset",
        tip: "Mistakes are proof that you're trying. Learn from them and keep going!",
        emoji: "🌱",
        color: "from-pink-500 to-rose-600"
    }
]

export default function DailyTip({ className = "" }: DailyTipProps) {
    const [currentTip, setCurrentTip] = useState(DAILY_TIPS[0])
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        // Get tip based on current date
        const today = new Date()
        const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
        const tipIndex = dayOfYear % DAILY_TIPS.length
        setCurrentTip(DAILY_TIPS[tipIndex])
        
        // Animate in after a short delay
        const timer = setTimeout(() => setIsVisible(true), 500)
        return () => clearTimeout(timer)
    }, [])

    if (!isVisible) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className={`relative overflow-hidden rounded-2xl shadow-xl ${className}`}
        >
            {/* Gradient Background */}
            <div className={`absolute inset-0 bg-gradient-to-br ${currentTip.color} opacity-10`} />
            
            {/* Content */}
            <div className="relative p-6 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm border border-white/20 dark:border-slate-700/20">
                {/* Header */}
                <div className="flex items-center gap-3 mb-3">
                    <span className="text-3xl">{currentTip.emoji}</span>
                    <div>
                        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-600 dark:text-slate-400">
                            Daily Tip
                        </h3>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-500">
                            {currentTip.category}
                        </p>
                    </div>
                </div>
                
                {/* Tip Content */}
                <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
                    {currentTip.tip}
                </p>
                
                {/* Decorative Elements */}
                <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${currentTip.color} opacity-20 rounded-full blur-2xl transform translate-x-10 -translate-y-10`} />
                <div className={`absolute bottom-0 left-0 w-16 h-16 bg-gradient-to-tr ${currentTip.color} opacity-15 rounded-full blur-xl transform -translate-x-8 translate-y-8`} />
            </div>
            
            {/* Hover Effect */}
            <motion.div
                className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", damping: 20, stiffness: 400 }}
            />
        </motion.div>
    )
}
