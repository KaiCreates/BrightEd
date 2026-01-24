import type { Metadata } from 'next'
import './globals.css'
import { ConditionalNavigation } from '@/components/ConditionalNavigation'
import { ThemeProvider } from '@/lib/theme-context'
import { AuthProvider } from '@/lib/auth-context'

export const metadata: Metadata = {
  title: 'BrightEd - Adaptive Learning for CXC',
  description: 'Simulation-first learning platform for SEA, CSEC, and CAPE students',
}

import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from 'react-hot-toast'
import { BusinessProvider } from '@/lib/business-context'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#0EA5E9" />
      </head>
      <body className="font-sans antialiased text-[var(--text-primary)] bg-[var(--bg-primary)] min-h-screen">
        <ErrorBoundary>
          <AuthProvider>
            <BusinessProvider>
              <ThemeProvider>
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
                <ConditionalNavigation />
                <main className="relative min-h-screen pt-20">
                  {children}
                </main>
              </ThemeProvider>
            </BusinessProvider>
          </AuthProvider>
        </ErrorBoundary>
      </body>
    </html>
  )
}
