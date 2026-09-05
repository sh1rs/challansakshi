'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { startSharedDeviceInactivityGuard, type SharedDeviceInactivityGuard } from '../../lib/shared-device-inactivity';

/** Both utility journeys are ephemeral, including when returning from the back-forward cache. */
export function useUtilityPrivacy(clear: () => void) {
  const [generation, setGeneration] = useState(0);
  const currentGuard = useRef<SharedDeviceInactivityGuard | null>(null);
  useEffect(() => {
    const reset = () => { clear(); setGeneration(value => value + 1); };
    const restore = (event: PageTransitionEvent) => { if (event.persisted) reset(); };
    const guard = startSharedDeviceInactivityGuard({
      windowTarget: window, documentTarget: document,
      isVisible: () => document.visibilityState === 'visible', onExpire: reset,
    });
    currentGuard.current = guard;
    window.addEventListener('pagehide', reset);
    window.addEventListener('pageshow', restore);
    return () => { currentGuard.current = null; guard.stop(); window.removeEventListener('pagehide', reset); window.removeEventListener('pageshow', restore); };
  }, [clear, generation]);
  return useCallback(() => {
    if (!currentGuard.current || Date.now() >= currentGuard.current.getExpiresAt()) {
      clear(); setGeneration(value => value + 1); return false;
    }
    return true;
  }, [clear]);
}
