'use client';

import React, { useState } from 'react';
import {
  Users,
  Search,
  Shield,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Trash2,
  KeyRound,
  Sparkles,
  Eye,
} from 'lucide-react';
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
} from '@/components/ui/table';
import { dateShort, shortId } from '@/lib/format';
import { ROLE_BADGE_COLORS } from '@/lib/constants';
import type { VendlyUser, UserRole } from '@/types/operations';
import { useVendlyUsers } from '@/hooks/use-users';
import { useToast } from '@/contexts/ToastContext';
import { useConfirm } from '@/contexts/ConfirmContext';

export default function UsersManagementPage() {
  const {
    users,
    loading,
    updateRole,
    toggleSuspension,
    warnUser,
    deleteUser,
    forceDisable2fa,
    setProStatus,
  } = useVendlyUsers();

  const { success, error: toastError } = useToast();
  const { confirm } = useConfirm();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');
  const [selectedUser, setSelectedUser] = useState<VendlyUser | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [warnModalOpen, setWarnModalOpen] = useState(false);
  const [warnReason, setWarnReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      u.full_name?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.id?.toLowerCase().includes(q);
    return matchesRole && matchesSearch;
  });

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    setActionLoading(true);
    try {
      await updateRole(userId, newRole);
      success(`User role updated to ${newRole}`);
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, role: newRole } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleSuspension = async (userId: string) => {
    setActionLoading(true);
    try {
      await toggleSuspension(userId);
      success('User suspension status toggled');
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, is_suspended: !prev.is_suspended } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleWarn = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      await warnUser(selectedUser.id, warnReason || 'Administrative warning');
      success('Warning issued to user');
      setWarnModalOpen(false);
      setWarnReason('');
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to issue warning');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisable2fa = async (userId: string) => {
    const ok = await confirm({
      title: 'Force-Disable 2FA',
      description:
        'Are you sure you want to force-disable two-factor authentication for this user? They will be required to set it up again upon their next sign in.',
      confirmText: 'Disable 2FA',
      variant: 'danger',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await forceDisable2fa(userId);
      success('2FA disabled for user');
      if (selectedUser?.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, totp_enabled: false } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTogglePro = async (user: VendlyUser) => {
    const isPro = !user.is_pro;
    if (!isPro) {
      const ok = await confirm({
        title: 'Revoke Pro Merchant Status',
        description: `Are you sure you want to revoke Pro Merchant privileges from ${user.full_name || user.email}?`,
        confirmText: 'Revoke Pro Status',
        variant: 'warning',
      });
      if (!ok) return;
    }
    setActionLoading(true);
    try {
      await setProStatus(user.id, { is_pro: isPro, duration_days: isPro ? 30 : 0 });
      success(isPro ? 'Pro status granted' : 'Pro status removed');
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, is_pro: isPro } : null));
      }
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    const ok = await confirm({
      title: 'Permanently Delete User',
      description:
        'Are you sure you want to permanently delete this user account? All listings, seller profile data, and related records will be removed. This action cannot be undone.',
      confirmText: 'Delete User Account',
      variant: 'danger',
      icon: 'trash',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await deleteUser(userId);
      success('User deleted');
      setDetailModalOpen(false);
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'Failed to delete user');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-foreground text-xl font-bold tracking-tight sm:text-2xl">
              User & Merchant Directory
            </h2>
            <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
              Manage platform members, permission roles, suspensions, warnings, and Pro accounts.
            </p>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col items-center gap-3 sm:flex-row">
          <div className="relative w-full sm:w-72">
            <Search className="text-muted-foreground absolute left-3 top-2.5 h-4 w-4" />
            <Input
              placeholder="Search by name, email, ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-9 text-xs"
            />
          </div>

          <div className="flex w-full items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'USER', 'SELLER', 'ADMIN'].map((role) => (
              <Button
                key={role}
                size="sm"
                variant={roleFilter === role ? 'primary' : 'outline'}
                onClick={() => setRoleFilter(role)}
                className="h-8 whitespace-nowrap px-3 text-xs"
              >
                {role === 'ALL' ? 'All Roles' : role}
              </Button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-2 py-20">
            <Spinner size="lg" className="text-brand" />
            <p className="text-muted-foreground text-xs">Loading directory...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <TableEmpty
            icon={Users}
            title="No users found"
            description="No users match your search or filter."
          />
        ) : (
          <Table>
            <TableHeader>
              <tr>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Warnings</TableHead>
                <TableHead>Pro</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </tr>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((u) => {
                const roleBadge = ROLE_BADGE_COLORS[u.role] || {
                  bg: 'bg-muted text-muted-foreground',
                  text: u.role,
                };

                return (
                  <TableRow key={u.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold uppercase">
                          {u.full_name?.charAt(0) || u.email?.charAt(0) || 'U'}
                        </div>
                        <div>
                          <p className="text-foreground font-medium">
                            {u.full_name || 'Anonymous'}
                          </p>
                          <p className="text-muted-foreground text-[11px]">{u.email}</p>
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
                      {u.is_suspended ? (
                        <Badge variant="danger" dot>
                          Suspended
                        </Badge>
                      ) : (
                        <Badge variant="success" dot>
                          Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.warnings > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-500">
                          <AlertTriangle className="h-3 w-3" />
                          {u.warnings}
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">0</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {u.is_pro ? (
                        <span className="text-brand inline-flex items-center gap-1 text-xs font-semibold">
                          <Sparkles className="h-3 w-3" />
                          Pro
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Free</span>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">
                      {dateShort(u.created_at)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setDetailModalOpen(true);
                        }}
                        className="h-7 px-2.5 text-xs"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Manage
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}

        {/* User Manage Modal */}
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title={selectedUser?.full_name || 'User Profile'}
          description={selectedUser?.email || ''}
          maxWidth="lg"
        >
          {selectedUser && (
            <div className="space-y-5 text-xs">
              {/* Info Grid */}
              <div className="bg-muted/40 border-border grid grid-cols-2 gap-3 rounded-xl border p-3.5">
                <div>
                  <span className="text-muted-foreground text-[11px]">User ID</span>
                  <p className="text-foreground mt-0.5 font-mono text-[11px]">
                    {shortId(selectedUser.id, 12)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Current Role</span>
                  <p className="text-foreground mt-0.5 font-semibold">{selectedUser.role}</p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">Account Status</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedUser.is_suspended ? 'Suspended' : 'Active'}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground text-[11px]">2FA Status</span>
                  <p className="text-foreground mt-0.5 font-semibold">
                    {selectedUser.totp_enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
              </div>

              {/* Action Buttons Group */}
              <div className="space-y-3 pt-2">
                <h4 className="text-foreground text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Administrative Controls
                </h4>

                {/* Role Toggle */}
                <div className="bg-card border-border flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-foreground font-medium">Change Permission Role</p>
                    <p className="text-muted-foreground text-[11px]">
                      Grant seller privileges or platform admin access.
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['USER', 'SELLER', 'ADMIN'] as UserRole[]).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={selectedUser.role === r ? 'primary' : 'outline'}
                        disabled={actionLoading || selectedUser.role === r}
                        onClick={() => handleRoleChange(selectedUser.id, r)}
                        className="h-7 px-2 text-xs"
                      >
                        {r}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Suspension Toggle */}
                <div className="bg-card border-border flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-foreground font-medium">
                      {selectedUser.is_suspended ? 'Reactivate Account' : 'Suspend Account'}
                    </p>
                    <p className="text-muted-foreground text-[11px]">
                      Temporarily block login and sales activities.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant={selectedUser.is_suspended ? 'primary' : 'outline'}
                    disabled={actionLoading}
                    onClick={() => handleToggleSuspension(selectedUser.id)}
                    className="h-7 text-xs"
                  >
                    <Ban className="mr-1 h-3 w-3" />
                    {selectedUser.is_suspended ? 'Lift Suspension' : 'Suspend'}
                  </Button>
                </div>

                {/* Issue Warning */}
                <div className="bg-card border-border flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-foreground font-medium">Official Warning</p>
                    <p className="text-muted-foreground text-[11px]">
                      Current warnings: {selectedUser.warnings}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setWarnModalOpen(true)}
                    className="h-7 border-amber-500/30 text-xs text-amber-500 hover:bg-amber-500/10"
                  >
                    <AlertTriangle className="mr-1 h-3 w-3" />
                    Issue Warning
                  </Button>
                </div>

                {/* Pro Toggle */}
                <div className="bg-card border-border flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-foreground font-medium">Pro Subscription</p>
                    <p className="text-muted-foreground text-[11px]">
                      Status: {selectedUser.is_pro ? 'Active Pro' : 'Standard'}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleTogglePro(selectedUser)}
                    className="h-7 text-xs"
                  >
                    <Sparkles className="text-brand mr-1 h-3 w-3" />
                    {selectedUser.is_pro ? 'Revoke Pro' : 'Grant 30d Pro'}
                  </Button>
                </div>

                {/* 2FA Reset */}
                <div className="bg-card border-border flex items-center justify-between rounded-xl border p-3">
                  <div>
                    <p className="text-foreground font-medium">Reset Two-Factor (2FA)</p>
                    <p className="text-muted-foreground text-[11px]">
                      Help user recover account if authenticator is lost.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleDisable2fa(selectedUser.id)}
                    className="h-7 text-xs"
                  >
                    <KeyRound className="mr-1 h-3 w-3" />
                    Disable 2FA
                  </Button>
                </div>

                {/* Delete User */}
                <div className="flex items-center justify-between rounded-xl border border-rose-500/20 bg-rose-500/5 p-3">
                  <div>
                    <p className="font-medium text-rose-500">Delete Account</p>
                    <p className="text-muted-foreground text-[11px]">
                      Permanently remove user from the system.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading}
                    onClick={() => handleDelete(selectedUser.id)}
                    className="h-7 border-rose-500/30 text-xs text-rose-500 hover:bg-rose-500/10"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal>

        {/* Warning Modal */}
        <Modal
          isOpen={warnModalOpen}
          onClose={() => setWarnModalOpen(false)}
          title="Issue Administrative Warning"
          description="A formal warning email and notification will be delivered to the user."
          maxWidth="md"
        >
          <div className="space-y-4 text-xs">
            <div className="space-y-1.5">
              <label className="text-foreground text-xs font-medium">Warning Reason</label>
              <Input
                placeholder="e.g. Violation of seller policy / delayed fulfillment"
                value={warnReason}
                onChange={(e) => setWarnReason(e.target.value)}
                className="text-xs"
              />
            </div>
            <div className="border-border flex justify-end gap-2 border-t pt-3">
              <Button variant="outline" size="sm" onClick={() => setWarnModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={actionLoading}
                onClick={handleWarn}
                className="bg-amber-600 text-white hover:bg-amber-700"
              >
                Send Warning
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminShell>
  );
}
