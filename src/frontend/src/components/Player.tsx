import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useBackgroundPermission } from "@/hooks/useBackgroundPermission";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useAppState } from "@/store/useAppStore";
import type { RepeatMode, Track } from "@/store/useAppStore";
import {
  ChevronDown,
  Download,
  Heart,
  ListMusic,
  Loader2,
  Lock,
  Music,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

function formatTime(seconds: number): string {
  if (!seconds || Number.isNaN(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Exported hook for global keyboard shortcuts
export let playerActions: {
  togglePlay: () => void;
  seekBy: (s: number) => void;
  nextTrack: () => void;
  prevTrack: () => void;
  toggleMute: () => void;
} | null = null;

export default function Player() {
  const { state, dispatch } = useAppState();
  const {
    currentTrack,
    queue,
    queueIndex,
    prefs,
    favourites,
    isPlayerExpanded,
  } = state;
  const [sleepTimerRemaining, setSleepTimerRemaining] = useState<number | null>(
    null,
  );
  const sleepTimerRef = useRef<number | null>(null);
  const shuffledQueueRef = useRef<number[]>([]);
  const apiKeyRef = useRef<string>(state.apiKey);

  useEffect(() => {
    apiKeyRef.current = state.apiKey;
  }, [state.apiKey]);

  const isFav = currentTrack
    ? favourites.some((f) => f.videoId === currentTrack.videoId)
    : false;

  const getNextIndex = useCallback(() => {
    if (queue.length === 0) return -1;
    if (prefs.shuffle) {
      if (shuffledQueueRef.current.length === 0) {
        shuffledQueueRef.current = Array.from(
          { length: queue.length },
          (_, i) => i,
        )
          .filter((i) => i !== queueIndex)
          .sort(() => Math.random() - 0.5);
      }
      return shuffledQueueRef.current.shift() ?? -1;
    }
    return (queueIndex + 1) % queue.length;
  }, [queue.length, queueIndex, prefs.shuffle]);

  // Use refs so handlePrev/handleNext/ytPlayer can be referenced
  // without circular dependency issues
  const handleNextRef = useRef<() => void>(() => {});
  const handlePrevRef = useRef<() => void>(() => {});
  const loadAndPlayRef = useRef<((videoId: string) => void) | null>(null);
  const currentTrackIdRef = useRef<string | null | undefined>(
    currentTrack?.videoId,
  );

  useEffect(() => {
    currentTrackIdRef.current = currentTrack?.videoId;
  }, [currentTrack?.videoId]);

  const handleEnded = useCallback(() => {
    if (prefs.repeatMode === "one") {
      // Re-load current track using ref to avoid circular dependency
      if (currentTrackIdRef.current && loadAndPlayRef.current) {
        loadAndPlayRef.current(currentTrackIdRef.current);
      }
      return;
    }
    const nextIdx = getNextIndex();
    if (
      nextIdx >= 0 &&
      (prefs.repeatMode === "all" || nextIdx > queueIndex || prefs.shuffle)
    ) {
      const next = queue[nextIdx];
      dispatch({ type: "SET_QUEUE_INDEX", index: nextIdx });
      dispatch({ type: "SET_CURRENT_TRACK", track: next });
      dispatch({ type: "ADD_RECENTLY_PLAYED", track: next });
    } else if (prefs.autoplay && queue.length > 0) {
      // Autoplay: fetch more similar tracks to the last played
      const lastTrack = queue[queueIndex];
      if (lastTrack?.channelName) {
        const apiKey = apiKeyRef.current;
        if (apiKey) {
          fetch(
            `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=10&q=${encodeURIComponent(`${lastTrack.channelName} music`)}&key=${apiKey}`,
          )
            .then((r) => r.json())
            .then((data) => {
              const items = data.items || [];
              const newTracks: Track[] = items
                .filter((i: { id: { videoId?: string } }) => i.id?.videoId)
                .map(
                  (i: {
                    id: { videoId: string };
                    snippet: {
                      title: string;
                      channelTitle: string;
                      thumbnails: {
                        high?: { url: string };
                        medium?: { url: string };
                      };
                    };
                  }) => ({
                    videoId: i.id.videoId,
                    title: i.snippet.title,
                    thumbnail:
                      i.snippet.thumbnails.high?.url ||
                      i.snippet.thumbnails.medium?.url ||
                      `https://i.ytimg.com/vi/${i.id.videoId}/hqdefault.jpg`,
                    channelName: i.snippet.channelTitle,
                    duration: "0:00",
                    isCreativeCommons: false,
                  }),
                );
              if (newTracks.length > 0) {
                dispatch({ type: "ADD_TO_QUEUE", track: newTracks[0] });
                dispatch({ type: "SET_QUEUE_INDEX", index: queue.length });
                dispatch({ type: "SET_CURRENT_TRACK", track: newTracks[0] });
                dispatch({ type: "ADD_RECENTLY_PLAYED", track: newTracks[0] });
                toast.info(`Autoplay: ${newTracks[0].title}`, {
                  duration: 2000,
                });
              }
            })
            .catch(() => {
              // silent
            });
        }
      }
    }
  }, [
    prefs.repeatMode,
    prefs.shuffle,
    prefs.autoplay,
    getNextIndex,
    queueIndex,
    queue,
    dispatch,
  ]);

  const ytPlayer = useYouTubePlayer({
    onEnded: handleEnded,
    currentTrack: currentTrack ?? undefined,
    onPrev: () => handlePrevRef.current(),
    onNext: () => handleNextRef.current(),
  });

  // Request background permission (wake lock + persistent storage) when playing
  useBackgroundPermission(ytPlayer.isPlaying);

  // Keep loadAndPlay ref up to date
  useEffect(() => {
    loadAndPlayRef.current = ytPlayer.loadAndPlay;
  }, [ytPlayer.loadAndPlay]);

  // Expose player actions globally for keyboard shortcuts
  useEffect(() => {
    playerActions = {
      togglePlay: ytPlayer.togglePlay,
      seekBy: ytPlayer.seekBy,
      nextTrack: () => {
        const nextIdx = getNextIndex();
        if (nextIdx >= 0) {
          const next = queue[nextIdx];
          dispatch({ type: "SET_QUEUE_INDEX", index: nextIdx });
          dispatch({ type: "SET_CURRENT_TRACK", track: next });
          dispatch({ type: "ADD_RECENTLY_PLAYED", track: next });
        }
      },
      prevTrack: () => {
        if (ytPlayer.currentTime > 3) {
          ytPlayer.seekTo(0);
          return;
        }
        const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
        const prev = queue[prevIdx];
        dispatch({ type: "SET_QUEUE_INDEX", index: prevIdx });
        dispatch({ type: "SET_CURRENT_TRACK", track: prev });
      },
      toggleMute: ytPlayer.toggleMute,
    };
  }, [ytPlayer, getNextIndex, queue, queueIndex, dispatch]);

  // Load track when currentTrack changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally using specific ytPlayer properties
  useEffect(() => {
    if (currentTrack && ytPlayer.isReady) {
      ytPlayer.loadAndPlay(currentTrack.videoId);
    }
  }, [currentTrack?.videoId, ytPlayer.isReady, ytPlayer.loadAndPlay]);

  // Sleep timer
  // biome-ignore lint/correctness/useExhaustiveDependencies: ytPlayer.pause is stable
  useEffect(() => {
    if (sleepTimerRef.current) {
      clearInterval(sleepTimerRef.current);
      sleepTimerRef.current = null;
    }
    if (prefs.sleepTimerMinutes > 0) {
      setSleepTimerRemaining(prefs.sleepTimerMinutes * 60);
      sleepTimerRef.current = window.setInterval(() => {
        setSleepTimerRemaining((prev) => {
          if (prev === null || prev <= 1) {
            ytPlayer.pause();
            toast.info("Sleep timer: playback paused");
            dispatch({ type: "SET_PREFS", prefs: { sleepTimerMinutes: 0 } });
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setSleepTimerRemaining(null);
    }
    return () => {
      if (sleepTimerRef.current) clearInterval(sleepTimerRef.current);
    };
  }, [prefs.sleepTimerMinutes]);

  const cycleRepeat = () => {
    const modes: RepeatMode[] = ["off", "all", "one"];
    const current = modes.indexOf(prefs.repeatMode);
    dispatch({
      type: "SET_PREFS",
      prefs: { repeatMode: modes[(current + 1) % 3] },
    });
  };

  const handleNext = useCallback(() => {
    const nextIdx = getNextIndex();
    if (nextIdx >= 0) {
      const next = queue[nextIdx];
      dispatch({ type: "SET_QUEUE_INDEX", index: nextIdx });
      dispatch({ type: "SET_CURRENT_TRACK", track: next });
      dispatch({ type: "ADD_RECENTLY_PLAYED", track: next });
    }
  }, [getNextIndex, queue, dispatch]);

  const handlePrev = useCallback(() => {
    if (ytPlayer.currentTime > 3) {
      ytPlayer.seekTo(0);
      return;
    }
    const prevIdx = (queueIndex - 1 + queue.length) % queue.length;
    if (queue.length > 0) {
      const prev = queue[prevIdx];
      dispatch({ type: "SET_QUEUE_INDEX", index: prevIdx });
      dispatch({ type: "SET_CURRENT_TRACK", track: prev });
    }
  }, [ytPlayer, queueIndex, queue, dispatch]);

  // Keep refs up-to-date for Media Session callbacks
  useEffect(() => {
    handleNextRef.current = handleNext;
  }, [handleNext]);
  useEffect(() => {
    handlePrevRef.current = handlePrev;
  }, [handlePrev]);

  // Handle repeat-one: reload current track when ended
  // biome-ignore lint/correctness/useExhaustiveDependencies: ytPlayer.loadAndPlay is stable
  useEffect(() => {
    if (prefs.repeatMode === "one" && currentTrack && ytPlayer.isReady) {
      // Handled by onEnded callback calling handleEnded_repeatOne — we use a separate effect
    }
  }, [prefs.repeatMode]);

  return (
    <>
      {/* Hidden YouTube Player - always mounted so YT API can attach */}
      <div
        id="yt-player"
        style={{
          position: "absolute",
          top: "-9999px",
          left: "-9999px",
          width: "1px",
          height: "1px",
          opacity: 0,
          pointerEvents: "none",
        }}
      />

      {currentTrack && (
        <>
          {/* Mini Player Bar */}
          <AnimatePresence>
            {!isPlayerExpanded && (
              <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 400,
                  damping: 38,
                  mass: 0.8,
                }}
                className="fixed left-0 right-0 z-50 h-[72px] bg-card/95 backdrop-blur-2xl border-t border-border shadow-player bottom-[56px] md:bottom-0"
              >
                {/* Progress gradient bar */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-border/40">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    style={{
                      width:
                        ytPlayer.duration > 0
                          ? `${(ytPlayer.currentTime / ytPlayer.duration) * 100}%`
                          : "0%",
                      transition: "width 300ms linear",
                    }}
                  />
                </div>

                <div className="flex items-center h-full px-3 gap-2">
                  {/* Thumbnail + Info — flex-1 with overflow hidden prevents pushing controls off screen */}
                  <button
                    type="button"
                    className="flex items-center gap-2.5 min-w-0 flex-1"
                    onClick={() =>
                      dispatch({ type: "SET_PLAYER_EXPANDED", expanded: true })
                    }
                    data-ocid="player.expand_button"
                  >
                    <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden bg-muted">
                      <img
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="min-w-0 overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium line-clamp-1 text-left">
                          {currentTrack.title}
                        </p>
                        {ytPlayer.isPlaying && (
                          <span className="equalizer shrink-0 hidden sm:flex">
                            <span className="bar" />
                            <span className="bar" />
                            <span className="bar" />
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-1 text-left">
                        {currentTrack.channelName}
                      </p>
                    </div>
                  </button>

                  {/* Controls — shrink-0 keeps them from collapsing; gap-1 on xs, gap-2 on sm+ */}
                  <div className="shrink-0 flex items-center gap-1 sm:gap-2">
                    {/* Prev — hidden on very small screens */}
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 hidden sm:flex"
                      onClick={handlePrev}
                      data-ocid="player.prev_button"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <motion.button
                      type="button"
                      className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors duration-200 shadow-glow-sm shrink-0"
                      onClick={ytPlayer.togglePlay}
                      whileTap={{ scale: 0.88 }}
                      data-ocid="player.play_button"
                    >
                      {ytPlayer.isPlaying ? (
                        <Pause className="h-4 w-4" fill="currentColor" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                      )}
                    </motion.button>

                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 flex"
                      onClick={handleNext}
                      data-ocid="player.next_button"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    {/* Heart — hidden on xs to prevent crowding */}
                    <button
                      type="button"
                      className={`p-2 transition-colors duration-200 hidden sm:flex ${isFav ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}
                      onClick={() =>
                        dispatch({
                          type: "TOGGLE_FAVOURITE",
                          track: currentTrack,
                        })
                      }
                      data-ocid="player.favourite_button"
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isFav ? "currentColor" : "none"}
                      />
                    </button>

                    {/* Queue — only on md+ */}
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors duration-200 hidden md:flex"
                      onClick={() =>
                        dispatch({
                          type: "SET_QUEUE_OPEN",
                          open: !state.isQueueOpen,
                        })
                      }
                      data-ocid="player.queue_button"
                    >
                      <ListMusic className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Expanded Player */}
          <AnimatePresence>
            {isPlayerExpanded && (
              <ExpandedPlayer
                track={currentTrack}
                ytPlayer={ytPlayer}
                isFav={isFav}
                prefs={prefs}
                sleepTimerRemaining={sleepTimerRemaining}
                onPrev={handlePrev}
                onNext={handleNext}
                onCycleRepeat={cycleRepeat}
                onFavourite={() =>
                  dispatch({ type: "TOGGLE_FAVOURITE", track: currentTrack })
                }
                onCollapse={() =>
                  dispatch({ type: "SET_PLAYER_EXPANDED", expanded: false })
                }
                onQueueToggle={() =>
                  dispatch({ type: "SET_QUEUE_OPEN", open: !state.isQueueOpen })
                }
                onShuffleToggle={() =>
                  dispatch({
                    type: "SET_PREFS",
                    prefs: { shuffle: !prefs.shuffle },
                  })
                }
                onAutoplayToggle={() =>
                  dispatch({
                    type: "SET_PREFS",
                    prefs: { autoplay: !prefs.autoplay },
                  })
                }
                onDownload={async (t) => {
                  if (!t.isCreativeCommons) return;
                  toast.loading("Preparing download…", {
                    id: `dl-${t.videoId}`,
                  });
                  const payload = {
                    url: `https://www.youtube.com/watch?v=${t.videoId}`,
                    isAudioOnly: true,
                    aFormat: "mp3",
                    filenamePattern: "basic",
                  };
                  const tryEndpoint = async (endpoint: string) => {
                    try {
                      const res = await fetch(endpoint, {
                        method: "POST",
                        headers: {
                          Accept: "application/json",
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                      });
                      const data = await res.json();
                      return data.url || null;
                    } catch {
                      return null;
                    }
                  };
                  const dlUrl =
                    (await tryEndpoint("https://co.wuk.sh/api/json")) ||
                    (await tryEndpoint("https://cobalt.tools/api/json"));
                  if (dlUrl) {
                    const a = document.createElement("a");
                    a.href = dlUrl;
                    a.download = `${t.title}.mp3`;
                    a.target = "_blank";
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    toast.success("Download started!", {
                      id: `dl-${t.videoId}`,
                    });
                  } else {
                    toast.dismiss(`dl-${t.videoId}`);
                    toast.error("Download service temporarily unavailable.", {
                      duration: 5000,
                    });
                  }
                }}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </>
  );
}

interface ExpandedPlayerProps {
  track: Track;
  ytPlayer: ReturnType<typeof useYouTubePlayer>;
  isFav: boolean;
  prefs: { repeatMode: RepeatMode; shuffle: boolean; autoplay: boolean };
  sleepTimerRemaining: number | null;
  onPrev: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onFavourite: () => void;
  onCollapse: () => void;
  onQueueToggle: () => void;
  onShuffleToggle: () => void;
  onAutoplayToggle: () => void;
  onDownload: (track: Track) => Promise<void>;
}

function ExpandedPlayer({
  track,
  ytPlayer,
  isFav,
  prefs,
  sleepTimerRemaining,
  onPrev,
  onNext,
  onCycleRepeat,
  onFavourite,
  onCollapse,
  onQueueToggle,
  onShuffleToggle,
  onAutoplayToggle,
  onDownload,
}: ExpandedPlayerProps) {
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!track.isCreativeCommons) return;
    setDownloading(true);
    try {
      await onDownload(track);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", stiffness: 320, damping: 32, mass: 0.9 }}
      className="fixed inset-0 z-50 flex flex-col md:rounded-none rounded-t-3xl"
      style={{ background: "var(--gradient-hero)" }}
    >
      {/* Blurred background */}
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url(${track.thumbnail})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(60px) saturate(1.5)",
        }}
      />
      <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" />

      <div className="relative z-10 flex flex-col h-full max-w-lg mx-auto w-full px-6 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            type="button"
            onClick={onCollapse}
            className="p-2 text-muted-foreground hover:text-foreground"
            data-ocid="player.collapse_button"
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-muted-foreground opacity-70">
            Now Playing
          </span>
          <div className="flex items-center gap-1">
            {/* Autoplay toggle */}
            <button
              type="button"
              onClick={onAutoplayToggle}
              className={`p-2 transition-colors rounded-full ${prefs.autoplay ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
              data-ocid="player.autoplay_toggle"
              title={prefs.autoplay ? "Autoplay on" : "Autoplay off"}
            >
              <Zap className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onQueueToggle}
              className="p-2 text-muted-foreground hover:text-foreground"
              data-ocid="player.queue_button"
            >
              <ListMusic className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Album art */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={track.videoId}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-xs aspect-square rounded-xl overflow-hidden shadow-glow-md bg-card will-change-transform"
          >
            {imgError ? (
              <div className="w-full h-full flex items-center justify-center bg-muted">
                <Music className="h-16 w-16 text-muted-foreground/30" />
              </div>
            ) : (
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            )}
          </motion.div>
        </div>

        {/* Track info */}
        <div className="mt-6 flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="font-outfit text-xl font-bold line-clamp-2 leading-tight">
              {track.title}
            </h2>
            <p className="text-muted-foreground mt-1">{track.channelName}</p>
          </div>
          <div className="flex items-center gap-1 mt-1 shrink-0">
            {/* Download for CC tracks */}
            {track.isCreativeCommons ? (
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="p-2 text-muted-foreground hover:text-secondary transition-colors"
                data-ocid="player.download_button"
                title="Download MP3"
              >
                {downloading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Download className="h-5 w-5" />
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className="p-2 text-muted-foreground/30 cursor-not-allowed"
                title="Download not available for copyrighted tracks"
              >
                <Lock className="h-5 w-5" />
              </button>
            )}
            <motion.button
              type="button"
              onClick={onFavourite}
              className={`p-2 transition-colors duration-200 ${isFav ? "text-secondary" : "text-muted-foreground hover:text-secondary"}`}
              animate={{ scale: isFav ? [1, 1.25, 1] : 1 }}
              transition={{ duration: 0.3 }}
              data-ocid="player.favourite_button"
            >
              <Heart
                className="h-6 w-6"
                fill={isFav ? "currentColor" : "none"}
              />
            </motion.button>
          </div>
        </div>

        {/* Sleep timer indicator */}
        {sleepTimerRemaining !== null && (
          <div className="mt-2 text-xs text-secondary text-center">
            Sleep in {Math.floor(sleepTimerRemaining / 60)}:
            {String(sleepTimerRemaining % 60).padStart(2, "0")}
          </div>
        )}

        {/* Progress */}
        <div className="mt-5">
          <Slider
            value={[ytPlayer.currentTime]}
            max={ytPlayer.duration || 100}
            step={1}
            onValueChange={([v]) => ytPlayer.seekTo(v)}
            className="w-full cursor-pointer"
            data-ocid="player.progress_slider"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>{formatTime(ytPlayer.currentTime)}</span>
            <span>{formatTime(ytPlayer.duration)}</span>
          </div>
        </div>

        {/* Main controls — Shuffle | Prev | Play | Next | Repeat */}
        <div className="flex items-center justify-between mt-5 gap-4">
          <button
            type="button"
            onClick={onShuffleToggle}
            className={`p-3 rounded-full transition-colors duration-200 ${prefs.shuffle ? "text-primary bg-primary/12" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            data-ocid="player.shuffle_toggle"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            className="p-3 text-foreground/80 hover:text-foreground transition-colors duration-200 rounded-full hover:bg-white/5"
            data-ocid="player.prev_button"
          >
            <SkipBack className="h-6 w-6" />
          </button>

          <motion.button
            type="button"
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow-md hover:bg-primary/90 transition-colors duration-200"
            onClick={ytPlayer.togglePlay}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.05 }}
            data-ocid="player.play_button"
          >
            {ytPlayer.isPlaying ? (
              <Pause className="h-7 w-7" fill="currentColor" />
            ) : (
              <Play className="h-7 w-7 ml-1" fill="currentColor" />
            )}
          </motion.button>

          <button
            type="button"
            onClick={onNext}
            className="p-3 text-foreground/80 hover:text-foreground transition-colors duration-200 rounded-full hover:bg-white/5"
            data-ocid="player.next_button"
          >
            <SkipForward className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            className={`p-3 rounded-full transition-colors duration-200 ${prefs.repeatMode !== "off" ? "text-primary bg-primary/12" : "text-muted-foreground hover:text-foreground hover:bg-white/5"}`}
            data-ocid="player.repeat_button"
          >
            {prefs.repeatMode === "one" ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Seek ±10 secondary row — below main controls, less prominent */}
        <div className="flex items-center justify-center gap-8 mt-2">
          <button
            type="button"
            onClick={() => ytPlayer.seekBy(-10)}
            className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors duration-200 text-xs font-semibold font-mono tracking-tight"
            data-ocid="player.seek_back_button"
          >
            −10s
          </button>
          <button
            type="button"
            onClick={() => ytPlayer.seekBy(10)}
            className="px-3 py-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors duration-200 text-xs font-semibold font-mono tracking-tight"
            data-ocid="player.seek_forward_button"
          >
            +10s
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={ytPlayer.toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors duration-200 shrink-0"
          >
            {ytPlayer.isMuted || ytPlayer.volume === 0 ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <Volume2 className="h-4 w-4" />
            )}
          </button>
          <Slider
            value={[ytPlayer.isMuted ? 0 : ytPlayer.volume]}
            max={100}
            step={1}
            onValueChange={([v]) => ytPlayer.setVolume(v)}
            className="flex-1 min-w-0"
            data-ocid="player.volume_slider"
          />
        </div>

        {/* Keyboard shortcuts hint */}
        <p className="mt-4 text-center text-[10px] text-muted-foreground/40 tracking-wide hidden sm:block">
          Space: play/pause · ← →: seek · N/P: next/prev · M: mute · F:
          favourite
        </p>
      </div>
    </motion.div>
  );
}
