'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/lib/contexts/auth-context';
import { storeApi } from '@/lib/api/store';
import { createStoreSchema, CreateStoreInput } from '@/lib/validations/store';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Textarea from '@/components/ui/Textarea';
import { Label } from '@/components/ui/Label';
import { Camera, Store } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function CreateStorePage() {
  const { user, token, refreshUser } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  const form = useForm<CreateStoreInput>({
    resolver: zodResolver(createStoreSchema),
    defaultValues: {
      store_name: '',
      store_link: '',
      bio: '',
      whatsapp_number: '',
    },
  });

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: CreateStoreInput) => {
    if (!token) return;
    setIsLoading(true);
    try {
      await storeApi.createStoreWithFile(token, data, logoFile || undefined);
      toast.success('Store created successfully!');
      await refreshUser();
      router.push('/dashboard');
    } catch (error: any) {
      toast.error(error.message || 'Failed to create store');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/10">
      <div className="container mx-auto max-w-xl px-4 py-12 md:py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="space-y-10"
        >
          {/* Header section */}
          <div className="text-center space-y-4">
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center justify-center p-4 bg-primary/5 rounded-2xl mb-2"
            >
              <Store className="w-10 h-10 text-primary" />
            </motion.div>
            <h1 className="text-4xl font-medium tracking-tight sm:text-5xl">
              Create Your Store
            </h1>
            <p className="text-lg text-muted max-w-md mx-auto leading-relaxed">
              Express yourself and start your selling journey on Vendly in just a few steps.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-12">
            {/* Logo Upload Section */}
            <div className="flex flex-col items-center">
              <div className="relative group cursor-pointer" onClick={() => document.getElementById('logo-upload')?.click()}>
                <motion.div 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-36 h-36 rounded-3xl overflow-hidden border-2 border-dashed border-border flex items-center justify-center bg-surface transition-all group-hover:border-primary/50"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Store logo preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center space-y-2 opacity-40 group-hover:opacity-100 transition-opacity">
                      <Camera className="w-10 h-10" />
                      <span className="text-xs font-medium">Add Logo</span>
                    </div>
                  )}
                </motion.div>
                
                <label
                  htmlFor="logo-upload"
                  className="absolute -bottom-2 -right-2 p-3 bg-primary text-background rounded-2xl shadow-xl cursor-pointer hover:scale-110 active:scale-95 transition-all"
                >
                  <Camera className="w-5 h-5" />
                </label>
                <input
                  id="logo-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleLogoChange}
                />
              </div>
              <p className="mt-4 text-xs font-medium text-muted uppercase tracking-wider">
                Max size 5MB • PNG or JPG
              </p>
            </div>

            {/* Form Fields Section */}
            <div className="space-y-8">
              <div className="grid gap-8">
                <Input
                  label="Store Name"
                  placeholder="e.g. Mike's Gadgets"
                  registration={form.register('store_name')}
                  error={form.formState.errors.store_name?.message}
                  className="text-lg py-3"
                />

                <div className="space-y-4">
                  <Input
                    label="Store Username"
                    placeholder="mike-gadgets"
                    registration={form.register('store_link')}
                    error={form.formState.errors.store_link?.message}
                    className="text-lg py-3"
                  />
                  <p className="text-xs text-muted/60 pl-1 font-medium">
                    Your store will be at: <span className="text-primary/70 italic">vendly.com/{form.watch('store_link') || 'username'}</span>
                  </p>
                </div>

                <Input
                  label="WhatsApp Number (Optional)"
                  placeholder="+234..."
                  registration={form.register('whatsapp_number')}
                  error={form.formState.errors.whatsapp_number?.message}
                  className="text-lg py-3"
                  icon={<span className="text-lg">📱</span>}
                />

                <div className="space-y-3">
                  <Label htmlFor="bio" className="text-sm font-normal text-muted pl-1">Store Description (Optional)</Label>
                  <Textarea
                    id="bio"
                    placeholder="Tell your customers about your amazing products..."
                    rows={4}
                    registration={form.register('bio')}
                    error={form.formState.errors.bio?.message}
                    className="bg-surface/50 border-none rounded-2xl p-4 focus:ring-2 focus:ring-primary/20 transition-all text-base leading-relaxed"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action */}
            <div className="pt-4 pb-12">
              <Button
                type="submit"
                size='lg'
                className="w-full h-14 text-lg font-normal bg-red-500 text-white"
                isLoading={isLoading}
              >
                Launch Store
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
