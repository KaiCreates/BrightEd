'use client'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { useEffect } from 'react'

export function PostHogProvider({ children }: { children: React.ReactNode }) {
    const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
    const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'
    const posthogEnabled = process.env.NEXT_PUBLIC_ENABLE_POSTHOG === 'true' && !!posthogKey

    useEffect(() => {
        if (!posthogEnabled || !posthogKey) return
        posthog.init(posthogKey, {
            api_host: posthogHost,
            person_profiles: 'identified_only',
            capture_pageview: false, // We handle this manually for SPA transitions
            capture_pageleave: true,
        })
    }, [posthogEnabled, posthogKey, posthogHost])

    if (!posthogEnabled) {
        return <>{children}</>
    }

    return <PHProvider client={posthog}>{children}</PHProvider>
}
