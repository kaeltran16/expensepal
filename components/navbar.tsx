'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { motion } from 'framer-motion'
import { LogIn, Mail, Moon, Sun, Wallet } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  onSyncEmails?: () => void
  isSyncing?: boolean
  onOpenProfile?: () => void
  onLogoClick?: () => void
}

export function Navbar({ onSyncEmails, isSyncing, onOpenProfile, onLogoClick }: NavbarProps = {}) {
  const { user, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <button
            onClick={() => {
              if (onLogoClick) {
                onLogoClick()
              } else {
                router.push('/')
              }
            }}
            className="flex items-center gap-2 group"
          >
            <motion.div
              whileHover={{ rotate: 360 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-md group-hover:blur-lg transition-all" />
              <Wallet className="h-6 w-6 text-primary relative z-10" />
            </motion.div>
            <span className="font-bold text-lg text-black dark:text-white">
              ExpensePal
            </span>
          </button>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Sync Emails Button */}
            {user && onSyncEmails && (
              <motion.div whileTap={{ scale: 0.9 }} className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onSyncEmails}
                  disabled={isSyncing}
                  className="rounded-full hover:bg-muted/50 ios-touch min-h-touch w-11"
                >
                  <Mail className={`h-5 w-5 transition-colors duration-200 ${isSyncing ? 'text-blue-500' : ''}`} />
                  <span className="sr-only">Sync emails</span>
                </Button>
                {/* Flowing circle progress */}
                {isSyncing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    transition={{
                      opacity: { duration: 0.2 },
                      rotate: { duration: 1, repeat: Infinity, ease: 'linear' }
                    }}
                    className="absolute inset-0 pointer-events-none"
                  >
                    <svg className="w-full h-full" viewBox="0 0 44 44">
                      <circle
                        cx="22"
                        cy="22"
                        r="20"
                        fill="none"
                        stroke="url(#syncGradient)"
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                      <defs>
                        <linearGradient id="syncGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0" />
                          <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Theme Toggle */}
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="rounded-full hover:bg-muted/50 ios-touch min-h-touch w-11"
              >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
              </Button>
            </motion.div>

            {/* User Menu or Login */}
            {loading ? (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <UserMenu onSyncEmails={onSyncEmails} isSyncing={isSyncing} onOpenProfile={onOpenProfile} />
            ) : (
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={() => router.push('/login')}
                  size="sm"
                  className="gap-2 ios-press min-h-touch rounded-full"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign In</span>
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  )
}
