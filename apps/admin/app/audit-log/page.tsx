'use client';

import React, { useState } from 'react';
import { Activity, Search, Filter, Eye, Terminal, Shield, Clock } from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Modal } from '@/components/ui/modal';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
  TablePagination,
} from '@/components/ui/table';
import { dateTime, shortId } from '@/lib/format';
import { useVendlyAuditLogs } from '@/hooks/use-audit-logs';
import type { AuditLogEntry } from '@/types/operations';

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const { logs, meta, loading, refresh } = useVendlyAuditLogs({
    page,
    limit: 20,
    action: actionFilter || undefined,
    entityType: entityFilter || undefined,
  });

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    void refresh({
      page: newPage,
      limit: 20,
      action: actionFilter || undefined,
      entityType: entityFilter || undefined,
    });
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              PostgreSQL System Audit Log
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Immutable ledger of administrative actions, merchant updates, role changes, and
              settlements.
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-64">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Filter by action..."
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Filter by entity (user, order...)"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>
          <Button
            size="sm"
            onClick={() =>
              refresh({
                page: 1,
                action: actionFilter || undefined,
                entityType: entityFilter || undefined,
              })
            }
            className="h-9 text-xs"
          >
            Apply Filters
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Reading PostgreSQL audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <TableEmpty
            icon={Activity}
            title="No audit entries"
            description="No audit logs matched your query criteria."
          />
        ) : (
          <div>
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>IP Address</TableHead>
                  <TableHead>Timestamp</TableHead>
                  <TableHead className="text-right">Payload</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <span className="text-foreground font-mono text-xs font-semibold">
                        {log.action}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="text-foreground flex items-center gap-1.5 text-xs">
                        <span className="text-muted-foreground capitalize">{log.entity_type}:</span>
                        <span className="font-mono text-[11px]">{shortId(log.entity_id, 8)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-[11px]">
                      {shortId(log.actor_id, 8)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          log.actor_role === 'ADMIN'
                            ? 'brand'
                            : log.actor_role === 'SELLER'
                              ? 'info'
                              : 'default'
                        }
                      >
                        {log.actor_role || 'SYSTEM'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground font-mono text-xs">
                      {log.ip || '—'}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateTime(log.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedLog(log);
                          setDetailModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Inspect
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              page={meta.page}
              totalPages={meta.totalPages}
              total={meta.total}
              limit={meta.limit}
              onPageChange={handlePageChange}
            />
          </div>
        )}

        {/* JSON Diff Inspector Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={`Audit Record: ${selectedLog?.action || ''}`}
          description={`Timestamp: ${selectedLog ? dateTime(selectedLog.created_at) : ''}`}
          maxWidth="2xl"
        >
          {selectedLog && (
            <div className="space-y-4 text-xs">
              <div className="bg-muted/40 border-border grid grid-cols-2 gap-2 rounded-xl border p-3">
                <div>
                  <span className="text-muted-foreground text-[11px]">Entity ID</span>
                  <p className="text-foreground mt-0.5 font-mono">{selectedLog.entity_id || '—'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Actor ID</span>
                  <p className="text-foreground mt-0.5 font-mono">
                    {selectedLog.actor_id || 'System'}
                  </p>
                </div>
                {selectedLog.reason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-[11px]">Reason</span>
                    <p className="text-foreground mt-0.5">{selectedLog.reason}</p>
                  </div>
                )}
              </div>

              {/* State Diffs */}
              <div className="space-y-3">
                {selectedLog.before && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      State Before
                    </span>
                    <pre className="bg-muted/60 border-border text-foreground overflow-x-auto rounded-xl border p-3 font-mono text-[11px]">
                      {JSON.stringify(selectedLog.before, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.after && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      State After
                    </span>
                    <pre className="bg-muted/60 border-border text-foreground overflow-x-auto rounded-xl border p-3 font-mono text-[11px]">
                      {JSON.stringify(selectedLog.after, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div className="space-y-1">
                    <span className="text-muted-foreground text-[11px] font-semibold">
                      Metadata & Headers
                    </span>
                    <pre className="bg-muted/60 border-border text-foreground overflow-x-auto rounded-xl border p-3 font-mono text-[11px]">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </Modal>
      </div>
    </AdminShell>
  );
}
