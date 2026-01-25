'use client'

import { useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface DragDropQuestionProps {
  question: string
  items: string[]
  correctOrder: number[]
  onComplete: (isCorrect: boolean) => void
  showFeedback?: boolean
}

interface DroppedItem {
  content: string
  originalIndex: number
}

export default function DragDropQuestion({
  question,
  items,
  correctOrder,
  onComplete,
  showFeedback = true
}: DragDropQuestionProps) {
  const [draggedItems, setDraggedItems] = useState<(DroppedItem | null)[]>(
    new Array(items.length).fill(null)
  )
  const [availableItems, setAvailableItems] = useState<DroppedItem[]>(
    items.map((content, originalIndex) => ({ content, originalIndex }))
  )
  const [isComplete, setIsComplete] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [draggedItem, setDraggedItem] = useState<DroppedItem | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Shuffle available items on mount for variety
  useEffect(() => {
    setAvailableItems(prev => {
      const shuffled = [...prev]
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    })
  }, [])

  const handleDragStart = useCallback((item: DroppedItem) => {
    setDraggedItem(item)
  }, [])

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null)
    setDragOverIndex(null)
  }, [])

  const checkAnswer = useCallback((currentOrder: DroppedItem[]) => {
    const correct = correctOrder.every((correctOriginalIndex, position) => {
      return currentOrder[position]?.originalIndex === correctOriginalIndex
    })

    setIsComplete(true)
    setIsCorrect(correct)
    onComplete(correct)
  }, [correctOrder, onComplete])

  const handleDrop = useCallback((targetIndex: number) => {
    if (!draggedItem || isComplete) return

    const newDraggedItems = [...draggedItems]
    const existingItem = newDraggedItems[targetIndex]

    // Place the dragged item in the target slot
    newDraggedItems[targetIndex] = draggedItem
    setDraggedItems(newDraggedItems)

    // Update available items
    setAvailableItems(prev => {
      let updated = prev.filter(item =>
        item.originalIndex !== draggedItem.originalIndex
      )

      // If swapping, add the old item back to available
      if (existingItem) {
        updated = [...updated, existingItem]
      }

      return updated
    })

    // Check if all slots are filled
    const allFilled = newDraggedItems.every(item => item !== null)
    if (allFilled) {
      checkAnswer(newDraggedItems as DroppedItem[])
    }

    setDraggedItem(null)
    setDragOverIndex(null)
  }, [draggedItem, draggedItems, isComplete, checkAnswer])

  const handleRemoveItem = useCallback((index: number) => {
    if (isComplete) return

    const item = draggedItems[index]
    if (!item) return

    const newDraggedItems = [...draggedItems]
    newDraggedItems[index] = null
    setDraggedItems(newDraggedItems)

    setAvailableItems(prev => [...prev, item])
    setIsCorrect(null)
  }, [draggedItems, isComplete])

  const handleReset = useCallback(() => {
    setDraggedItems(new Array(items.length).fill(null))
    setAvailableItems(items.map((content, originalIndex) => ({ content, originalIndex })))
    setIsComplete(false)
    setIsCorrect(null)
    setDraggedItem(null)
    setDragOverIndex(null)
  }, [items])

  // Touch device support
  const handleTouchStart = useCallback((item: DroppedItem) => {
    setDraggedItem(item)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault()
    const touch = e.touches[0]
    const element = document.elementFromPoint(touch.clientX, touch.clientY)
    const dropZone = element?.closest('[data-drop-zone]')

    if (dropZone) {
      const index = parseInt(dropZone.getAttribute('data-drop-index') || '-1')
      setDragOverIndex(index >= 0 ? index : null)
    } else {
      setDragOverIndex(null)
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (dragOverIndex !== null && draggedItem) {
      handleDrop(dragOverIndex)
    } else {
      setDraggedItem(null)
      setDragOverIndex(null)
    }
  }, [dragOverIndex, draggedItem, handleDrop])

  return (
    <div className="space-y-6">
      <h3 className="text-2xl font-heading font-semibold text-navy-dark mb-6">
        {question}
      </h3>

      {/* Feedback Message */}
      <AnimatePresence>
        {showFeedback && isComplete && isCorrect !== null && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`p-4 rounded-xl ${isCorrect
              ? 'bg-green-50 border-2 border-green-500 text-green-800'
              : 'bg-red-50 border-2 border-red-500 text-red-800'
              }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">
                {isCorrect ? '✓ Correct!' : '✗ Incorrect - Try Again'}
              </span>
              {!isCorrect && (
                <button
                  onClick={handleReset}
                  className="px-4 py-2 bg-white rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Reset
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop Zones */}
      <div className="space-y-3">
        <p className="text-sm text-gray-600 mb-2 font-medium">
          Drag items to arrange in the correct order:
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {draggedItems.map((item, index) => (
            <motion.div
              key={index}
              data-drop-zone
              data-drop-index={index}
              onDragOver={(e) => {
                e.preventDefault()
                setDragOverIndex(index)
              }}
              onDragLeave={() => setDragOverIndex(null)}
              onDrop={(e) => {
                e.preventDefault()
                handleDrop(index)
              }}
              className={`min-h-[80px] p-4 rounded-xl border-2 transition-all ${dragOverIndex === index
                ? 'border-teal-light bg-teal-light/20 scale-105'
                : item
                  ? 'border-teal-light bg-teal-light/10'
                  : 'border-dashed border-gray-300 bg-gray-50 hover:border-teal-light hover:bg-gray-100'
                } ${isComplete && isCorrect ? 'border-green-500 bg-green-50' : ''} ${isComplete && !isCorrect ? 'border-red-300' : ''
                }`}
              layout
              transition={{ duration: 0.2 }}
            >
              {item ? (
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0, opacity: 0 }}
                  className="flex items-center justify-between gap-2"
                  layout
                >
                  <div className="flex items-center gap-2 flex-1">
                    <span className="text-xs font-bold text-gray-400">
                      {index + 1}.
                    </span>
                    <span className="font-medium text-navy-dark">
                      {item.content}
                    </span>
                  </div>
                  {!isComplete && (
                    <button
                      onClick={() => handleRemoveItem(index)}
                      className="text-red-error hover:text-red-600 text-2xl leading-none transition-colors flex-shrink-0"
                      aria-label={`Remove ${item.content}`}
                    >
                      ×
                    </button>
                  )}
                </motion.div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <span className="text-gray-400 text-sm">
                    Drop here ({index + 1})
                  </span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Available Items */}
      {availableItems.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-gray-600 font-medium">
            Available items ({availableItems.length} remaining):
          </p>
          <div className="flex flex-wrap gap-2">
            <AnimatePresence mode="popLayout">
              {availableItems.map((item) => (
                <motion.div
                  key={item.originalIndex}
                  draggable={!isComplete}
                  onDragStart={(e) => {
                    (e as unknown as React.DragEvent).dataTransfer.effectAllowed = 'move'
                    handleDragStart(item)
                  }}
                  onDragEnd={handleDragEnd}
                  onTouchStart={() => handleTouchStart(item)}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{
                    scale: draggedItem?.originalIndex === item.originalIndex ? 0.95 : 1,
                    opacity: draggedItem?.originalIndex === item.originalIndex ? 0.5 : 1
                  }}
                  exit={{ scale: 0, opacity: 0 }}
                  whileHover={{ scale: isComplete ? 1 : 1.05 }}
                  whileTap={{ scale: isComplete ? 1 : 0.95 }}
                  layout
                  className={`px-4 py-3 bg-gradient-to-r from-purple-light to-purple-lavender text-white rounded-lg font-medium shadow-md transition-all ${isComplete
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-move hover:shadow-lg active:shadow-sm'
                    }`}
                >
                  {item.content}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Progress Indicator */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-teal-light to-purple-light"
            initial={{ width: 0 }}
            animate={{
              width: `${(draggedItems.filter(Boolean).length / items.length) * 100}%`
            }}
            transition={{ duration: 0.3 }}
          />
        </div>
        <span className="text-sm text-gray-600 font-medium min-w-[60px] text-right">
          {draggedItems.filter(Boolean).length} / {items.length}
        </span>
      </div>

      {/* Instructions for touch devices */}
      <p className="text-xs text-gray-500 italic text-center">
        Drag and drop items to arrange them in the correct order
      </p>
    </div>
  )
}