'use client';

import { useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useRouter } from 'next/navigation';
import Duolingo from '@/components//Duolingo';

export default function RootPage() {
  return <Duolingo />;
}
