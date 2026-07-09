import { Capacitor } from '@capacitor/core';

export function usePlatform() {
  return { isNative: Capacitor.isNativePlatform() };
}
