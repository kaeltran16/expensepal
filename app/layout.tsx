import { AuthProvider } from '@/components/auth-provider'
import { PWAInstallPrompt } from '@/components/pwa-install-prompt'
import { QueryProvider } from '@/components/query-provider'
import { ServiceWorkerRegistration } from '@/components/service-worker-registration'
import { ThemeProvider } from '@/components/theme-provider'
import type { Metadata, Viewport } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'ExpensePal',
  description: 'Track your expenses automatically from email notifications',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'ExpensePal',
    startupImage: [
      // iPad Pro 12.9"
      {
        url: '/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 11"
      {
        url: '/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad (10.2", 9.7")
      {
        url: '/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Air 10.9"
      {
        url: '/apple-splash-1640-2360.png',
        media: '(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Pro 10.5"
      {
        url: '/apple-splash-1668-2224.png',
        media: '(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad Air 10.5"
      {
        url: '/apple-splash-1620-2160.png',
        media: '(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPad mini 8.3"
      {
        url: '/apple-splash-1488-2266.png',
        media: '(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone 16 Pro Max
      {
        url: '/apple-splash-1320-2868.png',
        media: '(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 16 Pro
      {
        url: '/apple-splash-1206-2622.png',
        media: '(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 16 Plus
      {
        url: '/apple-splash-1260-2736.png',
        media: '(device-width: 420px) and (device-height: 912px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15 Pro Max, 14 Pro Max
      {
        url: '/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15 Pro, 14 Pro
      {
        url: '/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 15, 15 Plus, 14, 13
      {
        url: '/apple-splash-1170-2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 14 Plus, 13 Pro Max, 12 Pro Max
      {
        url: '/apple-splash-1284-2778.png',
        media: '(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 13 mini, 12 mini, 11 Pro, XS, X
      {
        url: '/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 11 Pro Max, XS Max
      {
        url: '/apple-splash-1242-2688.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 11, XR
      {
        url: '/apple-splash-828-1792.png',
        media: '(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone 8 Plus, 7 Plus, 6s Plus, 6 Plus
      {
        url: '/apple-splash-1242-2208.png',
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)',
      },
      // iPhone 8, 7, 6s, 6, SE (2nd & 3rd gen)
      {
        url: '/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
      // iPhone SE (1st gen), 5s, 5c, 5
      {
        url: '/apple-splash-640-1136.png',
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)',
      },
    ],
  },
  applicationName: 'ExpensePal',
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
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
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
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
            <link rel="dns-prefetch" href={new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin} />
          </>
        )}
        <link rel="icon" href="/icon-192x192.png" />
        <link rel="apple-touch-icon" href="/icon-180x180.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-180x180.png" />
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
              <Toaster
                position="top-center"
                richColors
                closeButton
                toastOptions={{
                  style: {
                    marginTop: 'max(env(safe-area-inset-top), 1rem)',
                  }
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
