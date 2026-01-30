'use client'

import { motion } from 'framer-motion'
import { BrightLayer, BrightHeading } from '@/components/system'

export interface SubSkillMastery {
  skillId: string
  skillName: string
  mastery: number // 0-1
  lastPracticed?: string
}

export interface TopicMastery {
  topicId: string
  topicName: string
  mastery: number // 0-1
  subSkills: SubSkillMastery[]
  questionsCompleted: number
  totalQuestions: number
}

interface TopicMasteryDashboardProps {
  topics: TopicMastery[]
  onTopicClick?: (topicId: string) => void
}

export default function TopicMasteryDashboard({ 
  topics, 
  onTopicClick 
}: TopicMasteryDashboardProps) {
  
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 0.85) return 'from-green-500 to-emerald-400'
    if (mastery >= 0.6) return 'from-[var(--brand-primary)] to-[var(--brand-accent)]'
    if (mastery >= 0.3) return 'from-amber-500 to-yellow-400'
    return 'from-gray-500 to-gray-400'
  }
  
  const getMasteryLabel = (mastery: number) => {
    if (mastery >= 0.85) return 'Mastered'
    if (mastery >= 0.6) return 'Proficient'
    if (mastery >= 0.3) return 'Learning'
    return 'Beginner'
  }
  
  const getMasteryEmoji = (mastery: number) => {
    if (mastery >= 0.85) return '🏆'
    if (mastery >= 0.6) return '⭐'
    if (mastery >= 0.3) return '📚'
    return '🌱'
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <BrightHeading level={2}>Topic Mastery</BrightHeading>
        <div className="text-sm text-[var(--text-muted)]">
          {topics.filter(t => t.mastery >= 0.85).length} / {topics.length} Mastered
        </div>
      </div>

      <div className="space-y-4">
        {topics.map((topic, index) => (
          <motion.div
            key={topic.topicId}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <BrightLayer
              variant="elevated"
              padding="md"
              className={`cursor-pointer hover:border-[var(--brand-primary)] transition-all ${
                onTopicClick ? 'hover:scale-[1.02]' : ''
              }`}
              onClick={() => onTopicClick?.(topic.topicId)}
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-2xl">{getMasteryEmoji(topic.mastery)}</span>
                    <h3 className="font-black text-lg text-[var(--text-primary)]">
                      {topic.topicName}
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--text-muted)]">
                    {topic.questionsCompleted} / {topic.totalQuestions} questions completed
                  </p>
                </div>
                
                <div className="text-right">
                  <div className="text-2xl font-black text-[var(--brand-primary)]">
                    {Math.round(topic.mastery * 100)}%
                  </div>
                  <div className={`text-[10px] font-bold uppercase tracking-wider ${
                    topic.mastery >= 0.85 ? 'text-green-600' :
                    topic.mastery >= 0.6 ? 'text-[var(--brand-primary)]' :
                    topic.mastery >= 0.3 ? 'text-amber-600' :
                    'text-gray-600'
                  }`}>
                    {getMasteryLabel(topic.mastery)}
                  </div>
                </div>
              </div>

              {/* Strength Bar */}
              <div className="mb-4">
                <div className="h-3 bg-[var(--bg-primary)] rounded-full overflow-hidden relative">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${topic.mastery * 100}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full bg-gradient-to-r ${getMasteryColor(topic.mastery)} relative`}
                  >
                    {/* Shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                  </motion.div>
                </div>
              </div>

              {/* Sub-skills Grid */}
              {topic.subSkills.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Sub-Skills
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {topic.subSkills.map((skill) => (
                      <div
                        key={skill.skillId}
                        className="flex items-center justify-between p-2 bg-[var(--bg-primary)] rounded-lg"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[var(--text-secondary)] truncate">
                            {skill.skillName}
                          </p>
                          {skill.lastPracticed && (
                            <p className="text-[10px] text-[var(--text-muted)]">
                              Last: {new Date(skill.lastPracticed).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        
                        <div className="ml-2 flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${skill.mastery * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.2 }}
                              className={`h-full bg-gradient-to-r ${getMasteryColor(skill.mastery)}`}
                            />
                          </div>
                          <span className="text-[10px] font-bold text-[var(--text-muted)] w-8 text-right">
                            {Math.round(skill.mastery * 100)}%
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Hint */}
              {topic.mastery < 0.85 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                    <span>💡</span>
                    <span>
                      {topic.mastery < 0.3
                        ? 'Start with the basics to build your foundation'
                        : topic.mastery < 0.6
                        ? 'Keep practicing to reach proficiency'
                        : 'Almost there! A few more questions to master this topic'}
                    </span>
                  </p>
                </div>
              )}
            </BrightLayer>
          </motion.div>
        ))}
      </div>

      {/* Overall Stats */}
      <BrightLayer variant="glass" padding="md" className="mt-8">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-3xl font-black text-[var(--brand-primary)]">
              {topics.filter(t => t.mastery >= 0.85).length}
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Mastered
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[var(--brand-accent)]">
              {topics.filter(t => t.mastery >= 0.6 && t.mastery < 0.85).length}
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Proficient
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-amber-500">
              {topics.filter(t => t.mastery < 0.6).length}
            </div>
            <div className="text-xs text-[var(--text-muted)] uppercase tracking-wider">
              Learning
            </div>
          </div>
        </div>
      </BrightLayer>
    </div>
  )
}
