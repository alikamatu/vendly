'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthPageShell from '@/components/auth/AuthPageShell';
import LoginForm from '@/components/auth/login-form';

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Legacy deep links: /login?mode=register
  useEffect(() => {
    if (searchParams.get('mode') === 'register') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('mode');
      const qs = params.toString();
      router.replace(`/register${qs ? `?${qs}` : ''}`);
    }
  }, [router, searchParams]);

  return (
    <AuthPageShell title="Welcome back">
      <LoginForm />
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
