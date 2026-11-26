'use client';

import React, { useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { websiteImportApi } from '@/lib/api/website-import';

const blobUrlCache = new Map<string, string>();

interface RemoteProductThumbProps {
  src: string;
  alt: string;
  token?: string | null;
  className?: string;
}

/**
 * Loads remote product preview thumbnails through Verndly's authenticated image
 * proxy into a local `blob:` URL so strict CSP `img-src` rules and external
 * website hotlink (`Referer`) blocks never break product photos in preview.
 */
export default function RemoteProductThumb({
  src,
  alt,
  token,
  className = 'h-full w-full object-cover',
}: RemoteProductThumbProps) {
  const isLocalOrCloudinary =
    src.startsWith('blob:') || src.startsWith('data:') || src.includes('res.cloudinary.com');

  const [fetched, setFetched] = useState<{ forSrc: string; url: string } | null>(null);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  const immediateSrc = isLocalOrCloudinary ? src : (blobUrlCache.get(src) ?? (!token ? src : null));

  const resolvedSrc = immediateSrc ?? (fetched?.forSrc === src ? fetched.url : null);
  const failed = failedSrc === src;

  useEffect(() => {
    if (isLocalOrCloudinary || blobUrlCache.get(src) || !token) {
      return;
    }

    let cancelled = false;
    websiteImportApi
      .fetchProxiedImageBlob(token, src)
      .then((blob) => {
        if (cancelled) return;
        const objectUrl = URL.createObjectURL(blob);
        blobUrlCache.set(src, objectUrl);
        setFetched({ forSrc: src, url: objectUrl });
      })
      .catch(() => {
        if (cancelled) return;
        setFetched({ forSrc: src, url: src });
      });

    return () => {
      cancelled = true;
    };
  }, [src, token, isLocalOrCloudinary]);

  if (failed) {
    return (
      <div className="text-muted flex h-full w-full flex-col items-center justify-center gap-0.5 p-1 text-center">
        <ImageOff className="h-4 w-4 opacity-60" />
        <span className="text-[9px] leading-tight">Unavailable</span>
      </div>
    );
  }

  if (!resolvedSrc) {
    return <div className="bg-foreground/[0.06] h-full w-full animate-pulse" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
      className={className}
    />
  );
}
