'use client'

import { useAuth } from '@/components/auth-provider'
import { Navbar } from '@/components/navbar'
import { Skeleton } from '@/components/skeleton-loader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { hapticFeedback } from '@/lib/utils'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, ExternalLink, Eye, EyeOff, Mail, Plus, Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface EmailSettings {
  id?: string
  email_address: string
  app_password: string
  imap_host: string
  imap_port: number
  imap_tls: boolean
  trusted_senders: string[]
  is_enabled: boolean
  last_sync_at?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user: _user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newSender, setNewSender] = useState('')
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    email_address: '',
    app_password: '',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_tls: true,
    trusted_senders: ['info@card.vib.com.vn', 'no-reply@grab.com'],
    is_enabled: true,
  })

  useEffect(() => {
    loadEmailSettings()
  }, [])

  const loadEmailSettings = async () => {
    try {
      const response = await fetch('/api/settings/email')
      if (response.ok) {
        const data = await response.json()
        if (data) {
          setEmailSettings(data)
        }
      }
    } catch (error) {
      console.error('Error loading email settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    hapticFeedback('medium')

    if (!emailSettings.email_address || !emailSettings.app_password) {
      toast.error('Please fill in email and app password')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(emailSettings),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      const data = await response.json()
      setEmailSettings(data)
      toast.success('Email settings saved successfully!')
    } catch (error: any) {
      console.error('Error saving email settings:', error)
      toast.error(error.message || 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    hapticFeedback('medium')

    if (!emailSettings.id) return

    if (!confirm('Are you sure you want to delete your email sync settings?')) {
      return
    }

    try {
      const response = await fetch('/api/settings/email', {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete settings')
      }

      setEmailSettings({
        email_address: '',
        app_password: '',
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        imap_tls: true,
        trusted_senders: ['info@card.vib.com.vn', 'no-reply@grab.com'],
        is_enabled: true,
      })
      toast.success('Email settings deleted')
    } catch (error) {
      console.error('Error deleting email settings:', error)
      toast.error('Failed to delete settings')
    }
  }

  const handleAddSender = () => {
    hapticFeedback('light')

    if (!newSender.trim()) {
      toast.error('Please enter an email address')
      return
    }

    // basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newSender.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    // check for duplicates
    if (emailSettings.trusted_senders.includes(newSender.trim().toLowerCase())) {
      toast.error('This sender is already in the list')
      return
    }

    setEmailSettings({
      ...emailSettings,
      trusted_senders: [...emailSettings.trusted_senders, newSender.trim().toLowerCase()],
    })
    setNewSender('')
    toast.success('Trusted sender added')
  }

  const handleRemoveSender = (sender: string) => {
    hapticFeedback('light')
    setEmailSettings({
      ...emailSettings,
      trusted_senders: emailSettings.trusted_senders.filter((s) => s !== sender),
    })
    toast.success('Trusted sender removed')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        {/* Navbar */}
        <Navbar onLogoClick={() => router.push('/')} />

        {/* content skeleton */}
        <div
          className="container max-w-4xl mx-auto px-4 py-6 space-y-6"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
          }}
        >
          {/* email sync card skeleton */}
          <Card className="ios-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-6 w-32" />
                </div>
              </div>
              <Skeleton className="h-4 w-full max-w-md mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              <Skeleton className="h-4 w-full max-w-xs" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-12 w-full" />
              </div>
              <div className="flex gap-3 pt-4">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-12" />
              </div>
            </CardContent>
          </Card>

          {/* trusted senders card skeleton */}
          <Card className="ios-card">
            <CardHeader>
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full max-w-md mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Skeleton className="h-12 flex-1" />
                <Skeleton className="h-12 w-24" />
              </div>
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <Skeleton key={i} className="h-14 w-full rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <Navbar onLogoClick={() => router.push('/')} />

      {/* content */}
      <div
        className="min-h-screen overflow-auto overscroll-behavior-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        {/* Header */}
        <div className="px-4 pt-4 pb-4">
          <h1 className="ios-large-title">Settings</h1>
        </div>

        <div className="container max-w-4xl mx-auto px-4 space-y-6 pb-6">

        {/* email sync settings */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Card className="ios-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-primary" />
                  <CardTitle>Email Sync</CardTitle>
                </div>
                {emailSettings.id && (
                  <Badge variant={emailSettings.is_enabled ? 'default' : 'secondary'}>
                    {emailSettings.is_enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                )}
              </div>
              <CardDescription>
                Configure email sync to automatically import expenses from bank transaction emails
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* status */}
              {emailSettings.id && emailSettings.last_sync_at && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-sm text-green-700 dark:text-green-400">
                    Last synced: {new Date(emailSettings.last_sync_at).toLocaleString()}
                  </span>
                </div>
              )}

              {/* gmail setup guide */}
              <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div className="space-y-2 flex-1">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      How to get a Gmail App Password
                    </p>
                    <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
                      <li>Enable 2-Factor Authentication on your Google account</li>
                      <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="underline inline-flex items-center gap-1">
                        Google App Passwords <ExternalLink className="h-3 w-3" />
                      </a></li>
                      <li>Select app: "Mail" or "Other (Expense Tracker)"</li>
                      <li>Click "Generate" and copy the 16-character password</li>
                      <li>Paste it below (remove spaces)</li>
                    </ol>
                    <p className="text-xs text-blue-700 dark:text-blue-300 italic">
                      ⚠️ Use the App Password, not your regular Gmail password
                    </p>
                  </div>
                </div>
              </div>

              {/* email address */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@gmail.com"
                  value={emailSettings.email_address}
                  onChange={(e) => setEmailSettings({ ...emailSettings, email_address: e.target.value })}
                  className="min-h-touch h-12 rounded-xl"
                />
                <p className="text-xs text-muted-foreground">
                  The Gmail account that receives bank transaction emails
                </p>
              </div>

              {/* app password */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">App Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="abcdefghijklmnop"
                    value={emailSettings.app_password}
                    onChange={(e) => setEmailSettings({ ...emailSettings, app_password: e.target.value.replace(/\s/g, '') })}
                    className="min-h-touch pr-10 h-12 rounded-xl"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  16-character password from Google App Passwords (spaces will be removed automatically)
                </p>
              </div>

              {/* advanced settings */}
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Advanced Settings (optional)
                </summary>
                <div className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
                  <div className="space-y-2">
                    <Label htmlFor="host">IMAP Host</Label>
                    <Input
                      id="host"
                      value={emailSettings.imap_host}
                      onChange={(e) => setEmailSettings({ ...emailSettings, imap_host: e.target.value })}
                      placeholder="imap.gmail.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="port">IMAP Port</Label>
                    <Input
                      id="port"
                      type="number"
                      value={emailSettings.imap_port}
                      onChange={(e) => setEmailSettings({ ...emailSettings, imap_port: parseInt(e.target.value) })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="tls">Use TLS</Label>
                    <Switch
                      id="tls"
                      checked={emailSettings.imap_tls}
                      onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, imap_tls: checked })}
                    />
                  </div>
                </div>
              </details>

              {/* enable/disable */}
              <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                <div>
                  <p className="font-medium">Enable Email Sync</p>
                  <p className="text-sm text-muted-foreground">
                    Automatically check for new transaction emails
                  </p>
                </div>
                <Switch
                  checked={emailSettings.is_enabled}
                  onCheckedChange={(checked) => setEmailSettings({ ...emailSettings, is_enabled: checked })}
                />
              </div>

              {/* actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 min-h-touch rounded-xl"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Settings
                    </>
                  )}
                </Button>
                {emailSettings.id && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="min-h-touch rounded-xl"
                    aria-label="Delete settings"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* trusted senders */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card className="ios-card">
            <CardHeader>
              <CardTitle className="text-base">Trusted Email Senders</CardTitle>
              <CardDescription>
                Only emails from these addresses will be processed for expense tracking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* add new sender */}
              <div className="flex gap-2">
                <Input
                  type="email"
                  placeholder="e.g., notifications@bank.com"
                  value={newSender}
                  onChange={(e) => setNewSender(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddSender()
                    }
                  }}
                  className="flex-1 h-12 rounded-xl"
                />
                <Button
                  onClick={handleAddSender}
                  variant="outline"
                  className="min-h-touch rounded-xl"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>

              {/* list of trusted senders */}
              {emailSettings.trusted_senders.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No trusted senders configured</p>
                  <p className="text-xs mt-1">Add email addresses above to start tracking expenses</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {emailSettings.trusted_senders.map((sender) => (
                    <div
                      key={sender}
                      className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                    >
                      <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                      <span className="text-sm font-mono flex-1 truncate">{sender}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveSender(sender)}
                        className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* helpful info */}
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="text-xs text-blue-800 dark:text-blue-200">
                  <strong>Common banks:</strong> info@card.vib.com.vn (VIB Bank), no-reply@grab.com (Grab), notifications@acb.com.vn (ACB Bank)
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
        </div>
      </div>
    </div>
  )
}
