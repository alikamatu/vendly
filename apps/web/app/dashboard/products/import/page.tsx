'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import {
  Upload,
  Download,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  HelpCircle,
  X,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Alert from '@/components/ui/Alert';
import { useAuth } from '@/lib/contexts/auth-context';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1000';

const TEMPLATE_HEADERS = [
  'title',
  'price',
  'original_price',
  'currency',
  'condition',
  'quantity_available',
  'category',
  'brand',
  'tags',
  'description',
  'status',
];

const TEMPLATE_ROWS = [
  [
    'Linen shirt — Sand',
    '180',
    '240',
    'GHS',
    'new',
    '12',
    'Clothing',
    'Verndly',
    'linen|summer|menswear',
    'Lightweight breathable linen shirt.',
    'draft',
  ],
  [
    'Ceramic Stoneware Mug 350ml',
    '55',
    '',
    'GHS',
    'new',
    '30',
    'Home & Kitchen',
    'Verndly',
    'kitchen|gift|ceramics',
    'Handmade stoneware mug, dishwasher safe.',
    'draft',
  ],
];

function csvEscape(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildTemplate(): string {
  return [TEMPLATE_HEADERS, ...TEMPLATE_ROWS].map((r) => r.map(csvEscape).join(',')).join('\n');
}

interface RowResult {
  row: number;
  ok: boolean;
  productId?: string;
  title?: string;
  error?: string;
}

interface ImportResponse {
  summary: { created: number; failed: number; total: number };
  results: RowResult[];
}

export default function BulkImportPage() {
  const { token } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplate()], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'vendly-products-template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV template downloaded.');
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      if (!droppedFile.name.toLowerCase().endsWith('.csv')) {
        toast.error('Please upload a valid .csv file');
        return;
      }
      setFile(droppedFile);
    }
  };

  const upload = async () => {
    if (!file || !token) {
      toast.error('Please select a CSV file first');
      return;
    }
    setUploading(true);
    setError(null);
    setResult(null);

    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(`${API_URL}/products/bulk-import`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(json?.message)
          ? json.message[0]
          : json?.message || 'CSV Import failed. Please check your column headers and data.';
        throw new Error(msg);
      }
      const data: ImportResponse =
        json && typeof json === 'object' && 'data' in json ? json.data : json;
      setResult(data);

      if (data.summary.created > 0) {
        toast.success(`Successfully imported ${data.summary.created} products!`);
      } else {
        toast.warning('Import completed with errors. See details below.');
      }
    } catch (e: any) {
      const msg = e?.message || 'Failed to import CSV';
      setError(msg);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/products"
          className="group mb-3 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] transition-colors hover:text-[var(--color-foreground)]"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
          Back to products
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl">
          Bulk CSV Import
        </h1>
        <p className="mt-1 text-xs text-[var(--color-muted)] sm:text-sm">
          Upload a CSV file to add dozens of product listings in seconds. Product photos and videos
          can be added after import.
        </p>
      </div>

      {/* Step 1: Download Template */}
      <Card
        className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        hoverEffect={false}
      >
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="bg-[var(--color-accent)]/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[var(--color-accent)]">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-foreground)]">
                Step 1: Download Sample CSV Template
              </div>
              <div className="mt-0.5 text-xs text-[var(--color-muted)]">
                Formatted with required headers, accepted enums, and 2 sample rows.
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={downloadTemplate}
            className="gap-2 rounded-xl text-xs font-semibold"
          >
            <Download className="h-4 w-4" /> Download Template (.csv)
          </Button>
        </div>

        {/* Column Specs */}
        <div className="space-y-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4 text-xs">
          <div className="flex items-center gap-1.5 font-semibold text-[var(--color-foreground)]">
            <HelpCircle className="h-3.5 w-3.5 text-[var(--color-accent)]" /> Expected Column
            Headers
          </div>
          <p className="overflow-x-auto whitespace-nowrap rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-2.5 py-1.5 font-mono text-[11px] text-[var(--color-muted)]">
            title, price, original_price, currency, condition, quantity_available, category, brand,
            tags, description, status
          </p>
          <div className="grid grid-cols-1 gap-2 pt-1 text-[11px] text-[var(--color-muted)] sm:grid-cols-2">
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Mandatory:</span>{' '}
              title, price, category
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Condition:</span> new,
              used, refurbished
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Status:</span> active,
              draft
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Tags:</span>{' '}
              pipe-separated (e.g. <code>shoes|leather|formal</code>)
            </div>
          </div>
        </div>
      </Card>

      {/* Step 2: Upload CSV */}
      <Card
        className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
        hoverEffect={false}
      >
        <div className="text-sm font-semibold text-[var(--color-foreground)]">
          Step 2: Upload Completed CSV File
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? 'bg-[var(--color-accent)]/5 border-[var(--color-accent)]'
              : file
                ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                : 'hover:border-[var(--color-foreground)]/30 hover:bg-[var(--color-background)]/50 border-[var(--color-border)]'
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => {
              const selected = e.target.files?.[0];
              if (selected) setFile(selected);
            }}
          />

          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-background)]">
            <Upload
              className={`h-5 w-5 ${file ? 'text-emerald-500' : 'text-[var(--color-muted)]'}`}
            />
          </div>

          {file ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 text-sm font-bold text-[var(--color-foreground)]">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="rounded-full p-1 text-[var(--color-muted)] hover:bg-[var(--color-border)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="text-xs text-[var(--color-muted)]">
                {(file.size / 1024).toFixed(1)} KB · Ready to import
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="text-sm font-semibold text-[var(--color-foreground)]">
                Click to browse or drop your CSV file here
              </div>
              <div className="text-xs text-[var(--color-muted)]">
                Accepts standard comma-delimited .csv files up to 10MB
              </div>
            </div>
          )}
        </div>

        {/* Custom Alert for Error */}
        {error && (
          <Alert
            variant="error"
            title="Import Error"
            message={error}
            onDismiss={() => setError(null)}
          />
        )}

        <div className="flex items-center justify-between pt-2">
          {file && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="text-xs text-[var(--color-muted)] hover:underline"
            >
              Choose different file
            </button>
          )}
          <Button
            onClick={upload}
            disabled={!file || uploading}
            className="ml-auto gap-2 rounded-xl text-xs font-semibold"
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Importing CSV...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" /> Import Products
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Step 3: Results & Audit Table */}
      {result && (
        <Card
          className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6"
          hoverEffect={false}
        >
          <Alert
            variant={result.summary.failed > 0 ? 'warning' : 'success'}
            title={
              result.summary.failed > 0
                ? 'Import Finished with Warnings'
                : 'Import Finished Successfully'
            }
            message={`${result.summary.created} products created, ${result.summary.failed} failed out of ${result.summary.total} total rows processed.`}
          />

          <div className="overflow-hidden rounded-xl border border-[var(--color-border)] text-xs">
            <div className="grid grid-cols-12 border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted)]">
              <div className="col-span-1">Row</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-5">Product Title</div>
              <div className="col-span-5">Report / Error</div>
            </div>
            <div className="max-h-96 divide-y divide-[var(--color-border)] overflow-y-auto">
              {result.results.map((r) => (
                <div
                  key={r.row}
                  className={`grid grid-cols-12 items-center px-4 py-3 ${
                    r.ok ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-danger)]/[0.04]'
                  }`}
                >
                  <div className="col-span-1 font-mono text-[11px] text-[var(--color-muted)]">
                    #{r.row}
                  </div>
                  <div className="col-span-1">
                    {r.ok ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-[var(--color-danger)]" />
                    )}
                  </div>
                  <div className="col-span-5 truncate pr-2 font-semibold text-[var(--color-foreground)]">
                    {r.title || '—'}
                  </div>
                  <div className="col-span-5 text-[11px] text-[var(--color-muted)]">
                    {r.ok ? (
                      <span className="font-medium text-emerald-600 dark:text-emerald-400">
                        Imported successfully
                      </span>
                    ) : (
                      <span className="text-[var(--color-danger)]">
                        {r.error || 'Validation error'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {result.summary.created > 0 && (
            <div className="flex justify-end pt-2">
              <Link href="/dashboard/products">
                <Button size="sm" className="rounded-xl">
                  View Products in Catalog
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
