'use client';

import React, { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Store,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';
import Header from '@/components/layout/Header';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import Alert from '@/components/ui/Alert';
import { useCart } from '@/lib/contexts/cart-context';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import { orderApi } from '@/lib/api/order';
import { addressApi, Address } from '@/lib/api/address';
import { launchPaystackInline } from '@/lib/paystack';
import PaymentProcessingModal from '@/components/orders/PaymentProcessingModal';
import { sanitizePhoneNumber, validatePhoneNumber } from '@/lib/utils/phone';
import clsx from '@/utils/clsx';

// ─── Input sanitizers ────────────────────────────────────────────────────────

const sanitizeName = (raw: string) =>
  raw
    .replace(/[^\p{L}\s'\-]/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, 60);

const sanitizeFreeText = (raw: string, max = 200) => raw.replace(/[ -  ]/g, '').slice(0, max);

const validateName = (v: string) => (v.trim().length < 2 ? 'Please enter your full name' : null);
const validatePhone = (v: string) => validatePhoneNumber(v);
const validateLocation = (v: string) =>
  v.trim().length < 3 ? 'Please enter a delivery / pickup location' : null;

export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const storeLink = searchParams.get('store');
  const { groupedByVendor, removeItem } = useCart();
  const { token, user } = useAuth();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoadingStore, setIsLoadingStore] = useState(false);
  const [paymentTiming, setPaymentTiming] = useState('BOTH');
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    deliveryMethod: 'PICKUP',
    deliveryLocation: 'Store Pickup',
    deliveryNotes: '',
    paymentMethod: 'PAYSTACK',
  });

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | 'new'>('new');

  const [paymentModalState, setPaymentModalState] = useState<
    'verifying' | 'success' | 'failed' | null
  >(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string>('');
  const [paymentOrderNumber, setPaymentOrderNumber] = useState<string>('');
  const [paymentOrderTotal, setPaymentOrderTotal] = useState<number | string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>('');

  const group = useMemo(
    () => groupedByVendor.find((vendor) => vendor.storeLink === storeLink),
    [groupedByVendor, storeLink],
  );

  useEffect(() => {
    const loadStore = async () => {
      if (!storeLink) return;
      setIsLoadingStore(true);
      try {
        const store = await storeApi.getStoreBySlug(storeLink);
        const timing = store.payment_timing || 'BOTH';
        setPaymentTiming(timing);
        setFormData((prev) => ({
          ...prev,
          paymentMethod:
            timing === 'UPFRONT_ONLY'
              ? 'PAYSTACK'
              : timing === 'DELIVERY_ONLY'
                ? 'CASH_ON_DELIVERY'
                : prev.paymentMethod,
        }));
      } catch (err: any) {
        setError(err.message || 'Failed to load store payment setup');
      } finally {
        setIsLoadingStore(false);
      }
    };
    loadStore();
  }, [storeLink]);

  const handleAddressSelect = React.useCallback(
    (id: string | 'new', addressesList = savedAddresses) => {
      setSelectedAddressId(id);
      if (id === 'new') {
        setFormData((prev) => ({
          ...prev,
          customerName: user?.full_name || '',
          customerPhone: sanitizePhoneNumber(user?.phone_e164 || ''),
          deliveryLocation: '',
        }));
      } else {
        const addr = addressesList.find((a) => a.id === id);
        if (addr) {
          setFormData((prev) => ({
            ...prev,
            customerName: addr.name,
            customerPhone: sanitizePhoneNumber(addr.phone),
            deliveryLocation: `${addr.street}, ${addr.city}${
              addr.region ? `, ${addr.region}` : ''
            }`,
          }));
        }
      }
    },
    [savedAddresses, user],
  );

  useEffect(() => {
    const loadAddresses = async () => {
      if (!token) return;
      try {
        const addresses = await addressApi.getAddresses(token);
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
          handleAddressSelect(defaultAddr.id, addresses);
        } else if (user?.full_name) {
          setFormData((prev) => ({
            ...prev,
            customerName: user.full_name || '',
            customerPhone: sanitizePhoneNumber(user.phone_e164 || ''),
          }));
        }
      } catch (err) {
        console.error('Failed to load addresses', err);
      }
    };
    loadAddresses();
  }, [token, user, handleAddressSelect]);

  const fieldErrors = {
    customerName: validateName(formData.customerName),
    customerPhone: validatePhone(formData.customerPhone),
    deliveryLocation: validateLocation(formData.deliveryLocation),
  };
  const formValid =
    !fieldErrors.customerName && !fieldErrors.customerPhone && !fieldErrors.deliveryLocation;

  const submitOrder = async () => {
    if (!token || !group) return;
    if (!formValid) {
      setError(
        fieldErrors.customerName ||
          fieldErrors.customerPhone ||
          fieldErrors.deliveryLocation ||
          'Please complete all required fields.',
      );
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const orderPayload = {
        customerName: formData.customerName.trim(),
        customerPhone: formData.customerPhone.trim(),
        deliveryMethod: formData.deliveryMethod,
        deliveryLocation: formData.deliveryLocation.trim(),
        deliveryNotes: formData.deliveryNotes.trim() ? formData.deliveryNotes.trim() : undefined,
        paymentMethod: formData.paymentMethod,
      };

      const result = await orderApi.createOrder(
        token,
        group.storeLink,
        group.items.map((i) => ({
          productId: i.productId,
          variantId: i.variantId ?? null,
          quantity: i.quantity,
        })),
        orderPayload,
      );

      group.items.forEach((item) => {
        const key = item.variantId ? `${item.productId}::${item.variantId}` : item.productId;
        removeItem(key);
      });

      const orderId = result.orderId || result.id;
      const orderTotal = Number(result.total ?? result.total_amount ?? subtotal);
      const orderNumber = (orderId ? orderId.slice(-8) : '').toUpperCase();
      const reference = result.reference;

      if (result.authorization_url || result.access_code) {
        setPaymentOrderId(orderId);
        setPaymentOrderNumber(orderNumber);
        setPaymentOrderTotal(orderTotal);
        setPaymentReference(reference || '');
        const checkoutEmail =
          user?.email && user.email.includes('@') ? user.email : 'customer@verndly.com';

        await launchPaystackInline({
          email: checkoutEmail,
          amount: orderTotal,
          reference: reference,
          accessCode: result.access_code,
          authorizationUrl: result.authorization_url,
          onSuccess: async (res) => {
            setPaymentModalState('verifying');
            try {
              await orderApi.verifyOrderPayment(token, res.reference, orderId);
              setPaymentModalState('success');
            } catch (verifyErr: any) {
              setPaymentErrorMessage(verifyErr.message || 'Payment verification failed');
              setPaymentModalState('failed');
            }
          },
          onClose: () => {
            router.push(`/orders/${orderId}`);
          },
        });
        return;
      }

      router.push(`/orders/${orderId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!group || !storeLink) {
    return (
      <div className="bg-background text-foreground min-h-screen">
        <Header />
        <main className="mx-auto max-w-2xl px-4 pb-20 pt-16">
          <div className="bg-surface/40 space-y-4 rounded-2xl p-8">
            <h2 className="text-base font-semibold">Store group not found in cart.</h2>
            <p className="text-muted-foreground text-xs">
              The products you selected may have already been checked out or removed.
            </p>
            <Link href="/cart">
              <Button variant="secondary" size="sm">
                Back to Cart
              </Button>
            </Link>
          </div>
        </main>
      </div>
    );
  }

  const subtotal = group.totalPrice;

  return (
    <div className="bg-background text-foreground min-h-screen">
      <Header />

      <main className="mx-auto max-w-3xl space-y-6 px-4 pb-28 pt-8 sm:px-6">
        {/* Navigation Breadcrumb */}
        <Link
          href="/cart"
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-2 text-xs transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Cart
        </Link>

        {/* Page Header */}
        <div className="flex flex-wrap items-end justify-between gap-2 pb-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Checkout</h1>
            <p className="text-muted-foreground mt-1 text-xs">
              Store: <span className="text-foreground font-semibold">{group.storeName}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold">Protected Checkout</span>
          </div>
        </div>

        {error && (
          <Alert
            variant="error"
            title="Checkout Error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        {/* Main Content Form (Borderless & Shadowless) */}
        <div className="space-y-6">
          {/* Order Summary Strip */}
          <div className="bg-surface/40 space-y-3 rounded-2xl p-5">
            <div className="text-muted-foreground flex items-center justify-between text-xs font-semibold uppercase tracking-wider">
              <span>Items ({group.items.length})</span>
              <span>Subtotal</span>
            </div>
            <div className="divide-border/40 divide-y">
              {group.items.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center justify-between gap-3 py-2.5 text-xs"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={item.imageUrl || '/placeholder-product.png'}
                      alt=""
                      className="bg-surface h-10 w-10 shrink-0 rounded-xl object-cover"
                    />
                    <div className="min-w-0">
                      <p className="text-foreground truncate font-medium">{item.title}</p>
                      <p className="text-muted-foreground text-[11px]">Qty: {item.quantity}</p>
                    </div>
                  </div>
                  <span className="text-foreground shrink-0 font-semibold">
                    GH₵ {(Number(item.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1. Order Type Selection */}
          <div className="bg-surface/40 space-y-4 rounded-2xl p-5">
            <div>
              <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                1. Delivery Method
              </h2>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryMethod: 'PICKUP',
                    deliveryLocation: 'Store Pickup',
                  }))
                }
                className={clsx(
                  'flex items-start gap-3 rounded-2xl p-4 text-left transition-all',
                  formData.deliveryMethod === 'PICKUP'
                    ? 'bg-foreground/[0.08] text-foreground'
                    : 'bg-surface/40 hover:bg-surface/70 text-muted-foreground',
                )}
              >
                <div
                  className={clsx(
                    'shrink-0 rounded-xl p-2.5',
                    formData.deliveryMethod === 'PICKUP'
                      ? 'bg-foreground text-background'
                      : 'bg-surface text-muted-foreground',
                  )}
                >
                  <Store className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold">Store Pickup</span>
                    {formData.deliveryMethod === 'PICKUP' && (
                      <CheckCircle2 className="text-foreground h-4 w-4" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Collect directly from the seller premises
                  </p>
                  <span className="mt-1 block text-[10px] font-semibold text-emerald-600">
                    Free
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    deliveryMethod: 'DELIVERY',
                    deliveryLocation: '',
                  }));
                  if (savedAddresses.length > 0 && selectedAddressId !== 'new') {
                    handleAddressSelect(selectedAddressId);
                  }
                }}
                className={clsx(
                  'flex items-start gap-3 rounded-2xl p-4 text-left transition-all',
                  formData.deliveryMethod === 'DELIVERY'
                    ? 'bg-foreground/[0.08] text-foreground'
                    : 'bg-surface/40 hover:bg-surface/70 text-muted-foreground',
                )}
              >
                <div
                  className={clsx(
                    'shrink-0 rounded-xl p-2.5',
                    formData.deliveryMethod === 'DELIVERY'
                      ? 'bg-foreground text-background'
                      : 'bg-surface text-muted-foreground',
                  )}
                >
                  <Truck className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold">Courier Delivery</span>
                    {formData.deliveryMethod === 'DELIVERY' && (
                      <CheckCircle2 className="text-foreground h-4 w-4" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Dispatched directly to your address
                  </p>
                  <span className="mt-1 block text-[10px] font-semibold text-emerald-600">
                    Included
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 2. Contact & Address Details */}
          <div className="bg-surface/40 space-y-4 rounded-2xl p-5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              2. Contact &amp; Location
            </h2>

            {/* Address Switcher for Delivery */}
            {formData.deliveryMethod === 'DELIVERY' && savedAddresses.length > 0 && (
              <div className="space-y-2">
                <label className="text-muted-foreground text-xs font-medium">
                  Select Delivery Address
                </label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {savedAddresses.map((addr) => (
                    <button
                      key={addr.id}
                      type="button"
                      onClick={() => handleAddressSelect(addr.id)}
                      className={clsx(
                        'rounded-xl p-3.5 text-left text-xs transition-all',
                        selectedAddressId === addr.id
                          ? 'bg-foreground/[0.08] text-foreground font-semibold'
                          : 'bg-surface/30 text-muted-foreground hover:bg-surface/60',
                      )}
                    >
                      <p className="text-foreground font-semibold">
                        {addr.label ? `${addr.label} · ` : ''}
                        {addr.name}
                      </p>
                      <p className="text-muted-foreground mt-0.5 truncate text-[11px]">
                        {addr.street}, {addr.city}
                      </p>
                      <p className="text-muted-foreground mt-0.5 text-[10px]">{addr.phone}</p>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => handleAddressSelect('new')}
                    className={clsx(
                      'flex items-center justify-center rounded-xl p-3.5 text-left text-xs transition-all',
                      selectedAddressId === 'new'
                        ? 'bg-foreground/[0.08] text-foreground font-semibold'
                        : 'bg-surface/30 text-muted-foreground hover:bg-surface/60',
                    )}
                  >
                    + Enter new address
                  </button>
                </div>
              </div>
            )}

            {/* Inputs using Custom Components */}
            <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
              <Input
                label="Full Name"
                placeholder="e.g. Ama Mensah"
                value={formData.customerName}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerName: sanitizeName(e.target.value),
                  }))
                }
                error={formData.customerName ? fieldErrors.customerName || undefined : undefined}
                required
              />

              <Input
                label="Phone Number (Mobile Money / SMS)"
                labelRight={
                  <span
                    className={clsx(
                      'font-mono text-[10px] font-medium tracking-wide',
                      formData.customerPhone.length === 10
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : 'text-muted-foreground',
                    )}
                  >
                    {formData.customerPhone.length}/10 digits
                  </span>
                }
                placeholder="e.g. 0244123456"
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={formData.customerPhone}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerPhone: sanitizePhoneNumber(e.target.value),
                  }))
                }
                error={formData.customerPhone ? fieldErrors.customerPhone || undefined : undefined}
                hint="Used for rider updates and payment SMS (strictly 10 digits)"
                required
              />
            </div>

            {formData.deliveryMethod === 'DELIVERY' && selectedAddressId === 'new' && (
              <Input
                label="Delivery Address / Landmark"
                placeholder="e.g. Room 4B, Pentagon Hall, Legon"
                value={formData.deliveryLocation}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    deliveryLocation: sanitizeFreeText(e.target.value, 120),
                  }))
                }
                error={
                  formData.deliveryLocation ? fieldErrors.deliveryLocation || undefined : undefined
                }
                required
              />
            )}

            <Textarea
              label={
                formData.deliveryMethod === 'DELIVERY'
                  ? 'Delivery Instructions (Optional)'
                  : 'Pickup Notes (Optional)'
              }
              placeholder={
                formData.deliveryMethod === 'DELIVERY'
                  ? 'e.g. Call when outside the gate'
                  : 'e.g. Picking up around 3pm'
              }
              value={formData.deliveryNotes}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  deliveryNotes: sanitizeFreeText(e.target.value, 500),
                }))
              }
              rows={2}
            />
          </div>

          {/* 3. Payment Method Selection */}
          <div className="bg-surface/40 space-y-4 rounded-2xl p-5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              3. Payment Channel
            </h2>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, paymentMethod: 'PAYSTACK' }))}
                disabled={paymentTiming === 'DELIVERY_ONLY'}
                className={clsx(
                  'flex items-start gap-3 rounded-2xl p-4 text-left transition-all',
                  formData.paymentMethod === 'PAYSTACK'
                    ? 'bg-foreground/[0.08] text-foreground'
                    : 'bg-surface/40 hover:bg-surface/70 text-muted-foreground',
                  paymentTiming === 'DELIVERY_ONLY' && 'cursor-not-allowed opacity-40',
                )}
              >
                <div
                  className={clsx(
                    'shrink-0 rounded-xl p-2.5',
                    formData.paymentMethod === 'PAYSTACK'
                      ? 'bg-foreground text-background'
                      : 'bg-surface text-muted-foreground',
                  )}
                >
                  <CreditCard className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold">
                      Pay Online (Paystack)
                    </span>
                    {formData.paymentMethod === 'PAYSTACK' && (
                      <CheckCircle2 className="text-foreground h-4 w-4" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Instant MoMo, Card, and Bank Transfer
                  </p>
                  <span className="mt-1 block text-[10px] font-semibold text-blue-600 dark:text-blue-400">
                    Instant Verification
                  </span>
                </div>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, paymentMethod: 'CASH_ON_DELIVERY' }))
                }
                disabled={paymentTiming === 'UPFRONT_ONLY'}
                className={clsx(
                  'flex items-start gap-3 rounded-2xl p-4 text-left transition-all',
                  formData.paymentMethod === 'CASH_ON_DELIVERY'
                    ? 'bg-foreground/[0.08] text-foreground'
                    : 'bg-surface/40 hover:bg-surface/70 text-muted-foreground',
                  paymentTiming === 'UPFRONT_ONLY' && 'cursor-not-allowed opacity-40',
                )}
              >
                <div
                  className={clsx(
                    'shrink-0 rounded-xl p-2.5',
                    formData.paymentMethod === 'CASH_ON_DELIVERY'
                      ? 'bg-foreground text-background'
                      : 'bg-surface text-muted-foreground',
                  )}
                >
                  <Banknote className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-foreground text-xs font-semibold">
                      Pay on Delivery / Pickup
                    </span>
                    {formData.paymentMethod === 'CASH_ON_DELIVERY' && (
                      <CheckCircle2 className="text-foreground h-4 w-4" />
                    )}
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-[11px]">
                    Pay cash upon receiving your order
                  </p>
                  <span className="text-muted-foreground mt-1 block text-[10px] font-semibold">
                    Cash Handover
                  </span>
                </div>
              </button>
            </div>
          </div>

          {/* 4. Financial Breakdown */}
          <div className="bg-surface/40 space-y-3 rounded-2xl p-5">
            <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
              Order Total Breakdown
            </h2>

            <div className="space-y-2 pt-1 text-xs">
              <div className="text-muted-foreground flex justify-between">
                <span>Items Subtotal</span>
                <span className="text-foreground font-medium">GH₵ {subtotal.toFixed(2)}</span>
              </div>

              <div className="text-muted-foreground flex justify-between">
                <span>Delivery &amp; Logistics</span>
                <span className="font-medium text-emerald-600">Free / Included</span>
              </div>

              <div className="border-border/60 flex items-center justify-between border-t pt-3 text-sm">
                <span className="text-foreground font-bold">Total to Pay</span>
                <span className="text-foreground text-lg font-bold">GH₵ {subtotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-3">
              <Button
                variant="primary"
                onClick={submitOrder}
                isLoading={isSubmitting}
                disabled={isSubmitting || isLoadingStore || !formValid}
                className="h-12 w-full rounded-xl text-xs font-semibold uppercase tracking-wider"
              >
                {isSubmitting
                  ? 'Processing Order...'
                  : formData.paymentMethod === 'PAYSTACK'
                    ? `Pay GH₵ ${subtotal.toFixed(2)} Now`
                    : 'Confirm & Place Order'}
              </Button>
            </div>
          </div>
        </div>
      </main>

      {paymentModalState && (
        <PaymentProcessingModal
          isOpen={!!paymentModalState}
          onClose={() => {
            setPaymentModalState(null);
            if (paymentOrderId) router.push(`/orders/${paymentOrderId}`);
          }}
          status={paymentModalState}
          errorMessage={paymentErrorMessage}
          orderNumber={paymentOrderNumber}
          orderId={paymentOrderId}
          reference={paymentReference}
          amount={paymentOrderTotal}
          onViewOrder={() => router.push(`/orders/${paymentOrderId}`)}
          onViewReceipt={() => router.push(`/orders/${paymentOrderId}?receipt=1`)}
        />
      )}
    </div>
  );
}
