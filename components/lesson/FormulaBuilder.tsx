'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

interface FormulaBuilderProps {
  question: string
  parts: string[]
  correctFormula: string[]
  onComplete: (isCorrect: boolean) => void
}

export default function FormulaBuilder({ question, parts, correctFormula, onComplete }: FormulaBuilderProps) {
  const [formula, setFormula] = useState<string[]>([])
  const [availableParts, setAvailableParts] = useState<string[]>(parts)
  const [isComplete, setIsComplete] = useState(false)

  const addPart = (part: string) => {
    setFormula(prev => [...prev, part])
    setAvailableParts(prev => prev.filter(p => p !== part))

    // Check if formula is complete
    if (formula.length + 1 === correctFormula.length) {
      checkAnswer([...formula, part])
    }
  }

  const removePart = (index: number) => {
    const part = formula[index]
    setFormula(prev => prev.filter((_, i) => i !== index))
    setAvailableParts(prev => [...prev, part])
    setIsComplete(false)
  }

  const checkAnswer = (currentFormula: string[]) => {
    const isCorrect = currentFormula.length === correctFormula.length &&
      currentFormula.every((part, index) => part === correctFormula[index])

    setIsComplete(true)
    onComplete(isCorrect)
  }

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-heading font-semibold text-navy-dark mb-6">{question}</h3>

      {/* Formula Display */}
      <div className="bg-gray-50 rounded-xl p-6 min-h-[120px] border-2 border-gray-200">
        <p className="text-sm text-gray-600 mb-3">Build your formula:</p>
        <div className="flex flex-wrap gap-2 items-center min-h-[60px]">
          {formula.length === 0 ? (
            <span className="text-gray-400">Click parts below to build the formula</span>
          ) : (
            formula.map((part, index) => (
              <motion.div
                key={index}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex items-center gap-2"
              >
                <span className="px-4 py-2 bg-gradient-to-r from-teal-light to-teal-medium text-white rounded-lg font-mono text-lg font-semibold shadow-md">
                  {part}
                </span>
                {index < formula.length - 1 && (
                  <span className="text-2xl text-gray-400">+</span>
                )}
                <button
                  onClick={() => removePart(index)}
                  className="text-red-error hover:text-red-600 text-xl ml-1"
                >
                  ×
                </button>
              </motion.div>
            ))
          )}
        </div>
      </div>

      {/* Available Parts */}
      <div className="space-y-2">
        <p className="text-sm text-gray-600">Available formula parts:</p>
        <div className="flex flex-wrap gap-2">
          {availableParts.map((part, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => addPart(part)}
              disabled={isComplete}
              className="px-4 py-2 bg-gradient-to-r from-purple-light to-purple-lavender text-white rounded-lg font-mono font-semibold shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {part}
            </motion.button>
          ))}
        </div>
      </div>

      {isComplete && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-green-100 border-l-4 border-green-500 rounded-xl"
        >
          <p className="text-green-800 font-medium">✓ Formula complete! Checking answer...</p>
        </motion.div>
      )}
    </div>
  )
}
