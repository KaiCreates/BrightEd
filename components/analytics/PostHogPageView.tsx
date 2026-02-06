'use client'

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { usePostHog } from 'posthog-js/react';

function PostHogPageViewContent() {
    const posthogEnabled = process.env.NEXT_PUBLIC_ENABLE_POSTHOG === 'true' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const posthog = usePostHog();

    useEffect(() => {
        if (!posthogEnabled || !posthog) return
        if (pathname) {
            let url = window.origin + pathname;
            if (searchParams && searchParams.toString()) {
                url = url + `?${searchParams.toString()}`;
            }
            posthog.capture('$pageview', {
                '$current_url': url,
            });
        }
    }, [pathname, searchParams, posthog, posthogEnabled]);

    return null;
}

export default function PostHogPageView() {
    const posthogEnabled = process.env.NEXT_PUBLIC_ENABLE_POSTHOG === 'true' && !!process.env.NEXT_PUBLIC_POSTHOG_KEY
    if (!posthogEnabled) return null
    return (
        <Suspense fallback={null}>
            <PostHogPageViewContent />
        </Suspense>
    )
}
