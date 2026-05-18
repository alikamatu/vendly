"use client";

import React from "react";
import { Clock } from "lucide-react";
import type { DeliveryTime } from "@/lib/api/onboarding";

interface DeliveryTimeSelectProps {
  value: DeliveryTime | null;
  onChange: (v: DeliveryTime) => void;
}

const OPTIONS: { value: DeliveryTime; label: string }[] = [
  { value: "SAME_DAY", label: "Same Day" },
  { value: "NEXT_DAY", label: "Next Day" },
  { value: "TWO_TO_THREE_DAYS", label: "2–3 Days" },
  { value: "FOUR_TO_SEVEN_DAYS", label: "4–7 Days" },
  { value: "MORE_THAN_ONE_WEEK", label: "More than 1 Week" },
];

export default function DeliveryTimeSelect({ value, onChange }: DeliveryTimeSelectProps) {
  return (
    <div className="space-y-2">
      <label
        htmlFor="avg-delivery-time"
        className="text-[11px] font-bold text-[var(--color-muted)] uppercase tracking-widest pl-1 flex items-center gap-1"
      >
        Average Delivery Time <span className="text-[var(--color-accent)]">*</span>
      </label>

      <div className="relative">
        <Clock className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-muted)] pointer-events-none" />
        <select
          id="avg-delivery-time"
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value as DeliveryTime)}
          className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl pl-11 pr-4 py-3 text-sm text-[var(--color-foreground)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 outline-none transition-all appearance-none cursor-pointer"
        >
          <option value="" disabled>Select average time</option>
          {OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
