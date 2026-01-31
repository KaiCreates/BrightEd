'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import LandingDuolingo from '@/components/landing/LandingDuolingo';

export default function RootPage() {
  return <LandingDuolingo />;
}
