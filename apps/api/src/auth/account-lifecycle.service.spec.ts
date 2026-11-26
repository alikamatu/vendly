import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  AccountLifecycleService,
  SELLER_DELETION_GRACE_DAYS,
} from './account-lifecycle.service';

describe('AccountLifecycleService', () => {
  const makeMocks = () => {
    const prisma: any = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        delete: jest.fn().mockResolvedValue({}),
      },
      order: {
        count: jest.fn().mockResolvedValue(0),
      },
      returnRequest: {
        count: jest.fn().mockResolvedValue(0),
      },
      payout: {
        count: jest.fn().mockResolvedValue(0),
      },
      orderItem: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        count: jest.fn().mockResolvedValue(0),
      },
      product: {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      sellerProfile: {
        update: jest.fn().mockResolvedValue({}),
      },
      address: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      favorite: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      notification: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      adminApproval: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };

    const emailService: any = {
      sendAccountDisabledEmail: jest.fn().mockResolvedValue(undefined),
      sendAccountDeletionScheduledEmail: jest.fn().mockResolvedValue(undefined),
      sendAccountDeletionReminderEmail: jest.fn().mockResolvedValue(undefined),
      sendAccountDeletedEmail: jest.fn().mockResolvedValue(undefined),
    };

    const cloudinary: any = {
      deleteByUrl: jest.fn().mockResolvedValue(undefined),
    };

    const auditLogs: any = {
      record: jest.fn().mockResolvedValue(undefined),
    };

    const service = new AccountLifecycleService(
      prisma,
      emailService,
      cloudinary,
      auditLogs,
    );

    return { service, prisma, emailService, cloudinary, auditLogs };
  };

  it('blocks a seller with standing orders from disabling or deleting their account', async () => {
    const { service, prisma } = makeMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-u1',
      role: 'SELLER',
      email: 'shop@example.com',
      full_name: 'Kofi Shop',
      password_hash: null, // OAuth-only
      is_suspended: false,
      disabled_at: null,
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      seller_profile: {
        id: 'sp-1',
        store_link: 'kofi-shop',
        balance_snapshot: { pending_balance: 0, available_balance: 0 },
        _count: { products: 4 },
      },
    });
    // buyer standing=0, seller standing=2, seller escrow=0
    prisma.order.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    const status = await service.getLifecycleStatus('seller-u1');
    expect(status.can_disable).toBe(false);
    expect(status.can_delete).toBe(false);
    expect(status.delete_blockers.map((b) => b.code)).toContain(
      'STANDING_SELLER_ORDERS',
    );

    // Re-mock order.count for requestAccountDeletion call
    prisma.order.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(0);

    await expect(
      service.requestAccountDeletion('seller-u1', { confirmText: 'DELETE' }),
    ).rejects.toThrow(BadRequestException);
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it('schedules seller account deletion for 14 days when zero blockers exist', async () => {
    const { service, prisma, emailService } = makeMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'seller-u2',
      role: 'SELLER',
      email: 'clean-shop@example.com',
      full_name: 'Ama Craft',
      password_hash: null,
      is_suspended: false,
      disabled_at: null,
      deletion_requested_at: null,
      deletion_scheduled_for: null,
      seller_profile: {
        id: 'sp-2',
        store_link: 'ama-craft',
        balance_snapshot: { pending_balance: 0, available_balance: 0 },
        _count: { products: 5 },
      },
    });

    const before = Date.now();
    const res = await service.requestAccountDeletion('seller-u2', {
      confirmText: 'DELETE',
    });

    expect(res.scheduled).toBe(true);
    expect(res.deleted).toBe(false);
    expect(res.grace_period_days).toBe(SELLER_DELETION_GRACE_DAYS);
    expect(res.deletion_scheduled_for).toBeTruthy();

    const scheduledMs = new Date(res.deletion_scheduled_for!).getTime();
    const diffDays = (scheduledMs - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(13.99);
    expect(diffDays).toBeLessThanOrEqual(14.05);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'seller-u2' },
        data: expect.objectContaining({
          disabled_at: expect.any(Date),
          deletion_requested_at: expect.any(Date),
          deletion_scheduled_for: expect.any(Date),
        }),
      }),
    );
    expect(emailService.sendAccountDeletionScheduledEmail).toHaveBeenCalled();
  });

  it('deletes a buyer with zero active orders immediately', async () => {
    const { service, prisma, emailService } = makeMocks();
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'buyer-u1',
        role: 'USER',
        email: 'buyer@example.com',
        full_name: 'Yaw Buyer',
        password_hash: null,
        is_suspended: false,
        disabled_at: null,
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        seller_profile: null,
      })
      .mockResolvedValueOnce({
        id: 'buyer-u1',
        role: 'USER',
        email: 'buyer@example.com',
        full_name: 'Yaw Buyer',
        password_hash: null,
        is_suspended: false,
        disabled_at: null,
        deletion_requested_at: null,
        deletion_scheduled_for: null,
        seller_profile: null,
      })
      .mockResolvedValueOnce({
        id: 'buyer-u1',
        role: 'USER',
        email: 'buyer@example.com',
        full_name: 'Yaw Buyer',
        orders: [],
        seller_profile: null,
      });

    const res = await service.requestAccountDeletion('buyer-u1', {
      confirmText: 'DELETE',
    });

    expect(res.deleted).toBe(true);
    expect(res.scheduled).toBe(false);
    expect(prisma.user.delete).toHaveBeenCalledWith({
      where: { id: 'buyer-u1' },
    });
    expect(emailService.sendAccountDeletedEmail).toHaveBeenCalledWith(
      'buyer@example.com',
      'Yaw Buyer',
      false,
    );
  });

  it('sends Day-11 reminders and hard-deletes all seller products on Day-14 sweep', async () => {
    const { service, prisma, emailService, cloudinary } = makeMocks();
    const inTwoDays = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    prisma.user.findMany
      .mockResolvedValueOnce([
        {
          id: 'seller-remind',
          email: 'remind@example.com',
          full_name: 'Remind Seller',
          deletion_scheduled_for: inTwoDays,
        },
      ])
      .mockResolvedValueOnce([{ id: 'seller-due' }]);

    // First findUnique inside executePermanentDeletion, second inside getLifecycleStatus recheck
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'seller-due',
        role: 'SELLER',
        email: 'due@example.com',
        full_name: 'Due Seller',
        is_suspended: false,
        orders: [],
        seller_profile: {
          id: 'sp-due-1234',
          store_link: 'due-shop',
          logo_url: 'https://res.cloudinary.com/demo/image/upload/v1/logo.png',
          products: [
            {
              id: 'p1',
              title: 'Leather Bag',
              image_urls: [
                'https://res.cloudinary.com/demo/image/upload/v1/bag.jpg',
              ],
              video_url: null,
            },
            {
              id: 'p2',
              title: 'Canvas Tote',
              image_urls: [],
              video_url: null,
            },
          ],
          payouts: [],
          ledger_entries: [],
          promotion_payments: [],
        },
      })
      .mockResolvedValueOnce({
        id: 'seller-due',
        role: 'SELLER',
        email: 'due@example.com',
        full_name: 'Due Seller',
        password_hash: null,
        is_suspended: false,
        disabled_at: new Date(),
        deletion_requested_at: new Date(),
        deletion_scheduled_for: new Date(Date.now() - 1000),
        seller_profile: {
          id: 'sp-due-1234',
          store_link: 'due-shop',
          balance_snapshot: { pending_balance: 0, available_balance: 0 },
          _count: { products: 2 },
        },
      });

    const summary = await service.processScheduledDeletions();

    expect(summary.remindersSent).toBe(1);
    expect(summary.deletedCount).toBe(1);
    expect(summary.totalProductsDeleted).toBe(2);
    expect(emailService.sendAccountDeletionReminderEmail).toHaveBeenCalledTimes(
      1,
    );
    expect(prisma.orderItem.updateMany).toHaveBeenCalledTimes(2);
    expect(prisma.product.deleteMany).toHaveBeenCalledWith({
      where: { seller_id: 'sp-due-1234' },
    });
    expect(prisma.sellerProfile.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'sp-due-1234' },
        data: expect.objectContaining({
          store_link: expect.stringMatching(/^deleted-/),
        }),
      }),
    );
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'seller-due' },
        data: expect.objectContaining({
          email: 'deleted_seller-due@verndly.com',
          deletion_scheduled_for: null,
        }),
      }),
    );
    expect(cloudinary.deleteByUrl).toHaveBeenCalledTimes(2);
    expect(emailService.sendAccountDeletedEmail).toHaveBeenCalledWith(
      'due@example.com',
      'Due Seller',
      true,
    );
  });

  it('prevents admin-suspended users from self-reactivating', async () => {
    const { service, prisma } = makeMocks();
    prisma.user.findUnique.mockResolvedValue({
      id: 'suspended-1',
      role: 'USER',
      is_suspended: true,
    });

    await expect(service.reactivateAccount('suspended-1')).rejects.toThrow(
      ForbiddenException,
    );
  });
});
