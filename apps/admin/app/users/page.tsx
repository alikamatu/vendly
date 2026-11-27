'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Users,
  Store,
  Search,
  AlertTriangle,
  Sparkles,
  Eye,
  Download,
  RefreshCw,
  ShieldCheck,
  Ban,
  Clock,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';
import { AdminShell } from '@/components/layout/AdminShell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableEmpty,
} from '@/components/ui/table';
import { dateShort, formatCurrency } from '@/lib/format';
import { ROLE_BADGE_COLORS } from '@/lib/constants';
import { useVendlyUsers } from '@/hooks/use-users';
import { useToast } from '@/contexts/ToastContext';
import { UserControlModal } from '@/components/users/UserControlModal';

const STOREFRONT_BASE_URL = process.env.NEXT_PUBLIC_WEB_URL || 'https://verndly.com';

type DirectoryView = 'users' | 'stores';

function csvEscape(value: unknown): string {
  const s = value == null ? '' : String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function UsersManagementPage() {
  const {
    users,
    stores,
    summary,
    total,
    totalPages,
    storesTotal,
    storesTotalPages,
    loading,
    storesLoading,
    fetchUsers,
    fetchStores,
  } = useVendlyUsers();

  const { success } = useToast();

  const [view, setView] = useState<DirectoryView>('users');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [page, setPage] = useState(1);

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const refreshActiveView = useCallback(async () => {
    if (view === 'users') {
      await fetchUsers({
        search,
        role: roleFilter,
        accountStatus: statusFilter,
        page,
        limit: 50,
      });
    } else {
      await fetchStores({
        search,
        accountStatus: statusFilter,
        page,
        limit: 50,
      });
    }
  }, [view, search, roleFilter, statusFilter, page, fetchUsers, fetchStores]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void refreshActiveView();
    }, 200);
    return () => clearTimeout(timer);
  }, [refreshActiveView]);

  // Also ensure KPI summary is fetched once if user lands on Stores tab
  useEffect(() => {
    if (!summary) {
      void fetchUsers({ page: 1, limit: 1 });
    }
  }, [summary, fetchUsers]);

  const handleOpenControl = (userId: string) => {
    setSelectedUserId(userId);
    setModalOpen(true);
  };

  const handleExportCsv = () => {
    let header: string[] = [];
    let rows: string[][] = [];
    let filename = 'verndly-users.csv';

    if (view === 'users') {
      header = [
        'ID',
        'Full Name',
        'Email',
        'Phone',
        'School',
        'Role',
        'Verified',
        'Suspended',
        'Disabled At',
        'Deletion Scheduled',
        'Warnings',
        'Pro',
        'Orders Count',
        'Store Name',
        'Store Handle',
        'Store WhatsApp',
        'Store Location',
        'Store Products',
        'Paystack Subaccount',
        'Joined At',
      ];
      rows = users.map((u) => [
        u.id,
        u.full_name,
        u.email,
        u.phone_e164 || '',
        u.school || '',
        u.role,
        String(u.is_verified),
        String(u.is_suspended),
        u.disabled_at || '',
        u.deletion_scheduled_for || '',
        String(u.warnings),
        String(Boolean(u.is_pro)),
        String(u.orders_count ?? 0),
        u.seller_profile?.store_name || '',
        u.seller_profile?.store_link || '',
        u.seller_profile?.whatsapp_number || '',
        u.seller_profile?.location || '',
        String(u.seller_profile?.products_count ?? 0),
        u.seller_profile?.paystack_subaccount_code || '',
        u.created_at,
      ]);
      filename = `verndly-users-page-${page}.csv`;
    } else {
      header = [
        'Store ID',
        'Store Name',
        'Handle',
        'Owner Name',
        'Owner Email',
        'Owner Verified',
        'Owner Suspended',
        'WhatsApp',
        'Location',
        'Products',
        'Rating',
        'Reports',
        'Bank',
        'Account Number',
        'Paystack Subaccount',
        'Available Balance',
        'Pending Escrow',
        'Total Earned',
        'Total Withdrawn',
        'Created At',
      ];
      rows = stores.map((s) => [
        s.id,
        s.store_name,
        s.store_link,
        s.owner?.full_name || '',
        s.owner?.email || '',
        String(Boolean(s.owner?.is_verified)),
        String(Boolean(s.owner?.is_suspended)),
        s.whatsapp_number || '',
        [s.area, s.location].filter(Boolean).join(', '),
        String(s.products_count),
        `${s.rating_avg.toFixed(1)} (${s.rating_count})`,
        String(s.reports_count),
        s.bank_name || '',
        s.account_number || '',
        s.paystack_subaccount_code || '',
        String(s.balance_snapshot?.available_balance ?? 0),
        String(s.balance_snapshot?.pending_balance ?? 0),
        String(s.balance_snapshot?.total_earned ?? 0),
        String(s.balance_snapshot?.total_withdrawn ?? 0),
        s.created_at,
      ]);
      filename = `verndly-stores-page-${page}.csv`;
    }

    const csv = [header, ...rows].map((r) => r.map(csvEscape).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    success(`Exported ${rows.length} record(s) to CSV`);
  };

  const activeTotal = view === 'users' ? total : storesTotal;
  const activeTotalPages = view === 'users' ? totalPages : storesTotalPages;
  const isBusy = view === 'users' ? loading : storesLoading;

  return (
    <AdminShell>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              Users, Sellers &amp; Stores Control
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Restricted Super Admin directory with full profile, storefront, payout, and lifecycle
              control.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshActiveView()}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              className="gap-1.5 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Live KPI Strip */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <span className="text-muted-foreground text-[11px] font-medium">Total Users</span>
            <p className="text-foreground mt-1 text-xl font-bold">{summary?.totalUsers ?? total}</p>
            <p className="text-muted-foreground text-[10px]">{summary?.admins ?? 0} admin(s)</p>
          </div>
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <span className="text-muted-foreground text-[11px] font-medium">Buyers</span>
            <p className="text-foreground mt-1 text-xl font-bold">{summary?.buyers ?? 0}</p>
            <p className="text-muted-foreground text-[10px]">Customer accounts</p>
          </div>
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <span className="text-muted-foreground text-[11px] font-medium">Sellers</span>
            <p className="text-foreground mt-1 text-xl font-bold">{summary?.sellers ?? 0}</p>
            <p className="text-muted-foreground text-[10px]">
              {summary?.totalStores ?? storesTotal} active stores
            </p>
          </div>
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Verified</span>
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
            </div>
            <p className="text-foreground mt-1 text-xl font-bold">{summary?.verified ?? 0}</p>
            <p className="text-muted-foreground text-[10px]">Approved identities</p>
          </div>
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Suspended</span>
              <Ban className="h-3.5 w-3.5 text-rose-500" />
            </div>
            <p className="mt-1 text-xl font-bold text-rose-500">{summary?.suspended ?? 0}</p>
            <p className="text-muted-foreground text-[10px]">
              {summary?.disabled ?? 0} self-disabled
            </p>
          </div>
          <div className="bg-card border-border rounded-2xl border p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground text-[11px] font-medium">Deleting</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="mt-1 text-xl font-bold text-amber-500">{summary?.deleting ?? 0}</p>
            <p className="text-muted-foreground text-[10px]">In 14-day window</p>
          </div>
        </div>

        {/* View Switcher: All Users vs Sellers & Stores */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="bg-muted/50 inline-flex items-center rounded-xl p-1">
            <button
              type="button"
              onClick={() => {
                setView('users');
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                view === 'users'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              All Users ({summary?.totalUsers ?? total})
            </button>
            <button
              type="button"
              onClick={() => {
                setView('stores');
                setPage(1);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                view === 'stores'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Store className="h-3.5 w-3.5" />
              Sellers &amp; Stores ({summary?.totalStores ?? storesTotal})
            </button>
          </div>

          <p className="text-muted-foreground text-xs">
            Showing <strong className="text-foreground">{activeTotal}</strong> matching record(s)
          </p>
        </div>

        {/* Search & Multi-Filters */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:w-80">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder={
                view === 'users'
                  ? 'Search name, email, phone, school, store…'
                  : 'Search store name, @handle, WhatsApp, owner…'
              }
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {view === 'users' && (
              <>
                {['ALL', 'USER', 'SELLER', 'ADMIN'].map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={roleFilter === role ? 'primary' : 'outline'}
                    onClick={() => {
                      setRoleFilter(role);
                      setPage(1);
                    }}
                    className="h-8 px-2.5 text-xs"
                  >
                    {role === 'ALL' ? 'All Roles' : role}
                  </Button>
                ))}
                <div className="bg-border mx-1 hidden h-5 w-px sm:block" />
              </>
            )}

            {['ALL', 'ACTIVE', 'VERIFIED', 'UNVERIFIED', 'SUSPENDED', 'DISABLED', 'DELETING'].map(
              (st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    setStatusFilter(st);
                    setPage(1);
                  }}
                  className={`rounded-xl px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    statusFilter === st
                      ? 'bg-foreground text-background'
                      : 'bg-card border-border text-muted-foreground hover:text-foreground border'
                  }`}
                >
                  {st === 'ALL' ? 'All Status' : st}
                </button>
              ),
            )}
          </div>
        </div>

        {/* Directory Table */}
        {isBusy ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">
              Loading {view === 'users' ? 'users' : 'sellers & stores'}…
            </p>
          </div>
        ) : view === 'users' ? (
          users.length === 0 ? (
            <TableEmpty
              icon={Users}
              title="No users found"
              description="No accounts match your search or filters."
            />
          ) : (
            <Table>
              <TableHeader>
                <tr>
                  <TableHead>User &amp; Contact</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Activity</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Control</TableHead>
                </tr>
              </TableHeader>
              <TableBody>
                {users.map((u) => {
                  const roleBadge = ROLE_BADGE_COLORS[u.role] || {
                    bg: 'bg-muted text-muted-foreground',
                    text: u.role,
                  };
                  return (
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex items-center gap-2.5">
                          <div className="bg-muted text-muted-foreground flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold uppercase">
                            {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="text-foreground truncate font-semibold">
                                {u.full_name || 'Anonymous'}
                              </p>
                              {u.is_verified && (
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                              )}
                              {u.is_pro && <Sparkles className="text-brand h-3 w-3 shrink-0" />}
                            </div>
                            <p className="text-muted-foreground truncate text-[11px]">{u.email}</p>
                            {(u.phone_e164 || u.school) && (
                              <p className="text-muted-foreground truncate text-[10px]">
                                {[u.phone_e164, u.school].filter(Boolean).join(' • ')}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${roleBadge.bg}`}
                        >
                          {u.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        {u.seller_profile ? (
                          <div className="min-w-0 max-w-[180px]">
                            <p className="text-foreground truncate text-xs font-semibold">
                              {u.seller_profile.store_name}
                            </p>
                            <p className="text-muted-foreground truncate text-[10px]">
                              @{u.seller_profile.store_link} •{' '}
                              {u.seller_profile.products_count ?? 0} items
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          {u.is_suspended ? (
                            <Badge variant="danger" dot>
                              Suspended
                            </Badge>
                          ) : u.deletion_scheduled_for ? (
                            <Badge variant="danger" dot>
                              Deleting {dateShort(u.deletion_scheduled_for)}
                            </Badge>
                          ) : u.disabled_at ? (
                            <Badge variant="warning" dot>
                              Disabled
                            </Badge>
                          ) : (
                            <Badge variant="success" dot>
                              Active
                            </Badge>
                          )}
                          {u.warnings > 0 && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-500">
                              <AlertTriangle className="h-3 w-3" />
                              {u.warnings} warn
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-[11px]">
                        <div>{u.orders_count ?? 0} orders</div>
                        {u.seller_profile?.balance_snapshot && (
                          <div className="text-foreground font-mono text-[10px]">
                            {formatCurrency(u.seller_profile.balance_snapshot.total_earned)} earned
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {dateShort(u.created_at)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenControl(u.id)}
                          className="h-7 gap-1 px-2.5 text-xs"
                        >
                          <Eye className="h-3 w-3" />
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )
        ) : stores.length === 0 ? (
          <TableEmpty
            icon={Store}
            title="No stores found"
            description="No seller stores match your search or status filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>Storefront</TableHead>
                <TableHead>Owner &amp; Contact</TableHead>
                <TableHead>Catalog &amp; Trust</TableHead>
                <TableHead>Payout &amp; Balance</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Control</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {stores.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="bg-muted flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl">
                        {s.logo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={s.logo_url}
                            alt={s.store_name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Store className="text-muted-foreground h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 max-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          <p className="text-foreground truncate text-xs font-semibold">
                            {s.store_name}
                          </p>
                          <a
                            href={`${STOREFRONT_BASE_URL}/s/${s.store_link}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-muted-foreground hover:text-brand"
                            title="Open storefront"
                          >
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                        <p className="text-muted-foreground truncate text-[11px]">
                          @{s.store_link}
                        </p>
                        <p className="text-muted-foreground truncate text-[10px]">
                          {[s.area, s.location].filter(Boolean).join(', ') || 'No location'}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <p className="text-foreground text-xs font-medium">{s.owner?.full_name}</p>
                    <p className="text-muted-foreground text-[11px]">{s.owner?.email}</p>
                    {s.whatsapp_number && (
                      <p className="text-muted-foreground text-[10px]">WA: {s.whatsapp_number}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="text-foreground font-semibold">{s.products_count} products</p>
                    <p className="text-muted-foreground text-[10px]">
                      ★ {s.rating_avg.toFixed(1)} ({s.rating_count})
                      {s.reports_count > 0 && (
                        <span className="ml-1.5 font-semibold text-rose-500">
                          • {s.reports_count} report(s)
                        </span>
                      )}
                    </p>
                  </TableCell>
                  <TableCell className="text-xs">
                    <p className="text-foreground font-mono font-semibold">
                      {formatCurrency(s.balance_snapshot?.available_balance ?? 0)}{' '}
                      <span className="text-muted-foreground font-sans text-[10px] font-normal">
                        avail
                      </span>
                    </p>
                    <p className="text-muted-foreground font-mono text-[10px]">
                      {formatCurrency(s.balance_snapshot?.pending_balance ?? 0)} escrow •{' '}
                      {s.paystack_subaccount_code ? 'Subacct OK' : 'No Subacct'}
                    </p>
                  </TableCell>
                  <TableCell>
                    {s.owner?.is_suspended ? (
                      <Badge variant="danger" dot>
                        Suspended
                      </Badge>
                    ) : s.owner?.deletion_scheduled_for ? (
                      <Badge variant="danger" dot>
                        Deleting {dateShort(s.owner.deletion_scheduled_for)}
                      </Badge>
                    ) : s.owner?.disabled_at ? (
                      <Badge variant="warning" dot>
                        Disabled
                      </Badge>
                    ) : s.owner?.is_verified ? (
                      <Badge variant="success" dot>
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="default" dot>
                        Unverified
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenControl(s.user_id)}
                      className="h-7 gap-1 px-2.5 text-xs"
                    >
                      <Eye className="h-3 w-3" />
                      Manage
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        {/* Pagination Bar */}
        {activeTotalPages > 1 && (
          <div className="flex items-center justify-between pt-2 text-xs">
            <span className="text-muted-foreground">
              Page <strong className="text-foreground">{page}</strong> of{' '}
              <strong className="text-foreground">{activeTotalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="h-8 gap-1 text-xs"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= activeTotalPages}
                onClick={() => setPage((p) => Math.min(activeTotalPages, p + 1))}
                className="h-8 gap-1 text-xs"
              >
                Next
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Complete 360° Super Admin User & Store Control Modal */}
      <UserControlModal
        userId={selectedUserId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onMutated={refreshActiveView}
      />
    </AdminShell>
  );
}
