import { AuthProvider } from '@/components/auth-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { QueryProvider } from '@/components/query-provider'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { ThemeProvider } from '@/components/theme-provider'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Expense Tracker',
  description: 'Track your expenses automatically from email notifications',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Expense Tracker',
    startupImage: [
      {
        url: '/icon-512x512.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3)',
      },
    ],
  },
  applicationName: 'Expense Tracker',
  formatDetection: {
    telephone: false,
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192x192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="ExpensePal" />
        <meta name="apple-mobile-web-app-status-bar-style" 
        content="black-translucent" />
      </head>
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <AuthProvider>
              <ServiceWorkerRegistration />
              {children}
              <PWAInstallPrompt />
              <Toaster position="top-center" richColors closeButton />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
