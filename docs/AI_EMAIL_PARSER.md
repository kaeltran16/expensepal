# AI-Powered Email Parser

This application now uses AI (via OpenRouter) to parse transaction emails more reliably than regex patterns.

## Why AI Parsing?

Traditional regex-based email parsing is fragile and breaks when email formats change. AI parsing is:

- **More reliable**: Understands context and natural language
- **Flexible**: Works with various email formats without code changes
- **Self-healing**: Adapts to format changes automatically
- **Extensible**: Works with any bank/service email without custom parsers

## Setup

### 1. Get OpenRouter API Key

1. Visit [https://openrouter.ai/keys](https://openrouter.ai/keys)
2. Sign up or log in
3. Create a new API key
4. Copy the key

### 2. Add to Environment Variables

Add to your `.env` file:

```bash
OPENROUTER_API_KEY=sk-or-v1-...your-key-here...
```

### 3. Test

Trigger an email sync in the app. Check the console logs:

```
Attempting to parse email with AI...
✓ AI parsed expense: { amount: 38000, currency: 'VND', merchant: 'Store Name', ... }
✓ Successfully parsed with AI
```

## How It Works

1. **Email received** → Email service fetches from IMAP
2. **AI parsing** → Sends email to OpenRouter API with instructions
3. **Structured data** → AI returns JSON with transaction details
4. **Fallback** → If AI fails, falls back to regex patterns
5. **Save to database** → Expense saved to Supabase

## Model Used

We use `google/gemini-2.0-flash-exp:free` which is:
- **Free** to use (no cost)
- **Fast** response times
- **Accurate** for structured data extraction

## Cost

The free tier on OpenRouter includes generous limits. For typical usage (10-50 emails/day):
- **Cost**: $0 (free model)
- **Rate limits**: Sufficient for personal use

## Fallback Behavior

If AI parsing fails or API key is not configured, the system automatically falls back to:
- Regex-based Grab email parser
- Regex-based VIB email parser

This ensures the app continues working even without AI.

## Privacy & Security

- Only emails from **trusted senders** are processed (info@card.vib.com.vn, no-reply@grab.com)
- Email content is sent to OpenRouter API (truncated to 2000 chars)
- No email content is stored permanently
- API calls are made server-side only

## Extending to Other Banks

To add support for other banks/services:

1. **No code changes needed!** Just add the sender to trusted list:

```typescript
// lib/email-service.ts
const TRUSTED_SENDERS = [
  'info@card.vib.com.vn',
  'no-reply@grab.com',
  'notify@vietcombank.com.vn',  // Add new senders here
]
```

2. The AI will automatically parse the new format

## Troubleshooting

### AI Parsing Not Working

Check console logs:

```bash
# Should see:
Attempting to parse email with AI...
✓ Successfully parsed with AI

# If you see:
OpenRouter API key not configured, falling back to regex parsing
```

→ Check your `.env` file has `OPENROUTER_API_KEY` set

### API Errors

```bash
OpenRouter API error: 401 Unauthorized
```

→ Invalid API key. Get a new one from OpenRouter.

```bash
OpenRouter API error: 429 Too Many Requests
```

→ Rate limited. Wait a few minutes or upgrade your OpenRouter plan.

### Fallback to Regex

If you see "AI parsing failed, falling back to regex", check:
- Network connectivity
- API key validity
- OpenRouter service status

The app will still work with regex parsing as fallback.

## Testing

To test AI parsing manually:

1. Send a test transaction email to your configured email
2. Trigger sync in the app
3. Check console logs for AI parsing results
4. Verify expense appears in database

## Benefits Over Regex

| Feature | Regex Parser | AI Parser |
|---------|-------------|-----------|
| Reliability | ⚠️ Breaks with format changes | ✅ Adapts automatically |
| Merchant extraction | ❌ Complex regex | ✅ Understands context |
| Date parsing | ⚠️ Multiple patterns needed | ✅ Handles any format |
| New banks | ❌ Requires code changes | ✅ Works immediately |
| Maintenance | ⚠️ High (regex updates) | ✅ Low (no code changes) |

## Future Improvements

- [ ] Add support for more languages
- [ ] Extract category suggestions from email content
- [ ] Parse receipt images/attachments
- [ ] Detect duplicate transactions more reliably
- [ ] Extract payment method details
