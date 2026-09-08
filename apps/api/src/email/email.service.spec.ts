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
              if (key === 'RESEND_FROM_EMAIL') return 'test@verndly.com';
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

  it('should send order confirmation email with items, images, and details', async () => {
    const response = await service.sendOrderConfirmation('buyer@example.com', {
      orderNumber: 'ORD-123456',
      date: new Date(),
      customerName: 'Ama Serwaa',
      customerPhone: '+233241234567',
      deliveryMethod: 'DELIVERY',
      deliveryLocation: 'East Legon, Accra',
      deliveryNotes: 'Leave at gate',
      storeName: 'Adom Boutique',
      storeLink: 'adom-boutique',
      items: [
        {
          title: 'Handmade Kente Tote',
          quantity: 2,
          price: '150.00',
          image_url: 'https://example.com/kente.png',
          variantDescription: 'Size: M • Color: Gold',
        },
      ],
      subtotal: '300.00',
      shipping: '25.00',
      total: '325.00',
      currency: 'GHS',
      paymentMethod: 'Cash on Delivery',
      isPaid: false,
    });
    expect(response).toBeDefined();
  });

  it('should send seller new sale alert email with items and WhatsApp quick action', async () => {
    const response = await service.sendSellerOrderNotification('seller@example.com', {
      orderNumber: 'ORD-123456',
      date: new Date(),
      customerName: 'Ama Serwaa',
      customerPhone: '+233241234567',
      deliveryMethod: 'DELIVERY',
      deliveryLocation: 'East Legon, Accra',
      storeName: 'Adom Boutique',
      items: [
        {
          title: 'Handmade Kente Tote',
          quantity: 2,
          price: '150.00',
          image_url: 'https://example.com/kente.png',
        },
      ],
      subtotal: '300.00',
      total: '300.00',
      currency: 'GHS',
    });
    expect(response).toBeDefined();
  });

  it('should send buyer order status update email for each status', async () => {
    const statuses = ['CONFIRMED', 'PROCESSING', 'ON THE WAY', 'DELIVERED', 'CANCELLED'];
    for (const status of statuses) {
      const response = await service.sendOrderStatusUpdate('buyer@example.com', {
        orderNumber: 'ORD-123456',
        customerName: 'Ama Serwaa',
        storeName: 'Adom Boutique',
        status,
        total: '325.00',
        currency: 'GHS',
        items: [
          {
            title: 'Handmade Kente Tote',
            quantity: 2,
            price: '150.00',
            image_url: 'https://example.com/kente.png',
          },
        ],
        reason: status === 'CANCELLED' ? 'Requested by buyer' : null,
      });
      expect(response).toBeDefined();
    }
  });

  it('should send seller order status notification when cancelled', async () => {
    const response = await service.sendSellerOrderStatusNotification('seller@example.com', {
      orderNumber: 'ORD-123456',
      customerName: 'Ama Serwaa',
      storeName: 'Adom Boutique',
      status: 'CANCELLED',
      total: '300.00',
      currency: 'GHS',
      reason: 'Change of mind',
      cancelledBy: 'buyer',
    });
    expect(response).toBeDefined();
  });
});
