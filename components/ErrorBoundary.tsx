'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { BrightLayer, BrightHeading, BrightButton } from '@/components/system';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-6">
                    <BrightLayer variant="glass" padding="lg" className="max-w-xl w-full text-center border-[var(--state-error)]/20 shadow-2xl">
                        <div className="text-8xl mb-6">🛰️</div>
                        <BrightHeading level={1} className="mb-4 text-[var(--state-error)]">
                            Business Re-routing
                        </BrightHeading>
                        <p className="text-[var(--text-secondary)] text-lg mb-8 leading-relaxed">
                            We encountered a technical disruption in your empire sync. Our maintenance crew is already on the case.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <BrightButton variant="primary" onClick={() => window.location.reload()}>
                                RETRY EMPIRE SYNC
                            </BrightButton>
                            <BrightButton variant="secondary" onClick={() => window.location.href = '/home'}>
                                RETURN TO HUB
                            </BrightButton>
                        </div>
                    </BrightLayer>
                </div>
            );
        }

        return this.props.children;
    }
}
