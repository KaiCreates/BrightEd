'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { useEffect, useState } from 'react'

interface LevelCompletionScreenProps {
  levelName: string
  subject: string
  starsEarned: number
  totalStars: number
  streak: number
  masteryPercentage: number
  consistencyPercentage: number
  xpGained: number
  questionsAnswered: number
  accuracy: number
  onContinue: () => void
  onRetry?: () => void
}

export default function LevelCompletionScreen({
  levelName,
  subject,
  starsEarned,
  totalStars,
  streak,
  masteryPercentage,
  consistencyPercentage,
  xpGained,
  questionsAnswered,
  accuracy,
  onContinue,
  onRetry
}: LevelCompletionScreenProps) {
  const [animatedStars, setAnimatedStars] = useState(0)
  const [animatedXP, setAnimatedXP] = useState(0)
  const [animatedMastery, setAnimatedMastery] = useState(0)
  const [animatedConsistency, setAnimatedConsistency] = useState(0)
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    // Animate values
    const duration = 1500
    const steps = 30
    const interval = duration / steps

    let step = 0
    const timer = setInterval(() => {
      step++
      const progress = step / steps
      const easeOut = 1 - Math.pow(1 - progress, 3)

      setAnimatedStars(Math.min(Math.round(starsEarned * easeOut), starsEarned))
      setAnimatedXP(Math.min(Math.round(xpGained * easeOut), xpGained))
      setAnimatedMastery(Math.min(Math.round(masteryPercentage * easeOut), masteryPercentage))
      setAnimatedConsistency(Math.min(Math.round(consistencyPercentage * easeOut), consistencyPercentage))

      if (step >= steps) {
        clearInterval(timer)
        setShowConfetti(true)
      }
    }, interval)

    return () => clearInterval(timer)
  }, [starsEarned, xpGained, masteryPercentage, consistencyPercentage])

  // Generate confetti particles
  const confettiParticles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 2,
    color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#58CC02', '#1cb0f6'][Math.floor(Math.random() * 7)],
    rotation: Math.random() * 360
  }))

  const isPerfect = starsEarned === totalStars && accuracy === 100
  const isPassing = starsEarned >= 2

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
          {confettiParticles.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ y: -20, x: `${particle.x}vw`, opacity: 1, rotate: 0 }}
              animate={{ 
                y: '110vh', 
                opacity: 0,
                rotate: particle.rotation
              }}
              transition={{ 
                duration: 3,
                delay: particle.delay,
                ease: 'linear'
              }}
              className="absolute top-0 w-3 h-3"
              style={{ backgroundColor: particle.color }}
            />
          ))}
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg text-center relative z-10"
      >
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className={`text-4xl md:text-5xl font-black uppercase tracking-wider drop-shadow-sm mb-2 ${
            isPerfect ? 'text-[#ffc800]' : isPassing ? 'text-[#58CC02]' : 'text-[#1cb0f6]'
          }`}>
            {isPerfect ? 'Perfect!' : isPassing ? 'Level Complete!' : 'Good Effort!'}
          </h1>
          <p className="text-[var(--text-secondary)] text-lg font-bold mb-8">
            {levelName}
          </p>
        </motion.div>

        {/* Stars Display */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
          className="flex justify-center gap-2 mb-8"
        >
          {Array.from({ length: totalStars }).map((_, i) => (
            <motion.div
              key={i}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: i < animatedStars ? 1 : 0.8, 
                rotate: 0 
              }}
              transition={{ delay: 0.4 + i * 0.1, type: 'spring', stiffness: 200 }}
              className={`text-5xl md:text-6xl ${i < animatedStars ? 'filter drop-shadow-lg' : 'opacity-30 grayscale'}`}
            >
              ⭐
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          {/* XP Gained */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="bg-[#ffc800] rounded-2xl p-5 border-b-4 border-[#e5a000]"
          >
            <div className="text-white font-black text-xs uppercase tracking-widest mb-1">XP Gained</div>
            <div className="text-white font-black text-3xl">+{animatedXP}</div>
          </motion.div>

          {/* Accuracy */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="bg-[#1cb0f6] rounded-2xl p-5 border-b-4 border-[#1899d6]"
          >
            <div className="text-white font-black text-xs uppercase tracking-widest mb-1">Accuracy</div>
            <div className="text-white font-black text-3xl">{accuracy}%</div>
          </motion.div>

          {/* Streak */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.7 }}
            className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl p-5 border-b-4 border-[#c2410c]"
          >
            <div className="text-white font-black text-xs uppercase tracking-widest mb-1">Current Streak</div>
            <div className="text-white font-black text-3xl flex items-center justify-center gap-1">
              <span>🔥</span> {streak}
            </div>
          </motion.div>

          {/* Mastery */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl p-5 border-b-4 border-[#5b21b6]"
          >
            <div className="text-white font-black text-xs uppercase tracking-widest mb-1">Mastery</div>
            <div className="text-white font-black text-3xl">{animatedMastery}%</div>
            <div className="w-full bg-black/20 rounded-full h-2 mt-2">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${animatedMastery}%` }}
                transition={{ delay: 0.8, duration: 1 }}
                className="h-full bg-white rounded-full"
              />
            </div>
          </motion.div>
        </div>

        {/* Consistency & Questions Row */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.9 }}
            className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-4"
          >
            <div className="text-[var(--text-muted)] font-black text-xs uppercase tracking-widest mb-1">Consistency</div>
            <div className="text-[var(--text-primary)] font-black text-2xl flex items-center gap-1">
              <span>📅</span> {animatedConsistency}%
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">30-day activity</p>
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.0 }}
            className="bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] rounded-2xl p-4"
          >
            <div className="text-[var(--text-muted)] font-black text-xs uppercase tracking-widest mb-1">Questions</div>
            <div className="text-[var(--text-primary)] font-black text-2xl flex items-center gap-1">
              <span>📝</span> {questionsAnswered}
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">answered this session</p>
          </motion.div>
        </div>

        {/* Mascot Message */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.1 }}
          className="mb-8"
        >
          <div className="w-32 h-32 mx-auto relative mb-4">
            <div className={`owl-sprite ${isPerfect ? 'owl-magic' : isPassing ? 'owl-happy' : 'owl-neutral'}`} 
                 style={{ transform: 'scale(1.5)', transformOrigin: 'center' }} />
          </div>
          <p className="text-xl font-bold text-[var(--text-secondary)]">
            {isPerfect 
              ? "Hoo-ray! Perfect score! You're a master of this topic!" 
              : isPassing 
                ? "Great work! You're making excellent progress!" 
                : "Keep practicing! Every question makes you stronger!"}
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 1.2 }}
          className="flex flex-col gap-3"
        >
          <Link href="/learn?animation=unlock" className="block w-full">
            <button className="w-full py-4 rounded-2xl bg-[#58CC02] border-b-4 border-[#46A302] text-white font-black text-xl uppercase tracking-widest hover:bg-[#46A302] transition-colors active:border-b-0 active:translate-y-[4px]">
              Continue Journey
            </button>
          </Link>
          
          {onRetry && (
            <button 
              onClick={onRetry}
              className="w-full py-4 rounded-2xl bg-[var(--bg-elevated)] border-2 border-[var(--border-subtle)] text-[var(--text-secondary)] font-black text-lg uppercase tracking-widest hover:bg-[var(--bg-primary)] transition-colors"
            >
              Practice Again
            </button>
          )}
        </motion.div>
      </motion.div>
    </div>
  )
}
