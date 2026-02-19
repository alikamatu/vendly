'use client';

import React, { Suspense } from 'react';
import ResetPasswordContent from './reset-password-content';
import Spinner from '@/components/ui/Spinner';

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
