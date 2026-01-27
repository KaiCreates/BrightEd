'use client';

import { useRouter } from 'next/navigation';
import BusinessRegistration from '@/components/business/BusinessRegistration';
import { BrightHeading, BrightLayer } from '@/components/system';
import { useAuth } from '@/lib/auth-context';
import Link from 'next/link';

export default function BusinessRegisterPage() {
  const router = useRouter();
  const { user, userData, loading } = useAuth();

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
    <div className="min-h-screen bg-[var(--bg-primary)] py-12 px-4 sm:px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <Link href="/practicals/business" className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            ← Back to Business Hub
          </Link>
        </div>

        <BusinessRegistration onComplete={handleComplete} />
      </div>
    </div>
  );
}
