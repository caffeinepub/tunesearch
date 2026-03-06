/**
 * useBackgroundPermission
 *
 * Requests persistent storage (needed for background wake-lock on some browsers)
 * and optionally acquires a Screen Wake Lock so the screen stays on while music
 * plays — giving the best chance for uninterrupted background audio, similar
 * to how native music apps (Spotify, YouTube Music) work.
 *
 * Note: browsers have hard limits on what web apps can do in the background.
 * This does the maximum that is legally possible within those limits.
 */
import { useEffect, useRef } from "react";

export function useBackgroundPermission(isPlaying: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const hasRequestedStorageRef = useRef(false);

  // Request persistent storage once on mount — this helps browsers treat
  // our origin as "installed" and give it more background leniency.
  useEffect(() => {
    if (hasRequestedStorageRef.current) return;
    hasRequestedStorageRef.current = true;

    if ("storage" in navigator && "persist" in navigator.storage) {
      navigator.storage.persist().catch(() => {
        // Silently ignore — not critical
      });
    }
  }, []);

  // Acquire / release Screen Wake Lock based on playback state.
  // When the screen stays on, audio keeps playing without interruption.
  // The lock is released automatically when the user manually locks their
  // screen or when playback stops.
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;

    const acquire = async () => {
      try {
        wakeLockRef.current = await (
          navigator.wakeLock as {
            request: (type: string) => Promise<WakeLockSentinel>;
          }
        ).request("screen");
      } catch {
        // Not granted — silently continue
      }
    };

    const release = () => {
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };

    // Re-acquire lock when the page becomes visible again (lock is released
    // automatically on visibility hide by the browser)
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && isPlaying) {
        acquire();
      }
    };

    if (isPlaying) {
      acquire();
      document.addEventListener("visibilitychange", handleVisibility);
    } else {
      release();
    }

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      release();
    };
  }, [isPlaying]);
}
