'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, MapPin, Plus, Trash2, Edit2, CheckCircle2, Loader2, Star } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/auth-context';
import { addressApi, Address } from '@/lib/api/address';

export default function AddressesPage() {
  const { token, user } = useAuth();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    label: '',
    name: '',
    phone: '',
    street: '',
    city: '',
    region: '',
    is_default: false,
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (token) {
      loadAddresses();
    }
  }, [token]);

  const loadAddresses = async () => {
    try {
      if (!token) return;
      const data = await addressApi.getAddresses(token);
      setAddresses(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenForm = (address?: Address) => {
    if (address) {
      setEditingId(address.id);
      setFormData({
        label: address.label || '',
        name: address.name,
        phone: address.phone,
        street: address.street,
        city: address.city,
        region: address.region || '',
        is_default: address.is_default,
      });
    } else {
      setEditingId(null);
      setFormData({
        label: '',
        name: user?.full_name || '',
        phone: '',
        street: '',
        city: '',
        region: '',
        is_default: addresses.length === 0,
      });
    }
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
    setEditingId(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setIsSaving(true);
    try {
      if (editingId) {
        await addressApi.updateAddress(token, editingId, formData);
      } else {
        await addressApi.createAddress(token, formData);
      }
      await loadAddresses();
      handleCloseForm();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!token) return;
    try {
      await addressApi.deleteAddress(token, id);
      await loadAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  const handleSetDefault = async (id: string) => {
    if (!token) return;
    try {
      await addressApi.updateAddress(token, id, { is_default: true });
      await loadAddresses();
    } catch (err) {
      console.error(err);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-lg space-y-5 pb-16">
      {/* Back Link */}
      <Link
        href="/account"
        className="group inline-flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Account
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-medium tracking-tight">Address Book</h1>
          <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">
            Manage your delivery addresses
          </p>
        </div>
        {!isFormOpen && (
          <button
            onClick={() => handleOpenForm()}
            className="flex items-center gap-1 rounded-full bg-[var(--color-foreground)] px-3 py-1.5 text-xs font-medium text-[var(--color-background)] transition-transform active:scale-95"
          >
            <Plus className="h-3.5 w-3.5" /> Add New
          </button>
        )}
      </div>

      <AnimatePresence mode="wait">
        {isFormOpen ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5"
          >
            <form onSubmit={handleSave} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-background)] px-4 text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-background)] px-4 text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10"
                />
              </div>

              <div className="col-span-2">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  Street Address
                </label>
                <input
                  type="text"
                  required
                  value={formData.street}
                  onChange={(e) => setFormData({ ...formData, street: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-background)] px-4 text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10"
                />
              </div>

              <div className="col-span-1">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  City
                </label>
                <input
                  type="text"
                  required
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-background)] px-4 text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10"
                />
              </div>

              <div className="col-span-1">
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                  Region / State
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                  className="h-12 w-full rounded-2xl border border-[var(--color-border)]/80 bg-[var(--color-background)] px-4 text-[13px] outline-none focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent)]/10"
                />
              </div>

              <div className="col-span-2 flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_default"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-[var(--color-border)] text-[var(--color-accent)] focus:ring-[var(--color-accent)]"
                />
                <label htmlFor="is_default" className="text-sm font-medium">
                  Set as default delivery address
                </label>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleCloseForm}
                className="flex h-12 flex-1 items-center justify-center rounded-2xl border border-[var(--color-border)] bg-transparent text-sm font-medium transition-colors hover:bg-[var(--color-border)]/50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="flex h-12 flex-1 items-center justify-center gap-2 rounded-2xl bg-[var(--color-foreground)] text-sm font-medium text-[var(--color-background)] transition-colors hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Address'}
              </button>
            </div>
            </form>
          </motion.div>
        ) : isLoading ? (
          <motion.div key="loading" className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--color-muted)]" />
          </motion.div>
        ) : addresses.length === 0 ? (
          <motion.div
            key="empty"
            className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--color-border)] py-12 text-center"
          >
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--color-border)]/50">
              <MapPin className="h-5 w-5 text-[var(--color-muted)]" />
            </div>
            <p className="text-sm font-medium">No addresses saved</p>
            <p className="mt-1 text-[11px] text-[var(--color-muted)]">
              Add an address to make checkout faster.
            </p>
          </motion.div>
        ) : (
          <motion.div key="list" className="space-y-3">
            {addresses.map((address) => (
              <div
                key={address.id}
                className={`group relative flex flex-col gap-3 rounded-3xl border p-4 transition-all ${
                  address.is_default
                    ? 'border-[var(--color-accent)]/50 bg-[var(--color-accent)]/5'
                    : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:border-[var(--color-border)]/80'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full ${
                        address.is_default
                          ? 'bg-[var(--color-accent)] text-white'
                          : 'bg-[var(--color-border)]/50 text-[var(--color-foreground)]'
                      }`}
                    >
                      <MapPin className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium leading-none">{address.name}</p>
                      {address.label && (
                        <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-[var(--color-muted)]">
                          {address.label}
                        </p>
                      )}
                    </div>
                  </div>
                  {address.is_default && (
                    <span className="flex items-center gap-1 rounded-full bg-[var(--color-accent)]/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-accent)]">
                      <Star className="h-3 w-3 fill-current" /> Default
                    </span>
                  )}
                </div>

                <div className="pl-10 text-[13px] leading-relaxed text-[var(--color-muted)]">
                  <p>{address.phone}</p>
                  <p>{address.street}</p>
                  <p>
                    {address.city}
                    {address.region ? `, ${address.region}` : ''}
                  </p>
                </div>

                <div className="mt-2 flex items-center gap-2 pl-10 opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
                  <button
                    onClick={() => handleOpenForm(address)}
                    className="flex items-center gap-1 text-[11px] font-medium text-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                  >
                    <Edit2 className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(address.id)}
                    className="flex items-center gap-1 text-[11px] font-medium text-red-500 hover:text-red-600"
                  >
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                  {!address.is_default && (
                    <button
                      onClick={() => handleSetDefault(address.id)}
                      className="ml-auto flex items-center gap-1 text-[11px] font-medium text-[var(--color-accent)] hover:underline"
                    >
                      Set as Default
                    </button>
                  )}
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
