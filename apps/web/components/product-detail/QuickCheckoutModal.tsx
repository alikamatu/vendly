'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShoppingBag,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Truck,
  Store,
  CreditCard,
  Banknote,
  Minus,
  Plus,
  ArrowRight,
  ExternalLink,
  MapPin,
  Lock,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/auth-context';
import { orderApi } from '@/lib/api/order';
import { addressApi, type Address } from '@/lib/api/address';
import { launchPaystackInline } from '@/lib/paystack';
import Spinner from '@/components/ui/Spinner';
import Select from '@/components/ui/Select';
import PaymentProcessingModal from '@/components/orders/PaymentProcessingModal';
import { sanitizePhoneNumber, validatePhoneNumber } from '@/lib/utils/phone';
import { toast } from 'sonner';

const MotionDiv = motion.div as any;

interface QuickCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    title: string;
    price: string | number;
    original_price?: string | number | null;
    image_urls: string[];
    seller: {
      id?: string;
      store_name: string;
      store_link: string;
      logo_url?: string | null;
      payment_timing?: string | null;
    };
  };
  selectedVariant?: {
    id: string;
    title?: string;
    sku?: string | null;
    price?: number | string | null;
    image_url?: string | null;
    attributes?: Record<string, string>;
  } | null;
  selectedVariantAttrs?: Record<string, string>;
}

