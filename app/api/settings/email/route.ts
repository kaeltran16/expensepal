import { withAuth } from '@/lib/api/middleware'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { NextResponse } from 'next/server'

// encryption key from environment (32 bytes for AES-256)
const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-please-change-in-production!!!'

// encrypt app password before storing in database
function encryptPassword(password: string): string {
  const iv = crypto.randomBytes(16)
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)

  let encrypted = cipher.update(password, 'utf8', 'hex')
  encrypted += cipher.final('hex')

  return iv.toString('hex') + ':' + encrypted
}

// decrypt app password when retrieving from database
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

// GET /api/settings/email - get all user's email accounts
export const GET = withAuth(async (request, user) => {
  const supabase = createClient()

  // get all user's email settings - RLS automatically filters by user_id
  const { data, error } = await supabase
    .from('user_email_settings')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching email settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // decrypt passwords before sending to client
  const decryptedData = (data || []).map((account) => {
    if (account.app_password) {
      try {
        account.app_password = decryptPassword(account.app_password)
      } catch (e) {
        console.error('Error decrypting password:', e)
        // if decryption fails, return empty password so user can reset it
        account.app_password = ''
      }
    }
    return account
  })

  return NextResponse.json(decryptedData)
})

// POST /api/settings/email - add or update email account
export const POST = withAuth(async (request, user) => {
  const supabase = createClient()
  const body = await request.json()
  const {
    id, // if provided, update existing account
    email_address,
    app_password,
    imap_host,
    imap_port,
    imap_tls,
    is_enabled,
    trusted_senders,
  } = body

  // validation
  if (!email_address || !app_password) {
    return NextResponse.json(
      { error: 'Email address and app password are required' },
      { status: 400 }
    )
  }

  // check if adding new account (no id provided)
  if (!id) {
    // get current account count - RLS automatically filters by user_id
    const { count, error: countError } = await supabase
      .from('user_email_settings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (countError) {
      console.error('Error counting email accounts:', countError)
      return NextResponse.json({ error: countError.message }, { status: 500 })
    }

    // enforce max 3 accounts limit
    if ((count || 0) >= 3) {
      return NextResponse.json(
        { error: 'Maximum 3 email accounts allowed' },
        { status: 400 }
      )
    }
  }

  // encrypt password before storing
  const encryptedPassword = encryptPassword(app_password)

  const settingsData = {
    user_id: user.id,
    email_address: email_address.trim().toLowerCase(),
    app_password: encryptedPassword,
    imap_host: imap_host || 'imap.gmail.com',
    imap_port: imap_port || 993,
    imap_tls: imap_tls !== undefined ? imap_tls : true,
    is_enabled: is_enabled !== undefined ? is_enabled : true,
    trusted_senders: trusted_senders || ['info@card.vib.com.vn', 'no-reply@grab.com'],
  }

  // upsert (insert or update) - RLS automatically sets user_id
  const { data, error } = await supabase
    .from('user_email_settings')
    .upsert(settingsData, {
      onConflict: 'user_id,email_address',
    })
    .select()
    .single()

  if (error) {
    console.error('Error saving email settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // decrypt password before sending back to client
  if (data && data.app_password) {
    data.app_password = decryptPassword(data.app_password)
  }

  return NextResponse.json(data)
})

// DELETE /api/settings/email?id=xxx - delete specific email account
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

  // delete specific account - RLS automatically filters by user_id
  const { error } = await supabase
    .from('user_email_settings')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) {
    console.error('Error deleting email settings:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
})
