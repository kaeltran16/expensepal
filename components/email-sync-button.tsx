'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { RefreshCw, Mail } from 'lucide-react'

interface EmailSyncButtonProps {
  onSync?: () => void
}

export function EmailSyncButton({ onSync }: EmailSyncButtonProps) {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleSync = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/email/sync', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage(`✓ Synced ${data.count} new expenses`)
        onSync?.()
      } else {
        setMessage(`✗ ${data.error || 'Sync failed'}`)
      }
    } catch (error) {
      setMessage('✗ Network error')
    } finally {
      setLoading(false)
      setTimeout(() => setMessage(''), 5000)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button
        onClick={handleSync}
        disabled={loading}
        className="gap-2"
      >
        <motion.div
          animate={{ rotate: loading ? 360 : 0 }}
          transition={{ duration: 1, repeat: loading ? Infinity : 0, ease: 'linear' }}
        >
          {loading ? <RefreshCw className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
        </motion.div>
        {loading ? 'Syncing...' : 'Sync Emails'}
      </Button>
      {message && (
        <motion.p
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0 }}
          className={`text-sm ${message.startsWith('✓') ? 'text-green-600' : 'text-red-600'}`}
        >
          {message}
        </motion.p>
      )}
    </div>
  )
}
