import type { Metadata } from 'next'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ConditionalMain } from '@/components/ConditionalMain'
import { ThemeProvider } from '@/lib/theme-context'
import { AuthProvider } from '@/lib/auth-context'
import { ConsoleBrandSplash } from '@/components/ConsoleBrandSplash'

export const metadata: Metadata = {
  title: 'BrightEd - Adaptive Learning for CXC',
  description: 'Simulation-first learning platform for SEA, CSEC, and CAPE students',
  icons: {
    icon: '/BrightEdLogo.png',
    shortcut: '/BrightEdLogo.png',
    apple: '/BrightEdLogo.png',
  },
}

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { BusinessProvider } from '@/lib/business-context'
import { AuthGate } from '@/components/AuthGate'
import { DialogProvider } from '@/components/system'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
        <meta name="theme-color" content="#0EA5E9" />
      </head>
      <body className="font-sans antialiased text-[var(--text-primary)] bg-[var(--bg-primary)] min-h-screen">
        <ErrorBoundary>
          <DialogProvider>
            <AuthProvider>
              <BusinessProvider>
                <ThemeProvider>
                  <ConsoleBrandSplash />
                  <Toaster position="top-right" toastOptions={{
                    duration: 4000,
                    style: {
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '12px',
                      backdropFilter: 'blur(10px)',
                    }
                  }} />
                  <AuthGate>
                    <ConditionalNavigation />
                    <ConditionalMain>{children}</ConditionalMain>
                  </AuthGate>
                </ThemeProvider>
              </BusinessProvider>
            </AuthProvider>
          </DialogProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
