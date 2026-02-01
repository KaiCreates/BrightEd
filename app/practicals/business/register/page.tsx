'use client';

import { useRouter } from 'next/navigation';
import BusinessRegistration from '@/components/business/BusinessRegistration';
import { BrightHeading } from '@/components/system';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';
import BusinessDuolingoLayout from '@/components/business/BusinessDuolingoLayout';

export default function BusinessRegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const handleComplete = (name: string) => {
    router.push('/practicals/business');
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  // Redirect if not logged in
  if (!user) {
    router.push('/login');
    return null;
  }

  return (
    <BusinessDuolingoLayout>
      <div className="max-w-6xl mx-auto">
        <BusinessRegistration onComplete={handleComplete} />
      </div>
    </BusinessDuolingoLayout>
  );
}
