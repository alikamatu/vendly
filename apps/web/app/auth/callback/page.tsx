"use client";

import React, { Suspense, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

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

    localStorage.setItem("verndly_token", token);
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-sm text-center space-y-4">
        {status === "loading" && (
          <>
            <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted" />
            <p className="text-sm text-muted">Finishing sign-in…</p>
          </>
        )}
        {status === "success" && (
          <>
            <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
            <p className="text-sm">Signed in! Taking you to your dashboard…</p>
          </>
        )}
        {status === "error" && (
          <>
            <AlertCircle className="w-10 h-10 mx-auto text-red-500" />
            <h1 className="text-lg font-medium">Sign-in didn't complete</h1>
            <p className="text-sm text-muted">{error}</p>
            <div className="flex flex-col gap-2 pt-2">
              <Link
                href="/login"
                className="text-sm text-accent hover:underline"
              >
                Back to sign in
              </Link>
              <a
                href="mailto:support@verndly.com?subject=Sign-in%20issue"
                className="text-xs text-muted hover:underline"
              >
                Contact support
              </a>
            </div>
          </>
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
