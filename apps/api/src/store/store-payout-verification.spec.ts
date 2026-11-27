import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { StoreService } from './store.service';
import { OnboardingService } from '../onboarding/onboarding.service';
import { PaymentTimingEnum } from '../onboarding/dto/complete-payment.dto';

describe('Payout Security Lock, Verification Flow & Onboarding Subaccount Sync', () => {
  const createCacheMock = () => {
    const store = new Map<string, any>();
    return {
      get: jest.fn(async (key: string) => store.get(key)),
      set: jest.fn(async (key: string, val: any) => {
        store.set(key, val);
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key);
      }),
      _store: store,
    };
  };

  function createStoreServiceHarness(overrides?: {
    seller?: Partial<any>;
    createSubaccountImpl?: jest.Mock;
    resolveBankAccountImpl?: jest.Mock;
  }) {
    const seller = {
      id: 'seller-1',
      user_id: 'user-1',
      store_name: 'Kofi Tech',
      store_link: 'kofi-tech',
      bank_name: 'MTN Mobile Money',
      bank_code: 'MTN',
      account_number: '0244111222',
      paystack_subaccount_code: 'ACCT_existing123',
      ...overrides?.seller,
    };

    const user = {
      id: 'user-1',
      email: 'kofi@verndly.com',
      full_name: 'Kofi Mensah',
      totp_enabled: false,
      totp_secret: null,
      seller_profile: seller,
    };

    const prisma: any = {
      sellerProfile: {
        findUnique: jest.fn(async () => ({ ...seller })),
        update: jest.fn(async ({ data }: any) => ({ ...seller, ...data })),
      },
      user: {
        findUnique: jest.fn(async () => ({
          ...user,
          seller_profile: { ...seller },
        })),
      },
    };

    const cloudinary: any = { uploadImage: jest.fn() };
    const paymentsService: any = {
      createSubaccount:
        overrides?.createSubaccountImpl ||
        jest.fn(async () => ({
          ok: true,
          subaccount_code: 'ACCT_updated999',
          action: 'updated',
        })),
      resolveBankAccount:
        overrides?.resolveBankAccountImpl ||
        jest.fn(async () => ({
          verified: true,
          account_name: 'KOFI MENSAH',
        })),
    };
    const emailService: any = {
      sendPayoutChangeOtpEmail: jest.fn(async () => {}),
      sendPayoutDetailsChangedAlertEmail: jest.fn(async () => {}),
    };
    const notificationService: any = {
      create: jest.fn(async () => {}),
    };
    const auditLogService: any = {
      record: jest.fn(async () => {}),
    };
    const cache = createCacheMock();

    const service = new StoreService(
      prisma,
      cloudinary,
      paymentsService,
      emailService,
      notificationService,
      auditLogService,
      cache as any,
    );

    return {
      service,
      prisma,
      paymentsService,
      emailService,
      notificationService,
      auditLogService,
      cache,
    };
  }

  it('hard-blocks altering existing bank/MoMo payout details through generic PATCH /stores', async () => {
    const { service, prisma } = createStoreServiceHarness();

    await expect(
      service.updateStore('user-1', {
        bank_code: 'VOD',
        account_number: '0209998888',
      }),
    ).rejects.toThrow(ForbiddenException);

    expect(prisma.sellerProfile.update).not.toHaveBeenCalled();
  });

  it('allows updating non-payout store fields when bank fields are omitted or unchanged', async () => {
    const { service, prisma } = createStoreServiceHarness();

    const res = await service.updateStore('user-1', {
      bio: 'Updated storefront bio',
      bank_code: 'MTN',
      account_number: '0244111222',
    });

    expect(prisma.sellerProfile.update).toHaveBeenCalledTimes(1);
    expect(res.store.bio).toBe('Updated storefront bio');
  });

  it('completes 2-step Email OTP payout change, syncs Paystack subaccount, audits, and sends security alert', async () => {
    const {
      service,
      prisma,
      paymentsService,
      emailService,
      notificationService,
      auditLogService,
    } = createStoreServiceHarness();

    // Step 1: Request OTP
    const reqRes = await service.requestPayoutChangeVerification('user-1', {
      bank_name: 'GCB Bank',
      bank_code: '040100',
      account_number: '1029384756',
    });

    expect(reqRes.sent).toBe(true);
    expect(reqRes.resolved_account_name).toBe('KOFI MENSAH');
    expect(emailService.sendPayoutChangeOtpEmail).toHaveBeenCalledTimes(1);

    const sentCode: string =
      emailService.sendPayoutChangeOtpEmail.mock.calls[0][0].code;
    expect(sentCode).toMatch(/^\d{6}$/);

    // Wrong code must be rejected with ForbiddenException
    await expect(
      service.confirmPayoutDetailsChange('user-1', {
        code: sentCode === '000000' ? '111111' : '000000',
        method: 'EMAIL_OTP',
      }),
    ).rejects.toThrow(ForbiddenException);

    // Valid code succeeds, syncs subaccount, audits, and alerts
    const confirmRes = await service.confirmPayoutDetailsChange('user-1', {
      code: sentCode,
      method: 'EMAIL_OTP',
    });

    expect(confirmRes.bank_code).toBe('040100');
    expect(confirmRes.account_number).toBe('1029384756');
    expect(confirmRes.subaccount_status).toBe('ACTIVE');
    expect(confirmRes.paystack_subaccount_code).toBe('ACCT_updated999');
    expect(paymentsService.createSubaccount).toHaveBeenCalledWith('seller-1', {
      forceUpdate: true,
      throwOnError: true,
    });
    expect(auditLogService.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'store.payout_details_changed',
        entityId: 'seller-1',
      }),
    );
    expect(notificationService.create).toHaveBeenCalledTimes(1);
    expect(
      emailService.sendPayoutDetailsChangedAlertEmail,
    ).toHaveBeenCalledTimes(1);
    expect(prisma.sellerProfile.update).toHaveBeenCalledTimes(1);
  });

  it('reverts DB payout details if Paystack rejects the new bank account with a 4xx BadRequestException', async () => {
    const { service, prisma } = createStoreServiceHarness({
      createSubaccountImpl: jest.fn(async () => {
        throw new BadRequestException(
          'Paystack rejected bank account: Invalid account number',
        );
      }),
    });

    await service.requestPayoutChangeVerification('user-1', {
      bank_name: 'GCB Bank',
      bank_code: '040100',
      account_number: '9999999999',
    });

    const sentCode: string = (service as any).emailService
      .sendPayoutChangeOtpEmail.mock.calls[0][0].code;

    await expect(
      service.confirmPayoutDetailsChange('user-1', {
        code: sentCode,
        method: 'EMAIL_OTP',
      }),
    ).rejects.toThrow(BadRequestException);

    // 1st update sets new values, 2nd update rolls back to original MTN 0244111222
    expect(prisma.sellerProfile.update).toHaveBeenCalledTimes(2);
    expect(prisma.sellerProfile.update.mock.calls[1][0].data).toEqual({
      bank_name: 'MTN Mobile Money',
      bank_code: 'MTN',
      account_number: '0244111222',
    });
  });

  it('OnboardingService.completePayment synchronously creates Paystack subaccount and rolls back on Paystack 4xx', async () => {
    const prisma: any = {
      sellerProfile: {
        findUnique: jest.fn(async () => ({
          id: 'seller-2',
          user_id: 'user-2',
          store_name: 'New Shop',
          onboarding_completed: false,
          bank_name: null,
          bank_code: null,
          account_number: null,
        })),
        update: jest.fn(async ({ data }: any) => ({
          id: 'seller-2',
          user_id: 'user-2',
          ...data,
        })),
      },
    };

    const paymentsService: any = {
      createSubaccount: jest.fn(async () => ({
        ok: true,
        subaccount_code: 'ACCT_onboarded_1',
        action: 'created',
      })),
    };

    const onboardingService = new OnboardingService(prisma, paymentsService);

    const res = await onboardingService.completePayment('user-2', {
      accepted_payment_methods: ['mobile_money'],
      payment_timing: PaymentTimingEnum.BOTH,
      bank_name: 'MTN Mobile Money',
      bank_code: 'MTN',
      account_number: '0244555666',
    });

    expect(res.subaccount_status).toBe('ACTIVE');
    expect(res.subaccount_code).toBe('ACCT_onboarded_1');
    expect(paymentsService.createSubaccount).toHaveBeenCalledWith('seller-2', {
      forceUpdate: true,
      throwOnError: true,
    });

    // Now test Paystack 4xx rollback during onboarding
    paymentsService.createSubaccount.mockRejectedValueOnce(
      new BadRequestException('Invalid settlement bank'),
    );
    prisma.sellerProfile.update.mockClear();

    await expect(
      onboardingService.completePayment('user-2', {
        accepted_payment_methods: ['bank_transfer'],
        payment_timing: PaymentTimingEnum.UPFRONT_ONLY,
        bank_name: 'GCB Bank',
        bank_code: '040100',
        account_number: '1112223334',
      }),
    ).rejects.toThrow(BadRequestException);

    // Must have reverted bank fields (payment_setup_completed was never flipped to true)
    expect(prisma.sellerProfile.update).toHaveBeenCalledTimes(2);
    expect(prisma.sellerProfile.update.mock.calls[1][0].data).toEqual({
      bank_name: null,
      bank_code: null,
      account_number: null,
    });
  });
});
