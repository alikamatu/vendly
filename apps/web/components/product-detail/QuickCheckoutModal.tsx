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

  // Unit price determination
  const unitPrice = useMemo(() => {
    if (selectedVariant?.price != null && Number(selectedVariant.price) > 0) {
      return Number(selectedVariant.price);
    }
    return Number(product.price || 0);
  }, [selectedVariant, product.price]);

  const subtotal = unitPrice * quantity;
  const totalAmount = subtotal;

  // Initialize or update customer details when auth changes
  useEffect(() => {
    if (user) {
      if (!customerName && user.full_name) setCustomerName(user.full_name);
      if (!customerPhone && user.phone_e164) setCustomerPhone(user.phone_e164);
    }
  }, [user, customerName, customerPhone]);

  // Load user saved addresses
  useEffect(() => {
    if (!token) return;
    addressApi.getAddresses(token)
      .then((addresses) => {
        setSavedAddresses(addresses);
        if (addresses.length > 0) {
          const defaultAddr = addresses.find((a) => a.is_default) || addresses[0];
          setSelectedAddressId(defaultAddr.id);
          setCustomerName(defaultAddr.name);
          setCustomerPhone(defaultAddr.phone);
          setDeliveryLocation(
            `${defaultAddr.street}, ${defaultAddr.city}${defaultAddr.region ? `, ${defaultAddr.region}` : ''}`
          );
        }
      })
      .catch(() => { });
  }, [token]);

  const handleSelectSavedAddress = (addrId: string) => {
    setSelectedAddressId(addrId);
    if (addrId === 'new') {
      setDeliveryLocation('');
    } else {
      const addr = savedAddresses.find((a) => a.id === addrId);
      if (addr) {
        setCustomerName(addr.name);
        setCustomerPhone(addr.phone);
        setDeliveryLocation(
          `${addr.street}, ${addr.city}${addr.region ? `, ${addr.region}` : ''}`
        );
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
    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      setError('Please provide a valid phone number for delivery updates.');
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
        deliveryNotes: deliveryNotes.trim() || undefined,
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
        orderPayload
      );

      // If online payment (Paystack)
      if (paymentMethod === 'PAYSTACK' && (result.authorization_url || result.access_code)) {
        const quickEmail =
          (user?.email && user.email.includes('@'))
            ? user.email
            : 'customer@verndly.com';

        await launchPaystackInline({
          email: quickEmail,
          amount: Number(result.total_amount),
          reference: result.reference,
          accessCode: result.access_code,
          authorizationUrl: result.authorization_url,
          onSuccess: async (payRes) => {
            try {
              await orderApi.verifyOrderPayment(token, payRes.reference, result.id);
              toast.success('Payment verified successfully!');
              router.push(`/orders/${result.id}`);
            } catch {
              // Still redirect to order page to see status
              router.push(`/orders/${result.id}`);
            }
          },
          onClose: () => {
            router.push(`/orders/${result.id}`);
          },
        });
        return;
      }

      // Cash / Instant Confirmation
      toast.success('Order placed successfully!');
      setOrderSuccess({ id: result.id, reference: result.reference });
      setTimeout(() => {
        router.push(`/orders/${result.id}`);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const imageThumbnail =
    selectedVariant?.image_url ||
    product.image_urls?.[0] ||
    '/placeholder-product.png';

  const variantSummary = selectedVariantAttrs
    ? Object.entries(selectedVariantAttrs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ')
    : selectedVariant?.title;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
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
            className="relative z-10 w-full sm:max-w-lg bg-background rounded-t-[2.5rem] sm:rounded-[2.5rem] border-0 shadow-none max-h-[92vh] flex flex-col overflow-hidden text-foreground"
          >
            {/* Mobile drag handle */}
            <div className="pt-3 pb-1 sm:hidden flex justify-center">
              <div className="w-10 h-1 rounded-full bg-muted/40" />
            </div>

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-3 sm:pt-6 pb-3 border-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-foreground/5 flex items-center justify-center text-foreground">
                  <ShoppingBag className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-foreground">
                    Quick Checkout
                  </h2>
                  <p className="text-[11px] text-muted">Fast 1-step direct purchase</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                aria-label="Close"
                className="p-2 rounded-full bg-surface hover:bg-surface/80 text-foreground border-0 shadow-none transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="px-6 py-2 overflow-y-auto space-y-5">
              {/* Product Snippet */}
              <div className="bg-surface rounded-2xl p-4 flex items-center gap-3.5 border-0 shadow-none">
                <img
                  src={imageThumbnail}
                  alt={product.title}
                  className="w-16 h-16 rounded-xl object-cover bg-background shrink-0 border-0"
                />
                <div className="min-w-0 flex-1 space-y-1">
                  <h3 className="text-xs font-medium text-foreground line-clamp-2 uppercase tracking-tight">
                    {product.title}
                  </h3>
                  {variantSummary && (
                    <p className="text-[10px] text-muted font-normal uppercase tracking-wider truncate">
                      {variantSummary}
                    </p>
                  )}
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-xs font-semibold text-primary">
                      GH₵ {unitPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-muted">@{product.seller.store_link}</span>
                  </div>
                </div>
              </div>

              {/* Quantity Selector */}
              <div className="bg-surface rounded-2xl p-3.5 flex items-center justify-between border-0 shadow-none">
                <span className="text-xs font-medium text-foreground">Quantity</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1 || isSubmitting}
                    className="w-8 h-8 rounded-xl bg-background hover:bg-background/80 text-foreground flex items-center justify-center disabled:opacity-40 border-0 shadow-none transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-semibold text-xs min-w-[20px] text-center">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    disabled={isSubmitting}
                    className="w-8 h-8 rounded-xl bg-background hover:bg-background/80 text-foreground flex items-center justify-center border-0 shadow-none transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="bg-red-500/10 text-red-600 dark:text-red-400 p-3 rounded-2xl text-xs flex items-center gap-2 border-0 shadow-none">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Unauthenticated Prompt */}
              {!isAuthenticated && (
                <div className="bg-surface rounded-2xl p-4 space-y-3 border-0 shadow-none">
                  <div className="flex items-center gap-2 text-foreground font-medium text-xs">
                    <Lock className="w-3.5 h-3.5 text-primary" />
                    <span>Sign in for 1-click checkout</span>
                  </div>
                  <p className="text-[11px] text-muted leading-relaxed">
                    Sign in to track real-time delivery status, view instant digital receipts, and protect your purchase.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      router.push(
                        `/login?redirect=${encodeURIComponent(`/product/${product.id}?buyNow=1`)}`
                      );
                    }}
                    className="w-full py-2.5 rounded-xl bg-foreground text-background text-xs font-semibold uppercase tracking-wider border-0 shadow-none hover:opacity-90 transition-opacity"
                  >
                    Sign In to Continue
                  </button>
                </div>
              )}

              {/* Customer Contact Details */}
              <div className="bg-surface rounded-2xl p-4 space-y-3 border-0 shadow-none">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Recipient Information
                </h4>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Ama Mensah"
                      disabled={isSubmitting}
                      className="w-full h-10 px-3 rounded-xl bg-background text-foreground text-xs placeholder:text-muted/60 border-0 shadow-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                      Phone Number (for delivery updates)
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="e.g. 0244123456"
                      disabled={isSubmitting}
                      className="w-full h-10 px-3 rounded-xl bg-background text-foreground text-xs placeholder:text-muted/60 border-0 shadow-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Method */}
              <div className="bg-surface rounded-2xl p-4 space-y-3 border-0 shadow-none">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Delivery Method
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('DELIVERY')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl text-left border-0 shadow-none transition-colors ${deliveryMethod === 'DELIVERY'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Truck className="w-3.5 h-3.5" />
                      <span className="text-xs">Doorstep</span>
                    </div>
                    <p className="text-[10px] opacity-75">Dispatch to address</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryMethod('PICKUP')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl text-left border-0 shadow-none transition-colors ${deliveryMethod === 'PICKUP'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Store className="w-3.5 h-3.5" />
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
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                        Delivery Address / Landmark
                      </label>
                      <input
                        type="text"
                        value={deliveryLocation}
                        onChange={(e) => setDeliveryLocation(e.target.value)}
                        placeholder="e.g. Ring Road Central, near Danquah Circle, Accra"
                        disabled={isSubmitting}
                        className="w-full h-10 px-3 rounded-xl bg-background text-foreground text-xs placeholder:text-muted/60 border-0 shadow-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-medium text-muted uppercase tracking-wider mb-1">
                        Delivery Instructions (Optional)
                      </label>
                      <input
                        type="text"
                        value={deliveryNotes}
                        onChange={(e) => setDeliveryNotes(e.target.value)}
                        placeholder="e.g. Call before arrival, leave with security"
                        disabled={isSubmitting}
                        className="w-full h-10 px-3 rounded-xl bg-background text-foreground text-xs placeholder:text-muted/60 border-0 shadow-none focus:outline-none focus:ring-1 focus:ring-primary/30"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Payment Method */}
              <div className="bg-surface rounded-2xl p-4 space-y-3 border-0 shadow-none">
                <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                  Payment Method
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('PAYSTACK')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl text-left border-0 shadow-none transition-colors ${paymentMethod === 'PAYSTACK'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-xs">Paystack</span>
                    </div>
                    <p className="text-[10px] opacity-75">MoMo &amp; Card</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('CASH')}
                    disabled={isSubmitting}
                    className={`p-3 rounded-xl text-left border-0 shadow-none transition-colors ${paymentMethod === 'CASH'
                        ? 'bg-foreground text-background font-medium'
                        : 'bg-background text-muted hover:text-foreground'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Banknote className="w-3.5 h-3.5" />
                      <span className="text-xs">Cash on Delivery</span>
                    </div>
                    <p className="text-[10px] opacity-75">Pay on receipt</p>
                  </button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="bg-surface rounded-2xl p-4 space-y-2.5 border-0 shadow-none text-xs">
                <div className="flex justify-between text-muted">
                  <span>Items Subtotal</span>
                  <span className="text-foreground font-medium">
                    GH₵ {subtotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Delivery &amp; Logistics</span>
                  <span className="text-emerald-600 font-medium">Free / Included</span>
                </div>
                <div className="pt-2 border-t border-border/20 flex justify-between items-center text-sm font-semibold text-foreground">
                  <span>Total to Pay</span>
                  <span className="text-base font-bold">
                    GH₵ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Action */}
            <div className="p-4 sm:p-6 bg-background border-0 shadow-none">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-14 rounded-2xl bg-foreground text-background font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 border-0 shadow-none hover:opacity-90 transition-opacity"
              >
                {isSubmitting ? (
                  <>
                    <Spinner size="sm" className="text-background" />
                    <span>Processing Order...</span>
                  </>
                ) : paymentMethod === 'PAYSTACK' ? (
                  <>
                    <span>
                      Pay GH₵ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })} Now
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Confirm Order · GH₵ {totalAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </MotionDiv>
        </div>
      )}
    </AnimatePresence>
  );
}
