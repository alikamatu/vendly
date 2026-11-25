import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailService } from './email/email.service';
import { LoopsService } from './loops/loops.service';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: EmailService,
          useValue: {
            getStatus: jest.fn(() => ({
              provider: 'resend',
              configured: true,
              apiKeyPrefix: 're_tes…',
              fromAddress: 'Verndly <noreply@verndly.com>',
              replyTo: 'support@verndly.com',
              frontendUrl: 'https://verndly.com',
              nodeEnv: 'test',
              lastDelivery: null,
            })),
          },
        },
        {
          provide: LoopsService,
          useValue: {
            isConfigured: jest.fn(() => false),
          },
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
