import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAppState } from "@/store/useAppStore";
import type { Track } from "@/store/useAppStore";
import { Clock, Music, Play, Plus, X } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";

export default function RecentlyPlayedPage() {
  const { state, dispatch } = useAppState();

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE", queue: state.recentlyPlayed, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="font-outfit text-2xl font-bold">Recently Played</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {state.recentlyPlayed.length} tracks
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {state.recentlyPlayed.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="recent.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Clock className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">
              Nothing played yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Your listening history will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {state.recentlyPlayed.map((track, idx) => (
              <motion.div
                key={`${track.videoId}-${idx}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(idx * 0.025, 0.4) }}
                className={`group flex items-center gap-3 p-3 rounded-md hover:bg-card transition-colors ${
                  state.currentTrack?.videoId === track.videoId
                    ? "bg-card border border-primary/30"
                    : ""
                }`}
                data-ocid={`recent.item.${idx + 1}`}
              >
                <div className="w-6 text-center shrink-0">
                  <span className="text-xs text-muted-foreground group-hover:hidden block">
                    {state.currentTrack?.videoId === track.videoId ? (
                      <span className="text-primary">▶</span>
                    ) : (
                      <Clock className="h-3 w-3 inline" />
                    )}
                  </span>
                  <button
                    type="button"
                    onClick={() => handlePlay(track, idx)}
                    className="hidden group-hover:block mx-auto text-foreground"
                  >
                    <Play className="h-3 w-3" fill="currentColor" />
                  </button>
                </div>

                <img
                  src={track.thumbnail}
                  alt={track.title}
                  className="w-10 h-10 rounded object-cover shrink-0"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />

                <div className="flex-1 min-w-0">
                  <p
                    className={`text-sm font-medium line-clamp-1 ${
                      state.currentTrack?.videoId === track.videoId
                        ? "text-primary"
                        : ""
                    }`}
                  >
                    {track.title}
                  </p>
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {track.channelName}
                  </p>
                </div>

                <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
                  {track.duration}
                </span>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem
                        onClick={() => {
                          dispatch({ type: "ADD_TO_QUEUE", track });
                          toast.success("Added to queue");
                        }}
                      >
                        Add to queue
                      </DropdownMenuItem>
                      {state.playlists.map((pl) => (
                        <DropdownMenuItem
                          key={pl.id}
                          onClick={() => {
                            dispatch({
                              type: "ADD_TO_PLAYLIST",
                              playlistId: pl.id,
                              track,
                            });
                            toast.success(`Added to "${pl.name}"`);
                          }}
                        >
                          {pl.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
