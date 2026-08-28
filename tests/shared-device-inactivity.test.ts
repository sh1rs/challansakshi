import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { startSharedDeviceInactivityGuard } from '../lib/shared-device-inactivity';

describe('shared-device inactivity guard', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-29T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function setup() {
    const windowTarget = new EventTarget();
    const documentTarget = new EventTarget();
    const onExpire = vi.fn();
    let visible = true;
    const guard = startSharedDeviceInactivityGuard({
      windowTarget,
      documentTarget,
      isVisible: () => visible,
      onExpire,
    });
    return {
      documentTarget,
      guard,
      onExpire,
      setVisible: (value: boolean) => { visible = value; },
      windowTarget,
    };
  }

  it.each(['pointerdown', 'keydown', 'input', 'touchstart'])('%s refreshes the absolute deadline', (eventName) => {
    const { guard, onExpire, windowTarget } = setup();
    const originalDeadline = guard.getExpiresAt();

    vi.advanceTimersByTime(9 * 60 * 1000);
    windowTarget.dispatchEvent(new Event(eventName));

    expect(guard.getExpiresAt()).toBe(originalDeadline + 9 * 60 * 1000);
    vi.advanceTimersByTime(2 * 60 * 1000);
    expect(onExpire).not.toHaveBeenCalled();
    vi.advanceTimersByTime(8 * 60 * 1000);
    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('clears after ten minutes with no deliberate activity', () => {
    const { onExpire } = setup();

    vi.advanceTimersByTime(10 * 60 * 1000);

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it.each(['focus', 'pageshow'])('clears immediately on overdue %s return', (eventName) => {
    const { onExpire, windowTarget } = setup();
    vi.setSystemTime(new Date('2026-08-29T00:11:00.000Z'));

    windowTarget.dispatchEvent(new Event(eventName));

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('clears immediately when an overdue tab becomes visible', () => {
    const { documentTarget, onExpire, setVisible } = setup();
    setVisible(false);
    vi.setSystemTime(new Date('2026-08-29T00:11:00.000Z'));
    setVisible(true);

    documentTarget.dispatchEvent(new Event('visibilitychange'));

    expect(onExpire).toHaveBeenCalledTimes(1);
  });

  it('removes timers and listeners when shared-device mode ends', () => {
    const { documentTarget, guard, onExpire, windowTarget } = setup();

    guard.stop();
    vi.setSystemTime(new Date('2026-08-29T00:20:00.000Z'));
    for (const eventName of ['pointerdown', 'keydown', 'input', 'touchstart', 'focus', 'pageshow']) {
      windowTarget.dispatchEvent(new Event(eventName));
    }
    documentTarget.dispatchEvent(new Event('visibilitychange'));
    vi.runOnlyPendingTimers();

    expect(onExpire).not.toHaveBeenCalled();
  });
});
