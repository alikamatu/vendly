import React from 'react';
import clsx from '@/utils/clsx';

export default function Card({ children, className }: React.PropsWithChildren<{ className?: string }>) {
  return (
    <div className={clsx('rounded-2xl bg-background p-8 shadow-lg', className)}>
      {children}
    </div>
  );
}