export default function QuickCheckoutModal({
  isOpen,
  onClose,
  product,
  selectedVariant,
  selectedVariantAttrs,
}: QuickCheckoutModalProps) {
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();

  const [quantity, setQuantity] = useState(1);
  const [deliveryMethod, setDeliveryMethod] = useState<'PICKUP' | 'DELIVERY'>('DELIVERY');
  const [paymentMethod, setPaymentMethod] = useState<'PAYSTACK' | 'CASH'>('PAYSTACK');

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  const [savedAddresses, setSavedAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>('new');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderSuccess, setOrderSuccess] = useState<{ id: string; reference?: string } | null>(null);

  const [paymentModalState, setPaymentModalState] = useState<
    'verifying' | 'success' | 'failed' | null
  >(null);
  const [paymentOrderId, setPaymentOrderId] = useState<string>('');
  const [paymentOrderNumber, setPaymentOrderNumber] = useState<string>('');
  const [paymentOrderTotal, setPaymentOrderTotal] = useState<number | string>('');
  const [paymentReference, setPaymentReference] = useState<string>('');
  const [paymentErrorMessage, setPaymentErrorMessage] = useState<string>('');

  // Unit price determination
  const unitPrice = useMemo(() => {
    if (selectedVariant?.price != null && Number(selectedVariant.price) > 0) {
      return Number(selectedVariant.price);
    }
    return Number(product.price || 0);
  }, [selectedVariant, product.price]);

  const subtotal = unitPrice * quantity;
  const totalAmount = subtotal;

  /* eslint-disable react-hooks/set-state-in-effect */
  // Initialize or update customer details when auth changes
  useEffect(() => {
    if (user) {
      if (!customerName && user.full_name) setCustomerName(user.full_name);
      if (!customerPhone && user.phone_e164) setCustomerPhone(sanitizePhoneNumber(user.phone_e164));
    }
  }, [user, customerName, customerPhone]);

  // Load user saved addresses
  useEffect(() => {
    if (!token) return;
    addressApi
      .getAddresses(token)
      .then((addresses) => {
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setCustomerName(defaultAddr.name);
          setCustomerPhone(sanitizePhoneNumber(defaultAddr.phone));
          setDeliveryLocation(
            `${defaultAddr.street}, ${defaultAddr.city}${defaultAddr.region ? `, ${defaultAddr.region}` : ''}`,
          );
        }
      })
      .catch(() => {});
  }, [token]);

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setDeliveryLocation('');
    } else {
      const addr = savedAddresses.find((a) => a.id === addrId);
      if (addr) {
        setCustomerName(addr.name);
        setCustomerPhone(sanitizePhoneNumber(addr.phone));
        setDeliveryLocation(`${addr.street}, ${addr.city}${addr.region ? `, ${addr.region}` : ''}`);
      }
    }
  };

  // Reset states on modal close
  useEffect(() => {
    if (!isOpen) {
      setError(null);
      setIsSubmitting(false);
      setOrderSuccess(null);
    }
  }, [isOpen]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthenticated || !token) {
      // Redirect to login preserving context
      toast.error('Please sign in to complete fast purchase.');
      router.push(`/login?redirect=${encodeURIComponent(`/product/${product.id}?buyNow=1`)}`);
      return;
    }

    if (!customerName.trim()) {
      setError('Please provide your full name.');
      return;
    }
    const phoneErr = validatePhoneNumber(customerPhone);
    if (phoneErr) {
      setError(phoneErr);
      return;
    }
    if (deliveryMethod === 'DELIVERY' && !deliveryLocation.trim()) {
      setError('Please enter your delivery location or address.');
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryMethod,
        deliveryLocation: deliveryMethod === 'PICKUP' ? 'Store Pickup' : deliveryLocation.trim(),
        deliveryNotes: deliveryNotes.trim() ? deliveryNotes.trim() : undefined,
        paymentMethod: paymentMethod === 'PAYSTACK' ? 'PAYSTACK' : 'CASH_ON_DELIVERY',
      };

      const itemsPayload = [
        {
          productId: String(product.id),
          variantId: selectedVariant?.id || null,
          quantity,
        },
      ];

      const result = await orderApi.createOrder(
        token,
        product.seller.store_link,
        itemsPayload,
        orderPayload,
      );

      const orderId = result.orderId || result.id;
      const orderTotal = Number(result.total ?? result.total_amount ?? totalAmount);
      const reference = result.reference;

      // If online payment (Paystack)
      if (paymentMethod === 'PAYSTACK' && (result.authorization_url || result.access_code)) {
        setPaymentOrderId(orderId);
        setPaymentOrderNumber(orderId ? orderId.slice(-8).toUpperCase() : '');
        setPaymentOrderTotal(orderTotal);
        setPaymentReference(reference || '');

        const quickEmail =
          user?.email && user.email.includes('@') ? user.email : 'customer@verndly.com';

        await launchPaystackInline({
          email: quickEmail,
          amount: orderTotal,
          reference: reference,
          accessCode: result.access_code,
          authorizationUrl: result.authorization_url,
          onSuccess: async (payRes) => {
            setPaymentModalState('verifying');
            try {
              await orderApi.verifyOrderPayment(token, payRes.reference, orderId);
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

      // Cash / Instant Confirmation
      toast.success('Order placed successfully!');
      setOrderSuccess({ id: orderId, reference });
      setTimeout(() => {
        router.push(`/orders/${orderId}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageThumbnail =
    selectedVariant?.image_url || product.image_urls?.[0] || '/placeholder-product.png';

  const variantSummary = selectedVariantAttrs
    ? Object.entries(selectedVariantAttrs)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ')
    : selectedVariant?.title;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center p-0 sm:items-center sm:p-4">
          {/* Strictly solid backdrop overlay (borderless, shadowless, NO blur) */}
          <MotionDiv
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => !isSubmitting && onClose()}
            className="fixed inset-0 bg-black/60"
            aria-hidden="true"
          />

          {/* Modal Container: Mobile-first bottom sheet, centered on desktop */}
          {/* Strictly borderless, shadowless, NO blur style */}
          <MotionDiv
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="bg-background text-foreground relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-[2.5rem] border-0 shadow-none sm:max-w-lg sm:rounded-[2.5rem]"
          >
            {/* Mobile drag handle */}
            <div className="flex justify-center pb-1 pt-3 sm:hidden">
              <div className="bg-muted/40 h-1 w-10 rounded-full" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between border-0 px-6 pb-3 pt-3 sm:pt-6">
              <div className="flex items-center gap-2">
                <div className="bg-foreground/5 text-foreground flex h-7 w-7 items-center justify-center rounded-full">
                  <ShoppingBag className="h-3.5 w-3.5" />
                </div>
                <div>
                  <h2 className="text-foreground text-sm font-semibold uppercase tracking-wider">
                    Quick Checkout
                  </h2>
                  <p className="text-muted text-[11px]">Fast 1-step direct purchase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close"
                className="bg-surface hover:bg-surface/80 text-foreground rounded-full border-0 p-2 shadow-none transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-5 overflow-y-auto px-6 py-2">
              {/* Product Snippet */}
              <div className="bg-surface flex items-center gap-3.5 rounded-2xl border-0 p-4 shadow-none">
                <img
                  src={imageThumbnail}
                  alt={product.title}
                  className="bg-background h-16 w-16 shrink-0 rounded-xl border-0 object-cover"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-foreground line-clamp-2 text-xs font-medium uppercase tracking-tight">
                    {product.title}
                  </h3>
                  {variantSummary && (
                    <p className="text-muted truncate text-[10px] font-normal uppercase tracking-wider">
                      {variantSummary}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-primary text-xs font-semibold">
                      GH₵ {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-muted text-[10px]">@{product.seller.store_link}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="bg-surface flex items-center justify-between rounded-2xl border-0 p-3.5 shadow-none">
                <span className="text-foreground text-xs font-medium">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isSubmitting}
                    className="bg-background hover:bg-background/80 text-foreground flex h-8 w-8 items-center justify-center rounded-xl border-0 shadow-none transition-colors disabled:opacity-40"
                  >
                    <Minus className="h-3.5 w-3.5" />
                  </button>
                  <span className="min-w-[20px] text-center text-xs font-semibold">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={isSubmitting}
                    className="bg-background hover:bg-background/80 text-foreground flex h-8 w-8 items-center justify-center rounded-xl border-0 shadow-none transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center gap-2 rounded-2xl border-0 bg-red-500/10 p-3 text-xs text-red-600 shadow-none dark:text-red-400">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Unauthenticated Prompt */}
              {!isAuthenticated && (
                <div className="bg-surface space-y-3 rounded-2xl border-0 p-4 shadow-none">
                  <div className="text-foreground flex items-center gap-2 text-xs font-medium">
                    <Lock className="text-primary h-3.5 w-3.5" />
                    <span>Sign in for 1-click checkout</span>
                  </div>
                  <p className="text-muted text-[11px] leading-relaxed">
                    Sign in to track real-time delivery status, view instant digital receipts, and
                    protect your purchase.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `/login?redirect=${encodeURIComponent(`/product/${product.id}?buyNow=1`)}`,
                      );
                    }}
                    className="bg-foreground text-background w-full rounded-xl border-0 py-2.5 text-xs font-semibold uppercase tracking-wider shadow-none transition-opacity hover:opacity-90"
                  >
                    Sign In to Continue
                  </button>
                </div>
              )}

              {/* Customer Contact Details */}
              <div className="bg-surface space-y-3 rounded-2xl border-0 p-4 shadow-none">
                <h4 className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Recipient Information
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="text-muted mb-1 block text-[10px] font-medium uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ama Mensah"
                      disabled={isSubmitting}
                      className="bg-background text-foreground placeholder:text-muted/60 focus:ring-primary/30 h-10 w-full rounded-xl border-0 px-3 text-xs shadow-none focus:outline-none focus:ring-1"
                    />
                  </div>
                  <div>
                    <div className="mb-1 flex items-center justify-between">
                      <label className="text-muted block text-[10px] font-medium uppercase tracking-wider">
                        Phone Number (Mobile Money / SMS)
                      </label>
                      <span
                        className={`font-mono text-[10px] font-medium tracking-wide ${
                          customerPhone.length === 10
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted'
                        }`}
                      >
                        {customerPhone.length}/10 digits
                      </span>
                    </div>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(sanitizePhoneNumber(e.target.value))}
                      placeholder="e.g. 0244123456"
                      disabled={isSubmitting}
                      className="bg-background text-foreground placeholder:text-muted/60 focus:ring-primary/30 h-10 w-full rounded-xl border-0 px-3 text-xs shadow-none focus:outline-none focus:ring-1"
                    />
                    <p className="text-muted/70 mt-1 text-[10px]">
                      Must be strictly 10 digits for rider contact &amp; MoMo SMS
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="bg-surface space-y-3 rounded-2xl border-0 p-4 shadow-none">
                <h4 className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Delivery Method
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('DELIVERY')}
                    disabled={isSubmitting}
                    className={`rounded-xl border-0 p-3 text-left shadow-none transition-colors ${
                      deliveryMethod === 'DELIVERY'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5" />
                      <span className="text-xs">Doorstep</span>
                    </div>
                    <p className="text-[10px] opacity-75">Dispatch to address</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('PICKUP')}
                    disabled={isSubmitting}
                    className={`rounded-xl border-0 p-3 text-left shadow-none transition-colors ${
                      deliveryMethod === 'PICKUP'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Store className="h-3.5 w-3.5" />
                      <span className="text-xs">Pickup</span>
                    </div>
                    <p className="text-[10px] opacity-75">Collect at store</p>
                  </button>
                </div>

                {deliveryMethod === 'DELIVERY' && (
                  <div className="space-y-2.5 pt-1">
                    {savedAddresses.length > 0 && (
                      <Select
                        label="Saved Address"
                        value={selectedAddressId}
                        onChange={(val) => handleSelectSavedAddress(val)}
                        options={[
                          ...savedAddresses.map((addr) => ({
                            value: addr.id,
                            label: `${addr.label ? `[${addr.label}] ` : ''}${addr.street}, ${addr.city}`,
                          })),
                          { value: 'new', label: '+ Use another address' },
                        ]}
                        size="sm"
                      />
                    )}

                    <div>
                      <label className="text-muted mb-1 block text-[10px] font-medium uppercase tracking-wider">
                        Delivery Address / Landmark
                      </label>
                      <input
                        type="text"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        placeholder="e.g. Ring Road Central, near Danquah Circle, Accra"
                        disabled={isSubmitting}
                        className="bg-background text-foreground placeholder:text-muted/60 focus:ring-primary/30 h-10 w-full rounded-xl border-0 px-3 text-xs shadow-none focus:outline-none focus:ring-1"
                      />
                    </div>

                    <div>
                      <label className="text-muted mb-1 block text-[10px] font-medium uppercase tracking-wider">
                        Delivery Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Call before arrival, leave with security"
                        disabled={isSubmitting}
                        className="bg-background text-foreground placeholder:text-muted/60 focus:ring-primary/30 h-10 w-full rounded-xl border-0 px-3 text-xs shadow-none focus:outline-none focus:ring-1"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-surface space-y-3 rounded-2xl border-0 p-4 shadow-none">
                <h4 className="text-muted text-[11px] font-semibold uppercase tracking-wider">
                  Payment Method
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYSTACK')}
                    disabled={isSubmitting}
                    className={`rounded-xl border-0 p-3 text-left shadow-none transition-colors ${
                      paymentMethod === 'PAYSTACK'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5" />
                      <span className="text-xs">Paystack</span>
                    </div>
                    <p className="text-[10px] opacity-75">MoMo &amp; Card</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    disabled={isSubmitting}
                    className={`rounded-xl border-0 p-3 text-left shadow-none transition-colors ${
                      paymentMethod === 'CASH'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5" />
                      <span className="text-xs">Cash on Delivery</span>
                    </div>
                    <p className="text-[10px] opacity-75">Pay on receipt</p>
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-surface space-y-2.5 rounded-2xl border-0 p-4 text-xs shadow-none">
                <div className="text-muted flex justify-between">
                  <span>Items Subtotal</span>
                  <span className="text-foreground font-medium">
                    GH₵ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="text-muted flex justify-between">
                  <span>Delivery &amp; Logistics</span>
                  <span className="font-medium text-emerald-600">Free / Included</span>
                </div>
                <div className="border-border/20 text-foreground flex items-center justify-between border-t pt-2 text-sm font-semibold">
                  <span>Total to Pay</span>
                  <span className="text-base font-bold">
                    GH₵ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="bg-background border-0 p-4 shadow-none sm:p-6">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="bg-foreground text-background flex h-14 w-full items-center justify-center gap-2 rounded-2xl border-0 text-xs font-semibold uppercase tracking-wider shadow-none transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="text-background" />
                    <span>Processing Order...</span>
                  </>
                ) : paymentMethod === 'PAYSTACK' ? (
                  <>
                    <span>
                      Pay GH₵ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}{' '}
                      Now
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                ) : (
                  <>
                    <span>
                      Confirm Order · GH₵{' '}
                      {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}

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
    </AnimatePresence>
  );
}
