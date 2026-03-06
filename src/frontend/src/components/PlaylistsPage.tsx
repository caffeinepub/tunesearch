import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/store/useAppStore";
import type { Track } from "@/store/useAppStore";
import {
  ArrowLeft,
  Edit3,
  Heart,
  MoreHorizontal,
  Music,
  Play,
  Plus,
  Shuffle,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export default function PlaylistsPage() {
  const { state, dispatch } = useAppState();
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState("");

  const createPlaylist = () => {
    if (!newPlaylistName.trim()) return;
    dispatch({
      type: "ADD_PLAYLIST",
      playlist: {
        id: `pl_${Date.now()}`,
        name: newPlaylistName.trim(),
        tracks: [],
        createdAt: Date.now(),
      },
    });
    setNewPlaylistName("");
    setIsCreateOpen(false);
    toast.success("Playlist created");
  };

  const handleRename = () => {
    if (!renameId || !renameName.trim()) return;
    dispatch({
      type: "RENAME_PLAYLIST",
      id: renameId,
      name: renameName.trim(),
    });
    setRenameId(null);
    setRenameName("");
    toast.success("Playlist renamed");
  };

  // If a playlist is selected, show detail view
  if (state.selectedPlaylistId) {
    const pl = state.playlists.find((p) => p.id === state.selectedPlaylistId);
    if (pl) {
      return <PlaylistDetail playlist={pl} />;
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <h1 className="font-outfit text-2xl font-bold">Playlists</h1>
        <Button
          onClick={() => setIsCreateOpen(true)}
          className="rounded-pill"
          data-ocid="playlists.create_button"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Playlist
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {state.playlists.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="playlists.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Music className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <p className="text-muted-foreground font-medium">
              No playlists yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Create a playlist to organise your music
            </p>
            <Button
              variant="outline"
              className="rounded-pill mt-2"
              onClick={() => setIsCreateOpen(true)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Create your first playlist
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {state.playlists.map((pl, idx) => (
              <motion.div
                key={pl.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="group bg-card rounded-card border border-border hover:border-primary/30 transition-all cursor-pointer overflow-hidden"
                data-ocid={`playlists.item.${idx + 1}`}
                onClick={() =>
                  dispatch({ type: "SET_SELECTED_PLAYLIST", id: pl.id })
                }
              >
                {/* Cover */}
                <div className="aspect-square bg-muted relative overflow-hidden">
                  {pl.tracks.length > 0 && pl.tracks[0].thumbnail ? (
                    <img
                      src={pl.tracks[0].thumbnail}
                      alt={pl.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all shadow-glow-sm">
                      <Play
                        className="h-5 w-5 text-primary-foreground ml-0.5"
                        fill="currentColor"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm line-clamp-1">
                      {pl.name}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {pl.tracks.length}{" "}
                      {pl.tracks.length === 1 ? "track" : "tracks"}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        data-ocid={`playlists.rename_button.${idx + 1}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          setRenameId(pl.id);
                          setRenameName(pl.name);
                        }}
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Rename
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        data-ocid={`playlists.delete_button.${idx + 1}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          dispatch({ type: "DELETE_PLAYLIST", id: pl.id });
                          toast.success("Playlist deleted");
                        }}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Playlist name…"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createPlaylist()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPlaylist} disabled={!newPlaylistName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog open={!!renameId} onOpenChange={(o) => !o && setRenameId(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              value={renameName}
              onChange={(e) => setRenameName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameId(null)}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={!renameName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlaylistDetail({
  playlist,
}: {
  playlist: { id: string; name: string; tracks: Track[]; createdAt: number };
}) {
  const { state, dispatch } = useAppState();

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE", queue: playlist.tracks, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  const handlePlayAll = () => {
    if (playlist.tracks.length === 0) return;
    dispatch({ type: "SET_QUEUE", queue: playlist.tracks, index: 0 });
    dispatch({ type: "SET_CURRENT_TRACK", track: playlist.tracks[0] });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track: playlist.tracks[0] });
  };

  const handleShufflePlay = () => {
    if (playlist.tracks.length === 0) return;
    const shuffled = [...playlist.tracks].sort(() => Math.random() - 0.5);
    dispatch({ type: "SET_QUEUE", queue: shuffled, index: 0 });
    dispatch({ type: "SET_CURRENT_TRACK", track: shuffled[0] });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track: shuffled[0] });
    dispatch({ type: "SET_PREFS", prefs: { shuffle: true } });
    toast.success("Shuffle play started");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-4 px-6 py-5 border-b border-border">
        <button
          type="button"
          className="p-2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => dispatch({ type: "SET_SELECTED_PLAYLIST", id: null })}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-outfit text-xl font-bold line-clamp-1">
            {playlist.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {playlist.tracks.length}{" "}
            {playlist.tracks.length === 1 ? "track" : "tracks"}
          </p>
        </div>
        {playlist.tracks.length > 0 && (
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleShufflePlay}
              className="rounded-pill"
              data-ocid="playlists.shuffle_button"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
            <Button onClick={handlePlayAll} className="rounded-pill">
              <Play className="h-4 w-4 mr-2" fill="currentColor" />
              Play All
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {playlist.tracks.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="playlists.empty_state"
          >
            <Music className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground text-sm">No tracks yet</p>
            <p className="text-xs text-muted-foreground/60">
              Search for music and add it to this playlist
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {playlist.tracks.map((track, idx) => (
              <TrackRow
                key={`${track.videoId}-${idx}`}
                track={track}
                index={idx}
                isPlaying={state.currentTrack?.videoId === track.videoId}
                isFav={state.favourites.some(
                  (f) => f.videoId === track.videoId,
                )}
                onPlay={() => handlePlay(track, idx)}
                onFavourite={() =>
                  dispatch({ type: "TOGGLE_FAVOURITE", track })
                }
                onRemove={() => {
                  dispatch({
                    type: "REMOVE_FROM_PLAYLIST",
                    playlistId: playlist.id,
                    trackVideoId: track.videoId,
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface TrackRowProps {
  track: Track;
  index: number;
  isPlaying: boolean;
  isFav: boolean;
  onPlay: () => void;
  onFavourite: () => void;
  onRemove: () => void;
}

function TrackRow({
  track,
  index,
  isPlaying,
  isFav,
  onPlay,
  onFavourite,
  onRemove,
}: TrackRowProps) {
  return (
    <div
      className={`group flex items-center gap-3 p-3 rounded-md hover:bg-card transition-colors ${isPlaying ? "bg-card border border-primary/30" : ""}`}
    >
      <span className="w-6 text-center text-xs text-muted-foreground shrink-0">
        {isPlaying ? (
          <span className="text-primary">▶</span>
        ) : (
          <span className="group-hover:hidden">{index + 1}</span>
        )}
        {!isPlaying && (
          <button
            type="button"
            onClick={onPlay}
            className="hidden group-hover:block text-foreground"
          >
            <Play className="h-3 w-3" fill="currentColor" />
          </button>
        )}
      </span>
      <img
        src={track.thumbnail}
        alt={track.title}
        className="w-10 h-10 rounded object-cover shrink-0"
        onError={(e) => {
          (e.target as HTMLImageElement).src = "";
        }}
      />
      <div className="flex-1 min-w-0">
        <p
          className={`text-sm font-medium line-clamp-1 ${isPlaying ? "text-primary" : ""}`}
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
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          type="button"
          className={`p-1.5 rounded transition-colors ${isFav ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
          onClick={onFavourite}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={isFav ? "currentColor" : "none"}
          />
        </button>
        <button
          type="button"
          className="p-1.5 rounded text-muted-foreground hover:text-destructive transition-colors"
          onClick={onRemove}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
