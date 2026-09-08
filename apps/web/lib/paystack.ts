'use client';

declare global {
  interface Window {
    PaystackPop?: {
      setup: (options: any) => {
        openIframe: () => void;
      };
    };
  }
}

let scriptPromise: Promise<boolean> | null = null;

export function loadPaystackScript(): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.PaystackPop) return Promise.resolve(true);

  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const existingScript = document.getElementById('paystack-inline-script');
      if (existingScript) {
        existingScript.addEventListener('load', () => resolve(true));
        existingScript.addEventListener('error', () => resolve(false));
        return;
      }

      const script = document.createElement('script');
      script.id = 'paystack-inline-script';
      script.src = 'https://js.paystack.co/v1/inline.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        console.error('Failed to load Paystack inline JS SDK');
        resolve(false);
      };
      document.body.appendChild(script);
    });
  }

  return scriptPromise;
}

export interface PaystackCheckoutOptions {
  email: string;
  amount: number; // In main currency units (e.g. 50.00 GHS)
  reference?: string;
  accessCode?: string | null;
  currency?: string;
  authorizationUrl?: string | null;
  onSuccess: (response: { reference: string; trxref?: string; status?: string }) => void;
  onClose?: () => void;
}

export function isValidEmail(email?: string | null): boolean {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

export function sanitizeEmail(email?: string | null, fallback = 'customer@verndly.com'): string {
  if (isValidEmail(email)) {
    return email!.trim().toLowerCase();
  }
  return fallback;
}

export async function launchPaystackInline(
  options: PaystackCheckoutOptions,
): Promise<{ opened: boolean; fallbackUrl?: string }> {
  const publicKey =
    process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY ||
    'pk_test_332ee4ff24ecbf85cfa548c048803adcf6731d0a';

  const loaded = await loadPaystackScript();

  if (!loaded || !window.PaystackPop) {
    if (options.authorizationUrl) {
      window.location.href = options.authorizationUrl;
      return { opened: false, fallbackUrl: options.authorizationUrl };
    }
    throw new Error('Paystack could not be loaded. Please check your internet connection.');
  }

  try {
    const safeEmail = sanitizeEmail(options.email);

    const handlerConfig: any = {
      key: publicKey,
      email: safeEmail,
      amount: Math.round(Number(options.amount || 0) * 100),
      ref: options.reference,
      currency: options.currency || 'GHS',
      callback: (res: any) => {
        options.onSuccess({
          reference: res.reference || res.trxref || options.reference || '',
          trxref: res.trxref || res.reference,
          status: res.status || 'success',
        });
      },
      onClose: () => {
        if (options.onClose) {
          options.onClose();
        }
      },
    };

    if (options.accessCode) {
      handlerConfig.access_code = options.accessCode;
    }

    const handler = window.PaystackPop.setup(handlerConfig);
    handler.openIframe();
    return { opened: true };
  } catch (err) {
    console.error('Error opening Paystack iframe popup:', err);
    if (options.authorizationUrl) {
      window.location.href = options.authorizationUrl;
      return { opened: false, fallbackUrl: options.authorizationUrl };
    }
    throw err;
  }
}
