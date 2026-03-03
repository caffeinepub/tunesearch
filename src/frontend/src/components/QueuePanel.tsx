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

export default function QueuePanel() {
  const { state, dispatch } = useAppState();

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE_INDEX", index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  return (
    <AnimatePresence>
      {state.isQueueOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40"
            onClick={() => dispatch({ type: "SET_QUEUE_OPEN", open: false })}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-80 bg-card border-l border-border z-50 flex flex-col shadow-[--shadow-player]"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <ListMusic className="h-5 w-5 text-primary" />
                <h2 className="font-outfit font-semibold text-lg">Queue</h2>
                <span className="text-sm text-muted-foreground">
                  ({state.queue.length})
                </span>
              </div>
              <div className="flex items-center gap-2">
                {state.queue.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive h-7"
                    onClick={() => dispatch({ type: "CLEAR_QUEUE" })}
                    data-ocid="queue.clear_button"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear
                  </Button>
                )}
                <button
                  type="button"
                  className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() =>
                    dispatch({ type: "SET_QUEUE_OPEN", open: false })
                  }
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Queue list */}
            <div className="flex-1 overflow-y-auto py-2">
              {state.queue.length === 0 ? (
                <div
                  className="flex flex-col items-center justify-center h-full gap-3 py-16"
                  data-ocid="queue.empty_state"
                >
                  <Music className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-muted-foreground text-sm">
                    Queue is empty
                  </p>
                  <p className="text-xs text-muted-foreground/60 text-center px-4">
                    Add tracks from search results or playlists
                  </p>
                </div>
              ) : (
                <ul>
                  {state.queue.map((track, idx) => (
                    <motion.li
                      key={`${track.videoId}-${idx}`}
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className={`group flex items-center gap-3 px-3 py-2.5 hover:bg-background/50 transition-colors ${
                        idx === state.queueIndex
                          ? "bg-primary/10 border-l-2 border-primary"
                          : ""
                      }`}
                      data-ocid={`queue.item.${idx + 1}`}
                    >
                      <div className="w-5 shrink-0 text-center">
                        {idx === state.queueIndex ? (
                          <span className="text-primary text-xs">▶</span>
                        ) : (
                          <span className="text-xs text-muted-foreground group-hover:hidden">
                            {idx + 1}
                          </span>
                        )}
                        {idx !== state.queueIndex && (
                          <button
                            type="button"
                            onClick={() => handlePlay(track, idx)}
                            className="hidden group-hover:block text-foreground mx-auto"
                          >
                            <Play className="h-3 w-3" fill="currentColor" />
                          </button>
                        )}
                      </div>

                      <img
                        src={track.thumbnail}
                        alt={track.title}
                        className="w-9 h-9 rounded object-cover shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "";
                        }}
                      />

                      <div className="flex-1 min-w-0">
                        <p
                          className={`text-xs font-medium line-clamp-1 ${
                            idx === state.queueIndex ? "text-primary" : ""
                          }`}
                        >
                          {track.title}
                        </p>
                        <p className="text-[11px] text-muted-foreground line-clamp-1">
                          {track.channelName}
                        </p>
                      </div>

                      {/* Reorder + Remove */}
                      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          type="button"
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() =>
                            dispatch({
                              type: "REORDER_QUEUE",
                              fromIndex: idx,
                              toIndex: Math.max(0, idx - 1),
                            })
                          }
                          disabled={idx === 0}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          className="p-0.5 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() =>
                            dispatch({
                              type: "REORDER_QUEUE",
                              fromIndex: idx,
                              toIndex: Math.min(
                                state.queue.length - 1,
                                idx + 1,
                              ),
                            })
                          }
                          disabled={idx === state.queue.length - 1}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                      </div>
                      <button
                        type="button"
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                        onClick={() =>
                          dispatch({ type: "REMOVE_FROM_QUEUE", index: idx })
                        }
                        data-ocid={`queue.remove_button.${idx + 1}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
