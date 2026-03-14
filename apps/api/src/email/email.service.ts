import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private resend: Resend;

  constructor(private configService: ConfigService) {
    this.resend = new Resend(this.configService.get('RESEND_API_KEY'));
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
        html: `<p>Click <a href="${url}">here</a> to verify your email.</p>`,
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
        html: `<p>Click <a href="${url}">here</a> to reset your password. This link expires in 1 hour.</p>`,
      });
      console.log('Password reset email sent:', response);
      return response;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      throw error;
    }
  }
}
