import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';
import {
  getVerificationEmail,
  getPasswordResetEmail,
  getWelcomeEmail,
  getOrderConfirmationEmail,
  getSellerOrderAlertEmail,
} from './email-templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
  }

  async sendWelcomeEmail(to: string, name: string) {
    try {
      const response = await this.resend.emails.send({
        from:
          this.configService.get('RESEND_FROM_EMAIL') ||
          'onboarding@resend.dev',
        to,
        subject: 'Welcome to Vendly!',
        html: getWelcomeEmail(name),
      });
      console.log('Welcome email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      throw error;
    }
  }

  async sendVerificationEmail(to: string, token: string) {
    const url = `${this.configService.get('FRONTEND_URL')}/verify-email?token=${token}`;
    try {
      const response = await this.resend.emails.send({
        from:
          this.configService.get('RESEND_FROM_EMAIL') ||
          'onboarding@resend.dev',
        to,
        subject: 'Verify your email',
        html: getVerificationEmail(url),
      });
      console.log('Verification email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      throw error;
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const url = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;
    try {
      const response = await this.resend.emails.send({
        from:
          this.configService.get('RESEND_FROM_EMAIL') ||
          'onboarding@resend.dev',
        to,
        subject: 'Reset your password',
        html: getPasswordResetEmail(url),
      });
      console.log('Password reset email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }

  async sendOrderConfirmation(to: string, orderData: any) {
    const from = this.configService.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    try {
      const response = await this.resend.emails.send({
        from,
        to,
        subject: `Order Confirmation #${orderData.orderNumber}`,
        html: getOrderConfirmationEmail(orderData),
      });
      
      if (response.error) {
        this.logger.error(`Resend API Error (Order Confirmation to ${to}):`, response.error);
        
        // Fallback attempt if custom domain fails
        if (from !== 'onboarding@resend.dev') {
           this.logger.log('Attempting fallback to onboarding@resend.dev...');
           return this.resend.emails.send({
             from: 'onboarding@resend.dev',
             to,
             subject: `Order Confirmation #${orderData.orderNumber}`,
             html: getOrderConfirmationEmail(orderData),
           });
        }
      }
      
      console.log('Order confirmation email response:', response);
      return response;
    } catch (error) {
      console.error('Failed to send order confirmation email:', error);
      throw error;
    }
  }

  async sendSellerOrderNotification(to: string, orderData: any) {
    const from = this.configService.get('RESEND_FROM_EMAIL') || 'onboarding@resend.dev';
    try {
      const response = await this.resend.emails.send({
        from,
        to,
        subject: `New Order Received - #${orderData.orderNumber}`,
        html: getSellerOrderAlertEmail(orderData),
      });

      if (response.error) {
        this.logger.error(`Resend API Error (Seller Notification to ${to}):`, response.error);
        
        // Fallback attempt
        if (from !== 'onboarding@resend.dev') {
           this.logger.log('Attempting fallback to onboarding@resend.dev...');
           return this.resend.emails.send({
             from: 'onboarding@resend.dev',
             to,
             subject: `New Order Received - #${orderData.orderNumber}`,
             html: getSellerOrderAlertEmail(orderData),
           });
        }
      }

      console.log('Seller order notification email response:', response);
      return response;
    } catch (error) {
      console.error('Failed to send seller order notification email:', error);
      throw error;
    }
  }
}
