'use client';

import { motion } from 'framer-motion';

interface BusinessCreditCardProps {
  businessName: string;
  ownerName?: string;
  themeColor?: string;
  logoUrl?: string;
  icon?: string;
  className?: string;
  cardLabel?: string;
  cardNumber?: string;
  expiry?: string;
}

export default function BusinessCreditCard({
  businessName,
  ownerName,
  themeColor,
  logoUrl,
  icon,
  className = '',
  cardLabel = 'BUSINESS',
  cardNumber = '4921  0032  8841  2049',
  expiry = '01/29'
}: BusinessCreditCardProps) {
  const accent = themeColor && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(themeColor) ? themeColor : 'var(--brand-primary)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`relative w-full aspect-[1.586/1] rounded-3xl overflow-hidden border border-white/10 bg-[var(--bg-elevated)] shadow-2xl ${className}`}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(900px circle at 20% 0%, ${accent}35, transparent 55%), radial-gradient(800px circle at 80% 100%, ${accent}2a, transparent 60%), linear-gradient(135deg, rgba(2,6,23,0.92), rgba(2,6,23,0.75))`
        }}
      />

      <div className="absolute inset-0 opacity-30" style={{
        backgroundImage:
          'linear-gradient(transparent 0, transparent 8px, rgba(255,255,255,0.08) 9px), linear-gradient(90deg, transparent 0, transparent 16px, rgba(255,255,255,0.06) 17px)',
        backgroundSize: '100% 9px, 17px 100%'
      }} />

      <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" />

      <div className="relative z-10 h-full p-6 flex flex-col justify-between">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-[10px] font-black uppercase tracking-[0.24em] text-white/60">
              {cardLabel}
            </div>
            <div className="mt-1 text-sm font-black text-white/90 truncate">
              {businessName}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Business logo"
                className="w-10 h-10 rounded-xl object-cover border border-white/15 bg-white/5"
              />
            ) : (
              <div
                className="w-10 h-10 rounded-xl border border-white/15 bg-white/5 flex items-center justify-center text-lg"
                aria-label="Business icon"
              >
                {icon || '🏢'}
              </div>
            )}

            <div className="text-right">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">BRIGHTED</div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: accent }}>
                CREDIT
              </div>
            </div>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <div className="w-12 h-9 rounded-lg border border-white/20 bg-gradient-to-br from-yellow-200/60 to-yellow-600/40" />
            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Exp</div>
              <div className="text-xs font-mono text-white/85">{expiry}</div>
            </div>
          </div>

          <div className="mt-6 text-lg sm:text-xl font-mono tracking-[0.22em] text-white/95">
            {cardNumber}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Cardholder</div>
              <div className="text-sm font-bold text-white/90 truncate">
                {ownerName || 'DIRECTOR'}
              </div>
            </div>

            <div className="text-right">
              <div className="text-[9px] font-black uppercase tracking-widest text-white/45">Tier</div>
              <div className="text-sm font-black" style={{ color: accent }}>
                STARTUP
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute -bottom-24 -right-24 w-56 h-56 blur-[80px] opacity-40" style={{ backgroundColor: accent }} />
    </motion.div>
  );
}
