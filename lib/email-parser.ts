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
  emailUid?: string      // IMAP UID for database tracking
  emailAccount?: string  // Email address that received this email
}

export class EmailParser {
  /**
   * Map transaction type to category
   */
  private mapToCategory(transactionType: string, merchant: string): string {
    const type = transactionType.toLowerCase();
    const merch = merchant.toLowerCase();

    // Food-related
    if (
      type.includes('food') ||
      type.includes('restaurant') ||
      merch.includes('cafe') ||
      merch.includes('coffee')
    ) {
      return 'Food';
    }

    // Transport-related
    if (
      type.includes('car') ||
      type.includes('bike') ||
      type.includes('taxi') ||
      type.includes('ride') ||
      type.includes('grab')
    ) {
      return 'Transport';
    }

    // Shopping-related
    if (
      type.includes('shopping') ||
      type.includes('mart') ||
      type.includes('retail') ||
      type.includes('store')
    ) {
      return 'Shopping';
    }

    // Entertainment-related
    if (
      type.includes('entertainment') ||
      type.includes('movie') ||
      type.includes('game') ||
      type.includes('subscription')
    ) {
      return 'Entertainment';
    }

    // Bills-related
    if (
      type.includes('bill') ||
      type.includes('utility') ||
      type.includes('internet') ||
      type.includes('phone')
    ) {
      return 'Bills';
    }

    // Health-related
    if (
      type.includes('health') ||
      type.includes('medical') ||
      type.includes('hospital') ||
      type.includes('pharmacy') ||
      type.includes('clinic')
    ) {
      return 'Health';
    }

    return 'Other';
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
      .trim();
  }

