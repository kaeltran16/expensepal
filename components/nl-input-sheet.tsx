'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Send, X, Check, Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import { useParseInput, useExecuteParsedInput } from '@/lib/hooks/use-nl-input'
import { useQuickSuggestions } from '@/lib/hooks/use-quick-suggestions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface NLInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFallbackToForm?: () => void
}

const INTENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  expense: { label: 'Expense', icon: '\u{1F4B0}', color: 'text-orange-500' },
  meal: { label: 'Meal', icon: '\u{1F37D}\u{FE0F}', color: 'text-green-500' },
  routine: { label: 'Routine', icon: '\u{2705}', color: 'text-blue-500' },
  goal: { label: 'Goal', icon: '\u{1F3AF}', color: 'text-purple-500' },
  unknown: { label: 'Unknown', icon: '\u{2753}', color: 'text-gray-500' },
}

export function NLInputSheet({ open, onOpenChange, onFallbackToForm }: NLInputSheetProps) {
  const [input, setInput] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'done'>('input')
  const inputRef = useRef<HTMLInputElement>(null)
  const parseInput = useParseInput()
  const executeInput = useExecuteParsedInput()
  const suggestions = useQuickSuggestions(5)

  useEffect(() => {
    if (open) {
      setStep('input')
      setInput('')
      parseInput.reset()
      executeInput.reset()
      setTimeout(() => inputRef.current?.focus(), 300)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Lock body scroll when open
  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [open])

  const handleSubmit = async () => {
    if (!input.trim()) return
    const result = await parseInput.mutateAsync(input.trim())
    if (result.intent === 'unknown' || result.confidence < 0.5) {
      toast.error("Couldn't understand that. Try again or use manual entry.")
      return
    }
    setStep('confirm')
  }

  const handleConfirm = async () => {
    if (!parseInput.data) return
    try {
      await executeInput.mutateAsync(parseInput.data)
      setStep('done')
      toast.success(parseInput.data.display_text)
      setTimeout(() => onOpenChange(false), 800)
    } catch {
      toast.error('Failed to save. Try again.')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (step === 'input') handleSubmit()
      else if (step === 'confirm') handleConfirm()
    }
  }

  const parsed = parseInput.data
  const intentMeta = parsed ? INTENT_LABELS[parsed.intent] : null

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom panel */}
          <motion.div
            className="fixed inset-x-0 bottom-0 z-50 bg-background rounded-t-2xl"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2">
              <div className="flex items-center gap-2 text-base font-semibold">
                <Sparkles className="h-4 w-4 text-violet-500" />
                Quick Add
              </div>
              <button
                onClick={() => onOpenChange(false)}
                className="rounded-full p-2 text-muted-foreground hover:bg-muted"
              >
                <ChevronDown className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="px-4 pb-4">
              <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    <div className="relative">
                      <input
                        ref={inputRef}
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type anything... e.g. coffee 45k"
                        className="w-full rounded-xl border bg-muted/50 px-4 py-3 pr-12 text-base outline-none focus:ring-2 focus:ring-violet-500/50"
                        disabled={parseInput.isPending}
                      />
                      <button
                        onClick={handleSubmit}
                        disabled={!input.trim() || parseInput.isPending}
                        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-violet-500 p-2 text-white disabled:opacity-50"
                      >
                        {parseInput.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </button>
                    </div>

                    {/* Personalized suggestion chips */}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s.text}
                          onClick={() => setInput(s.text)}
                          className="rounded-full bg-muted px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted/80"
                        >
                          {s.text}
                        </button>
                      ))}
                    </div>

                    {/* Manual entry fallback */}
                    {onFallbackToForm && (
                      <button
                        onClick={() => {
                          onOpenChange(false)
                          onFallbackToForm()
                        }}
                        className="mt-3 flex w-full items-center justify-center gap-1 text-sm text-muted-foreground"
                      >
                        Or use manual form <ArrowRight className="h-3 w-3" />
                      </button>
                    )}
                  </motion.div>
                )}

                {step === 'confirm' && parsed && intentMeta && (
                  <motion.div
                    key="confirm"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <div className="rounded-xl border bg-muted/30 p-4">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span>{intentMeta.icon}</span>
                        <span className={intentMeta.color}>{intentMeta.label}</span>
                        <span className="ml-auto text-xs text-muted-foreground">
                          {Math.round(parsed.confidence * 100)}% confident
                        </span>
                      </div>
                      <p className="mt-2 text-lg font-semibold">{parsed.display_text}</p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setStep('input')}
                      >
                        <X className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button
                        className="flex-1 bg-violet-500 hover:bg-violet-600"
                        onClick={handleConfirm}
                        disabled={executeInput.isPending}
                      >
                        {executeInput.isPending ? (
                          <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="mr-1 h-4 w-4" />
                        )}
                        Confirm
                      </Button>
                    </div>
                  </motion.div>
                )}

                {step === 'done' && (
                  <motion.div
                    key="done"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center py-8"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-7 w-7 text-green-600" />
                    </div>
                    <p className="mt-3 font-medium">Saved!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
