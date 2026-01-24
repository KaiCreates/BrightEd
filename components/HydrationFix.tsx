'use client';

import { useEffect, useState } from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function HydrationFix({ children, fallback }: Props) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  if (!isHydrated) {
    return fallback || <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return <>{children}</>;
}
