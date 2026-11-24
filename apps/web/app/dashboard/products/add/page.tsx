'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import BatchProductNotesForm from '@/components/products/BatchProductNotesForm';

export default function AddProductPage() {
  const router = useRouter();

  return (
    <div className="w-full">
      <BatchProductNotesForm
        onCancel={() => router.push('/dashboard/products')}
        onSuccess={(ids) => {
          if (ids.length === 1) {
            router.push(`/dashboard/products/${ids[0]}`);
          } else {
            router.push('/dashboard/products');
          }
        }}
      />
    </div>
  );
}
