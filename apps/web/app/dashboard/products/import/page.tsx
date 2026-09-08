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
    'Vendly',
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
    'Vendly',
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
  return [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
    .map((r) => r.map(csvEscape).join(','))
    .join('\n');
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/products"
          className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted)] hover:text-[var(--color-foreground)] inline-flex items-center gap-1.5 transition-colors group mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
          Back to products
        </Link>
        <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Bulk CSV Import
        </h1>
        <p className="text-xs sm:text-sm text-[var(--color-muted)] mt-1">
          Upload a CSV file to add dozens of product listings in seconds. Product photos and videos can be added after import.
        </p>
      </div>

      {/* Step 1: Download Template */}
      <Card className="p-6 space-y-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl" hoverEffect={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--color-accent)]/10 text-[var(--color-accent)] flex items-center justify-center shrink-0">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[var(--color-foreground)]">
                Step 1: Download Sample CSV Template
              </div>
              <div className="text-xs text-[var(--color-muted)] mt-0.5">
                Formatted with required headers, accepted enums, and 2 sample rows.
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={downloadTemplate}
            className="gap-2 rounded-xl text-xs font-semibold"
          >
            <Download className="w-4 h-4" /> Download Template (.csv)
          </Button>
        </div>

        {/* Column Specs */}
        <div className="bg-[var(--color-background)] border border-[var(--color-border)] p-4 rounded-xl space-y-2 text-xs">
          <div className="font-semibold text-[var(--color-foreground)] flex items-center gap-1.5">
            <HelpCircle className="w-3.5 h-3.5 text-[var(--color-accent)]" /> Expected Column Headers
          </div>
          <p className="text-[11px] font-mono text-[var(--color-muted)] bg-[var(--color-surface)] px-2.5 py-1.5 rounded-lg border border-[var(--color-border)] overflow-x-auto whitespace-nowrap">
            title, price, original_price, currency, condition, quantity_available, category, brand, tags, description, status
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-[var(--color-muted)] pt-1">
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Mandatory:</span> title, price, category
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Condition:</span> new, used, refurbished
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Status:</span> active, draft
            </div>
            <div>
              <span className="font-semibold text-[var(--color-foreground)]">Tags:</span> pipe-separated (e.g. <code>shoes|leather|formal</code>)
            </div>
          </div>
        </div>
      </Card>

      {/* Step 2: Upload CSV */}
      <Card className="p-6 space-y-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl" hoverEffect={false}>
        <div className="text-sm font-semibold text-[var(--color-foreground)]">
          Step 2: Upload Completed CSV File
        </div>

        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            isDragging
              ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/5'
              : file
                ? 'border-emerald-500/40 bg-emerald-500/[0.02]'
                : 'border-[var(--color-border)] hover:border-[var(--color-foreground)]/30 hover:bg-[var(--color-background)]/50'
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

          <div className="w-12 h-12 rounded-xl bg-[var(--color-background)] border border-[var(--color-border)] flex items-center justify-center mx-auto mb-3">
            <Upload className={`w-5 h-5 ${file ? 'text-emerald-500' : 'text-[var(--color-muted)]'}`} />
          </div>

          {file ? (
            <div className="space-y-1">
              <div className="text-sm font-bold text-[var(--color-foreground)] flex items-center justify-center gap-2">
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 rounded-full hover:bg-[var(--color-border)] text-[var(--color-muted)]"
                >
                  <X className="w-3.5 h-3.5" />
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
            className="gap-2 rounded-xl text-xs font-semibold ml-auto"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Importing CSV...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" /> Import Products
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Step 3: Results & Audit Table */}
      {result && (
        <Card className="p-6 space-y-4 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl" hoverEffect={false}>
          <Alert
            variant={result.summary.failed > 0 ? 'warning' : 'success'}
            title={result.summary.failed > 0 ? 'Import Finished with Warnings' : 'Import Finished Successfully'}
            message={`${result.summary.created} products created, ${result.summary.failed} failed out of ${result.summary.total} total rows processed.`}
          />

          <div className="border border-[var(--color-border)] rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-12 px-4 py-2.5 text-[10px] uppercase font-bold tracking-wider text-[var(--color-muted)] bg-[var(--color-background)] border-b border-[var(--color-border)]">
              <div className="col-span-1">Row</div>
              <div className="col-span-1">Status</div>
              <div className="col-span-5">Product Title</div>
              <div className="col-span-5">Report / Error</div>
            </div>
            <div className="divide-y divide-[var(--color-border)] max-h-96 overflow-y-auto">
              {result.results.map((r) => (
                <div
                  key={r.row}
                  className={`grid grid-cols-12 px-4 py-3 items-center ${
                    r.ok ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-danger)]/[0.04]'
                  }`}
                >
                  <div className="col-span-1 font-mono text-[11px] text-[var(--color-muted)]">
                    #{r.row}
                  </div>
                  <div className="col-span-1">
                    {r.ok ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-[var(--color-danger)]" />
                    )}
                  </div>
                  <div className="col-span-5 font-semibold text-[var(--color-foreground)] truncate pr-2">
                    {r.title || '—'}
                  </div>
                  <div className="col-span-5 text-[var(--color-muted)] text-[11px]">
                    {r.ok ? (
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                        Imported successfully
                      </span>
                    ) : (
                      <span className="text-[var(--color-danger)]">{r.error || 'Validation error'}</span>
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
