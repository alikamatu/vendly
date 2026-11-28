'use client';

import { useState } from 'react';
import { LocateFixed, Check } from 'lucide-react';
import { toast } from 'sonner';
import { readDeviceLocation, type DevicePoint } from '@/lib/location/device-location';

export default function UseCurrentLocation({
  saved,
  onPoint,
}: {
  saved?: boolean;
  onPoint: (point: DevicePoint) => void;
}) {
  const [reading, setReading] = useState(false);
  const ready = Boolean(saved);

  return (
    <button
      type="button"
      disabled={reading}
      onClick={() => {
        setReading(true);
        readDeviceLocation()
          .then((point) => {
            onPoint(point);
            toast.success('Location saved on this device.');
          })
          .catch((err: unknown) => {
            toast.error(err instanceof Error ? err.message : 'Could not read your location.');
          })
          .finally(() => setReading(false));
      }}
      className="text-foreground bg-[var(--color-foreground)]/5 inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {ready ? (
        <Check className="h-3.5 w-3.5 text-emerald-600" />
      ) : (
        <LocateFixed className="h-3.5 w-3.5" />
      )}
      <span>
        {reading ? 'Reading location...' : ready ? 'Location saved' : 'Use current location'}
      </span>
    </button>
  );
}
