"use client";

import React, { useRef, useState } from "react";
import Link from "next/link";
import {
  Upload,
  Download,
  ArrowLeft,
  FileText,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { useAuth } from "@/lib/contexts/auth-context";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:1000";

const TEMPLATE_HEADERS = [
  "title",
  "price",
  "original_price",
  "currency",
  "condition",
  "quantity_available",
  "category",
  "brand",
  "tags",
  "description",
  "status",
];

const TEMPLATE_ROWS = [
  [
    "Linen shirt — sand",
    "180",
    "240",
    "GHS",
    "new",
    "12",
    "Clothing",
    "Verndly",
    "linen|summer|menswear",
    "Lightweight breathable linen shirt.",
    "draft",
  ],
  [
    "Ceramic mug 350ml",
    "55",
    "",
    "GHS",
    "new",
    "30",
    "Home",
    "Verndly",
    "kitchen|gift",
    "Stoneware mug, dishwasher safe.",
    "draft",
  ],
];

function csvEscape(v: string) {
  if (/[",\n\r]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

function buildTemplate(): string {
  return [TEMPLATE_HEADERS, ...TEMPLATE_ROWS]
    .map((r) => r.map(csvEscape).join(","))
    .join("\n");
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
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResponse | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const downloadTemplate = () => {
    const blob = new Blob([buildTemplate()], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verndly-products-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const upload = async () => {
    if (!file || !token) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`${API_URL}/products/bulk-import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        const msg = Array.isArray(json?.message)
          ? json.message[0]
          : json?.message || "Upload failed";
        throw new Error(msg);
      }
      const data: ImportResponse =
        json && typeof json === "object" && "data" in json ? json.data : json;
      setResult(data);
    } catch (e: any) {
      setError(e?.message || "Failed to import");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-0 py-8 space-y-8">
      <div>
        <Link
          href="/dashboard/products"
          className="text-[10px] uppercase tracking-wider text-muted hover:text-foreground inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-3 h-3" /> Back to products
        </Link>
        <h1 className="text-2xl mt-2 tracking-tight">Bulk import products</h1>
        <p className="text-sm text-muted mt-1">
          Upload a CSV to create multiple listings at once. Images are added
          later by editing each product.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 mt-0.5 text-muted" />
            <div>
              <div className="text-sm font-medium">Get the template</div>
              <div className="text-xs text-muted">
                Includes required columns and two example rows.
              </div>
            </div>
          </div>
          <Button
            variant="secondary"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="w-4 h-4" /> Download template
          </Button>
        </div>

        <div className="text-xs text-muted">
          <div className="font-medium text-foreground/80 mb-1">Columns</div>
          <code className="text-[11px] bg-surface px-2 py-1 rounded">
            title, price, original_price, currency, condition,
            quantity_available, category, brand, tags, description, status
          </code>
          <div className="mt-2">
            <span className="text-foreground/80">Required:</span> title, price,
            category. <span className="text-foreground/80">Tags:</span>{" "}
            pipe-separated (e.g. <code>red|cotton|gift</code>).
          </div>
        </div>
      </Card>

      <Card className="p-5 space-y-4">
        <div className="text-sm font-medium">Upload CSV</div>
        <label
          onClick={() => inputRef.current?.click()}
          className="block border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition"
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <Upload className="w-6 h-6 mx-auto text-muted mb-2" />
          {file ? (
            <>
              <div className="text-sm font-medium">{file.name}</div>
              <div className="text-xs text-muted">
                {(file.size / 1024).toFixed(1)} KB
              </div>
            </>
          ) : (
            <>
              <div className="text-sm">Click to choose a CSV file</div>
              <div className="text-xs text-muted">or drag a file onto this area</div>
            </>
          )}
        </label>

        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-500/5 border border-red-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-4 h-4" /> {error}
          </div>
        )}

        <div className="flex justify-end">
          <Button onClick={upload} disabled={!file || uploading} className="gap-2">
            <Upload className="w-4 h-4" />{" "}
            {uploading ? "Importing…" : "Import products"}
          </Button>
        </div>
      </Card>

      {result && (
        <Card className="p-5 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium">
              {result.summary.created} created · {result.summary.failed} failed ·{" "}
              {result.summary.total} processed
            </span>
          </div>

          <div className="border rounded-xl overflow-hidden">
            <div className="grid grid-cols-12 px-3 py-2 text-[11px] uppercase tracking-wider text-muted bg-surface/40">
              <div className="col-span-1">Row</div>
              <div className="col-span-1">OK</div>
              <div className="col-span-6">Title</div>
              <div className="col-span-4">Error</div>
            </div>
            <div className="divide-y max-h-96 overflow-y-auto">
              {result.results.map((r) => (
                <div
                  key={r.row}
                  className={`grid grid-cols-12 px-3 py-2 text-xs ${
                    r.ok ? "" : "bg-red-500/5"
                  }`}
                >
                  <div className="col-span-1">{r.row}</div>
                  <div className="col-span-1">
                    {r.ok ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                    )}
                  </div>
                  <div className="col-span-6 truncate">{r.title || "—"}</div>
                  <div className="col-span-4 text-muted">{r.error || ""}</div>
                </div>
              ))}
            </div>
          </div>

          {result.summary.created > 0 && (
            <div className="flex justify-end">
              <Link href="/dashboard/products">
                <Button size="sm" variant="secondary">
                  Back to products
                </Button>
              </Link>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
