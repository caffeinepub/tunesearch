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

  // Update media session metadata when track changes
  useEffect(() => {
    if (!("mediaSession" in navigator) || !currentTrack) return;
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentTrack.title,
      artist: currentTrack.channelName,
      artwork: [
        { src: currentTrack.thumbnail, sizes: "96x96", type: "image/jpeg" },
        { src: currentTrack.thumbnail, sizes: "128x128", type: "image/jpeg" },
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

  const initPlayer = useCallback(() => {
    if (!window.YT || !window.YT.Player) return;
    if (playerRef.current) return;

    const el = document.getElementById("yt-player");
    if (!el) return;

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
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "playing";
              if (currentTrackRef.current) {
                navigator.mediaSession.metadata = new MediaMetadata({
                  title: currentTrackRef.current.title,
                  artist: currentTrackRef.current.channelName,
                  artwork: [
                    {
                      src: currentTrackRef.current.thumbnail,
                      sizes: "96x96",
                      type: "image/jpeg",
                    },
                  ],
                });
              }
            }
          } else if (
            state === window.YT.PlayerState.PAUSED ||
            state === window.YT.PlayerState.BUFFERING
          ) {
            if (state === window.YT.PlayerState.PAUSED) {
              setIsPlaying(false);
              stopTimer();
              if ("mediaSession" in navigator) {
                navigator.mediaSession.playbackState = "paused";
              }
            }
          } else if (state === window.YT.PlayerState.ENDED) {
            setIsPlaying(false);
            stopTimer();
            if ("mediaSession" in navigator) {
              navigator.mediaSession.playbackState = "none";
            }
            onEndedRef.current?.();
          }
        },
      },
    });
  }, [startTimer, stopTimer]);

  // Register Media Session action handlers when player is ready
  useEffect(() => {
    if (!isReady || !("mediaSession" in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler("play", () => {
        playerRef.current?.playVideo();
      });
      navigator.mediaSession.setActionHandler("pause", () => {
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

    return () => {
      if (!("mediaSession" in navigator)) return;
      try {
        navigator.mediaSession.setActionHandler("play", null);
        navigator.mediaSession.setActionHandler("pause", null);
        navigator.mediaSession.setActionHandler("previoustrack", null);
        navigator.mediaSession.setActionHandler("nexttrack", null);
        navigator.mediaSession.setActionHandler("seekbackward", null);
        navigator.mediaSession.setActionHandler("seekforward", null);
      } catch {
        // ignore
      }
    };
  }, [isReady, seekBy]);

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

    return () => {
      stopTimer();
    };
  }, [initPlayer, stopTimer]);

  const loadAndPlay = useCallback((videoId: string) => {
    if (!playerRef.current) return;
    playerRef.current.loadVideoById(videoId);
  }, []);

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