  /**
   * Sanitize email content before sending to AI
   * Removes personal info and unnecessary marketing content
   */
  private sanitizeForAI(text: string): string {
    let sanitized = text;

    // Remove email addresses (replace with placeholder)
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL]'
    );

    // Remove phone numbers (various formats)
    sanitized = sanitized.replace(/(\+?84|0)?[0-9]{9,11}/g, '[PHONE]');

    // Remove credit card numbers (partial or full, keep last 4 digits pattern like 5138***5758)
    sanitized = sanitized.replace(
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
      '[CARD]'
    );

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
    ];

    footerPatterns.forEach((pattern) => {
      sanitized = sanitized.replace(pattern, '');
    });

    // Remove URLs (keep only the domain for context if needed)
    sanitized = sanitized.replace(/https?:\/\/[^\s]+/g, '[LINK]');

    // Remove excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
  }

  /**
   * Check if email should be skipped before calling LLM (saves API costs)
   */
  private shouldSkipEmail(subject: string, body: string): boolean {
    const lowerSubject = subject.toLowerCase();
    const lowerBody = body.toLowerCase();

    // skip promotional emails
    const promotionalPatterns = [
      'chăm lo', // promotional vietnamese
      'đặc biệt', // special offer
      'khuyến mãi', // promotion
      'giảm giá', // discount
      'ưu đãi', // offer
      'miễn phí', // free
      'refer a friend',
      'invite friends',
      'download the app',
      'follow us',
      'rate your trip',
      'how was your',
      'share your feedback',
    ];

    // skip pending/confirmation emails
    const pendingPatterns = [
      'scheduled order received',
      'order received',
      'booking received',
      'đơn hàng đã được nhận',
      'booking confirmed',
      "we've received your order",
      'order confirmation',
      'đã nhận đơn',
      'đang xử lý', // processing
      'chờ xác nhận', // waiting confirmation
    ];

    const skipPatterns = [...promotionalPatterns, ...pendingPatterns];

    // check subject first (faster)
    if (skipPatterns.some((pattern) => lowerSubject.includes(pattern))) {
      return true;
    }

    // check body for pending patterns only (more specific)
    if (pendingPatterns.some((pattern) => lowerBody.includes(pattern))) {
      return true;
    }

    return false;
  }

  /**
   * Parse email using OpenRouter AI (more reliable than regex)
   */
  private async parseWithAI(
    subject: string,
    body: string
  ): Promise<ParsedExpense | null> {
    if (!llmService.isConfigured()) {
      console.log('OpenRouter API key not configured, cannot parse email');
      return null;
    }

    try {
      const cleanBody = this.stripHtml(body);

      // Sanitize to remove PII and unnecessary content
      const sanitizedBody = this.sanitizeForAI(cleanBody);
      const sanitizedSubject = this.sanitizeForAI(subject);

      // Truncate to reasonable length (first 1000 chars after sanitization)
      const truncatedBody = sanitizedBody.substring(0, 3000);

      console.log(
        `Sanitized email: ${truncatedBody.length} chars (original: ${cleanBody.length} chars)`
      );

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
2. For date parsing, be VERY careful with the format:
   - "06 Jan 26" means DAY 06, MONTH Jan, YEAR 2026 (NOT January 26!)
   - "08/11/2025 18:38" means 08 Nov 2025 at 18:38
   - "08 Nov 25 18:38" means 08 Nov 2025 at 18:38
   - Always interpret 2-digit years as 20XX (e.g., 25 = 2025, 26 = 2026)
   - Format: "DD MMM YY HH:MM" where DD is day, MMM is month abbreviation, YY is 2-digit year
   - Convert to ISO 8601 format with +07:00 timezone (Vietnam time)
3. If you cannot find a specific field, use reasonable defaults:
   - merchant: "Unknown" if not found
   - transactionType: "Purchase" if not specific
   - category: Choose the MOST appropriate from the list above
4. Remove all formatting from amount (no commas, dots, or currency symbols)
5. For Grab emails, look for "Đặt từ" or "From" to find the merchant name
6. Skip emails that are NOT actual receipts or payment confirmations. Return {"skip": true} for:
   - Pending orders / order confirmations: "Order Received", "Booking Confirmed", "Đơn hàng đã được nhận", etc.
   - Delivery/shipping status updates: "đã giao hàng thành công", "giao hàng thành công", "has been delivered", "delivery completed", etc.
   - Tracking updates, refund notifications, review requests, or any non-payment email.
   - Only process emails that contain an actual payment/charge — a receipt showing money was taken from the customer.
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

EXAMPLE DATE PARSING:
Input: "Ngày | Giờ\n06 Jan 26 11:27 +0700"
This means: Day 06, Month January, Year 2026, Time 11:27
Output: "transactionDate": "2026-01-06T11:27:00+07:00"
(NOT January 26, 2026!)

If this email is NOT a completed transaction (e.g., pending order, confirmation email, promotional email), return:
{"skip": true}`;

      const response = await llmService.completion({
        messages: [{ role: 'user', content: prompt }],
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.1,
        maxTokens: 500,
      });

      if (!response) {
        console.error('No response from LLM service');
        return null;
      }

      // Parse JSON response
      const parsed = llmService.parseJSON<{
        skip?: boolean;
        amount?: number;
        merchant?: string;
        currency?: string;
        transactionDate?: string;
        transactionType?: string;
        category?: string;
      }>(response.content);

      if (!parsed) {
        return null;
      }

      // Check if email should be skipped
      if (parsed.skip) {
        console.log(
          'AI detected this should be skipped (pending order or non-transaction email)'
        );
        return null;
      }

      // Validate required fields
      if (!parsed.amount || !parsed.merchant) {
        console.error('Missing required fields in AI response:', parsed);
        return null;
      }

      // Validate category is one of the allowed values
      const validCategories = [
        'Food',
        'Transport',
        'Shopping',
        'Entertainment',
        'Bills',
        'Health',
        'Other',
      ];
      const category = validCategories.includes(parsed.category || '')
        ? parsed.category!
        : 'Other';

      console.log('✓ AI parsed expense:', parsed);

      return {
        transactionType: parsed.transactionType || 'Purchase',
        amount: parseFloat(String(parsed.amount)),
        currency: parsed.currency || 'VND',
        transactionDate: parsed.transactionDate || new Date().toISOString(),
        merchant: parsed.merchant,
        category,
        source: 'email',
        emailSubject: subject,
      };
    } catch (error) {
      console.error('Error in AI parsing:', error);
      return null;
    }
  }

  /**
   * Main parser function - uses AI only
   */
  async parseEmail(
    subject: string,
    body: string
  ): Promise<ParsedExpense | null> {
    // pre-filter: skip obvious non-transaction emails before calling llm
    if (this.shouldSkipEmail(subject, body)) {
      console.log(
        '✗ Skipped email (promotional or pending order) - no llm call made'
      );
      return null;
    }

    console.log('Attempting to parse email with AI...');

    // Try AI parsing
    const aiResult = await this.parseWithAI(subject, body);
    if (aiResult) {
      console.log('✓ Successfully parsed with AI');
      return aiResult;
    }

    console.log('AI parsing failed or returned null');
    return null;
  }
}

export const emailParser = new EmailParser()
