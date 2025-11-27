import { supabaseAdmin } from '@/lib/supabase'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'
import { NextRequest, NextResponse } from 'next/server'

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
  const iv = Buffer.from(parts[0], 'hex')
  const encryptedText = parts[1]
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// GET /api/settings/email - get user's email settings
export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // get user's email settings
    const { data, error } = await supabaseAdmin
      .from('user_email_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // no settings found
        return NextResponse.json(null)
      }
      console.error('Error fetching email settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // decrypt password before sending to client
    if (data && data.app_password) {
      try {
        data.app_password = decryptPassword(data.app_password)
      } catch (e) {
        console.error('Error decrypting password:', e)
        // if decryption fails, return empty password so user can reset it
        data.app_password = ''
      }
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error in GET /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST /api/settings/email - save or update email settings
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const {
      email_address,
      app_password,
      imap_host,
      imap_port,
      imap_tls,
      is_enabled,
    } = body

    // validation
    if (!email_address || !app_password) {
      return NextResponse.json(
        { error: 'Email address and app password are required' },
        { status: 400 }
      )
    }

    // encrypt password before storing
    const encryptedPassword = encryptPassword(app_password)

    const settingsData = {
      user_id: user.id,
      email_address: email_address.trim(),
      app_password: encryptedPassword,
      imap_host: imap_host || 'imap.gmail.com',
      imap_port: imap_port || 993,
      imap_tls: imap_tls !== undefined ? imap_tls : true,
      is_enabled: is_enabled !== undefined ? is_enabled : true,
    }

    // upsert (insert or update)
    const { data, error } = await supabaseAdmin
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
  } catch (error) {
    console.error('Error in POST /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// DELETE /api/settings/email - delete email settings
export async function DELETE(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { error } = await supabaseAdmin
      .from('user_email_settings')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting email settings:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/settings/email:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
