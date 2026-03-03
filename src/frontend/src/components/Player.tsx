import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useYouTubePlayer } from "@/hooks/useYouTubePlayer";
import { useAppState } from "@/store/useAppStore";
import type { RepeatMode, Track } from "@/store/useAppStore";
import {
  ChevronDown,
  ChevronUp,
  Heart,
  ListMusic,
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
    }
  }, [
    prefs.repeatMode,
    prefs.shuffle,
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
                className="fixed left-0 right-0 z-50 h-[72px] bg-card/95 backdrop-blur-xl border-t border-border shadow-player bottom-[56px] md:bottom-0"
              >
                {/* Progress */}
                <div className="absolute top-0 left-0 right-0 h-0.5 bg-border">
                  <div
                    className="h-full bg-primary transition-all duration-300"
                    style={{
                      width:
                        ytPlayer.duration > 0
                          ? `${(ytPlayer.currentTime / ytPlayer.duration) * 100}%`
                          : "0%",
                    }}
                  />
                </div>

                <div className="flex items-center gap-3 h-full px-4">
                  {/* Thumbnail + Info */}
                  <button
                    type="button"
                    className="flex items-center gap-3 flex-1 min-w-0"
                    onClick={() =>
                      dispatch({ type: "SET_PLAYER_EXPANDED", expanded: true })
                    }
                    data-ocid="player.expand_button"
                  >
                    <div className="w-12 h-12 rounded shrink-0 overflow-hidden bg-muted">
                      <img
                        src={currentTrack.thumbnail}
                        alt={currentTrack.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-1">
                        {currentTrack.title}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {currentTrack.channelName}
                      </p>
                    </div>
                  </button>

                  {/* Controls */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
                      onClick={handlePrev}
                      data-ocid="player.prev_button"
                    >
                      <SkipBack className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground hover:bg-primary/90 transition-colors shadow-glow-sm"
                      onClick={ytPlayer.togglePlay}
                      data-ocid="player.play_button"
                    >
                      {ytPlayer.isPlaying ? (
                        <Pause className="h-4 w-4" fill="currentColor" />
                      ) : (
                        <Play className="h-4 w-4 ml-0.5" fill="currentColor" />
                      )}
                    </button>

                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                      onClick={handleNext}
                      data-ocid="player.next_button"
                    >
                      <SkipForward className="h-4 w-4" />
                    </button>

                    <button
                      type="button"
                      className={`p-2 transition-colors hidden sm:block ${isFav ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
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

                    <button
                      type="button"
                      className="p-2 text-muted-foreground hover:text-foreground transition-colors hidden sm:block"
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
  prefs: { repeatMode: RepeatMode; shuffle: boolean };
  sleepTimerRemaining: number | null;
  onPrev: () => void;
  onNext: () => void;
  onCycleRepeat: () => void;
  onFavourite: () => void;
  onCollapse: () => void;
  onQueueToggle: () => void;
  onShuffleToggle: () => void;
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
}: ExpandedPlayerProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ y: "100%" }}
      animate={{ y: 0 }}
      exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 28, stiffness: 280 }}
      className="fixed inset-0 z-50 flex flex-col"
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
          >
            <ChevronDown className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium text-muted-foreground">
            Now Playing
          </span>
          <button
            type="button"
            onClick={onQueueToggle}
            className="p-2 text-muted-foreground hover:text-foreground"
            data-ocid="player.queue_button"
          >
            <ListMusic className="h-5 w-5" />
          </button>
        </div>

        {/* Album art */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            key={track.videoId}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="w-full max-w-xs aspect-square rounded-xl overflow-hidden shadow-glow-md bg-card"
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
          <button
            type="button"
            onClick={onFavourite}
            className={`p-2 transition-colors mt-1 ${isFav ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
            data-ocid="player.favourite_button"
          >
            <Heart className="h-6 w-6" fill={isFav ? "currentColor" : "none"} />
          </button>
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

        {/* Main controls */}
        <div className="flex items-center justify-between mt-4">
          <button
            type="button"
            onClick={onShuffleToggle}
            className={`p-2 transition-colors ${prefs.shuffle ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            data-ocid="player.shuffle_toggle"
          >
            <Shuffle className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={onPrev}
            className="p-3 text-foreground/70 hover:text-foreground transition-colors"
            data-ocid="player.prev_button"
          >
            <SkipBack className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={() => ytPlayer.seekBy(-10)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="player.seek_back_button"
          >
            <span className="text-[11px] font-bold font-mono">-10</span>
          </button>

          <button
            type="button"
            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-glow-md hover:bg-primary/90 transition-all active:scale-95"
            onClick={ytPlayer.togglePlay}
            data-ocid="player.play_button"
          >
            {ytPlayer.isPlaying ? (
              <Pause className="h-7 w-7" fill="currentColor" />
            ) : (
              <Play className="h-7 w-7 ml-1" fill="currentColor" />
            )}
          </button>

          <button
            type="button"
            onClick={() => ytPlayer.seekBy(10)}
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            data-ocid="player.seek_forward_button"
          >
            <span className="text-[11px] font-bold font-mono">+10</span>
          </button>

          <button
            type="button"
            onClick={onNext}
            className="p-3 text-foreground/70 hover:text-foreground transition-colors"
            data-ocid="player.next_button"
          >
            <SkipForward className="h-6 w-6" />
          </button>

          <button
            type="button"
            onClick={onCycleRepeat}
            className={`p-2 transition-colors ${prefs.repeatMode !== "off" ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
            data-ocid="player.repeat_button"
          >
            {prefs.repeatMode === "one" ? (
              <Repeat1 className="h-5 w-5" />
            ) : (
              <Repeat className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-3 mt-4">
          <button
            type="button"
            onClick={ytPlayer.toggleMute}
            className="text-muted-foreground hover:text-foreground transition-colors"
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
            className="flex-1"
            data-ocid="player.volume_slider"
          />
        </div>
      </div>
    </motion.div>
  );
}
