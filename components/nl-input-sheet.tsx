'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useSheetBackdrop } from '@/components/sheet-backdrop-context'
import { springs, variants, durations } from '@/lib/motion-system'
import { Sparkles, X, Check, Loader2, ArrowRight, ChevronDown } from 'lucide-react'
import { useParseInput, useExecuteParsedInput } from '@/lib/hooks/use-nl-input'
import { useQuickSuggestions } from '@/lib/hooks/use-quick-suggestions'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface NLInputSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFallbackToForm?: () => void
  onStartWorkout?: () => void
  onStartRoutine?: () => void
}

const INTENT_LABELS: Record<string, { label: string; icon: string; color: string }> = {
  expense: { label: 'Expense', icon: '\u{1F4B0}', color: 'text-orange-500' },
  meal: { label: 'Meal', icon: '\u{1F37D}\u{FE0F}', color: 'text-green-500' },
  workout: { label: 'Workout', icon: '\u{1F4AA}', color: 'text-violet-500' },
  routine: { label: 'Routine', icon: '\u{2705}', color: 'text-blue-500' },
  goal: { label: 'Goal', icon: '\u{1F3AF}', color: 'text-purple-500' },
  unknown: { label: 'Unknown', icon: '\u{2753}', color: 'text-gray-500' },
}

const SUGGESTION_TINTS: Record<string, string> = {
  expense: 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
  meal: 'bg-green-500/10 text-green-700 dark:text-green-400',
  workout: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  routine: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
}

export function NLInputSheet({ open, onOpenChange, onFallbackToForm, onStartWorkout, onStartRoutine }: NLInputSheetProps) {
  const [input, setInput] = useState('')
  const [step, setStep] = useState<'input' | 'confirm' | 'done'>('input')
  const [keyboardOffset, setKeyboardOffset] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const parseInput = useParseInput()
  const executeInput = useExecuteParsedInput()
  const suggestions = useQuickSuggestions(4)
  const { onSheetOpen, onSheetClose } = useSheetBackdrop()

  useEffect(() => {
    if (open) { onSheetOpen(); return onSheetClose }
    return undefined
  }, [open, onSheetOpen, onSheetClose])

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

  // iOS scroll lock: overflow:hidden alone doesn't work on iOS Safari/PWA.
  // Block touchmove at document level to prevent background scroll without
  // layout shifts that clash with the backdrop scale animation.
  useEffect(() => {
    if (!open) return
    const prevent = (e: TouchEvent) => {
      if (!panelRef.current?.contains(e.target as Node)) e.preventDefault()
    }
    document.addEventListener('touchmove', prevent, { passive: false })
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('touchmove', prevent)
      document.body.style.overflow = ''
    }
  }, [open])

  // iOS keyboard avoidance: adjust sheet position when virtual keyboard opens
  useEffect(() => {
    if (!open) { setKeyboardOffset(0); return }
    const vv = window.visualViewport
    if (!vv) return

    const onResize = () => {
      const offset = window.innerHeight - vv.height
      setKeyboardOffset(offset > 0 ? offset : 0)
    }

    vv.addEventListener('resize', onResize)
    onResize()
    return () => vv.removeEventListener('resize', onResize)
  }, [open])

  const handleSubmit = async () => {
    if (!input.trim()) return
    const result = await parseInput.mutateAsync(input.trim())
    if (result.intent === 'unknown' || result.confidence < 0.5) {
      toast.error("Couldn't understand that. Try again or use manual entry.")
      return
    }

    // navigation intents — close sheet and open the right flow
    if (result.intent === 'workout') {
      onOpenChange(false)
      onStartWorkout?.()
      return
    }
    if (result.intent === 'routine') {
      onOpenChange(false)
      onStartRoutine?.()
      return
    }

    // data intents — show confirm card
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
            className="fixed inset-0 z-[60] bg-black/50"
            {...variants.fade}
            transition={{ duration: durations.standard }}
            onClick={() => onOpenChange(false)}
          />

          {/* Bottom panel */}
          <motion.div
            ref={panelRef}
            className="fixed inset-x-0 z-[60] bg-background rounded-t-2xl"
            {...variants.sheet}
            transition={springs.sheet}
            style={{
              bottom: keyboardOffset,
              paddingBottom: keyboardOffset > 0 ? undefined : 'env(safe-area-inset-bottom)',
            }}
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

            {/* Content - staggers in after sheet settles */}
            <motion.div
              className="px-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.15, duration: 0.2 } }}
              exit={{ opacity: 0, transition: { duration: 0.05 } }}
            >
              <AnimatePresence mode="wait">
                {step === 'input' && (
                  <motion.div
                    key="input"
                    {...variants.slideUp}
                  >
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="coffee 45k, had pho, workout..."
                      className="w-full rounded-xl border bg-muted/50 px-4 py-3 text-base outline-none focus:ring-2 focus:ring-violet-500/50"
                      disabled={parseInput.isPending}
                    />

                    {/* Tinted suggestion pills */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {suggestions.map((s) => {
                        const tint = SUGGESTION_TINTS[s.intent] || 'bg-muted text-muted-foreground'

                        return (
                          <button
                            key={s.text}
                            onClick={() => setInput(s.text)}
                            className={`rounded-xl px-3 py-2 text-sm font-medium text-center ${tint}`}
                          >
                            {s.text}
                          </button>
                        )
                      })}
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
                    {...variants.slideUp}
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
                    {...variants.scale}
                    className="flex flex-col items-center py-8"
                  >
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                      <Check className="h-7 w-7 text-green-600" />
                    </div>
                    <p className="mt-3 font-medium">Saved!</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* CTA button — fixed at sheet bottom, right above keyboard */}
            {step === 'input' && (
              <div className="px-4 pb-4 pt-2">
                <button
                  onClick={handleSubmit}
                  disabled={!input.trim() || parseInput.isPending}
                  className="w-full rounded-xl bg-violet-500 py-3.5 text-base font-semibold text-white disabled:opacity-40 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                >
                  {parseInput.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Quick Add
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
