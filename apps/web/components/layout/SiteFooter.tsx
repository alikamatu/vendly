"use client";

import React from "react";
import { usePathname } from "next/navigation";
import Footer from "./Footer";

const HIDE_PREFIXES = [
  "/dashboard",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/seller-verification",
  "/onboarding",
];

/** Renders the global footer except on dashboard + auth/onboarding routes. */
export default function SiteFooter() {
  const pathname = usePathname();
  if (!pathname) return <Footer />;
  if (HIDE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return null;
  }
  return <Footer />;
}
