'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DeprecatedActivityPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard/settings/activity');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-xs text-muted">Redirecting to Activity Log under Settings...</p>
    </div>
  );
}
