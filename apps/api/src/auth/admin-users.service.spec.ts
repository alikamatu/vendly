import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { AdminService } from './admin.service';

describe('AdminService (restricted user, seller & store controls)', () => {
  const adminActor = { id: 'admin-1', role: Role.ADMIN, ip: '127.0.0.1' };

  function makeService() {
    const prisma = {
      user: {
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValue(2),
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    } as any;

    const paymentsService = {
      createSubaccount: jest
        .fn()
        .mockResolvedValue({ subaccount_code: 'ACCT_123' }),
    } as any;

    const emailService = {
      sendAccountSuspendedEmail: jest.fn().mockResolvedValue(undefined),
      sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
    } as any;

    const auditLogs = {
      record: jest.fn().mockResolvedValue(undefined),
    } as any;

    const notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    } as any;

    const accountLifecycle = {
      executePermanentDeletion: jest.fn().mockResolvedValue({
        mode: 'ANONYMIZED',
        deletedProducts: 4,
      }),
    } as any;

    const service = new AdminService(
      prisma,
      paymentsService,
      emailService,
      auditLogs,
      notifications,
      accountLifecycle,
    );

    return {
      service,
      prisma,
      paymentsService,
      emailService,
      auditLogs,
      notifications,
      accountLifecycle,
    };
  }

  it('prevents an admin from demoting, suspending, warning, or deleting themselves', async () => {
    const { service } = makeService();

    await expect(
      service.updateUserRole('admin-1', { role: Role.USER }, adminActor),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.toggleUserSuspension('admin-1', {}, adminActor),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.warnUser('admin-1', { reason: 'test' }, adminActor),
    ).rejects.toThrow(ForbiddenException);

    await expect(
      service.forceExecuteDeletion(
        'admin-1',
        { confirmText: 'DELETE' },
        adminActor,
      ),
    ).rejects.toThrow(ForbiddenException);
  });

  it('prevents demoting or suspending the last remaining active platform admin', async () => {
    const { service, prisma } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'admin-2',
      role: Role.ADMIN,
      is_suspended: false,
      email: 'other-admin@verndly.com',
    });
    prisma.user.count.mockResolvedValue(0);

    await expect(
      service.updateUserRole('admin-2', { role: Role.SELLER }, adminActor),
    ).rejects.toThrow(BadRequestException);

    await expect(
      service.toggleUserSuspension('admin-2', {}, adminActor),
    ).rejects.toThrow(BadRequestException);
  });

  it('verifies users, resets warnings, updates stores, and records audit logs', async () => {
    const { service, prisma, auditLogs, notifications } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-u1',
      email: 'seller@verndly.com',
      full_name: 'Kofi',
      is_verified: false,
      warnings: 3,
      deletion_scheduled_for: new Date(Date.now() + 86400000),
    });
    prisma.user.update.mockResolvedValue({ id: 'seller-u1', warnings: 0 });
    prisma.sellerProfile.findUnique
      .mockResolvedValueOnce({
        id: 'store-1',
        user_id: 'seller-u1',
        store_name: 'Old Store',
        store_link: 'old-store',
        whatsapp_number: '0244000000',
        location: 'Accra',
        payment_timing: 'UPFRONT_ONLY',
        onboarding_completed: true,
      })
      .mockResolvedValueOnce({
        id: 'store-1',
        user_id: 'seller-u1',
        store_name: 'Old Store',
        store_link: 'old-store',
        whatsapp_number: '0244000000',
        location: 'Accra',
        payment_timing: 'UPFRONT_ONLY',
        onboarding_completed: true,
      })
      .mockResolvedValueOnce(null);
    prisma.sellerProfile.update.mockResolvedValue({
      id: 'store-1',
      store_name: 'New Store',
      store_link: 'new-store',
      whatsapp_number: '0244111111',
      location: 'Accra',
      payment_timing: 'UPFRONT_ONLY',
      onboarding_completed: true,
    });

    await service.setUserVerification(
      'seller-u1',
      { is_verified: true },
      adminActor,
    );
    expect(prisma.sellerProfile.updateMany).toHaveBeenCalledWith({
      where: { user_id: 'seller-u1' },
      data: { is_seller_verified: true },
    });
    expect(notifications.create).toHaveBeenCalled();

    await service.resetUserWarnings(
      'seller-u1',
      { reason: 'Cleared' },
      adminActor,
    );
    await service.updateUserStore(
      'seller-u1',
      { store_name: 'New Store', store_link: 'new-store' },
      adminActor,
    );
    await service.cancelUserScheduledDeletion('seller-u1', adminActor);

    expect(auditLogs.record).toHaveBeenCalledTimes(4);
  });

  it('requires typed confirmation for force-executing deletion and delegates safely to AccountLifecycleService', async () => {
    const { service, prisma, accountLifecycle } = makeService();
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-u9',
      email: 'bad@store.com',
      role: Role.SELLER,
    });

    await expect(
      service.forceExecuteDeletion(
        'seller-u9',
        { confirmText: 'wrong' },
        adminActor,
      ),
    ).rejects.toThrow(BadRequestException);

    const res = await service.forceExecuteDeletion(
      'seller-u9',
      { confirmText: 'DELETE', reason: 'Confirmed fraud' },
      adminActor,
    );
    expect(accountLifecycle.executePermanentDeletion).toHaveBeenCalledWith(
      'seller-u9',
      { skipBlockerRecheck: true },
    );
    expect(res.result.deletedProducts).toBe(4);
  });
});
