'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { UserMenu } from '@/components/user-menu'
import { motion } from 'framer-motion'
import { LogIn, Moon, Sun, Wallet } from 'lucide-react'
import { useTheme } from 'next-themes'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface NavbarProps {
  onSyncEmails?: () => void
  isSyncing?: boolean
}

export function Navbar({ onSyncEmails, isSyncing }: NavbarProps = {}) {
  const { user, loading } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()

  const isDark = theme === 'dark'

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        paddingTop: 'env(safe-area-inset-top)',
        backgroundColor: `rgba(var(--card-rgb), ${isDark ? '0.7' : '0.8'})`,
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderBottom: isDark
          ? '0.5px solid rgba(255, 255, 255, 0.1)'
          : '0.5px solid rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
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
          </Link>

          {/* Actions */}
          <div className="flex items-center gap-2">
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

            {/* Sync Status Badge */}
            {isSyncing && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: 'spring', bounce: 0.4 }}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20"
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-blue-500"
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [1, 0.6, 1],
                  }}
                  transition={{
                    duration: 1.5,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  Syncing
                </span>
              </motion.div>
            )}

            {/* User Menu or Login */}
            {loading ? (
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
            ) : user ? (
              <UserMenu onSyncEmails={onSyncEmails} isSyncing={isSyncing} />
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
