import Imap from 'imap'
import { simpleParser } from 'mailparser'
import { emailParser, ParsedExpense } from './email-parser'

export interface EmailConfig {
  user: string
  password: string
  host: string
  port: number
  tls: boolean
}

export class EmailService {
  private config: EmailConfig

  constructor(config: EmailConfig) {
    this.config = config
  }

  /**
   * Fetch unread emails and parse expense information
   * Only processes emails from trusted VIB sender: info@card.vib.com.vn
   */
  async fetchUnreadExpenses(): Promise<ParsedExpense[]> {
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
      const TRUSTED_SENDERS = ['info@card.vib.com.vn', 'no-reply@grab.com']
      const processedUids: number[] = [] // Track UIDs to mark as read

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) {
            reject(err)
            return
          }

          // Search for unread emails from trusted senders only
          // Only emails from the last 7 days
          const sevenDaysAgo = new Date()
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
          const sinceDate = sevenDaysAgo.toISOString().split('T')[0].replace(/-/g, '-')

          // IMAP search criteria: UNSEEN, from trusted senders, since 7 days ago
          const searchCriteria = [
            'UNSEEN',
            ['SINCE', sinceDate],
            ['OR', ...TRUSTED_SENDERS.map(sender => ['FROM', sender])]
          ]

          console.log(`Searching for emails since: ${sinceDate} (last 7 days)`)

          imap.search(searchCriteria, (err, results) => {
            if (err) {
              reject(err)
              return
            }

            if (results.length === 0) {
              console.log(`No unread emails from trusted senders: ${TRUSTED_SENDERS.join(', ')}`)
              imap.end()
              resolve([])
              return
            }

            console.log(`Found ${results.length} unread emails from trusted senders`)

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
              let messageUid: number | undefined

              msg.once('attributes', (attrs) => {
                messageUid = attrs.uid
                uidMap.set(seqno, attrs.uid)
                console.log(`Message UID: ${attrs.uid}, Seqno: ${seqno}`)
              })

              msg.on('body', (stream) => {
                const parsingPromise = new Promise<void>((resolveMsg) => {
                  simpleParser(stream as any, async (err, parsed) => {
                    if (err) {
                      console.error('Error parsing email:', err)
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
                        expenses.push(expense)
                        // Track UID for marking as read (avoid duplicates if AI fails)
                        const uid = uidMap.get(seqno)
                        if (uid) processedUids.push(uid)
                      } else {
                        console.log(`✗ Email parsing returned null (likely skipped or failed)`)
                        // Still mark as read to avoid re-processing promotional/pending emails
                        const uid = uidMap.get(seqno)
                        if (uid) processedUids.push(uid)
                      }
                      // Silently skip emails that don't parse (pending orders, confirmations, etc.)
                    } catch (parseError) {
                      console.error('Error parsing email:', parseError)
                      // Mark as read anyway to avoid infinite retry
                      const uid = uidMap.get(seqno)
                      if (uid) processedUids.push(uid)
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

              // Mark processed emails as read to avoid re-parsing
              if (processedUids.length > 0) {
                console.log(`Marking ${processedUids.length} email(s) as read (UIDs: ${processedUids.join(', ')})...`)

                // Use UID-based addFlags
                imap.addFlags(processedUids, ['\\Seen'], (err) => {
                  if (err) {
                    console.error('Failed to mark emails as read:', err)
                    // Don't fail the whole operation, just log it
                  } else {
                    console.log(`✓ Successfully marked ${processedUids.length} email(s) as read`)
                  }
                  imap.end()
                })
              } else {
                console.log('No emails to mark as read')
                imap.end()
              }
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

  /**
   * Mark emails as read
   */
  async markAsRead(uids: number[]): Promise<void> {
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

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err) => {
          if (err) {
            reject(err)
            return
          }

          imap.addFlags(uids, ['\\Seen'], (err) => {
            if (err) {
              reject(err)
            } else {
              resolve()
            }
            imap.end()
          })
        })
      })

      imap.once('error', reject)
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
export function getEmailService(): EmailService {
  const services = getEmailServices()
  if (services.length === 0) {
    throw new Error('No email services configured')
  }
  return services[0]
}
