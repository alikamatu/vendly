import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ReportReason,
  ReportResolutionAction,
  ReportStatus,
  ReportTargetType,
  Role,
} from '@prisma/client';
import { ReportService } from './report.service';

describe('ReportService (buyer product & seller reporting + super admin moderation)', () => {
  function makeDeps() {
    const tx = {
      product: { update: jest.fn().mockResolvedValue({}) },
      user: { update: jest.fn().mockResolvedValue({}) },
      report: { update: jest.fn() },
    };

    const prisma = {
      product: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      sellerProfile: {
        findUnique: jest.fn(),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 'admin-1' }]),
        update: jest.fn(),
      },
      report: {
        findFirst: jest.fn().mockResolvedValue(null),
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        groupBy: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb: any) => cb(tx)),
    } as any;

    const auditLogs = {
      record: jest.fn().mockResolvedValue(undefined),
    } as any;

    const notifications = {
      create: jest.fn().mockResolvedValue(undefined),
      createMany: jest.fn().mockResolvedValue({ count: 1 }),
    } as any;

    const service = new ReportService(prisma, auditLogs, notifications);
    return { service, prisma, tx, auditLogs, notifications };
  }

  it('creates a product report, links seller_id, and notifies super admins', async () => {
    const { service, prisma, notifications } = makeDeps();
    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'Fake AirPods',
      seller_id: 'seller-1',
      seller: {
        id: 'seller-1',
        user_id: 'seller-user-1',
        store_name: 'Tech Plug',
      },
    });
    prisma.report.create.mockResolvedValue({
      id: 'rep-1',
      reporter_id: 'buyer-1',
      target_type: ReportTargetType.PRODUCT,
      product_id: 'prod-1',
      seller_id: 'seller-1',
      reason: ReportReason.COUNTERFEIT,
      status: ReportStatus.OPEN,
    });

    const result = await service.createReport('buyer-1', {
      target_type: ReportTargetType.PRODUCT,
      product_id: 'prod-1',
      reason: ReportReason.COUNTERFEIT,
      details: 'Serial number is fake',
    });

    expect(result.report.id).toBe('rep-1');
    expect(prisma.report.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporter_id: 'buyer-1',
          target_type: ReportTargetType.PRODUCT,
          product_id: 'prod-1',
          seller_id: 'seller-1',
          reason: ReportReason.COUNTERFEIT,
          status: ReportStatus.OPEN,
        }),
      }),
    );
    // Allow microtask notification promise to settle
    await new Promise((r) => setImmediate(r));
    expect(notifications.createMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          userId: 'admin-1',
          link: '/reports?highlight=rep-1',
        }),
      ]),
    );
  });

  it('blocks sellers from reporting their own product or own store', async () => {
    const { service, prisma } = makeDeps();

    prisma.product.findUnique.mockResolvedValue({
      id: 'prod-1',
      title: 'My Item',
      seller_id: 'seller-1',
      seller: { id: 'seller-1', user_id: 'owner-1', store_name: 'My Store' },
    });

    await expect(
      service.createReport('owner-1', {
        target_type: ReportTargetType.PRODUCT,
        product_id: 'prod-1',
        reason: ReportReason.SPAM,
      }),
    ).rejects.toThrow(ForbiddenException);

    prisma.sellerProfile.findUnique.mockResolvedValue({
      id: 'seller-1',
      user_id: 'owner-1',
      store_name: 'My Store',
    });

    await expect(
      service.createReport('owner-1', {
        target_type: ReportTargetType.SELLER,
        seller_id: 'seller-1',
        reason: ReportReason.SCAM_FRAUD,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('blocks duplicate open reports from the same buyer against the same target', async () => {
    const { service, prisma } = makeDeps();
    prisma.sellerProfile.findUnique.mockResolvedValue({
      id: 'seller-1',
      user_id: 'seller-user-1',
      store_name: 'Shady Store',
    });
    prisma.report.findFirst.mockResolvedValue({ id: 'existing-rep' });

    await expect(
      service.createReport('buyer-1', {
        target_type: ReportTargetType.SELLER,
        seller_id: 'seller-1',
        reason: ReportReason.SCAM_FRAUD,
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('rejects a reported product on admin resolution, writes audit log, and notifies seller & buyer', async () => {
    const { service, prisma, tx, auditLogs, notifications } = makeDeps();
    const existingReport = {
      id: 'rep-2',
      reporter_id: 'buyer-1',
      target_type: ReportTargetType.PRODUCT,
      product_id: 'prod-1',
      seller_id: 'seller-1',
      reason: ReportReason.COUNTERFEIT,
      status: ReportStatus.OPEN,
      resolution_action: null,
      admin_notes: null,
      reviewed_at: null,
      product: {
        id: 'prod-1',
        title: 'Fake AirPods',
        seller: {
          id: 'seller-1',
          user_id: 'seller-user-1',
          store_name: 'Tech Plug',
        },
      },
      seller: {
        id: 'seller-1',
        user_id: 'seller-user-1',
        store_name: 'Tech Plug',
      },
    };
    prisma.report.findUnique.mockResolvedValue(existingReport);
    tx.report.update.mockResolvedValue({
      ...existingReport,
      status: ReportStatus.RESOLVED,
      resolution_action: ReportResolutionAction.PRODUCT_REJECTED,
    });

    const res = await service.resolveAdminReport(
      'rep-2',
      {
        status: ReportStatus.RESOLVED,
        action: ReportResolutionAction.PRODUCT_REJECTED,
        admin_notes: 'Confirmed replica listing',
      },
      { id: 'admin-1', role: Role.ADMIN, ip: '127.0.0.1' },
    );

    expect(tx.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-1' },
      data: { status: 'rejected' },
    });
    expect(res.report.resolution_action).toBe(
      ReportResolutionAction.PRODUCT_REJECTED,
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 'admin-1',
        action: 'report.resolve',
        entityType: 'report',
        entityId: 'rep-2',
      }),
    );
    expect(notifications.create).toHaveBeenCalledTimes(2);
  });

  it('suspends a seller on admin resolution and rejects invalid product actions on seller-only reports', async () => {
    const { service, prisma, tx } = makeDeps();
    const sellerReport = {
      id: 'rep-3',
      reporter_id: 'buyer-1',
      target_type: ReportTargetType.SELLER,
      product_id: null,
      seller_id: 'seller-9',
      reason: ReportReason.SCAM_FRAUD,
      status: ReportStatus.OPEN,
      resolution_action: null,
      admin_notes: null,
      reviewed_at: null,
      product: null,
      seller: {
        id: 'seller-9',
        user_id: 'seller-user-9',
        store_name: 'Scam Hub',
      },
    };
    prisma.report.findUnique.mockResolvedValue(sellerReport);

    await expect(
      service.resolveAdminReport(
        'rep-3',
        {
          status: ReportStatus.RESOLVED,
          action: ReportResolutionAction.PRODUCT_REJECTED,
        },
        { id: 'admin-1', role: Role.ADMIN },
      ),
    ).rejects.toThrow(BadRequestException);

    tx.report.update.mockResolvedValue({
      ...sellerReport,
      status: ReportStatus.RESOLVED,
      resolution_action: ReportResolutionAction.SELLER_SUSPENDED,
    });

    await service.resolveAdminReport(
      'rep-3',
      {
        status: ReportStatus.RESOLVED,
        action: ReportResolutionAction.SELLER_SUSPENDED,
        admin_notes: 'Repeated fraud reports verified',
      },
      { id: 'admin-1', role: Role.ADMIN },
    );

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: 'seller-user-9' },
      data: { is_suspended: true },
    });
  });
});
