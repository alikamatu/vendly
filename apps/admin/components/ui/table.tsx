import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="border-border bg-card w-full overflow-x-auto rounded-xl border">
      <table className={cn('w-full border-collapse text-left text-[13px]', className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-muted/40 border-border text-muted-foreground border-b">{children}</thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-border/60 divide-y">{children}</tbody>;
}

export function TableRow({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <tr
      onClick={onClick}
      className={cn('hover:bg-muted/30 transition-colors', onClick && 'cursor-pointer', className)}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        'text-muted-foreground px-4 py-3 text-[11px] font-semibold uppercase tracking-wider',
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableCell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn('text-foreground px-4 py-3.5 align-middle', className)}>{children}</td>;
}

export function TableEmpty({
  title = 'No items found',
  description = 'No matching records match your query.',
  icon: Icon,
  action,
}: {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      {Icon && (
        <div className="bg-muted mb-3 flex h-12 w-12 items-center justify-center rounded-full">
          <Icon className="text-muted-foreground h-6 w-6" />
        </div>
      )}
      <p className="text-foreground text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 max-w-sm text-xs">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TablePagination({
  page,
  totalPages,
  onPageChange,
  total,
  limit,
}: {
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  total?: number;
  limit?: number;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="border-border text-muted-foreground flex items-center justify-between border-t px-4 py-3 text-xs">
      <div>
        {total !== undefined && limit !== undefined ? (
          <span>
            Showing {Math.min((page - 1) * limit + 1, total)} - {Math.min(page * limit, total)} of{' '}
            {total}
          </span>
        ) : (
          <span>
            Page {page} of {totalPages}
          </span>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="h-8 px-2.5"
        >
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="text-foreground px-2 font-medium">
          {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="h-8 px-2.5"
        >
          Next
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
