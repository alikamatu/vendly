"use client";

import React from "react";
import { Clock } from "lucide-react";
import type { DeliveryTime } from "@/lib/api/onboarding";
import Select from "@/components/ui/Select";

interface DeliveryTimeSelectProps {
  value: DeliveryTime | null;
  onChange: (v: DeliveryTime) => void;
}

const OPTIONS = [
  { value: "SAME_DAY", label: "Same Day" },
  { value: "NEXT_DAY", label: "Next Day" },
  { value: "TWO_TO_THREE_DAYS", label: "2–3 Days" },
  { value: "FOUR_TO_SEVEN_DAYS", label: "4–7 Days" },
  { value: "MORE_THAN_ONE_WEEK", label: "More than 1 Week" },
];

export default function DeliveryTimeSelect({ value, onChange }: DeliveryTimeSelectProps) {
  return (
    <div className="w-full">
      <Select
        id="avg-delivery-time"
        label="Average Delivery Time"
        icon={<Clock className="w-4 h-4" />}
        value={value ?? ""}
        onChange={(v) => onChange(v as DeliveryTime)}
        options={OPTIONS}
        placeholder="Select average time"
      />
    </div>
  );
}
