'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type BusinessNavItem = {
  href: string;
  label: string;
};

const NAV_ITEMS: BusinessNavItem[] = [
  { href: '/stories/business', label: 'Hub' },
  { href: '/stories/business/operations', label: 'Operations' },
  { href: '/stories/business/credit', label: 'Credit' },
  { href: '/stories/business/reports', label: 'Reports' },
  { href: '/stories/business/team', label: 'Team' },
  { href: '/stories/business/supply', label: 'Supply' },
];

export default function BusinessSectionNav() {
  const pathname = usePathname();

  return (
    <div className="sticky top-0 z-40 bg-[var(--bg-primary)]/80 backdrop-blur-md border-b border-[var(--border-subtle)]">
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/stories"
            className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            ← Stories
          </Link>

          <div className="text-xs font-black uppercase tracking-widest text-[var(--text-muted)]">
            Business Dashboard
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto sleek-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all whitespace-nowrap ${
                  active
                    ? 'bg-[var(--brand-primary)] text-white border-white/10 shadow-lg shadow-[var(--brand-primary)]/15'
                    : 'bg-[var(--bg-elevated)]/20 text-[var(--text-muted)] border-[var(--border-subtle)] hover:text-[var(--text-primary)] hover:border-[var(--brand-primary)]/40'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
