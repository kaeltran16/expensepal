import { withAuth, withAuthAndValidation } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { EmailSettingsSchema } from '@/lib/api/schemas'

const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-please-change-in-production!!!'

function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(password, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

function decryptPassword(encrypted: string): string {
  const parts = encrypted.split(':')
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted password format')
  }
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('user_email_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Failed to fetch email settings:', error)
    return NextResponse.json({ error: 'Failed to fetch email settings' }, { status: 500 })
  }

  const decryptedData = (data || []).map((account) => {
    if (account.app_password) {
      try {
        account.app_password = decryptPassword(account.app_password)
      } catch (e) {
        console.error('Error decrypting password:', e)
        account.app_password = ''
      }
    }
    return account
  })

  return NextResponse.json(decryptedData)
})

export const POST = withAuthAndValidation(
  EmailSettingsSchema,
  async (request, user, validatedData) => {
    const supabase = createClient()
    const {
      id,
      email_address,
      app_password,
      imap_host,
      imap_port,
      imap_tls,
      is_enabled,
      trusted_senders,
    } = validatedData

    if (!id) {
      const { count, error: countError } = await supabase
        .from('user_email_settings')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)

      if (countError) {
        console.error('Failed to count email accounts:', countError)
        return NextResponse.json({ error: 'Failed to count email accounts' }, { status: 500 })
      }

      if ((count || 0) >= 3) {
        return NextResponse.json(
          { error: 'Maximum 3 email accounts allowed' },
          { status: 400 }
        )
      }
    }

    const encryptedPassword = encryptPassword(app_password)

    const settingsData = {
      user_id: user.id,
      email_address: email_address.trim().toLowerCase(),
      app_password: encryptedPassword,
      imap_host,
      imap_port,
      imap_tls,
      is_enabled,
      trusted_senders: trusted_senders || ['info@card.vib.com.vn', 'no-reply@grab.com'],
    }

    const { data, error } = await supabase
      .from('user_email_settings')
      .upsert(settingsData, {
        onConflict: 'user_id,email_address',
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to save email settings:', error)
      return NextResponse.json({ error: 'Failed to save email settings' }, { status: 500 })
    }

    if (data && data.app_password) {
      data.app_password = decryptPassword(data.app_password)
    }

    return NextResponse.json(data)
  }
)

export const DELETE = withAuth(async (request, user) => {
  const supabase = createClient()
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json(
      { error: 'Email account ID is required' },
      { status: 400 }
    )
  }

  const { error } = await supabase
    .from('user_email_settings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Failed to delete email settings:', error)
    return NextResponse.json({ error: 'Failed to delete email settings' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
