'use client';

import React, { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthPageShell from '@/components/auth/AuthPageShell';
import RegisterForm from '@/components/auth/register-form';

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Legacy deep links: /register?mode=login
  useEffect(() => {
    if (searchParams.get('mode') === 'login') {
      const params = new URLSearchParams(searchParams.toString());
      params.delete('mode');
      const qs = params.toString();
      router.replace(`/login${qs ? `?${qs}` : ''}`);
    }
  }, [router, searchParams]);

  return (
    <AuthPageShell title="Create your account">
      <RegisterForm />
    </AuthPageShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={null}>
      <RegisterContent />
    </Suspense>
  );
}
