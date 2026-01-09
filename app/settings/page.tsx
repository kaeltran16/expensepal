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
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle, ChevronDown, ChevronUp, Edit, ExternalLink, Eye, EyeOff, Mail, Plus, Save, Trash2, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface EmailSettings {
  id: string
  email_address: string
  app_password: string
  imap_host: string
  imap_port: number
  imap_tls: boolean
  trusted_senders: string[]
  is_enabled: boolean
  last_sync_at?: string
  created_at: string
}

export default function SettingsPage() {
  const router = useRouter()
  const { user: _user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [emailAccounts, setEmailAccounts] = useState<EmailSettings[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null)
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})

  // Form state for add/edit
  const [formData, setFormData] = useState({
    email_address: '',
    app_password: '',
    imap_host: 'imap.gmail.com',
    imap_port: 993,
    imap_tls: true,
    trusted_senders: ['info@card.vib.com.vn', 'no-reply@grab.com'] as string[],
    is_enabled: true,
  })

  // State for trusted senders
  const [newSender, setNewSender] = useState('')

  useEffect(() => {
    loadEmailAccounts()
  }, [])

  const loadEmailAccounts = async () => {
    try {
      const response = await fetch('/api/settings/email')
      if (response.ok) {
        const data = await response.json()
        setEmailAccounts(data || [])
      }
    } catch (error) {
      console.error('Error loading email accounts:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email_address: '',
      app_password: '',
      imap_host: 'imap.gmail.com',
      imap_port: 993,
      imap_tls: true,
      trusted_senders: ['info@card.vib.com.vn', 'no-reply@grab.com'],
      is_enabled: true,
    })
    setEditingAccountId(null)
    setShowAddForm(false)
  }

  const handleAddClick = () => {
    resetForm()
    setShowAddForm(true)
  }

  const handleEditClick = (account: EmailSettings) => {
    setFormData({
      email_address: account.email_address,
      app_password: account.app_password,
      imap_host: account.imap_host,
      imap_port: account.imap_port,
      imap_tls: account.imap_tls,
      trusted_senders: account.trusted_senders,
      is_enabled: account.is_enabled,
    })
    setEditingAccountId(account.id)
    setShowAddForm(true)
  }

  const handleSave = async () => {
    hapticFeedback('medium')

    if (!formData.email_address || !formData.app_password) {
      toast.error('Please fill in email and app password')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to save settings')
      }

      await loadEmailAccounts()
      resetForm()
      toast.success('Email account saved successfully!')
    } catch (error: any) {
      console.error('Error saving email account:', error)
      toast.error(error.message || 'Failed to save account')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, email: string) => {
    hapticFeedback('medium')

    if (!confirm(`Delete email account ${email}?`)) {
      return
    }

    try {
      const response = await fetch(`/api/settings/email?id=${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete account')
      }

      await loadEmailAccounts()
      toast.success('Email account deleted')
    } catch (error) {
      console.error('Error deleting email account:', error)
      toast.error('Failed to delete account')
    }
  }

  const handleToggleEnabled = async (account: EmailSettings) => {
    hapticFeedback('light')

    try {
      const response = await fetch('/api/settings/email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...account,
          is_enabled: !account.is_enabled,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to update account')
      }

      await loadEmailAccounts()
      toast.success(account.is_enabled ? 'Account disabled' : 'Account enabled')
    } catch (error) {
      console.error('Error toggling account:', error)
      toast.error('Failed to update account')
    }
  }

  const handleAddSender = () => {
    hapticFeedback('light')

    if (!newSender.trim()) {
      toast.error('Please enter an email address')
      return
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(newSender.trim())) {
      toast.error('Please enter a valid email address')
      return
    }

    if (formData.trusted_senders.includes(newSender.trim().toLowerCase())) {
      toast.error('This sender is already in the list')
      return
    }

    setFormData({
      ...formData,
      trusted_senders: [...formData.trusted_senders, newSender.trim().toLowerCase()],
    })
    setNewSender('')
    toast.success('Trusted sender added')
  }

  const handleRemoveSender = (sender: string) => {
    hapticFeedback('light')
    setFormData({
      ...formData,
      trusted_senders: formData.trusted_senders.filter((s) => s !== sender),
    })
  }

  const togglePasswordVisibility = (accountId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [accountId]: !prev[accountId]
    }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar onLogoClick={() => router.push('/')} />
        <div
          className="container max-w-4xl mx-auto px-4 py-6 space-y-6"
          style={{
            paddingTop: 'calc(4rem + env(safe-area-inset-top))',
            paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
          }}
        >
          <Card className="ios-card">
            <CardHeader>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-4 w-full max-w-md mt-2" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  const maxAccountsReached = emailAccounts.length >= 3

  return (
    <div className="min-h-screen bg-background">
      <Navbar onLogoClick={() => router.push('/')} />

      <div
        className="min-h-screen overflow-auto overscroll-behavior-none"
        style={{
          WebkitOverflowScrolling: 'touch',
          paddingTop: 'calc(4rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(2rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="px-4 pt-4 pb-3">
          <h1 className="ios-large-title">Settings</h1>
        </div>

        <div className="px-4 space-y-3 pb-6">
          {/* Section Header */}
          <div className="flex items-center justify-between pt-4 pb-2">
            <div>
              <h2 className="ios-headline mb-0.5">Email Sync</h2>
              <p className="ios-caption text-muted-foreground">
                {emailAccounts.length}/3 accounts
              </p>
            </div>
            {!showAddForm && !maxAccountsReached && (
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAddClick}
                  variant="outline"
                  className="min-h-touch gap-2 px-4 rounded-2xl ios-press"
                >
                  <Plus className="h-4 w-4" />
                  Add Account
                </Button>
              </motion.div>
            )}
          </div>

          {/* Empty State */}
          {emailAccounts.length === 0 && !showAddForm && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-16 px-4"
            >
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <p className="text-base font-medium mb-2">No accounts yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Add an email account to automatically import expenses from transaction emails
              </p>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  onClick={handleAddClick}
                  variant="outline"
                  className="min-h-touch gap-2 px-6 rounded-2xl ios-press"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Account
                </Button>
              </motion.div>
            </motion.div>
          )}

          {/* Account Cards */}
          <AnimatePresence mode="popLayout">
            {emailAccounts.map((account, index) => (
              <motion.div
                key={account.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="ios-card overflow-hidden">
                  <CardContent className="p-0">
                    {/* Header with gradient accent */}
                    <div className={`px-4 py-4 ${account.is_enabled ? 'bg-gradient-to-r from-primary/5 to-transparent' : 'bg-muted/30'}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${account.is_enabled ? 'bg-primary/10' : 'bg-muted'}`}>
                          <Mail className={`h-5 w-5 ${account.is_enabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-base truncate">{account.email_address}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {account.is_enabled ? 'Syncing enabled' : 'Syncing paused'}
                            {account.last_sync_at && ` · ${new Date(account.last_sync_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                          </p>
                        </div>
                        <Badge
                          variant={account.is_enabled ? 'default' : 'secondary'}
                          className="text-xs shrink-0"
                        >
                          {account.is_enabled ? 'Active' : 'Off'}
                        </Badge>
                      </div>
                    </div>

                    {/* Trusted senders */}
                    <div className="px-4 py-3 bg-muted/20">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Trusted senders</p>
                      <div className="flex flex-wrap gap-2">
                        {account.trusted_senders.slice(0, 3).map((sender) => (
                          <div
                            key={sender}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-xs font-mono truncate max-w-[200px]"
                          >
                            <span className="truncate">{sender}</span>
                          </div>
                        ))}
                        {account.trusted_senders.length > 3 && (
                          <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-muted text-xs text-muted-foreground">
                            +{account.trusted_senders.length - 3} more
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="grid grid-cols-3 border-t border-border">
                      <button
                        onClick={() => handleToggleEnabled(account)}
                        className={`py-3 flex items-center justify-center gap-2 text-sm font-medium active:bg-muted/50 transition-colors min-h-touch border-r border-border ${account.is_enabled ? 'text-amber-600' : 'text-green-600'}`}
                      >
                        {account.is_enabled ? (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            <span>Pause</span>
                          </>
                        ) : (
                          <>
                            <span className="relative flex h-2 w-2">
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span>Resume</span>
                          </>
                        )}
                      </button>
                      <button
                        onClick={() => handleEditClick(account)}
                        className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-primary active:bg-muted/50 transition-colors min-h-touch border-r border-border"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(account.id, account.email_address)}
                        className="py-3 flex items-center justify-center gap-2 text-sm font-medium text-red-500 active:bg-red-500/10 transition-colors min-h-touch"
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Add/Edit Form */}
          <AnimatePresence>
            {showAddForm && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="ios-card">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {editingAccountId ? 'Edit Account' : 'Add Account'}
                      </CardTitle>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={resetForm}
                        className="h-9 w-9 p-0 rounded-full"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription className="text-xs">
                      Configure your email account for automatic expense tracking
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-5">
                    {/* Gmail Setup Guide - Collapsible */}
                    <details className="group bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-200 dark:border-blue-800 overflow-hidden">
                      <summary className="cursor-pointer p-4 flex items-center gap-3 list-none">
                        <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            How to get Gmail App Password
                          </p>
                        </div>
                        <ChevronDown className="h-4 w-4 text-blue-600 group-open:hidden" />
                        <ChevronUp className="h-4 w-4 text-blue-600 hidden group-open:block" />
                      </summary>
                      <div className="px-4 pb-4 pt-1">
                        <ol className="text-xs text-blue-800 dark:text-blue-200 space-y-2 list-decimal list-inside">
                          <li>Enable 2-Factor Authentication on Google</li>
                          <li>
                            Visit{' '}
                            <a
                              href="https://myaccount.google.com/apppasswords"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="underline inline-flex items-center gap-1 font-medium"
                            >
                              App Passwords <ExternalLink className="h-3 w-3" />
                            </a>
                          </li>
                          <li>Select "Mail" or "Other (ExpensePal)"</li>
                          <li>Copy the 16-character password</li>
                        </ol>
                      </div>
                    </details>

                    {/* Email Address */}
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">
                        Email Address
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="your.email@gmail.com"
                        value={formData.email_address}
                        onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                        className="min-h-touch h-12 rounded-xl text-base"
                        autoComplete="email"
                      />
                    </div>

                    {/* App Password */}
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">
                        App Password
                      </Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPasswords['form'] ? 'text' : 'password'}
                          placeholder="16-character password"
                          value={formData.app_password}
                          onChange={(e) => setFormData({ ...formData, app_password: e.target.value.replace(/\s/g, '') })}
                          className="min-h-touch h-12 rounded-xl pr-12 text-base font-mono"
                          autoComplete="off"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => togglePasswordVisibility('form')}
                          className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 p-0 rounded-full"
                        >
                          {showPasswords['form'] ?
                            <EyeOff className="h-4 w-4" /> :
                            <Eye className="h-4 w-4" />
                          }
                        </Button>
                      </div>
                    </div>

                    {/* Trusted Senders */}
                    <div className="space-y-3">
                      <div>
                        <Label className="text-sm font-medium">Trusted Senders</Label>
                        <p className="text-xs text-muted-foreground mt-1">
                          Only process emails from these addresses
                        </p>
                      </div>

                      <div className="flex gap-2">
                        <Input
                          type="email"
                          placeholder="notifications@bank.com"
                          value={newSender}
                          onChange={(e) => setNewSender(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              handleAddSender()
                            }
                          }}
                          className="flex-1 h-11 rounded-xl text-sm"
                        />
                        <Button
                          onClick={handleAddSender}
                          variant="outline"
                          className="h-11 px-4 rounded-xl shrink-0"
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {formData.trusted_senders.map((sender) => (
                          <div
                            key={sender}
                            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1.5 rounded-full bg-muted border border-border text-sm font-mono group"
                          >
                            <span className="truncate max-w-[180px]">{sender}</span>
                            <button
                              onClick={() => handleRemoveSender(sender)}
                              className="h-5 w-5 rounded-full flex items-center justify-center hover:bg-destructive/10 active:bg-destructive/20 transition-colors"
                            >
                              <X className="h-3 w-3 text-muted-foreground group-hover:text-destructive" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Advanced Settings - Collapsible */}
                    <details className="group">
                      <summary className="cursor-pointer p-3 -mx-3 rounded-xl hover:bg-muted/50 flex items-center gap-2 list-none">
                        <span className="text-sm font-medium flex-1">Advanced Settings</span>
                        <ChevronDown className="h-4 w-4 text-muted-foreground group-open:hidden" />
                        <ChevronUp className="h-4 w-4 text-muted-foreground hidden group-open:block" />
                      </summary>
                      <div className="mt-3 pt-3 space-y-4 border-t">
                        <div className="space-y-2">
                          <Label htmlFor="host" className="text-sm">IMAP Host</Label>
                          <Input
                            id="host"
                            value={formData.imap_host}
                            onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                            placeholder="imap.gmail.com"
                            className="h-11 rounded-xl"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label htmlFor="port" className="text-sm">Port</Label>
                            <Input
                              id="port"
                              type="number"
                              value={formData.imap_port}
                              onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                              className="h-11 rounded-xl"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="tls" className="text-sm">TLS</Label>
                            <div className="h-11 flex items-center">
                              <Switch
                                id="tls"
                                checked={formData.imap_tls}
                                onCheckedChange={(checked) => setFormData({ ...formData, imap_tls: checked })}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </details>

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                      <Button
                        onClick={resetForm}
                        variant="outline"
                        className="flex-1 min-h-touch h-12 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 min-h-touch h-12 rounded-xl"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4 mr-2" />
                            {editingAccountId ? 'Update' : 'Add'}
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Max accounts message */}
          {maxAccountsReached && !showAddForm && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="ios-card bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800">
                <CardContent className="p-4 flex gap-3">
                  <AlertCircle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                      Account limit reached
                    </p>
                    <p className="text-xs text-yellow-800 dark:text-yellow-200 mt-1">
                      Delete an account to add a new one
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}
