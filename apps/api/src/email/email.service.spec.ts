import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EmailService } from './email.service';
import { Resend } from 'resend';

jest.mock('resend', () => {
  return {
    Resend: jest.fn().mockImplementation(() => {
      return {
        emails: {
          send: jest.fn().mockResolvedValue({ id: 'test-id' }),
        },
      };
    }),
  };
});

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'RESEND_API_KEY') return 'test-key';
              if (key === 'FRONTEND_URL') return 'http://localhost:3000';
              if (key === 'RESEND_FROM_EMAIL') return 'test@vendly.com';
              return null;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should send welcome email', async () => {
    const response = await service.sendWelcomeEmail(
      'test@example.com',
      'John Doe',
    );
    expect(response).toBeDefined();
    if (response && 'data' in response && response.data) {
      expect(response.data.id).toBe('test-id');
    }
  });

  it('should send verification email', async () => {
    const response = await service.sendVerificationEmail(
      'test@example.com',
      'token123',
    );
    expect(response).toBeDefined();
    if (response && 'data' in response && response.data) {
      expect(response.data.id).toBe('test-id');
    }
  });

  it('should send password reset email', async () => {
    const response = await service.sendPasswordResetEmail(
      'test@example.com',
      'token123',
    );
    expect(response).toBeDefined();
    if (response && 'data' in response && response.data) {
      expect(response.data.id).toBe('test-id');
    }
  });
});
