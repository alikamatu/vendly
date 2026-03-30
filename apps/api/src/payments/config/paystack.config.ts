import { registerAs } from '@nestjs/config';

export default registerAs('paystack', () => {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const baseUrl = process.env.PAYSTACK_BASE_URL;

  if (!secretKey) {
    throw new Error(
      'PAYSTACK_SECRET_KEY is not defined. Please set it in your .env file.',
    );
  }

  if (!baseUrl) {
    throw new Error(
      'PAYSTACK_BASE_URL is not defined. Please set it in your .env file.',
    );
  }

  return {
    secretKey,
    baseUrl,
  };
});
