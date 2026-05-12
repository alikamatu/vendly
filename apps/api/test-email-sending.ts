import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { EmailService } from './src/email/email.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const emailService = app.get(EmailService);

  const testEmail = 'osamaalikamatu14@gmail.com'; // Adjust to a recipient you can check or the buyer's email
  console.log(`Attempting to send test email to ${testEmail}...`);

  try {
    const result = await emailService.sendWelcomeEmail(testEmail, 'Test User');
    console.log('Test email sent successfully!', result);
  } catch (error) {
    console.error('Failed to send test email:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
