"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";

interface PortalProps {
  children: ReactNode;
  elementId?: string;
}

export default function Portal({ children, elementId = "portal-root" }: PortalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Ensure element exists
    if (!document.getElementById(elementId)) {
      const el = document.createElement("div");
      el.id = elementId;
      document.body.appendChild(el);
    }
  }, [elementId]);

  if (!mounted) return null;

  const target = document.getElementById(elementId);
  return target ? createPortal(children, target) : null;
}
