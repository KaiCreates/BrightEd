'use client';

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState } from 'react';

interface BusinessCardProps {
    businessName: string;
    className?: string;
    tier?: 'Startup' | 'Growth' | 'Enterprise';
}

export default function BusinessCard3D({
    businessName,
    className = '',
    tier = 'Startup'
}: BusinessCardProps) {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const mouseX = useSpring(x, { stiffness: 500, damping: 100 });
    const mouseY = useSpring(y, { stiffness: 500, damping: 100 });

    const rotateX = useTransform(mouseY, [-0.5, 0.5], ["17.5deg", "-17.5deg"]);
    const rotateY = useTransform(mouseX, [-0.5, 0.5], ["-17.5deg", "17.5deg"]);

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        const xPct = mouseX / width - 0.5;
        const yPct = mouseY / height - 0.5;
        x.set(xPct);
        y.set(yPct);
    };

    const handleMouseLeave = () => {
        x.set(0);
        y.set(0);
    };

    return (
        <motion.div
            style={{
                rotateX,
                rotateY,
                transformStyle: "preserve-3d",
            }}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative w-full aspect-[1.586/1] rounded-3xl bg-gradient-to-br from-gray-900 to-black border border-white/10 shadow-2xl cursor-default group overflow-hidden ${className}`}
        >
            <div
                style={{ transform: "translateZ(75px)" }}
                className="absolute inset-4 rounded-2xl border border-white/10 flex flex-col justify-between p-6 bg-white/5 backdrop-blur-sm"
            >
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-[var(--neon-cyan)] to-[var(--brand-primary)] flex items-center justify-center text-[10px] font-black text-black">
                            BE
                        </div>
                        <span className="text-xs font-bold text-white/60 tracking-widest uppercase">BrightEd Enterprise</span>
                    </div>
                    <span className="px-2 py-1 bg-white/10 rounded text-[10px] font-black uppercase text-white/50 border border-white/10">
                        {tier}
                    </span>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] font-bold text-[var(--neon-cyan)] uppercase tracking-widest">
                        Identity Card
                    </p>
                    <h3 className="text-2xl font-black text-white tracking-tight text-glow-cyan">
                        {businessName}
                    </h3>
                </div>

                <div className="flex justify-between items-end">
                    <div className="space-y-1">
                        <div className="h-1 w-12 bg-white/20 rounded-full mb-1" />
                        <div className="h-1 w-8 bg-white/20 rounded-full" />
                    </div>
                    <div className="text-right">
                        <p className="text-[8px] text-white/40 uppercase font-bold tracking-widest mb-1">Generated</p>
                        <p className="text-xs font-mono text-white/80">01 / 2026</p>
                    </div>
                </div>
            </div>

            {/* Glossy reflection */}
            <div
                className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none"
                style={{ transform: "translateZ(50px)" }}
            />

            {/* Neon accent glow */}
            <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-[var(--neon-cyan)] blur-[80px] opacity-20 group-hover:opacity-40 transition-opacity" />

        </motion.div>
    );
}
