import { llmService } from './llm-service'

export interface ParsedExpense {
  transactionType: string
  amount: number
  currency: string
  transactionDate: string
  merchant: string
  category: string
  source: 'email'
  emailSubject: string
}

export class EmailParser {
  /**
   * Map transaction type to category
   */
  private mapToCategory(transactionType: string, merchant: string): string {
    const type = transactionType.toLowerCase()
    const merch = merchant.toLowerCase()

    // Food-related
    if (type.includes('food') || type.includes('restaurant') || merch.includes('cafe') || merch.includes('coffee')) {
      return 'Food'
    }

    // Transport-related
    if (type.includes('car') || type.includes('bike') || type.includes('taxi') || type.includes('ride') || type.includes('grab')) {
      return 'Transport'
    }

    // Shopping-related
    if (type.includes('shopping') || type.includes('mart') || type.includes('retail') || type.includes('store')) {
      return 'Shopping'
    }

    // Entertainment-related
    if (type.includes('entertainment') || type.includes('movie') || type.includes('game') || type.includes('subscription')) {
      return 'Entertainment'
    }

    // Bills-related
    if (type.includes('bill') || type.includes('utility') || type.includes('internet') || type.includes('phone')) {
      return 'Bills'
    }

    // Health-related
    if (type.includes('health') || type.includes('medical') || type.includes('hospital') || type.includes('pharmacy') || type.includes('clinic')) {
      return 'Health'
    }

    return 'Other'
  }

  /**
   * Strip HTML tags from text
   */
  private stripHtml(html: string): string {
    return html
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /**
   * Sanitize email content before sending to AI
   * Removes personal info and unnecessary marketing content
   */
  private sanitizeForAI(text: string): string {
    let sanitized = text

    // Remove email addresses (replace with placeholder)
    sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL]')

    // Remove phone numbers (various formats)
    sanitized = sanitized.replace(/(\+?84|0)?[0-9]{9,11}/g, '[PHONE]')

    // Remove credit card numbers (partial or full, keep last 4 digits pattern like 5138***5758)
    sanitized = sanitized.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]')

    // Remove common footer/unsubscribe sections
    const footerPatterns = [
      /Unsubscribe.*$/is,
      /Click here to unsubscribe.*$/is,
      /You received this email because.*$/is,
      /To stop receiving these emails.*$/is,
      /Privacy Policy.*$/is,
      /Terms.*Conditions.*$/is,
      /© .*\d{4}.*$/is,
      /Follow us on.*$/is,
      /Download.*app.*$/is,
    ]

    footerPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, '')
    })

    // Remove URLs (keep only the domain for context if needed)
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[LINK]')

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim()

    return sanitized
  }

  /**
   * Parse email using OpenRouter AI (more reliable than regex)
   */
  private async parseWithAI(subject: string, body: string): Promise<ParsedExpense | null> {
    if (!llmService.isConfigured()) {
      console.log('OpenRouter API key not configured, falling back to regex parsing')
      return null
    }

    try {
      const cleanBody = this.stripHtml(body)

      // Sanitize to remove PII and unnecessary content
      const sanitizedBody = this.sanitizeForAI(cleanBody)
      const sanitizedSubject = this.sanitizeForAI(subject)

      // Truncate to reasonable length (first 1000 chars after sanitization)
      const truncatedBody = sanitizedBody.substring(0, 1000)

      console.log(`Sanitized email: ${truncatedBody.length} chars (original: ${cleanBody.length} chars)`)

      const prompt = `You are an email parser that extracts transaction information from emails.
Parse the following email and extract the transaction details in JSON format.

Email Subject: ${sanitizedSubject}
Email Body: ${truncatedBody}

Note: Personal info has been sanitized ([EMAIL], [PHONE], [CARD], [LINK] are placeholders).

Extract the following information:
- amount (number, no currency symbols or commas)
- currency (e.g., "VND", "USD")
- merchant (store/restaurant/service name)
- transactionDate (ISO 8601 format like "2025-11-19T10:30:00+07:00")
- transactionType (e.g., "GrabFood", "GrabCar", "Online Shopping", etc.)
- category (MUST be one of: "Food", "Transport", "Shopping", "Entertainment", "Bills", "Health", "Other")

IMPORTANT RULES:
1. For the amount, extract ONLY the final total amount paid by the customer, not subtotals or individual items
2. For Vietnamese dates like "08/11/2025 18:38" or "08 Nov 25 18:38", convert to ISO 8601 format with +07:00 timezone
3. If you cannot find a specific field, use reasonable defaults:
   - merchant: "Unknown" if not found
   - transactionType: "Purchase" if not specific
   - category: Choose the MOST appropriate from the list above
4. Remove all formatting from amount (no commas, dots, or currency symbols)
5. For Grab emails, look for "Đặt từ" or "From" to find the merchant name
6. Skip pending orders or order confirmations - only parse completed transactions
7. Ignore placeholder values like [EMAIL], [PHONE], [CARD], [LINK]
8. Category mapping examples:
   - GrabFood, restaurants, cafes → "Food"
   - GrabCar, GrabBike, Uber, taxis → "Transport"
   - Online shopping, retail stores → "Shopping"
   - Movies, games, subscriptions → "Entertainment"
   - Utilities, phone bills, internet → "Bills"
   - Hospitals, pharmacies, clinics → "Health"
   - Anything else → "Other"

Return ONLY valid JSON in this exact format (no markdown, no explanations):
{
  "amount": 38000,
  "currency": "VND",
  "merchant": "Store Name",
  "transactionDate": "2025-11-19T18:38:00+07:00",
  "transactionType": "GrabFood",
  "category": "Food"
}

If this email is NOT a completed transaction (e.g., pending order, confirmation email, promotional email), return:
{"skip": true}`

      const response = await llmService.completion({
        messages: [{ role: 'user', content: prompt }],
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.1,
        maxTokens: 500,
      })

      if (!response) {
        console.error('No response from LLM service')
        return null
      }

      // Parse JSON response
      const parsed = llmService.parseJSON<{
        skip?: boolean
        amount?: number
        merchant?: string
        currency?: string
        transactionDate?: string
        transactionType?: string
        category?: string
      }>(response.content)

      if (!parsed) {
        return null
      }

      // Check if email should be skipped
      if (parsed.skip) {
        console.log('AI detected this should be skipped (pending order or non-transaction email)')
        return null
      }

      // Validate required fields
      if (!parsed.amount || !parsed.merchant) {
        console.error('Missing required fields in AI response:', parsed)
        return null
      }

      // Validate category is one of the allowed values
      const validCategories = ['Food', 'Transport', 'Shopping', 'Entertainment', 'Bills', 'Health', 'Other']
      const category = validCategories.includes(parsed.category || '') ? parsed.category! : 'Other'

      console.log('✓ AI parsed expense:', parsed)

      return {
        transactionType: parsed.transactionType || 'Purchase',
        amount: parseFloat(String(parsed.amount)),
        currency: parsed.currency || 'VND',
        transactionDate: parsed.transactionDate || new Date().toISOString(),
        merchant: parsed.merchant,
        category,
        source: 'email',
        emailSubject: subject,
      }
    } catch (error) {
      console.error('Error in AI parsing:', error)
      return null
    }
  }

  /**
   * Parse VIB (Vietnam International Bank) transaction notification email
   * Supports both English and Vietnamese formats
   */
  parseVIBEmail(subject: string, body: string): ParsedExpense | null {
    try {
      // Strip HTML if present
      const cleanBody = this.stripHtml(body)

      console.log('Cleaned body preview:', cleanBody.substring(0, 800))

      // Extract transaction type (Vietnamese: Giao dịch OR English: Transaction)
      const transactionMatch = cleanBody.match(/(?:Giao dịch|Transaction):\s*[<>]*\s*([^<]+?)(?:\s*Giá trị|\s*Value|<)/i)
      const transactionType = transactionMatch ? transactionMatch[1].trim() : 'Purchase'

      // Extract amount and currency (Vietnamese: Giá trị OR English: Value)
      const valueMatch = cleanBody.match(/(?:Giá trị|Value):\s*[<>]*\s*([\d,\.]+)\s*([A-Z]{3})/i)
      if (!valueMatch) {
        console.error('Could not extract amount from email')
        console.error('Looking for pattern in:', cleanBody.substring(0, 1000))
        return null
      }

      const amount = parseFloat(valueMatch[1].replace(/,/g, '').replace(/\./g, ''))
      const currency = valueMatch[2]

      // Extract date and time (Vietnamese: Vào lúc OR English: At)
      const dateMatch = cleanBody.match(/(?:Vào lúc|At):\s*[<>]*\s*(\d{2}:\d{2})\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)
      if (!dateMatch) {
        console.error('Could not extract date from email')
        return null
      }

      const time = dateMatch[1]
      const date = dateMatch[2]
      const [day, month, year] = date.split('/')
      const transactionDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${time}:00`)

      // Extract merchant (Vietnamese: Tại OR English: At)
      // Look for the merchant name after "Tại" or "At"
      const merchantMatch = cleanBody.match(/(?:Tại|At)\s+[<>]*\s*([^\n<]+?)(?:\s*Để biết|For more|Email|Địa chỉ|<|$)/i)
      let merchant = 'Unknown'
      if (merchantMatch) {
        merchant = merchantMatch[1].trim() || 'Unknown'
      }

      // Map to category
      const category = this.mapToCategory(transactionType, merchant)

      console.log('Parsed values:', { transactionType, amount, currency, merchant, category })

      return {
        transactionType,
        amount,
        currency,
        transactionDate: transactionDate.toISOString(),
        merchant,
        category,
        source: 'email',
        emailSubject: subject,
      }
    } catch (error) {
      console.error('Error parsing VIB email:', error)
      return null
    }
  }

  /**
   * Parse Grab transaction notification email (GrabFood, GrabMart, GrabCar, etc.)
   */
  parseGrabEmail(subject: string, body: string): ParsedExpense | null {
    try {
      // Strip HTML if present
      const cleanBody = this.stripHtml(body)

      console.log('Grab email body preview (first 1000 chars):', cleanBody.substring(0, 1000))

      // Skip pending/scheduled orders silently
      if (cleanBody.match(/Total pending|Order for Later|We've got your Order for Later|Đơn hàng đang chờ xử lý/i)) {
        console.log('Skipping pending/scheduled order')
        return null
      }

      // Extract total amount - try multiple patterns
      let amountMatch = null
      let amount = 0

      // Pattern 1: "Tổng cộng ₫38,000" or "Total ₫38000"
      amountMatch = cleanBody.match(/(?:Tổng cộng|Tổng giá|BẠN TRẢ|Total|Grand Total)\s*[:\-]?\s*₫\s*([\d,\.]+)/i)

      // Pattern 2: "38000₫" or "38,000₫"
      if (!amountMatch) {
        amountMatch = cleanBody.match(/(?:Tổng cộng|Tổng giá|BẠN TRẢ|Total|Grand Total)\s*[:\-]?\s*([\d,\.]+)\s*₫/i)
      }

      // Pattern 3: Just find "₫ followed by numbers" as last resort
      if (!amountMatch) {
        amountMatch = cleanBody.match(/₫\s*([\d,\.]+)/i)
      }

      if (!amountMatch) {
        console.error('Could not extract amount from Grab email')
        return null
      }

      // Clean and parse amount - remove commas and dots (Vietnamese number format)
      amount = parseFloat(amountMatch[1].replace(/,/g, '').replace(/\./g, ''))
      console.log('Extracted amount:', amount)

      const currency = 'VND'

      // Extract date - try multiple patterns
      let transactionDate: Date | null = null

      // Pattern 1: "08 Nov 25 18:38" format
      let dateMatch = cleanBody.match(/(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{2})\s+(\d{2}):(\d{2})/i)

      if (dateMatch) {
        const [, day, monthStr, year, hour, minute] = dateMatch
        const monthMap: { [key: string]: string } = {
          'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04',
          'May': '05', 'Jun': '06', 'Jul': '07', 'Aug': '08',
          'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
        }
        const month = monthMap[monthStr.substring(0, 3)] || '01'
        const fullYear = `20${year}`
        transactionDate = new Date(`${fullYear}-${month}-${day.padStart(2, '0')}T${hour}:${minute}:00+07:00`)
        console.log('Extracted date (pattern 1):', transactionDate.toISOString())
      }

      // Pattern 2: Vietnamese date format "18:38 08/11/2025" or "08/11/2025 18:38"
      if (!transactionDate) {
        dateMatch = cleanBody.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\s+(\d{2}):(\d{2})/i)
        if (dateMatch) {
          const [, day, month, year, hour, minute] = dateMatch
          transactionDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour}:${minute}:00+07:00`)
          console.log('Extracted date (pattern 2):', transactionDate.toISOString())
        }
      }

      // Pattern 3: Time before date "18:38 08/11/2025"
      if (!transactionDate) {
        dateMatch = cleanBody.match(/(\d{2}):(\d{2})\s+(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/i)
        if (dateMatch) {
          const [, hour, minute, day, month, year] = dateMatch
          transactionDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour}:${minute}:00+07:00`)
          console.log('Extracted date (pattern 3):', transactionDate.toISOString())
        }
      }

      // If still no date found, use current time
      if (!transactionDate) {
        console.warn('Could not extract date from Grab email, using current time')
        console.log('Searched in body:', cleanBody.substring(0, 500))
        transactionDate = new Date()
      }

      // Extract merchant/store name - try multiple patterns
      let merchant = 'Grab'

      // Pattern 1: "Đặt từ STORE_NAME" or "From STORE_NAME"
      let merchantMatch = cleanBody.match(/(?:Đặt từ|Ordered from|From)\s+([^\n\r]{3,80}?)(?:\s+(?:Giao đến|Delivered to|Được giao|Ngày|Date|₫)|$)/i)

      // Pattern 2: Look for merchant before the amount
      if (!merchantMatch) {
        merchantMatch = cleanBody.match(/([A-Z][^\n\r₫]{5,60}?)\s+(?:Tổng cộng|Total|₫)/i)
      }

      if (merchantMatch) {
        merchant = merchantMatch[1].trim()
        // Clean up merchant name - remove common noise
        merchant = merchant.replace(/\s*Xem chi tiết.*/i, '')
        merchant = merchant.replace(/\s*View details.*/i, '')
        merchant = merchant.replace(/\s*\d+\s*₫.*/, '')
        merchant = merchant.trim()
      }

      console.log('Extracted merchant:', merchant)

      // Determine transaction type based on content
      let transactionType = 'Grab'
      if (cleanBody.toLowerCase().includes('grabfood') || cleanBody.toLowerCase().includes('food')) {
        transactionType = 'GrabFood'
      } else if (cleanBody.toLowerCase().includes('grabmart') || cleanBody.toLowerCase().includes('mart') || cleanBody.toLowerCase().includes('7-eleven')) {
        transactionType = 'GrabMart'
      } else if (cleanBody.toLowerCase().includes('grabcar') || cleanBody.toLowerCase().includes('grabike') || cleanBody.toLowerCase().includes('ride')) {
        transactionType = 'GrabCar/Bike'
      }

      // Map to category
      const category = this.mapToCategory(transactionType, merchant)

      console.log('Parsed Grab values:', { amount, currency, merchant, transactionType, category, date: transactionDate.toISOString() })

      return {
        transactionType,
        amount,
        currency,
        transactionDate: transactionDate.toISOString(),
        merchant,
        category,
        source: 'email',
        emailSubject: subject,
      }
    } catch (error) {
      console.error('Error parsing Grab email:', error)
      return null
    }
  }

  /**
   * Main parser function - uses AI first, falls back to regex
   */
  async parseEmail(subject: string, body: string): Promise<ParsedExpense | null> {
    const subjectLower = subject.toLowerCase()
    const bodyLower = body.toLowerCase()

    console.log('Attempting to parse email with AI...')

    // Try AI parsing first (more reliable)
    const aiResult = await this.parseWithAI(subject, body)
    if (aiResult) {
      console.log('✓ Successfully parsed with AI')
      return aiResult
    }

    console.log('AI parsing failed or not configured, falling back to regex...')

    // Fall back to regex-based parsing
    // Check for Grab email
    if (
      subjectLower.includes('grab') ||
      bodyLower.includes('grab') ||
      bodyLower.includes('no-reply@grab.com')
    ) {
      console.log('Detected Grab email format, attempting regex parse...')
      return this.parseGrabEmail(subject, body)
    }

    // Check for VIB email - multiple possible indicators
    if (
      subjectLower.includes('vib') ||
      bodyLower.includes('vietnam international bank') ||
      bodyLower.includes('vib online') ||
      bodyLower.includes('card.vib.com.vn') ||
      bodyLower.includes('card number:') // Common in transaction emails
    ) {
      console.log('Detected VIB email format, attempting regex parse...')
      return this.parseVIBEmail(subject, body)
    }

    // Add more parsers here
    // if (subject.includes('Vietcombank')) return this.parseVietcombankEmail(subject, body)
    // if (subject.includes('Techcombank')) return this.parseTechcombankEmail(subject, body)

    console.log('Unknown email format - does not match known patterns')
    return null
  }
}

export const emailParser = new EmailParser()
