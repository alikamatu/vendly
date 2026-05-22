"use client";

import React, { useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, HTMLMotionProps } from "framer-motion";
import { Copy, Check, Download, X, ExternalLink } from "lucide-react";
import { QRCodeCanvas } from "qrcode.react";
import { toast } from "sonner";

interface StorefrontQRModalProps {
  open: boolean;
  onClose: () => void;
  storeLink: string;
  storeName: string;
}

export default function StorefrontQRModal({
  open,
  onClose,
  storeLink,
  storeName,
}: StorefrontQRModalProps) {
  const url = useMemo(() => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    return `${origin}/s/${storeLink}`;
  }, [storeLink]);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error("Could not copy");
    }
  }

  function download() {
    const canvas = canvasRef.current?.querySelector("canvas");
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${storeLink}-qr.png`;
    a.click();
  }

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          {...({
            initial: { opacity: 0 },
            animate: { opacity: 1 },
            exit: { opacity: 0 },
            onClick: onClose,
            className:
              "fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-sm",
          } as HTMLMotionProps<"div">)}
        >
          <motion.div
            {...({
              initial: { y: 40, opacity: 0, scale: 0.97 },
              animate: { y: 0, opacity: 1, scale: 1 },
              exit: { y: 40, opacity: 0 },
              transition: { type: "spring", stiffness: 360, damping: 30 },
              onClick: (e: React.MouseEvent) => e.stopPropagation(),
              className:
                "w-full sm:max-w-md bg-[var(--color-background)] border border-[var(--color-border)] rounded-t-3xl sm:rounded-3xl overflow-hidden",
              role: "dialog",
              "aria-modal": true,
              "aria-labelledby": "qr-modal-title",
            } as HTMLMotionProps<"div">)}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3">
              <div className="space-y-1">
                <p
                  id="qr-modal-title"
                  className="text-[10px] font-medium uppercase tracking-wider text-[var(--color-accent)]"
                >
                  Pro · Storefront QR
                </p>
                <h2 className="text-lg font-medium tracking-tight text-[var(--color-foreground)]">
                  {storeName}
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="p-2 rounded-xl text-[var(--color-muted)] hover:bg-[var(--color-surface)] hover:text-[var(--color-foreground)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-5 pb-5 space-y-4">
              <div
                ref={canvasRef}
                className="mx-auto p-5 rounded-2xl bg-white w-fit shadow-sm"
              >
                <QRCodeCanvas
                  value={url}
                  size={224}
                  includeMargin={false}
                  level="M"
                  bgColor="#ffffff"
                  fgColor="#000000"
                />
              </div>

              <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-2 px-3 py-2.5">
                <span className="flex-1 text-[11px] font-mono text-[var(--color-foreground)] truncate">
                  {url}
                </span>
                <button
                  onClick={copy}
                  className="p-1.5 rounded-lg hover:bg-[var(--color-border)]/60 text-[var(--color-muted)] hover:text-[var(--color-foreground)] transition-colors"
                  aria-label="Copy URL"
                  title="Copy URL"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={download}
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--color-foreground)] text-[var(--color-background)] text-xs font-medium hover:opacity-90 transition-opacity"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download PNG
                </button>
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="h-11 inline-flex items-center justify-center gap-2 rounded-2xl border border-[var(--color-border)] text-xs font-medium text-[var(--color-foreground)] hover:bg-[var(--color-surface)] transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Preview
                </a>
              </div>

              <p className="text-[11px] text-[var(--color-muted)] text-center leading-relaxed">
                Print on flyers, stick on packaging, or share digitally. Anyone who
                scans lands directly on your storefront.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
