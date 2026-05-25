"use client";

import React from "react";
import { authApi } from "@/lib/api/auth";

interface Props {
  /** Where to land after sign-in succeeds. Defaults to `/`. */
  next?: string;
  /** Label override. Defaults to "Continue with Google". */
  label?: string;
  className?: string;
}

/**
 * Sends the browser to the API's Google OAuth start endpoint. The API then
 * redirects to Google, Google redirects back to the API's callback, and the
 * API finally lands the browser at `/auth/callback#token=...`.
 */
export default function GoogleSignInButton({
  next,
  label = "Continue with Google",
  className = "",
}: Props) {
  const handleClick = () => {
    window.location.href = authApi.googleStartUrl(next);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border border-border bg-background text-foreground text-sm font-medium hover:bg-surface transition active:scale-[0.99] ${className}`}
    >
      <GoogleLogo />
      {label}
    </button>
  );
}

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.838.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.331A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.331z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}
