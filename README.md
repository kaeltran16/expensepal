# 💰 Expense Tracker - Mobile-First Daily Expense Manager

A beautiful, mobile-first expense tracking app built with Next.js that automatically reads transaction emails and helps you track daily spending. Designed for quick, personal expense logging on the go.

![Next.js](https://img.shields.io/badge/Next.js-14-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38bdf8)
![Supabase](https://img.shields.io/badge/Supabase-green)

## ✨ Features

- **📱 Mobile-First Design**: Optimized for one-handed use on smartphones
- **⚡ Quick Add**: Add expenses in seconds with large touch targets
- **📧 Auto-Import**: Automatically reads bank transaction emails (VIB supported)
- **🎨 Beautiful UI**: Smooth animations with Framer Motion and shadcn/ui
- **📊 Today's Summary**: See today's spending at a glance
- **🏷️ Category Pills**: Quick categorization with emoji icons
- **🔄 One-Click Sync**: Sync expenses from email with a tap
- **💾 Offline-Ready**: Works smoothly even on slow connections

## 🎯 Perfect For

- Daily personal expense tracking
- Quick lunch/coffee expense logging
- Splitting bills with friends
- Monitoring daily spending habits
- Budget-conscious individuals

## 📱 Mobile-First Experience

### Quick Add Form
- **Large amount input** - Easy to type on mobile
- **Smart category selection** - One-tap category buttons with emojis
- **Bottom sheet modal** - Natural mobile interaction
- **Auto-focus** - Start typing immediately
- **Today as default** - Optimized for logging current expenses

### Expense Cards
- **Big, tappable buttons** - Easy to edit/delete
- **Emoji categories** - Visual identification at a glance
- **Swipe-friendly** - Smooth animations
- **Compact info** - Just what you need: amount, merchant, date

## 🏗️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [Supabase](https://supabase.com/) (PostgreSQL)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **UI Components**: [shadcn/ui](https://ui.shadcn.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Email Parsing**: IMAP + Mailparser

## 📧 Email Auto-Import

Supports **VIB (Vietnam International Bank)** transaction notifications:

```
From: info@card.vib.com.vn
Subject: Transaction notification VIB Online Plus 2in1 Credit Card

Card number: 5138***5758
Cardholder: TRAN CAO KHANG
Transaction: Payment for services and goods
Value: 87,000 VND
At: 01:03 11/17/2025
At Shopee
```

### 🔒 Security Features

- **Sender Validation**: Only processes emails from trusted senders:
  - `info@card.vib.com.vn` (VIB Bank)
  - `no-reply@grab.com` (Grab)
- **Double-Check**: Validates sender address at both IMAP and parser levels
- **Prevents Spoofing**: Ignores emails from untrusted senders

Emails are parsed and expenses are created automatically with:
- Amount and currency
- Merchant name
- Transaction date and time
- Card info (stored but not displayed for manual entries)

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account (free)
- Email with IMAP access (Gmail recommended)

### Installation

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Supabase**
   - Create project at [supabase.com](https://supabase.com)
   - Run SQL from `supabase/schema.sql` in SQL Editor
   - Get your URL and anon key from Settings > API

3. **Configure environment**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   # Supabase
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

   # Email (Gmail: Enable App Passwords in Google Account)
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=your-app-password
   EMAIL_HOST=imap.gmail.com
   EMAIL_PORT=993
   EMAIL_TLS=true
   ```

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open on your phone or browser**
   - Visit `http://localhost:3000`
   - Or use your local IP to test on mobile: `http://192.168.x.x:3000`

## 📱 Usage

### Adding an Expense

1. Tap the **+** button (bottom right)
2. Enter the **amount** (auto-focused)
3. Type **what you bought** (e.g., "Coffee")
4. Tap a **category** pill
5. Tap **Add Expense**

⚡ Takes less than 5 seconds!

### Email Sync

1. Tap the **mail icon** (top right)
2. Wait for sync to complete
3. New expenses appear automatically

### Editing/Deleting

- Tap **pencil icon** to edit
- Tap **trash icon** to delete (with confirmation)

## 📁 Project Structure

```
saver/
├── app/
│   ├── api/
│   │   ├── expenses/        # CRUD endpoints
│   │   ├── email/           # Email sync
│   │   └── stats/           # Dashboard stats
│   ├── page.tsx             # Main mobile-first page
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── quick-expense-form.tsx  # Mobile bottom sheet form
│   ├── expense-card.tsx        # Compact expense display
│   ├── stats-card.tsx          # Summary cards
│   └── ui/                     # shadcn/ui components
├── lib/
│   ├── email-parser.ts      # VIB email parsing
│   ├── email-service.ts     # IMAP service
│   ├── supabase.ts          # DB client
│   └── utils.ts             # Helpers
└── supabase/
    └── schema.sql           # Database schema
```

## 🎨 Categories

Built-in categories with emojis:
- 🍔 Food
- 🚗 Transport
- 🛍️ Shopping
- 🎬 Entertainment
- 💡 Bills
- 🏥 Health
- 📦 Other

## 📊 Data Model

For **manual entries**, you only need:
- Amount
- Merchant/Description
- Category (optional)
- Date (defaults to now)
- Notes (optional)

For **email imports**, additional fields are stored:
- Card number
- Cardholder name
- Email subject

*Card info is stored but NOT displayed in the mobile UI*

## 🔒 Security

- ✅ `.env` never committed
- ✅ Use app-specific passwords
- ✅ No credential exposure in API responses
- ✅ Row Level Security ready in Supabase
- ⚠️ Add authentication before production deployment

## 🚀 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy!

Your mobile URL: `https://your-app.vercel.app`

### Testing on Mobile

```bash
# Find your local IP
ifconfig | grep "inet " | grep -v 127.0.0.1

# Access from phone on same WiFi
http://YOUR-LOCAL-IP:3000
```

## 🎯 Design Principles

1. **Mobile-First**: Designed for phone screens, works on desktop
2. **Quick Input**: Large touch targets, minimal typing
3. **Visual Feedback**: Smooth animations, clear states
4. **One-Handed Use**: Reachable buttons, bottom sheets
5. **Fast Performance**: Optimistic updates, smart caching

## 🤝 Contributing

Contributions welcome! Please feel free to submit a Pull Request.

## 📝 Roadmap

- [ ] Add user authentication
- [ ] Budget tracking and alerts
- [ ] Weekly/monthly spending charts
- [ ] Export to CSV/Excel
- [ ] Receipt photo capture
- [ ] Multiple bank email parsers
- [ ] PWA with offline support
- [ ] Split expense with friends
- [ ] Recurring expense tracking
- [ ] Multi-currency support

## 📄 License

ISC License

## 🙏 Acknowledgments

Built with amazing tools:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)

---

Made with ❤️ for easy expense tracking on the go!

For questions or issues, please open a GitHub issue.
