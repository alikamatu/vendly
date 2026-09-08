"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import Spinner from "@/components/ui/Spinner";

/**
 * Endpoint the API redirects to after a successful Google OAuth handshake.
 * The token is delivered in the URL hash (`#token=...&next=...`) so it never
 * hits server logs. We pull it out, stash it in localStorage, and bounce.
 */
function CallbackInner() {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) {
      setStatus("error");
      setError("Missing sign-in details. Please try again from the sign-in page.");
      return;
    }
    const params = new URLSearchParams(hash);
    const token = params.get("token");
    const next = params.get("next") || "/";
    if (!token) {
      setStatus("error");
      setError("Couldn't read your sign-in token. Please try again.");
      return;
    }

    localStorage.setItem("vendly_token", token);
    // Strip the hash so the token doesn't linger in the address bar.
    window.history.replaceState(null, "", window.location.pathname);
    setStatus("success");
    // A short delay so the user sees confirmation before the redirect.
    const id = window.setTimeout(() => {
      // Hard reload so the auth-context picks up the new token cleanly.
      window.location.href = next;
    }, 600);
    return () => window.clearTimeout(id);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-sm rounded-3xl border border-border bg-card p-8 text-center shadow-sm space-y-5">
        {status === "loading" && (
          <div className="py-4 space-y-4">
            <Spinner size="lg" className="mx-auto text-foreground" />
            <div>
              <h2 className="text-base font-medium text-foreground">Completing sign-in</h2>
              <p className="text-xs text-muted mt-1">Securing your session…</p>
            </div>
          </div>
        )}
        {status === "success" && (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-medium text-foreground">Signed in successfully</h2>
              <p className="text-xs text-muted mt-1">Taking you to your dashboard…</p>
            </div>
          </div>
        )}
        {status === "error" && (
          <div className="py-4 space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-base font-medium text-foreground">Sign-in couldn't be completed</h1>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">{error}</p>
            </div>
            <div className="flex flex-col gap-2.5 pt-2">
              <Link
                href="/login"
                className="w-full h-11 inline-flex items-center justify-center rounded-xl bg-foreground text-background text-xs font-medium hover:opacity-90 transition-opacity"
              >
                Back to sign in
              </Link>
              <a
                href="mailto:support@verndly.app?subject=Sign-in%20issue"
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Contact support
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={null}>
      <CallbackInner />
    </Suspense>
  );
}
