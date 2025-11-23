'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { X, Plus, RefreshCw, Target, ChevronRight } from 'lucide-react'
import { hapticFeedback } from '@/lib/utils'

interface OnboardingProps {
  onComplete: () => void
  onAddExpense: () => void
  onSyncEmails: () => void
}

const STEPS = [
  {
    title: 'Welcome to Expense Tracker!',
    description: 'Track your spending automatically from emails or add expenses manually',
    icon: '👋',
    action: 'Get Started',
  },
  {
    title: 'Add Your First Expense',
    description: 'Tap the + button to manually add an expense or swipe to explore',
    icon: '💰',
    action: 'Add Expense',
  },
  {
    title: 'Sync Email Expenses',
    description: 'Automatically import expenses from VIB Bank and Grab emails',
    icon: '📧',
    action: 'Sync Emails',
  },
  {
    title: 'Set Budget Goals',
    description: 'Track spending by category and stay within your budget',
    icon: '🎯',
    action: 'Done',
  },
]

export function Onboarding({ onComplete, onAddExpense, onSyncEmails }: OnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding')
    if (!hasSeenOnboarding) {
      setTimeout(() => setShow(true), 500)
    }
  }, [])

  const handleNext = () => {
    hapticFeedback('light')

    if (currentStep === 1) {
      onAddExpense()
    } else if (currentStep === 2) {
      onSyncEmails()
    }

    if (currentStep === STEPS.length - 1) {
      handleComplete()
    } else {
      setCurrentStep((prev) => prev + 1)
    }
  }

  const handleSkip = () => {
    hapticFeedback('light')
    handleComplete()
  }

  const handleComplete = () => {
    localStorage.setItem('hasSeenOnboarding', 'true')
    setShow(false)
    setTimeout(onComplete, 300)
  }

  if (!show) return null

  const step = STEPS[currentStep]

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
        onClick={handleSkip}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: 'spring', damping: 25 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="max-w-md w-full p-6 relative">
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="text-center mb-6">
              <div className="text-6xl mb-4">{step.icon}</div>
              <h2 className="text-2xl font-bold mb-2">{step.title}</h2>
              <p className="text-muted-foreground">{step.description}</p>
            </div>

            {/* Progress dots */}
            <div className="flex justify-center gap-2 mb-6">
              {STEPS.map((_, index) => (
                <div
                  key={index}
                  className={`h-2 rounded-full transition-all ${
                    index === currentStep
                      ? 'w-8 bg-primary'
                      : index < currentStep
                      ? 'w-2 bg-primary/50'
                      : 'w-2 bg-muted'
                  }`}
                />
              ))}
            </div>

            <div className="flex gap-3">
              {currentStep < STEPS.length - 1 && (
                <Button variant="outline" onClick={handleSkip} className="flex-1">
                  Skip
                </Button>
              )}
              <Button onClick={handleNext} className="flex-1 gap-2">
                {step.action}
                {currentStep < STEPS.length - 1 && <ChevronRight className="h-4 w-4" />}
              </Button>
            </div>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
