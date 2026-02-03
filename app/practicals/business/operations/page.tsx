'use client';

import BusinessOperationsCommandCenter from './BusinessOperationsCommandCenter';
import { BusinessProvider } from '@/lib/business-context';

export default function BusinessOperationsPage() {
  return (
    <BusinessProvider>
      <BusinessOperationsCommandCenter />
    </BusinessProvider>
  );
}
