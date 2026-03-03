import { Button } from "@/components/ui/button";
import { useAppState } from "@/store/useAppStore";
import type { Track } from "@/store/useAppStore";
import {
  ChevronDown,
  ChevronUp,
  ListMusic,
  Music,
  Play,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

export default function QueuePage() {
  const { state, dispatch } = useAppState();

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE_INDEX", index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2">
          <ListMusic className="h-5 w-5 text-primary" />
          <h1 className="font-outfit text-2xl font-bold">Queue</h1>
          <span className="text-sm text-muted-foreground">
            ({state.queue.length})
          </span>
        </div>
        {state.queue.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-pill"
            onClick={() => dispatch({ type: "CLEAR_QUEUE" })}
            data-ocid="queue.clear_button"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear All
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {state.queue.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="queue.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Music className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">Queue is empty</p>
            <p className="text-xs text-muted-foreground/60">
              Add tracks from search results, playlists, or favourites
            </p>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            <div className="space-y-1">
              {state.queue.map((track, idx) => (
                <motion.div
                  key={`${track.videoId}-${idx}`}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className={`group flex items-center gap-3 p-3 rounded-md hover:bg-card transition-colors ${
                    idx === state.queueIndex
                      ? "bg-primary/10 border border-primary/30"
                      : ""
                  }`}
                  data-ocid={`queue.item.${idx + 1}`}
                >
                  {/* Index / play */}
                  <div className="w-7 text-center shrink-0">
                    {idx === state.queueIndex ? (
                      <span className="text-primary text-sm">▶</span>
                    ) : (
                      <>
                        <span className="text-xs text-muted-foreground group-hover:hidden">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handlePlay(track, idx)}
                          className="hidden group-hover:block mx-auto text-foreground"
                        >
                          <Play className="h-3.5 w-3.5" fill="currentColor" />
                        </button>
                      </>
                    )}
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
                        idx === state.queueIndex ? "text-primary" : ""
                      }`}
                    >
                      {track.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {track.channelName}
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground font-mono shrink-0">
                    {track.duration}
                  </span>

                  {/* Reorder */}
                  <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() =>
                        dispatch({
                          type: "REORDER_QUEUE",
                          fromIndex: idx,
                          toIndex: Math.max(0, idx - 1),
                        })
                      }
                      disabled={idx === 0}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                      onClick={() =>
                        dispatch({
                          type: "REORDER_QUEUE",
                          fromIndex: idx,
                          toIndex: Math.min(state.queue.length - 1, idx + 1),
                        })
                      }
                      disabled={idx === state.queue.length - 1}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                    onClick={() =>
                      dispatch({ type: "REMOVE_FROM_QUEUE", index: idx })
                    }
                    data-ocid={`queue.remove_button.${idx + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
