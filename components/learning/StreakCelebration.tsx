'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'

interface StreakCelebrationProps {
  streak: number
  show: boolean
  onClose: () => void
}

const getStreakReward = (streak: number) => {
  if (streak === 20) return { xp: 250, badge: "🌟 Unstoppable!", color: "from-purple-500 to-pink-500" }
  if (streak === 15) return { xp: 150, badge: "💎 Diamond Streak!", color: "from-cyan-500 to-blue-500" }
  if (streak === 10) return { xp: 100, badge: "⚡ Lightning Round!", color: "from-yellow-500 to-orange-500" }
  if (streak === 5) return { xp: 50, badge: "🔥 Hot Streak!", color: "from-red-500 to-orange-500" }
  return null
}

export default function StreakCelebration({ 
  streak, 
  show, 
  onClose 
}: StreakCelebrationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; x: number; delay: number }>>([])
  
  const reward = getStreakReward(streak)
  
  useEffect(() => {
    if (show && reward) {
      // Generate confetti particles
      const particles = Array.from({ length: 30 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 0.5
      }))
      setConfetti(particles)
      
      // Auto-close after 3 seconds
      const timer = setTimeout(onClose, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, reward, onClose])
  
  if (!reward) return null

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          {/* Confetti */}
          {confetti.map((particle) => (
            <motion.div
              key={particle.id}
              initial={{ y: -20, x: `${particle.x}vw`, opacity: 1, scale: 1 }}
              animate={{ 
                y: '100vh', 
                opacity: 0,
                rotate: Math.random() * 360,
                scale: 0.5
              }}
              transition={{ 
                duration: 2, 
                delay: particle.delay,
                ease: 'easeIn'
              }}
              className="absolute top-0 w-3 h-3 rounded-full"
              style={{
                background: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A'][
                  Math.floor(Math.random() * 5)
                ]
              }}
            />
          ))}

          {/* Main Card */}
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`
              bg-gradient-to-br ${reward.color} 
              p-8 rounded-3xl shadow-2xl text-white text-center
              min-w-[300px] max-w-md
              border-4 border-white/20
            `}>
              {/* Glow Effect */}
              <div className="absolute inset-0 bg-white/10 rounded-3xl blur-xl -z-10" />
              
              {/* Streak Number */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                className="text-8xl font-black mb-4 drop-shadow-lg"
              >
                {streak}
              </motion.div>
              
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="text-3xl font-black mb-2 drop-shadow-md"
              >
                {reward.badge}
              </motion.div>
              
              {/* Message */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="text-xl font-bold mb-6 drop-shadow"
              >
                {streak} Questions in a Row!
              </motion.p>
              
              {/* XP Reward */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
                className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-white/30"
              >
                <span className="text-2xl">⭐</span>
                <span className="text-2xl font-black">+{reward.xp} XP</span>
              </motion.div>
              
              {/* Tap to Continue */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-sm mt-6 opacity-80"
              >
                Tap anywhere to continue
              </motion.p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
