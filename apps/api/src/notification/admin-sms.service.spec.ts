import { BadRequestException } from '@nestjs/common';
import { normalizeGhanaSmsNumber } from '../auth/arkesel.client';
import { AdminSmsService, interpolateSmsTemplate } from './admin-sms.service';

describe('AdminSmsService & Ghana phone normalization', () => {
  describe('normalizeGhanaSmsNumber', () => {
    it('removes leading 0 from 10-digit Ghana numbers and prepends 233', () => {
      expect(normalizeGhanaSmsNumber('0244123456')).toBe('233244123456');
      expect(normalizeGhanaSmsNumber('055 987 6543')).toBe('233559876543');
      expect(normalizeGhanaSmsNumber('020-111-2233')).toBe('233201112233');
    });

    it('prepends 233 to 9-digit Ghana subscriber numbers', () => {
      expect(normalizeGhanaSmsNumber('244123456')).toBe('233244123456');
    });

    it('accepts already-formatted 233XXXXXXXXX and +233XXXXXXXXX numbers', () => {
      expect(normalizeGhanaSmsNumber('233244123456')).toBe('233244123456');
      expect(normalizeGhanaSmsNumber('+233244123456')).toBe('233244123456');
      expect(normalizeGhanaSmsNumber('00233244123456')).toBe('233244123456');
    });

    it('fixes common redundant 0 after 233 (2330XXXXXXXXX)', () => {
      expect(normalizeGhanaSmsNumber('2330244123456')).toBe('233244123456');
      expect(normalizeGhanaSmsNumber('+2330551234567')).toBe('233551234567');
    });

    it('rejects invalid or incomplete numbers', () => {
      expect(normalizeGhanaSmsNumber('')).toBeNull();
      expect(normalizeGhanaSmsNumber('024412')).toBeNull();
      expect(normalizeGhanaSmsNumber('0000000000')).toBeNull();
      expect(normalizeGhanaSmsNumber('+447911123456')).toBeNull();
    });
  });

  describe('interpolateSmsTemplate', () => {
    it('replaces {first_name}, {name}, and {store_name}', () => {
      const text = interpolateSmsTemplate(
        'Hi {first_name} ({name}), {store_name} is approved!',
        { name: 'Ama Osei', storeName: 'Ama Styles' },
      );
      expect(text).toBe('Hi Ama (Ama Osei), Ama Styles is approved!');
    });
  });

  describe('AdminSmsService.sendSms', () => {
    const adminActor = { id: 'admin-1', role: 'ADMIN' as any };

    it('normalizes user + manual numbers to 233XXXXXXXXX, deduplicates, personalizes, and logs audit', async () => {
      const sendSms = jest
        .fn()
        .mockResolvedValue({ sent: true, id: 'ark-123' });
      const recordAudit = jest.fn().mockResolvedValue(undefined);

      const prismaMock = {
        user: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 'u-1',
              full_name: 'Kwame Mensah',
              phone_e164: '0244123456',
              seller_profile: {
                store_name: 'Kwame Tech',
                whatsapp_number: null,
              },
              addresses: [],
            },
            {
              id: 'u-2',
              full_name: 'Esi Boateng',
              phone_e164: null,
              seller_profile: {
                store_name: 'Esi Beauty',
                whatsapp_number: '0551112233',
              },
              addresses: [],
            },
            {
              id: 'u-3',
              full_name: 'No Phone User',
              phone_e164: null,
              seller_profile: null,
              addresses: [],
            },
          ]),
        },
      };

      const smsMock = {
        sendSms,
        sendBulkSms: jest.fn(),
        getConfigStatus: () => ({
          configured: true,
          sandbox: false,
          senderId: 'Verndly',
          provider: 'arkesel',
        }),
      };

      const service = new AdminSmsService(
        prismaMock as never,
        smsMock as never,
        { record: recordAudit } as never,
      );

      const res = await service.sendSms(
        {
          message:
            'Hi {first_name}, your store {store_name} is approved on Verndly!',
          userIds: ['u-1', 'u-2', 'u-3'],
          // Duplicate of u-1 in +233 format + one new manual number + one invalid
          customNumbers: ['+233244123456', '0209998877', '12345'],
          templateId: 'seller_approved_create_store',
        },
        adminActor,
      );

      expect(res.sentCount).toBe(3);
      expect(res.failedCount).toBe(0);
      expect(res.invalidCount).toBe(2);

      // Deduplicated: u-1 + u-2 + 0209998877 = 3 unique sends
      expect(sendSms).toHaveBeenCalledTimes(3);
      expect(sendSms).toHaveBeenCalledWith(
        '233244123456',
        'Hi Kwame, your store Kwame Tech is approved on Verndly!',
        undefined,
      );
      expect(sendSms).toHaveBeenCalledWith(
        '233551112233',
        'Hi Esi, your store Esi Beauty is approved on Verndly!',
        undefined,
      );
      expect(sendSms).toHaveBeenCalledWith(
        '233209998877',
        'Hi Direct, your store your Verndly store is approved on Verndly!',
        undefined,
      );
      expect(recordAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'admin.sms_sent',
          entityType: 'sms_campaign',
          entityId: 'seller_approved_create_store',
        }),
      );
    });

    it('uses bulk dispatch for non-personalized multi-recipient sends', async () => {
      const sendBulkSms = jest.fn().mockResolvedValue({
        sent: true,
        recipients: ['233244123456', '233551112233'],
        ids: { '233244123456': 'id-1', '233551112233': 'id-2' },
      });

      const service = new AdminSmsService(
        { user: { findMany: jest.fn() } } as never,
        {
          sendSms: jest.fn(),
          sendBulkSms,
          getConfigStatus: () => ({
            configured: true,
            sandbox: false,
            senderId: 'Verndly',
            provider: 'arkesel',
          }),
        } as never,
        { record: jest.fn().mockResolvedValue(undefined) } as never,
      );

      const res = await service.sendSms(
        {
          message: 'Verndly marketplace update: check your dashboard today.',
          customNumbers: ['0244123456', '0551112233'],
        },
        adminActor,
      );

      expect(sendBulkSms).toHaveBeenCalledWith(
        ['233244123456', '233551112233'],
        'Verndly marketplace update: check your dashboard today.',
        undefined,
      );
      expect(res.sentCount).toBe(2);
    });

    it('throws BadRequestException when no valid recipients remain', async () => {
      const service = new AdminSmsService(
        { user: { findMany: jest.fn() } } as never,
        {
          getConfigStatus: () => ({
            configured: true,
            sandbox: false,
            senderId: 'Verndly',
            provider: 'arkesel',
          }),
        } as never,
        { record: jest.fn() } as never,
      );

      await expect(
        service.sendSms(
          { message: 'Hello', customNumbers: ['123', 'invalid'] },
          adminActor,
        ),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
