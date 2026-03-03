import { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    YT: {
      Player: new (
        elementId: string,
        options: {
          width?: number;
          height?: number;
          videoId?: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onStateChange?: (event: { data: number; target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        ENDED: number;
        PLAYING: number;
        PAUSED: number;
        BUFFERING: number;
        CUED: number;
        UNSTARTED: number;
      };
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

interface YTPlayer {
  loadVideoById: (videoId: string) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  stopVideo: () => void;
  seekTo: (seconds: number, allowSeekAhead?: boolean) => void;
  setVolume: (volume: number) => void;
  getVolume: () => number;
  mute: () => void;
  unMute: () => void;
  isMuted: () => boolean;
  getCurrentTime: () => number;
  getDuration: () => number;
  getPlayerState: () => number;
  destroy: () => void;
}

type PlayerHookOptions = {
  onEnded?: () => void;
  onStateChange?: (state: number) => void;
  onReady?: () => void;
  currentTrack?: { title: string; channelName: string; thumbnail: string };
  onPrev?: () => void;
  onNext?: () => void;
};

export function useYouTubePlayer({
  onEnded,
  onStateChange,
  onReady,
  currentTrack,
  onPrev,
  onNext,
}: PlayerHookOptions = {}) {
  const playerRef = useRef<YTPlayer | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(80);
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<number | null>(null);
  const onEndedRef = useRef(onEnded);
  const onStateChangeRef = useRef(onStateChange);
  const onReadyRef = useRef(onReady);
  const onPrevRef = useRef(onPrev);
  const onNextRef = useRef(onNext);
  const currentTrackRef = useRef(currentTrack);

  useEffect(() => {
    onEndedRef.current = onEnded;
  }, [onEnded]);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);
  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);
  useEffect(() => {
    onPrevRef.current = onPrev;
  }, [onPrev]);
  useEffect(() => {
    onNextRef.current = onNext;
  }, [onNext]);
  useEffect(() => {
    currentTrackRef.current = currentTrack;
  }, [currentTrack]);

  // Update media session metadata when track changes.
  // Providing multiple artwork sizes (including 512x512) ensures Android and
  // iOS show the notification with full media controls (Prev / Next buttons).
  // Note: omitting the `type` field avoids MIME-type validation failures on
  // some Android browsers which can silently prevent artwork from appearing.
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channelName,
      album: "TuneSearch",
      artwork: [
        { src: currentTrack.thumbnail, sizes: "96x96" },
        { src: currentTrack.thumbnail, sizes: "128x128" },
        { src: currentTrack.thumbnail, sizes: "192x192" },
        { src: currentTrack.thumbnail, sizes: "256x256" },
        { src: currentTrack.thumbnail, sizes: "512x512" },
      ],
    });
  }, [currentTrack]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      if (playerRef.current) {
        const ct = playerRef.current.getCurrentTime() || 0;
        const dur = playerRef.current.getDuration() || 0;
        setCurrentTime(ct);
        setDuration(dur);
        // Update Media Session position state for notification bar seek
        if ("mediaSession" in navigator && dur > 0) {
          try {
            navigator.mediaSession.setPositionState({
              duration: dur,
              playbackRate: 1,
              position: ct,
            });
          } catch {
            // ignore — some browsers don't support setPositionState
          }
        }
      }
    }, 500);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const seekBy = useCallback((seconds: number) => {
    if (!playerRef.current) return;
    const current = playerRef.current.getCurrentTime() || 0;
    const dur = playerRef.current.getDuration() || 0;
    const newTime = Math.max(0, Math.min(dur, current + seconds));
    playerRef.current.seekTo(newTime, true);
    setCurrentTime(newTime);
  }, []);

  // Stable Media Session handler registration — defined early so initPlayer
  // can reference it via ref without a circular dependency.
  // Both previoustrack AND nexttrack must be registered for Android/iOS to
  // show Prev/Next buttons in the notification shade.
  const registerMediaSessionHandlers = useCallback(() => {
    if (!("mediaSession" in navigator)) return;
    try {
      navigator.mediaSession.setActionHandler("play", () => {
        playerRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
        playerRef.current?.pauseVideo();
      });
      navigator.mediaSession.setActionHandler("stop", () => {
        playerRef.current?.pauseVideo();
      });
      navigator.mediaSession.setActionHandler("previoustrack", () => {
        onPrevRef.current?.();
      });
      navigator.mediaSession.setActionHandler("nexttrack", () => {
        onNextRef.current?.();
      });
      navigator.mediaSession.setActionHandler("seekbackward", (details) => {
        seekBy(-(details.seekOffset ?? 10));
      });
      navigator.mediaSession.setActionHandler("seekforward", (details) => {
        seekBy(details.seekOffset ?? 10);
      });
    } catch {
      // Some browsers may not support all action handlers
    }
  }, [seekBy]);

  // Declared here (before initPlayer) so the onStateChange closure can reference it.
  const wasPlayingRef = useRef(false);
  // Ref to registerMediaSessionHandlers so initPlayer's onStateChange closure
  // can call the latest version without a circular dependency.
  const registerMediaSessionHandlersRef = useRef<() => void>(() => {});
  // Keep the ref current whenever the callback changes
  registerMediaSessionHandlersRef.current = registerMediaSessionHandlers;

  const initPlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player) return;
    if (playerRef.current) return;

    const el = document.getElementById("yt-player");
    if (!el) {
      // DOM element not ready yet — retry after a short delay
      setTimeout(() => initPlayer(), 150);
      return;
    }

    playerRef.current = new window.YT.Player("yt-player", {
      width: 1,
      height: 1,
      playerVars: {
        autoplay: 0,
        controls: 0,
        disablekb: 1,
        fs: 0,
        rel: 0,
        modestbranding: 1,
        iv_load_policy: 3,
        origin: window.location.origin,
      },
      events: {
        onReady: (event) => {
          event.target.setVolume(80);
          setIsReady(true);
          setVolumeState(80);
          onReadyRef.current?.();
        },
        onStateChange: (event) => {
          const state = event.data;
          onStateChangeRef.current?.(state);

          if (state === window.YT.PlayerState.PLAYING) {
            setIsPlaying(true);
            startTimer();
            // Confirmed playing — clear the "was playing" flag
            wasPlayingRef.current = false;
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
              // Re-set metadata on PLAYING in case it was cleared by a track change
              if (currentTrackRef.current) {
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: currentTrackRef.current.title,
                  artist: currentTrackRef.current.channelName,
                  album: "TuneSearch",
                  artwork: [
                    { src: currentTrackRef.current.thumbnail, sizes: "96x96" },
                    {
                      src: currentTrackRef.current.thumbnail,
                      sizes: "128x128",
                    },
                    {
                      src: currentTrackRef.current.thumbnail,
                      sizes: "192x192",
                    },
                    {
                      src: currentTrackRef.current.thumbnail,
                      sizes: "256x256",
                    },
                    {
                      src: currentTrackRef.current.thumbnail,
                      sizes: "512x512",
                    },
                  ],
                });
              }
              // Re-register all 7 action handlers via the stable ref.
              // Both previoustrack AND nexttrack must be registered for Android/iOS
              // to show Prev/Next buttons in the notification bar / lock screen.
              registerMediaSessionHandlersRef.current();
            }
          } else if (state === window.YT.PlayerState.PAUSED) {
            // If YouTube forced a pause because the page is hidden, fight it back.
            // Do NOT update the UI to "paused" — the user did not press pause.
            if (wasPlayingRef.current && document.hidden) {
              setTimeout(() => {
                try {
                  playerRef.current?.playVideo();
                } catch {
                  // ignore
                }
              }, 300);
              return;
            }
            setIsPlaying(false);
            stopTimer();
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "paused";
            }
          } else if (state === window.YT.PlayerState.BUFFERING) {
            // Buffering — keep current isPlaying state; do not stop timer
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            stopTimer();
            wasPlayingRef.current = false;
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "none";
            }
            onEndedRef.current?.();
          }
        },
      },
    });
  }, [startTimer, stopTimer]);

  // Register Media Session action handlers as soon as the API is available.
  // We use refs for onPrev/onNext so the handlers always call the latest
  // callbacks without needing to re-register on every render.
  // This must run once on mount (regardless of isReady) so the notification
  // bar shows Prev / Next buttons as soon as metadata is set.
  useEffect(() => {
    if (!("mediaSession" in navigator)) return;

    // Register immediately on mount
    registerMediaSessionHandlers();

    return () => {
      if (!("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("stop", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
      } catch {
        // ignore
      }
    };
  }, [registerMediaSessionHandlers]);

  // Helper: retry playVideo up to `maxAttempts` times with `intervalMs` spacing.
  // Stops early if the player confirms PLAYING state. Does NOT reset wasPlayingRef
  // here — that is done in the PLAYING onStateChange handler to avoid races.
  const retryPlay = useCallback((maxAttempts = 5, intervalMs = 300) => {
    let attempts = 0;
    const attempt = () => {
      attempts++;
      try {
        const st = playerRef.current?.getPlayerState();
        if (st === (window.YT?.PlayerState?.PLAYING ?? 1)) {
          // Already playing — clear flag immediately
          wasPlayingRef.current = false;
          return;
        }
        playerRef.current?.playVideo();
        if (attempts < maxAttempts) {
          setTimeout(attempt, intervalMs);
        } else {
          wasPlayingRef.current = false;
        }
      } catch {
        wasPlayingRef.current = false;
      }
    };
    setTimeout(attempt, 150);
  }, []);

  // Track visibility to resume playback when the page is hidden (home screen,
  // app switching, tab backgrounded). We do NOT pause on hide. We set
  // wasPlayingRef so the onStateChange PAUSED handler knows a YouTube-forced
  // pause happened and fights it back immediately. The retry loop here is a
  // belt-and-suspenders fallback for when visibility returns.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!playerRef.current) return;
      if (document.visibilityState === "hidden") {
        const state = playerRef.current.getPlayerState();
        if (state === (window.YT?.PlayerState?.PLAYING ?? 1)) {
          wasPlayingRef.current = true;
        }
        // Do NOT pause — let audio keep running.
      } else if (document.visibilityState === "visible") {
        if (wasPlayingRef.current) {
          // Retry up to 5 times: YouTube may need a moment to accept playVideo()
          retryPlay(5, 300);
        }
      }
    };

    // Page Lifecycle API: freeze fires when OS suspends the page (mobile Chrome)
    const handleFreeze = () => {
      if (!playerRef.current) return;
      const state = playerRef.current.getPlayerState();
      if (state === (window.YT?.PlayerState?.PLAYING ?? 1)) {
        wasPlayingRef.current = true;
      }
    };

    const handleResume = () => {
      if (wasPlayingRef.current) {
        retryPlay(5, 300);
      }
    };

    // pagehide fires on mobile Safari when tab is backgrounded
    const handlePageHide = () => {
      if (!playerRef.current) return;
      const state = playerRef.current.getPlayerState();
      if (state === (window.YT?.PlayerState?.PLAYING ?? 1)) {
        wasPlayingRef.current = true;
      }
    };

    const handlePageShow = () => {
      if (wasPlayingRef.current) {
        retryPlay(5, 300);
      }
    };

    // window blur fires on Android when the user switches to another app,
    // often BEFORE visibilitychange — capture the playing state early.
    const handleBlur = () => {
      if (!playerRef.current) return;
      const state = playerRef.current.getPlayerState();
      if (state === (window.YT?.PlayerState?.PLAYING ?? 1)) {
        wasPlayingRef.current = true;
      }
    };

    // window focus = user returned to this tab/app
    const handleFocus = () => {
      if (wasPlayingRef.current) {
        retryPlay(5, 300);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("freeze", handleFreeze);
    document.addEventListener("resume", handleResume);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("pageshow", handlePageShow);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("freeze", handleFreeze);
      document.removeEventListener("resume", handleResume);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("pageshow", handlePageShow);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [retryPlay]);

  useEffect(() => {
    const loadYTApi = () => {
      if (window.YT?.Player) {
        initPlayer();
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      tag.async = true;
      const firstScript = document.getElementsByTagName("script")[0];
      firstScript?.parentNode?.insertBefore(tag, firstScript);

      window.onYouTubeIframeAPIReady = () => {
        initPlayer();
      };
    };

    loadYTApi();

    // Retry init in case DOM element wasn't ready when API first loaded
    const retryTimer = setTimeout(() => {
      if (!playerRef.current) {
        initPlayer();
      }
    }, 1500);

    return () => {
      clearTimeout(retryTimer);
      stopTimer();
    };
  }, [initPlayer, stopTimer]);

  const loadAndPlay = useCallback(
    (videoId: string) => {
      if (!playerRef.current) return;
      playerRef.current.loadVideoById(videoId);
      // Re-register Media Session handlers immediately after loading a new video
      // so that the notification bar Prev/Next buttons are always present.
      registerMediaSessionHandlers();
      // Update metadata for the new track immediately (before PLAYING fires)
      if ("mediaSession" in navigator && currentTrackRef.current) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: currentTrackRef.current.title,
          artist: currentTrackRef.current.channelName,
          album: "TuneSearch",
          artwork: [
            { src: currentTrackRef.current.thumbnail, sizes: "96x96" },
            { src: currentTrackRef.current.thumbnail, sizes: "128x128" },
            { src: currentTrackRef.current.thumbnail, sizes: "192x192" },
            { src: currentTrackRef.current.thumbnail, sizes: "256x256" },
            { src: currentTrackRef.current.thumbnail, sizes: "512x512" },
          ],
        });
      }
    },
    [registerMediaSessionHandlers],
  );

  const play = useCallback(() => {
    playerRef.current?.playVideo();
  }, []);

  const pause = useCallback(() => {
    playerRef.current?.pauseVideo();
  }, []);

  const togglePlay = useCallback(() => {
    if (!playerRef.current) return;
    const state = playerRef.current.getPlayerState();
    if (state === (window.YT?.PlayerState?.PLAYING ?? 1)) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    playerRef.current?.seekTo(seconds, true);
    setCurrentTime(seconds);
  }, []);

  const setVolume = useCallback(
    (vol: number) => {
      playerRef.current?.setVolume(vol);
      setVolumeState(vol);
      if (vol > 0 && isMuted) {
        playerRef.current?.unMute();
        setIsMuted(false);
      }
    },
    [isMuted],
  );

  const toggleMute = useCallback(() => {
    if (!playerRef.current) return;
    if (playerRef.current.isMuted()) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  }, []);

  return {
    isReady,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    loadAndPlay,
    play,
    pause,
    togglePlay,
    seekTo,
    seekBy,
    setVolume,
    toggleMute,
  };
}
