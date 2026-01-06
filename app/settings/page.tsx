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
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle, CheckCircle2, ExternalLink, Eye, EyeOff, Mail, Plus, Save, Trash2, X, Edit, ChevronDown, ChevronUp } from 'lucide-react'
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
        <div className="px-4 pt-4 pb-4">
          <h1 className="ios-large-title">Settings</h1>
        </div>

        <div className="container max-w-4xl mx-auto px-4 space-y-6 pb-6">
          {/* Email Accounts Section */}
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
                    <CardTitle>Email Sync Accounts</CardTitle>
                    <Badge variant="outline">{emailAccounts.length}/3</Badge>
                  </div>
                  {!showAddForm && (
                    <Button
                      onClick={handleAddClick}
                      disabled={maxAccountsReached}
                      size="sm"
                      className="min-h-touch rounded-xl"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Account
                    </Button>
                  )}
                </div>
                <CardDescription>
                  Configure up to 3 email accounts to automatically import expenses from bank transaction emails
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Existing Accounts List */}
                {emailAccounts.length === 0 && !showAddForm && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-sm font-medium">No email accounts configured</p>
                    <p className="text-xs mt-2">Click "Add Account" to get started</p>
                  </div>
                )}

                <AnimatePresence mode="popLayout">
                  {emailAccounts.map((account, index) => (
                    <motion.div
                      key={account.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium font-mono text-sm">{account.email_address}</p>
                              <Badge variant={account.is_enabled ? 'default' : 'secondary'} className="text-xs">
                                {account.is_enabled ? 'Enabled' : 'Disabled'}
                              </Badge>
                            </div>
                            {account.last_sync_at && (
                              <p className="text-xs text-muted-foreground">
                                Last synced: {new Date(account.last_sync_at).toLocaleString()}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Switch
                              checked={account.is_enabled}
                              onCheckedChange={() => handleToggleEnabled(account)}
                              aria-label="Toggle email sync"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditClick(account)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(account.id, account.email_address)}
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Trusted Senders Preview */}
                        <div className="text-xs text-muted-foreground">
                          <span className="font-medium">Trusted senders:</span>{' '}
                          {account.trusted_senders.slice(0, 2).join(', ')}
                          {account.trusted_senders.length > 2 && ` +${account.trusted_senders.length - 2} more`}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Add/Edit Form */}
                <AnimatePresence>
                  {showAddForm && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="border-t pt-6 space-y-6"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-lg">
                          {editingAccountId ? 'Edit Email Account' : 'Add New Email Account'}
                        </h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={resetForm}
                          className="h-8 w-8 p-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Gmail Setup Guide */}
                      <div className="p-4 bg-blue-50 dark:bg-blue-900/10 rounded-lg border border-blue-200 dark:border-blue-800 space-y-3">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
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
                              <li>Paste it below (spaces will be removed automatically)</li>
                            </ol>
                          </div>
                        </div>
                      </div>

                      {/* Email Address */}
                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="your.email@gmail.com"
                          value={formData.email_address}
                          onChange={(e) => setFormData({ ...formData, email_address: e.target.value })}
                          className="min-h-touch h-12 rounded-xl"
                        />
                      </div>

                      {/* App Password */}
                      <div className="space-y-2">
                        <Label htmlFor="password">App Password</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPasswords['form'] ? 'text' : 'password'}
                            placeholder="abcdefghijklmnop"
                            value={formData.app_password}
                            onChange={(e) => setFormData({ ...formData, app_password: e.target.value.replace(/\s/g, '') })}
                            className="min-h-touch pr-10 h-12 rounded-xl"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => togglePasswordVisibility('form')}
                            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                          >
                            {showPasswords['form'] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>

                      {/* Advanced Settings */}
                      <details className="group">
                        <summary className="cursor-pointer text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2">
                          <span>Advanced Settings</span>
                          <ChevronDown className="h-4 w-4 group-open:hidden" />
                          <ChevronUp className="h-4 w-4 hidden group-open:block" />
                        </summary>
                        <div className="mt-4 space-y-4 pl-4 border-l-2 border-muted">
                          <div className="space-y-2">
                            <Label htmlFor="host">IMAP Host</Label>
                            <Input
                              id="host"
                              value={formData.imap_host}
                              onChange={(e) => setFormData({ ...formData, imap_host: e.target.value })}
                              placeholder="imap.gmail.com"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="port">IMAP Port</Label>
                            <Input
                              id="port"
                              type="number"
                              value={formData.imap_port}
                              onChange={(e) => setFormData({ ...formData, imap_port: parseInt(e.target.value) })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <Label htmlFor="tls">Use TLS</Label>
                            <Switch
                              id="tls"
                              checked={formData.imap_tls}
                              onCheckedChange={(checked) => setFormData({ ...formData, imap_tls: checked })}
                            />
                          </div>
                        </div>
                      </details>

                      {/* Trusted Senders */}
                      <div className="space-y-3">
                        <Label>Trusted Email Senders</Label>
                        <p className="text-xs text-muted-foreground">
                          Only emails from these addresses will be processed
                        </p>

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
                            className="flex-1 h-10 rounded-xl"
                          />
                          <Button
                            onClick={handleAddSender}
                            variant="outline"
                            size="sm"
                            className="rounded-xl"
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {formData.trusted_senders.map((sender) => (
                            <div
                              key={sender}
                              className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg group hover:bg-muted transition-colors"
                            >
                              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                              <span className="text-sm font-mono flex-1 truncate">{sender}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveSender(sender)}
                                className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Save/Cancel Actions */}
                      <div className="flex gap-3 pt-4 border-t">
                        <Button
                          onClick={resetForm}
                          variant="outline"
                          className="flex-1 min-h-touch rounded-xl"
                        >
                          Cancel
                        </Button>
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
                              {editingAccountId ? 'Update' : 'Add'} Account
                            </>
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Max accounts reached message */}
                {maxAccountsReached && !showAddForm && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-900/10 rounded-lg border border-yellow-200 dark:border-yellow-800">
                    <p className="text-xs text-yellow-800 dark:text-yellow-200">
                      ⚠️ Maximum 3 email accounts reached. Delete an account to add a new one.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
