'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Camera, Globe, MessageCircle, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import BatchProductNotesForm from '@/components/products/BatchProductNotesForm';
import WebsiteImportPanel from '@/components/products/WebsiteImportPanel';
import WhatsAppImportPanel from '@/components/products/WhatsAppImportPanel';

type AddSource = 'upload' | 'website' | 'whatsapp';

const SOURCE_STORAGE_KEY = 'verndly_add_product_source_v1';

const SPRING_PILL = { type: 'spring' as const, stiffness: 420, damping: 34 };

const SOURCES: Array<{
  id: AddSource;
  label: string;
  desc: string;
  icon: React.ElementType;
}> = [
  {
    id: 'upload',
    label: 'Upload Product',
    desc: 'Photos & Verndly AI',
    icon: Camera,
  },
  {
    id: 'website',
    label: 'From Website',
    desc: 'Store or single item URL',
    icon: Globe,
  },
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    desc: 'Catalog or screenshots',
    icon: MessageCircle,
  },
];

export default function AddProductPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialParam = searchParams.get('source');
  const initialSource: AddSource =
    initialParam === 'website' || initialParam === 'whatsapp' ? initialParam : 'upload';

  const [source, setSource] = useState<AddSource>(initialSource);

  useEffect(() => {
    if (initialParam === 'website' || initialParam === 'whatsapp' || initialParam === 'upload') {
      return;
    }
    try {
      const saved = localStorage.getItem(SOURCE_STORAGE_KEY);
      if (saved === 'upload' || saved === 'website' || saved === 'whatsapp') {
        setSource(saved);
      }
    } catch {
      // ignore storage errors
    }
  }, [initialParam]);

  const handleSelectSource = (next: AddSource) => {
    setSource(next);
    try {
      localStorage.setItem(SOURCE_STORAGE_KEY, next);
    } catch {
      // ignore storage errors
    }
  };

  return (
    <div className="w-full space-y-6">
      {/* Unified Source Switcher — lists all ways to add or import products */}
      <nav
        aria-label="Choose how to add products"
        className="bg-surface grid grid-cols-2 gap-1.5 rounded-2xl p-1.5 sm:grid-cols-4"
      >
        {SOURCES.map((tab) => {
          const Icon = tab.icon;
          const active = source === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleSelectSource(tab.id)}
              className={`relative flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-colors ${
                active ? 'text-foreground' : 'text-muted hover:text-foreground'
              }`}
            >
              {active && (
                <motion.span
                  layoutId="add-product-source-pill"
                  transition={SPRING_PILL}
                  className="bg-background absolute inset-0 rounded-xl"
                />
              )}
              <span className="relative z-10 flex min-w-0 items-center gap-2.5">
                <Icon
                  className={`h-4 w-4 shrink-0 ${active ? 'text-[var(--color-accent)]' : ''}`}
                />
                <span className="min-w-0">
                  <span className="block truncate text-xs font-semibold leading-tight sm:text-[13px]">
                    {tab.label}
                  </span>
                  <span className="text-muted hidden truncate text-[10px] leading-tight sm:block">
                    {tab.desc}
                  </span>
                </span>
              </span>
            </button>
          );
        })}

        <Link
          href="/dashboard/products/import"
          className="text-muted hover:bg-background/60 hover:text-foreground flex items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-left transition-colors"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <FileSpreadsheet className="h-4 w-4 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold leading-tight sm:text-[13px]">
                Bulk CSV
              </span>
              <span className="text-muted hidden truncate text-[10px] leading-tight sm:block">
                Spreadsheet upload
              </span>
            </span>
          </span>
          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
        </Link>
      </nav>

      {/* Active Creation / Import Flow */}
      {source === 'upload' && (
        <BatchProductNotesForm
          onCancel={() => router.push('/dashboard/products')}
          onSuccess={(ids) => {
            if (ids.length === 1) {
              router.push(`/dashboard/products/${ids[0]}`);
            } else {
              router.push('/dashboard/products');
            }
          }}
        />
      )}

      {source === 'website' && <WebsiteImportPanel />}

      {source === 'whatsapp' && <WhatsAppImportPanel embedded />}
    </div>
  );
}
