import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LoopsService } from './loops.service';

describe('LoopsService', () => {
  let service: LoopsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key: string) => {
      if (key === 'LOOPS_API_KEY') return 'test_loops_key_12345';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoopsService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<LoopsService>(LoopsService);
    configService = module.get<ConfigService>(ConfigService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.isConfigured()).toBe(true);
  });

  describe('unconfigured state', () => {
    it('should operate safely in mock mode if API key is not set', async () => {
      const unconfiguredModule: TestingModule = await Test.createTestingModule({
        providers: [
          LoopsService,
          {
            provide: ConfigService,
            useValue: { get: () => null },
          },
        ],
      }).compile();

      const unconfiguredService = unconfiguredModule.get<LoopsService>(LoopsService);
      expect(unconfiguredService.isConfigured()).toBe(false);

      const result = await unconfiguredService.createOrUpdateContact({
        email: 'test@example.com',
        firstName: 'Ama',
      });
      expect(result.success).toBe(true);

      const eventResult = await unconfiguredService.sendEvent('test@example.com', 'signup_completed');
      expect(eventResult.success).toBe(true);
    });
  });

  describe('createOrUpdateContact', () => {
    it('should return error if email is missing', async () => {
      const result = await service.createOrUpdateContact({ email: '' });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Email is required');
    });

    it('should successfully create a new contact', async () => {
      const globalFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ success: true, id: 'cnt_123' }),
        text: async () => JSON.stringify({ success: true }),
      } as any);

      const result = await service.createOrUpdateContact({
        email: 'seller@verndly.com',
        firstName: 'Kofi',
        lastName: 'Mensah',
        userGroup: 'Seller',
        source: 'Auth Registration',
        subscribed: true,
      });

      expect(result.success).toBe(true);
      expect(globalFetch).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetch.mock.calls[0];
      expect(url).toBe('https://app.loops.so/api/v1/contacts/create');
      expect(options?.method).toBe('POST');
      const body = JSON.parse(options?.body as string);
      expect(body.email).toBe('seller@verndly.com');
      expect(body.firstName).toBe('Kofi');
      expect(body.userGroup).toBe('Seller');
      expect(body.subscribed).toBe(true);
      globalFetch.mockRestore();
    });

    it('should fallback to update if contact already exists (409)', async () => {
      const globalFetch = jest
        .spyOn(global, 'fetch')
        // 1st call: POST /contacts/create returns 409
        .mockResolvedValueOnce({
          ok: false,
          status: 409,
          text: async () => 'Contact already exists',
        } as any)
        // 2nd call: PUT /contacts/update returns 200
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ success: true }),
          text: async () => '{"success":true}',
        } as any);

      const result = await service.createOrUpdateContact({
        email: 'existing@verndly.com',
        firstName: 'Abena',
        userGroup: 'Buyer',
      });

      expect(result.success).toBe(true);
      expect(globalFetch).toHaveBeenCalledTimes(2);
      expect(globalFetch.mock.calls[0][0]).toBe('https://app.loops.so/api/v1/contacts/create');
      expect(globalFetch.mock.calls[1][0]).toBe('https://app.loops.so/api/v1/contacts/update');
      expect(globalFetch.mock.calls[1][1]?.method).toBe('PUT');
      globalFetch.mockRestore();
    });
  });

  describe('sendEvent', () => {
    it('should dispatch an event to Loops', async () => {
      const globalFetch = jest.spyOn(global, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '{"success":true}',
      } as any);

      const result = await service.sendEvent('seller@verndly.com', 'signup_completed', {
        accountType: 'SELLER',
      });

      expect(result.success).toBe(true);
      expect(globalFetch).toHaveBeenCalledTimes(1);
      const [url, options] = globalFetch.mock.calls[0];
      expect(url).toBe('https://app.loops.so/api/v1/events/send');
      const body = JSON.parse(options?.body as string);
      expect(body.eventName).toBe('signup_completed');
      expect(body.eventProperties.accountType).toBe('SELLER');
      globalFetch.mockRestore();
    });
  });
});
