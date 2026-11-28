export interface DevicePoint {
  latitude: number;
  longitude: number;
}

export function readDeviceLocation(): Promise<DevicePoint> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('This browser cannot share a location.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          reject(new Error('Location permission is needed so nearby stores can deliver to you.'));
          return;
        }
        reject(new Error('Could not read your location. Try again.'));
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 },
    );
  });
}

export function storeDeliversNearby(serviceArea: string | null | undefined): boolean {
  return serviceArea === 'SAME_CITY' || serviceArea === 'NEARBY_STATES';
}
