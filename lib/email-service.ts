import type { SupabaseClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { emailParser, ParsedExpense } from './email-parser'
import type { Database } from './supabase/database.types'

export interface EmailConfig {
  user: string
  password: string
  host: string
  port: number
  tls: boolean
  trustedSenders?: string[]
}

export class EmailService {
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }


  /**
   * Fetch emails and parse expense information
   * Fetches ALL emails (read or unread) from trusted senders within the last 7 days
   * Uses database UID tracking to skip already-processed emails
   * @param processedUids Set of already-processed UIDs to skip (format: "email@example.com:12345")
   */
  async fetchUnreadExpenses(processedUids: Set<string> = new Set()): Promise<ParsedExpense[]> {
    return new Promise((resolve, reject) => {
      const imap = new Imap({
        user: this.config.user,
        password: this.config.password,
        host: this.config.host,
        port: this.config.port,
        tls: this.config.tls,
        tlsOptions: { rejectUnauthorized: false },
        // Increase timeouts for serverless environments
        authTimeout: 30000, // 30 seconds for authentication
        connTimeout: 20000, // 20 seconds for connection
        keepalive: {
          interval: 10000, // Send keepalive every 10 seconds
          idleInterval: 300000, // 5 minutes idle interval
          forceNoop: true
        }
      })

      const expenses: ParsedExpense[] = []
      // use trusted senders from config, or default to common ones
      const TRUSTED_SENDERS = this.config.trustedSenders || ['info@card.vib.com.vn', 'no-reply@grab.com']

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            reject(err)
            return
          }

          // Search for ALL emails from trusted senders (regardless of read/unread status)
          // Only emails from the last 7 days (to prevent overwhelming)
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const sinceDate = sevenDaysAgo.toISOString().split('T')[0]?.replace(/-/g, '-') || ''

          // IMAP search criteria: ALL emails (not UNSEEN), from trusted senders, since 7 days ago
          // Database UID tracking handles duplicate detection, not read/unread status
          const searchCriteria = [
            ['SINCE', sinceDate],
            ['OR', ...TRUSTED_SENDERS.map(sender => ['FROM', sender])]
          ]

          console.log(`Searching for emails since: ${sinceDate} (last 7 days)`)
          console.log(`Already processed ${processedUids.size} emails (will skip)`)

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              reject(err)
              return
            }

            if (results.length === 0) {
              console.log(`No emails found from trusted senders: ${TRUSTED_SENDERS.join(', ')}`)
              imap.end()
              resolve([])
              return
            }

            console.log(`Found ${results.length} emails from trusted senders (checking database for duplicates...)`)

            // Map to track UIDs for marking as read
            const uidMap = new Map<number, number>() // seqno -> UID

            const fetch = imap.fetch(results, {
              bodies: '',
              struct: true // Need this to get attributes
            })

            // Track all parsing promises to ensure they complete before closing connection
            const parsingPromises: Promise<void>[] = []

            fetch.on('message', (msg, seqno) => {
              // Get the UID for this message
              let shouldSkip = false

              // promise that resolves when attributes are ready
              let resolveAttributes: () => void
              const attributesReady = new Promise<void>((resolve) => {
                resolveAttributes = resolve
              })

              msg.once('attributes', (attrs) => {
                uidMap.set(seqno, attrs.uid)

                // check if already processed
                const uidKey = `${this.config.user}:${attrs.uid}`
                if (processedUids.has(uidKey)) {
                  shouldSkip = true
                }

                resolveAttributes() // signal that attributes are ready
              })

              msg.on('body', (stream) => {
                const parsingPromise = new Promise<void>((resolveMsg) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  simpleParser(stream as any, async (err, parsed) => {
                    if (err) {
                      console.error('Error parsing email:', err)
                      resolveMsg()
                      return
                    }

                    // wait for attributes to be processed
                    await attributesReady

                    // check if should skip after attributes are ready
                    if (shouldSkip) {
                      resolveMsg()
                      return
                    }

                    // Double-check sender for security
                    const from = parsed.from?.value?.[0]?.address?.toLowerCase() || ''
                    const isTrustedSender = TRUSTED_SENDERS.some(
                      sender => from === sender.toLowerCase()
                    )

                    if (!isTrustedSender) {
                      console.warn(`Skipping email from untrusted sender: ${from}`)
                      resolveMsg()
                      return
                    }

                    console.log(`Processing email from: ${from}`)
                    console.log(`Subject: ${parsed.subject}`)

                    const subject = parsed.subject || ''
                    const body = parsed.text || parsed.html || ''

                    // Try to parse the email (now async)
                    try {
                      const expense = await emailParser.parseEmail(subject, body)
                      if (expense) {
                        console.log(`✓ Parsed expense: ${expense.amount} ${expense.currency} at ${expense.merchant}`)

                        // Attach UID and email account for database tracking
                        const uid = uidMap.get(seqno)
                        if (uid) {
                          expense.emailUid = String(uid)
                          expense.emailAccount = this.config.user
                        }

                        expenses.push(expense)
                      } else {
                        console.log(`✗ Email parsing returned null (likely skipped or failed)`)
                      }
                      // Silently skip emails that don't parse (pending orders, confirmations, etc.)
                    } catch (parseError) {
                      console.error('Error parsing email:', parseError)
                    }

                    resolveMsg()
                  })
                })

                parsingPromises.push(parsingPromise)
              })
            })

            fetch.once('error', (err) => {
              console.error('Fetch error:', err)
              reject(err)
            })

            fetch.once('end', async () => {
              console.log(`Waiting for ${parsingPromises.length} email(s) to finish parsing...`)

              // Wait for all async parsing to complete
              await Promise.all(parsingPromises)

              console.log(`✓ All emails parsed. Found ${expenses.length} valid expense(s)`)
              console.log('Emails will NOT be marked as read (using database UID tracking instead)')
              
              // Close connection without marking as read
              imap.end()
            })
          })
        })
      })

      imap.once('error', (err: Error) => {
        console.error('IMAP error:', err)
        reject(err)
      })

      imap.once('end', () => {
        resolve(expenses)
      })

      imap.connect()
    })
  }
}

