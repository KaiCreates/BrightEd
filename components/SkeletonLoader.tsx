'use client';

import { motion } from 'framer-motion';

interface SkeletonProps {
    className?: string;
    variant?: 'text' | 'card' | 'circle';
}

export function Skeleton({ className = "", variant = 'text' }: SkeletonProps) {
    const baseClass = "bg-[var(--bg-elevated)]/50 relative overflow-hidden";

    const variants = {
        text: "h-4 w-full rounded-md",
        card: "h-48 w-full rounded-2xl",
        circle: "h-12 w-12 rounded-full",
    };

    return (
        <div className={`${baseClass} ${variants[variant]} ${className}`}>
            <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_20px_rgba(255,255,255,0.05)]"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{
                    repeat: Infinity,
                    duration: 1.5,
                    ease: "linear"
                }}
            />
        </div>
    );
}

export function CardSkeleton() {
    return (
        <div className="space-y-4 p-6 border border-[var(--border-subtle)] rounded-2xl bg-[var(--bg-elevated)]/20">
            <div className="flex gap-4 items-center">
                <Skeleton variant="circle" />
                <div className="flex-1 space-y-2">
                    <Skeleton className="w-1/3" />
                    <Skeleton className="w-2/3" />
                </div>
            </div>
            <Skeleton variant="card" className="h-32" />
        </div>
    );
}

export function FeedSkeleton() {
    return (
        <div className="space-y-3">
            {[1, 2, 3].map(i => (
                <div key={i} className="flex gap-4 p-4 border border-[var(--border-subtle)] rounded-xl bg-[var(--bg-elevated)]/10">
                    <div className="flex-1 space-y-2">
                        <Skeleton className="w-1/2 h-3" />
                        <Skeleton className="w-1/4 h-2" />
                    </div>
                    <Skeleton className="w-12 h-6" />
                </div>
            ))}
        </div>
    );
}
