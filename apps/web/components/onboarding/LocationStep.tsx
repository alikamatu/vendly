"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { MapPin, ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import Button from "@/components/ui/Button";
import type {
  OnboardingStatus,
  ServiceArea,
  DeliveryTime,
} from "@/lib/api/onboarding";
import RegionCityPicker from "./RegionCityPicker";
import ServiceAreaSelect from "./ServiceAreaSelect";
import DeliveryTimeSelect from "./DeliveryTimeSelect";

interface LocationStepProps {
  data: OnboardingStatus["current_data"];
  onComplete: (formData: {
    location_id: string;
    area?: string;
    service_area: ServiceArea;
    avg_delivery_time: DeliveryTime;
  }) => void;
  isLoading: boolean;
  onBack: () => void;
}

const baseInput =
  "w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl px-4 py-3 text-sm text-[var(--color-foreground)] focus:ring-2 focus:ring-[var(--color-accent)]/30 focus:border-[var(--color-accent)]/50 outline-none transition-all placeholder:text-[var(--color-muted)]/50";

export default function LocationStep({
  data,
  onComplete,
  isLoading,
  onBack,
}: LocationStepProps) {
  const [cityId, setCityId] = useState<string>(data.location_id ?? "");
  const [region, setRegion] = useState<string>(data.location?.region ?? "");
  const [area, setArea] = useState<string>(data.area ?? "");
  const [serviceArea, setServiceArea] = useState<ServiceArea | null>(
    data.service_area ?? null,
  );
  const [deliveryTime, setDeliveryTime] = useState<DeliveryTime | null>(
    data.avg_delivery_time ?? null,
  );

  const canProceed =
    Boolean(region) && Boolean(cityId) && Boolean(serviceArea) && Boolean(deliveryTime);

  function handleSubmit() {
    if (!cityId) return toast.error("Please choose your city.");
    if (!serviceArea) return toast.error("Please choose a service area.");
    if (!deliveryTime) return toast.error("Please choose an average delivery time.");
    onComplete({
      location_id: cityId,
      area: area.trim() || undefined,
      service_area: serviceArea,
      avg_delivery_time: deliveryTime,
    });
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.25 }}
      className="space-y-6"
    >
      <header className="text-center space-y-2 mb-2 md:mb-6">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-[var(--color-accent)]/10 text-[var(--color-accent)]">
          <MapPin className="w-7 h-7" />
        </div>
        <h2 className="text-lg md:text-xl font-medium tracking-tight text-[var(--color-foreground)]">
          Set Your Location
        </h2>
        <p className="text-xs text-[var(--color-muted)] font-medium max-w-sm mx-auto leading-relaxed">
          Help customers near you find your store and know when their order arrives.
        </p>
      </header>

      <div className="space-y-6">
        <RegionCityPicker
          initialRegion={region}
          initialCityId={cityId}
          onError={(m) => toast.error(m)}
          onChange={({ region: r, cityId: c }) => {
            setRegion(r);
            setCityId(c);
          }}
        />

        <div className="space-y-2">
          <label className="text-[11px] font-normal text-[var(--color-muted)] uppercase tracking-wider pl-1">
            Area / Neighborhood{" "}
            <span className="text-[var(--color-muted)]/60 normal-case font-medium">
              (optional)
            </span>
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            placeholder="e.g. East Legon, Osu Oxford Street"
            className={baseInput}
          />
        </div>

        <ServiceAreaSelect value={serviceArea} onChange={setServiceArea} />
        <DeliveryTimeSelect value={deliveryTime} onChange={setDeliveryTime} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button
          onClick={onBack}
          variant="secondary"
          className="sm:flex-1 h-12 sm:h-13 text-sm font-normal rounded-2xl"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <Button
          onClick={handleSubmit}
          isLoading={isLoading}
          disabled={!canProceed}
          className="sm:flex-[2] h-12 sm:h-13 text-sm font-normal rounded-2xl disabled:opacity-40"
        >
          Continue <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </motion.div>
  );
}
