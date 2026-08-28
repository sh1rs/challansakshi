const SHARED_DEVICE_INACTIVITY_MS = 10 * 60 * 1000;
const ACTIVITY_EVENTS = ['pointerdown', 'keydown', 'input', 'touchstart'] as const;
const RETURN_EVENTS = ['focus', 'pageshow'] as const;

type EventTargetLike = Pick<EventTarget, 'addEventListener' | 'removeEventListener'>;

export type SharedDeviceInactivityGuard = {
  getExpiresAt: () => number;
  stop: () => void;
};

export function startSharedDeviceInactivityGuard({
  windowTarget,
  documentTarget,
  isVisible,
  onExpire,
  now = Date.now,
  timeoutMs = SHARED_DEVICE_INACTIVITY_MS,
}: {
  windowTarget: EventTargetLike;
  documentTarget: EventTargetLike;
  isVisible: () => boolean;
  onExpire: () => void;
  now?: () => number;
  timeoutMs?: number;
}): SharedDeviceInactivityGuard {
  let expiresAt = now() + timeoutMs;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  let expired = false;

  const clearTimer = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearTimer();
    for (const eventName of ACTIVITY_EVENTS) {
      windowTarget.removeEventListener(eventName, recordActivity);
    }
    for (const eventName of RETURN_EVENTS) {
      windowTarget.removeEventListener(eventName, checkExpiry);
    }
    documentTarget.removeEventListener('visibilitychange', checkVisibleExpiry);
  };

  const expire = () => {
    if (expired || stopped) return;
    expired = true;
    stop();
    onExpire();
  };

  const schedule = () => {
    if (stopped || expired) return;
    clearTimer();
    const remaining = expiresAt - now();
    if (remaining <= 0) {
      expire();
      return;
    }
    timer = setTimeout(checkExpiry, remaining);
  };

  function checkExpiry() {
    if (now() >= expiresAt) {
      expire();
      return;
    }
    schedule();
  }

  function checkVisibleExpiry() {
    if (isVisible()) checkExpiry();
  }

  function recordActivity() {
    if (now() >= expiresAt) {
      expire();
      return;
    }
    expiresAt = now() + timeoutMs;
    schedule();
  }

  for (const eventName of ACTIVITY_EVENTS) {
    windowTarget.addEventListener(eventName, recordActivity);
  }
  for (const eventName of RETURN_EVENTS) {
    windowTarget.addEventListener(eventName, checkExpiry);
  }
  documentTarget.addEventListener('visibilitychange', checkVisibleExpiry);
  schedule();

  return {
    getExpiresAt: () => expiresAt,
    stop,
  };
}