// Create singleton instances for multiple email accounts
let emailServices: EmailService[] | null = null

export function getEmailServices(): EmailService[] {
  if (!emailServices) {
    emailServices = []

    // Primary email account
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      emailServices.push(
        new EmailService({
          user: process.env.EMAIL_USER,
          password: process.env.EMAIL_PASSWORD,
          host: process.env.EMAIL_HOST || 'imap.gmail.com',
          port: parseInt(process.env.EMAIL_PORT || '993'),
          tls: process.env.EMAIL_TLS === 'true',
        })
      )
    }

    // Secondary email account (optional)
    if (process.env.EMAIL_USER_2 && process.env.EMAIL_PASSWORD_2) {
      emailServices.push(
        new EmailService({
          user: process.env.EMAIL_USER_2,
          password: process.env.EMAIL_PASSWORD_2,
          host: process.env.EMAIL_HOST_2 || 'imap.gmail.com',
          port: parseInt(process.env.EMAIL_PORT_2 || '993'),
          tls: process.env.EMAIL_TLS_2 === 'true',
        })
      )
    }
  }
  return emailServices
}

// Backward compatibility - returns first email service
export function getEmailService(): EmailService | null {
  const services = getEmailServices()
  if (services.length === 0) {
    return null
  }
  return services[0] ?? null
}

// decrypt app password when retrieving from database
function decryptPassword(encrypted: string): string {
  const ENCRYPTION_KEY = process.env.EMAIL_ENCRYPTION_KEY || 'default-key-please-change-in-production!!!'
  const parts = encrypted.split(':')
  const ivHex = parts[0]
  const encryptedText = parts[1]
  
  if (!ivHex || !encryptedText) {
    throw new Error('Invalid encrypted password format')
  }
  
  const iv = Buffer.from(ivHex, 'hex')
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}

// get user-specific email services from database
// Accepts a Supabase client to respect RLS policies
export async function getUserEmailServices(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<EmailService[]> {
  try {
    // fetch user's email settings from database using the authenticated client
    const { data: settingsArray, error } = await supabase
      .from('user_email_settings')
      .select('*')
      .eq('user_id', userId)
      .eq('is_enabled', true)

    if (error) {
      console.error('Error fetching user email settings:', error)
      return []
    }

    if (!settingsArray || settingsArray.length === 0) {
      return []
    }

    // create email service instances for each configured account
    const services: EmailService[] = []
    
    for (const settings of settingsArray) {
      try {
        const decryptedPassword = decryptPassword(settings.app_password)

        services.push(new EmailService({
          user: settings.email_address,
          password: decryptedPassword,
          host: settings.imap_host,
          port: settings.imap_port,
          tls: settings.imap_tls,
          trustedSenders: settings.trusted_senders || ['info@card.vib.com.vn', 'no-reply@grab.com'],
        }))
      } catch (decryptError) {
        console.error(`Failed to decrypt password for ${settings.email_address}. Please re-save your email settings.`)
      }
    }

    return services
  } catch (error) {
    console.error('Error in getUserEmailServices:', error)
    return []
  }
}
