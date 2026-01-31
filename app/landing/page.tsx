'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import LandingDuolingo from '@/components/landing/LandingDuolingo';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      router.push('/home');
    }
  }, [user, loading, router]);

  return <LandingDuolingo />;
}
