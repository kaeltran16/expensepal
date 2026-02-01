'use client'

import { useAuth } from '@/components/auth-provider'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { UserProfile } from '@/lib/supabase'
import { hapticFeedback } from '@/lib/utils'
import { motion } from 'framer-motion'
import {
  Bell,
  ChevronRight,
  DollarSign,
  Edit2,
  LogOut,
  Mail,
  Moon,
  Sun
} from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'

interface ProfileViewProps {
  profile: UserProfile | null
  loading: boolean
  onUpdate: (profile: Partial<UserProfile>) => Promise<UserProfile>
}

const CURRENCIES = [
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong' },
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
]

const THEMES = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Sun },
]

export function ProfileView({ profile, loading, onUpdate }: ProfileViewProps) {
  const { signOut, user } = useAuth()
  const router = useRouter()
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [expandedSetting, setExpandedSetting] = useState<'currency' | 'theme' | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    full_name: profile?.full_name || '',
    bio: profile?.bio || '',
    currency: profile?.currency || 'VND',
    theme: profile?.theme || 'system',
    notification_enabled: profile?.notification_enabled ?? true,
  })

  // Update form data when profile loads
  useEffect(() => {
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        currency: profile.currency || 'VND',
        theme: profile.theme || 'system',
        notification_enabled: profile.notification_enabled ?? true,
      })
    }
  }, [profile])

  const handleSave = async () => {
    setIsSaving(true)
    hapticFeedback('medium')
    try {
      await onUpdate(formData)
      setIsEditingProfile(false)
      setExpandedSetting(null)
      toast.success('Profile updated successfully')
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to profile values
    if (profile) {
      setFormData({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        currency: profile.currency || 'VND',
        theme: profile.theme || 'system',
        notification_enabled: profile.notification_enabled ?? true,
      })
    }
    setIsEditingProfile(false)
    setExpandedSetting(null)
    hapticFeedback('light')
  }

  const handleSignOut = async () => {
    hapticFeedback('medium')
    try {
      await signOut()
      toast.success('Signed out successfully')
    } catch (error) {
      console.error('Failed to sign out:', error)
      toast.error('Failed to sign out')
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Profile Header Skeleton */}
        <div className="ios-card p-6 animate-pulse">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full bg-muted mb-4" />
            <div className="h-6 w-32 bg-muted rounded mb-2" />
            <div className="h-4 w-48 bg-muted rounded" />
          </div>
        </div>

        {/* Settings Skeleton */}
        <div className="ios-card divide-y divide-border/50">
          {[1, 2, 3].map((i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted" />
              <div className="flex-1">
                <div className="h-4 w-24 bg-muted rounded mb-2" />
                <div className="h-3 w-32 bg-muted rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const displayName = formData.full_name || user?.email?.split('@')[0] || 'User'
  const initials = displayName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <div className="space-y-4 pb-8">
      {/* Profile Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="ios-card p-6"
      >
        <div className="flex flex-col items-center text-center">
          {/* Avatar */}
          <div className="relative mb-4">
            {profile?.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={displayName}
                width={96}
                height={96}
                className="w-24 h-24 rounded-full object-cover ring-4 ring-primary/10"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-primary flex items-center justify-center text-white text-3xl font-bold ring-4 ring-primary/10">
                {initials}
              </div>
            )}
          </div>

          {/* Name and Email */}
          <h2 className="text-2xl font-bold mb-1">{displayName}</h2>
          <p className="ios-caption text-muted-foreground mb-4">{user?.email}</p>

          {/* Edit Button */}
          {!isEditingProfile && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsEditingProfile(true)
                hapticFeedback('light')
              }}
              className="gap-2 rounded-full"
            >
              <Edit2 className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>

        {/* Editable Bio */}
        {isEditingProfile && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-6 space-y-4"
          >
            <div>
              <label htmlFor="full_name" className="text-sm font-medium mb-1.5 block">
                Full Name
              </label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Enter your name"
                className="rounded-xl"
              />
            </div>

            <div>
              <label htmlFor="bio" className="text-sm font-medium mb-1.5 block">
                Bio
              </label>
              <Textarea
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                rows={3}
                className="resize-none rounded-xl"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1 rounded-xl"
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 rounded-xl"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        )}

        {/* Display Bio when not editing */}
        {!isEditingProfile && formData.bio && (
          <div className="mt-4 pt-4 border-t border-border/50">
            <p className="ios-body text-muted-foreground text-center">{formData.bio}</p>
          </div>
        )}
      </motion.div>

      {/* Settings Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <h3 className="ios-headline px-1 mb-3">Settings</h3>

        <div className="ios-card divide-y divide-border/50">
          {/* Currency */}
          <button
            onClick={() => {
              setExpandedSetting(expandedSetting === 'currency' ? null : 'currency')
              hapticFeedback('light')
            }}
            className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center flex-shrink-0">
              <DollarSign className="h-5 w-5 text-warning" />
            </div>
            <div className="flex-1 text-left">
              <p className="ios-body font-medium">Currency</p>
              <p className="ios-caption text-muted-foreground">
                {CURRENCIES.find((c) => c.code === formData.currency)?.name} ({CURRENCIES.find((c) => c.code === formData.currency)?.symbol})
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Currency Selector - Shows when expanded */}
          {expandedSetting === 'currency' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {CURRENCIES.map((currency) => (
                  <button
                    key={currency.code}
                    onClick={() => {
                      setFormData({ ...formData, currency: currency.code })
                      hapticFeedback('light')
                    }}
                    className={`p-3 rounded-xl border-2 transition-all text-left ${
                      formData.currency === currency.code
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:bg-muted/50'
                    }`}
                  >
                    <div className="text-lg font-bold mb-1">{currency.symbol}</div>
                    <div className="text-xs font-medium">{currency.code}</div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Theme */}
          <button
            onClick={() => {
              setExpandedSetting(expandedSetting === 'theme' ? null : 'theme')
              hapticFeedback('light')
            }}
            className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center flex-shrink-0">
              {formData.theme === 'dark' ? (
                <Moon className="h-5 w-5 text-accent" />
              ) : (
                <Sun className="h-5 w-5 text-accent" />
              )}
            </div>
            <div className="flex-1 text-left">
              <p className="ios-body font-medium">Appearance</p>
              <p className="ios-caption text-muted-foreground">
                {THEMES.find((t) => t.value === formData.theme)?.label} mode
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>

          {/* Theme Selector - Shows when expanded */}
          {expandedSetting === 'theme' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="px-4 py-4"
            >
              <div className="grid grid-cols-3 gap-2">
                {THEMES.map((theme) => {
                  const Icon = theme.icon
                  const isActive = formData.theme === theme.value
                  return (
                    <button
                      key={theme.value}
                      onClick={() => {
                        setFormData({ ...formData, theme: theme.value })
                        hapticFeedback('light')
                      }}
                      className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isActive
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs font-medium">{theme.label}</span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Notifications */}
          <div className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Bell className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 text-left">
              <p className="ios-body font-medium">Notifications</p>
              <p className="ios-caption text-muted-foreground">
                {formData.notification_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setFormData({
                  ...formData,
                  notification_enabled: !formData.notification_enabled,
                })
                hapticFeedback('light')
                // Auto-save notification preference
                onUpdate({ notification_enabled: !formData.notification_enabled })
                  .then(() => toast.success('Notification preference updated'))
                  .catch(() => toast.error('Failed to update preference'))
              }}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                formData.notification_enabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  formData.notification_enabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Email Sync */}
          <button
            onClick={() => {
              hapticFeedback('light')
              router.push('/settings')
            }}
            className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
          >
            <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Mail className="h-5 w-5 text-success" />
            </div>
            <div className="flex-1 text-left">
              <p className="ios-body font-medium">Email Sync</p>
              <p className="ios-caption text-muted-foreground">
                Configure bank transaction sync
              </p>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>
      </motion.div>

      {/* Account Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="ios-headline px-1 mb-3">Account</h3>

        <div className="ios-card">
          <button
            onClick={handleSignOut}
            className="w-full p-4 flex items-center gap-3 text-destructive hover:bg-destructive/10 transition-colors rounded-2xl"
          >
            <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <span className="ios-body font-medium">Sign Out</span>
          </button>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center pt-4 space-y-1"
      >
        <p className="ios-caption text-muted-foreground">
          ExpensePal v1.0.0
        </p>
      </motion.div>
    </div>
  )
}
