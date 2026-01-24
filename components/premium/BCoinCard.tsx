'use client'

import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import NextImage from 'next/image'
import { useState } from 'react'

interface BCoinCardProps {
    balance: number
    tier: 'Bronze' | 'Silver' | 'Gold' | 'Diamond' | 'Platinum'
    cardHolder: string
}

export default function BCoinCard({ balance, tier, cardHolder }: BCoinCardProps) {
    const x = useMotionValue(0)
    const y = useMotionValue(0)
    const [showNumber, setShowNumber] = useState(false)
    const [cardNumber] = useState(() => {
        // Generate random 16 digit number
        return Array.from({ length: 16 }, () => Math.floor(Math.random() * 10)).join('')
    })

    const mouseXSpring = useSpring(x)
    const mouseYSpring = useSpring(y)

    const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ['15deg', '-15deg'])
    const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ['-15deg', '15deg'])

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const width = rect.width
        const height = rect.height
        const mouseX = e.clientX - rect.left
        const mouseY = e.clientY - rect.top
        const xPct = mouseX / width - 0.5
        const yPct = mouseY / height - 0.5
        x.set(xPct)
        y.set(yPct)
    }

    const handleMouseLeave = () => {
        x.set(0)
        y.set(0)
    }

    const tierColors = {
        Bronze: 'from-[#8B4513] to-[#A0522D]',
        Silver: 'from-[#C0C0C0] to-[#E8E8E8]',
        Gold: 'from-[#FFD700] to-[#FFCC33]',
        Diamond: 'from-[#B9F2FF] to-[#E0FFFF]',
        Platinum: 'from-[#E5E4E2] to-[#FFFFFF]',
    }

    const formatCardNumber = (num: string) => {
        if (!showNumber) return '•••• •••• •••• ' + num.slice(-4)
        return num.match(/.{1,4}/g)?.join(' ') || num
    }

    return (
        <motion.div
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            style={{
                rotateY,
                rotateX,
                transformStyle: 'preserve-3d',
            }}
            className={`relative h-[240px] w-full max-w-[420px] rounded-[2rem] bg-gradient-to-br ${tierColors[tier]} p-8 shadow-2xl cursor-pointer overflow-hidden group select-none`}
        >
            {/* Shiny Effect - Moving gradient on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                        width: '200%',
                        height: '100%'
                    }}
                />
            </div>

            {/* Gloss Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/30 to-transparent opacity-50 group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-10 mix-blend-overlay pointer-events-none" />

            {/* Card Content */}
            <div className="relative z-10 h-full flex flex-col justify-between" style={{ transform: 'translateZ(50px)' }}>
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-8 bg-gradient-to-r from-yellow-200 to-yellow-400 rounded-md shadow-inner border border-yellow-500/30 flex items-center justify-center">
                            <div className="w-8 h-5 border border-yellow-600/20 rounded-sm grid grid-cols-2 gap-1 p-[2px]">
                                <div className="border border-yellow-600/20 rounded-[1px]" />
                                <div className="border border-yellow-600/20 rounded-[1px]" />
                            </div>
                        </div>
                        <div className="text-[#0F172A]/60 font-mono text-xs tracking-widest">
                            ((wireless))
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[#0F172A] font-black text-sm tracking-widest uppercase opacity-80">{tier}</span>
                    </div>
                </div>

                {/* Balance & Number */}
                <div className="space-y-4">
                    <div>
                        <p className="text-[#0F172A]/40 text-[10px] font-black uppercase tracking-widest mb-1">Total Balance</p>
                        <h3 className={`text-[#0F172A] text-4xl font-black flex items-center gap-2 ${balance === 0 ? 'animate-pulse opacity-60' : ''}`}>
                            {/* 3D B-Coin Icon */}
                            <motion.div
                                className="relative w-12 h-12"
                                animate={{
                                    rotateY: [0, 360],
                                    scale: balance === 0 ? [1, 1.05, 1] : 1
                                }}
                                transition={{
                                    duration: balance === 0 ? 4 : 3,
                                    repeat: Infinity,
                                    ease: "linear"
                                }}
                                style={{
                                    transformStyle: 'preserve-3d',
                                }}
                            >
                                <NextImage
                                    src="/b-coin.png"
                                    alt="B-Coin"
                                    fill
                                    className={`object-contain ${balance === 0 ? 'filter grayscale opacity-50' : 'drop-shadow-lg'}`}
                                />
                            </motion.div>
                            {balance === 0 ? '0.00 B' : balance.toLocaleString()}
                        </h3>
                    </div>

                    <div
                        className="font-mono text-xl text-[#0F172A] tracking-wider py-2 flex items-center gap-4 group/number"
                        onClick={() => setShowNumber(!showNumber)}
                    >
                        <span>{formatCardNumber(cardNumber)}</span>
                        <span className="opacity-0 group-hover/number:opacity-50 text-xs uppercase font-bold tracking-widest border border-[#0F172A]/20 px-2 py-1 rounded transition-opacity">
                            {showNumber ? 'Hide' : 'Show'}
                        </span>
                    </div>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-[#0F172A]/40 text-[8px] font-black uppercase tracking-widest mb-1">Card Holder</p>
                        <p className="text-[#0F172A] font-bold tracking-tight text-lg">{cardHolder.toUpperCase()}</p>
                    </div>
                    <div className="flex flex-col items-end">
                        <p className="text-[#0F172A]/40 text-[8px] font-black uppercase tracking-widest mb-1">Valid Thru</p>
                        <p className="text-[#0F172A] font-mono font-bold">12/28</p>
                    </div>
                </div>
            </div>

            {/* Background Micro-patterns */}
            <div className="absolute top-[-20%] right-[-20%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        </motion.div>
    )
}
