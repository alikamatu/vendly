'use client';

import React, { Suspense } from 'react';
import VerifyEmailContent from './verify-email-content';
import Spinner from '@/components/ui/Spinner';

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
