import { BadRequestException } from '@nestjs/common';
import { of } from 'rxjs';
import { PaymentsService } from './payments.service';

describe('PaymentsService Super Admin Financial Controls', () => {
  const actor = {
    id: 'admin-1',
    role: 'ADMIN' as const,
    ip: '127.0.0.1',
    userAgent: 'jest',
  };

  function createHarness() {
    const httpService: any = {
      get: jest.fn(() =>
        of({ data: { data: [{ currency: 'GHS', balance: 254000 }] } }),
      ),
      post: jest.fn(),
      put: jest.fn(),
    };
    const paymentsRepository: any = {
      findSellerByProfileId: jest.fn(async () => ({
        id: 'seller-1',
        user_id: 'user-1',
        store_name: 'Accra Tech',
        bank_name: 'MTN Mobile Money',
        bank_code: 'MTN',
        account_number: '0244111222',
        paystack_subaccount_code: 'ACCT_old',
        user: { email: 'seller@verndly.com', full_name: 'Ama Seller' },
      })),
      createLedgerEntry: jest.fn(async () => ({ id: 'led-1' })),
      upsertVendorBalanceSnapshot: jest.fn(async () => ({
        available_balance: 500,
        pending_balance: 100,
        total_earned: 600,
        total_withdrawn: 0,
      })),
      listVendorWallets: jest.fn(async () => ({
        items: [
          {
            seller_id: 'seller-1',
            pending_balance: 150,
            available_balance: 200,
          },
        ],
      })),
      updateSellerBankDetails: jest.fn(async () => ({})),
      getPromotionPaymentById: jest.fn(async () => ({
        id: 'promo-1',
        category: 'BOOST',
        product_id: 'prod-1',
        status: 'PENDING',
        seller: { user_id: 'user-1' },
      })),
      updatePromotionPaymentById: jest.fn(
        async (_id: string, status: string) => ({
          id: 'promo-1',
          status,
        }),
      ),
      featureProductById: jest.fn(async () => ({})),
      upgradeUserToPro: jest.fn(async () => ({})),
    };
    const emailService: any = {
      sendPayoutDetailsChangedAlertEmail: jest.fn(async () => {}),
    };
    const orderEvents: any = { emit: jest.fn() };
    const notifications: any = { create: jest.fn(async () => {}) };
    const auditLogs: any = { record: jest.fn(async () => {}) };
    const configService: any = { get: jest.fn(() => '4') };

    const service = new PaymentsService(
      httpService,
      paymentsRepository,
      emailService,
      auditLogs,
      orderEvents,
      notifications,
      configService,
    );

    return {
      service,
      httpService,
      paymentsRepository,
      emailService,
      notifications,
      auditLogs,
    };
  }

  it('fetches live Paystack merchant balance in GHS', async () => {
    const { service } = createHarness();
    const res = await service.getPaystackBalance();
    expect(res.live).toBe(true);
    expect(res.currency).toBe('GHS');
    expect(res.available).toBe(2540);
  });

  it('adjusts seller wallet balance, creates ADJUSTMENT ledger entry, notifies, and audits', async () => {
    const { service, paymentsRepository, notifications, auditLogs } =
      createHarness();
    const res = await service.adjustVendorWallet(
      'seller-1',
      {
        type: 'CREDIT',
        bucket: 'available',
        amount: 75.5,
        reason: 'Promo bonus',
      },
      actor,
    );

    expect(res.success).toBe(true);
    expect(paymentsRepository.createLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        seller_id: 'seller-1',
        type: 'CREDIT',
        source_type: 'ADJUSTMENT',
      }),
    );
    expect(paymentsRepository.upsertVendorBalanceSnapshot).toHaveBeenCalled();
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'wallet.admin_adjust' }),
    );
  });

  it('releases pending escrow balance to available balance', async () => {
    const { service, paymentsRepository, auditLogs } = createHarness();
    const res = await service.releaseVendorPendingBalance(
      'seller-1',
      { amount: 100, reason: 'Buyer confirmed delivery via WhatsApp' },
      actor,
    );

    expect(res.success).toBe(true);
    expect(res.released_amount).toBe(100);
    expect(paymentsRepository.upsertVendorBalanceSnapshot).toHaveBeenCalled();
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'wallet.admin_release_pending' }),
    );
  });

  it('overrides seller bank details, syncs Paystack subaccount, and reverts on 4xx error', async () => {
    const { service, paymentsRepository, emailService } = createHarness();
    jest.spyOn(service, 'createSubaccount').mockResolvedValueOnce({
      ok: true,
      subaccount_code: 'ACCT_new_override',
      action: 'updated',
    });

    const okRes = await service.adminOverrideSellerBankAndSync(
      'seller-1',
      {
        bank_name: 'GCB Bank',
        bank_code: '040100',
        account_number: '1029384756',
        reason: 'Seller ticket #42',
      },
      actor,
    );
    expect(okRes.subaccount_code).toBe('ACCT_new_override');
    expect(
      emailService.sendPayoutDetailsChangedAlertEmail,
    ).toHaveBeenCalledTimes(1);

    // Rollback on 4xx rejection
    jest
      .spyOn(service, 'createSubaccount')
      .mockRejectedValueOnce(new BadRequestException('Invalid account'));
    paymentsRepository.updateSellerBankDetails.mockClear();

    await expect(
      service.adminOverrideSellerBankAndSync(
        'seller-1',
        {
          bank_name: 'GCB Bank',
          bank_code: '040100',
          account_number: '9999999999',
        },
        actor,
      ),
    ).rejects.toThrow(BadRequestException);

    expect(paymentsRepository.updateSellerBankDetails).toHaveBeenCalledTimes(2);
    expect(paymentsRepository.updateSellerBankDetails.mock.calls[1][1]).toEqual(
      {
        bank_name: 'MTN Mobile Money',
        bank_code: 'MTN',
        account_number: '0244111222',
      },
    );
  });

  it('reconciles a pending promotion payment to SUCCESS and activates product boost', async () => {
    const { service, paymentsRepository, auditLogs } = createHarness();
    const res = await service.reconcilePromotionPayment(
      'promo-1',
      'SUCCESS',
      'Verified',
      actor,
    );

    expect(res.success).toBe(true);
    expect(paymentsRepository.featureProductById).toHaveBeenCalledWith(
      'prod-1',
    );
    expect(auditLogs.record).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'promotion.admin_reconcile' }),
    );
  });
});
