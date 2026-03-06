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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAppState } from "@/store/useAppStore";
import type { Playlist, Track } from "@/store/useAppStore";
import { Heart, Music, Play, Plus, Shuffle } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";

export default function FavouritesPage() {
  const { state, dispatch } = useAppState();

  // New playlist quick-create
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [pendingTrack, setPendingTrack] = useState<Track | null>(null);

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE", queue: state.favourites, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  const handlePlayAll = () => {
    if (state.favourites.length === 0) return;
    dispatch({ type: "SET_QUEUE", queue: state.favourites, index: 0 });
    dispatch({ type: "SET_CURRENT_TRACK", track: state.favourites[0] });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track: state.favourites[0] });
  };

  const handleShufflePlay = () => {
    if (state.favourites.length === 0) return;
    const shuffled = [...state.favourites].sort(() => Math.random() - 0.5);
    dispatch({ type: "SET_QUEUE", queue: shuffled, index: 0 });
    dispatch({ type: "SET_CURRENT_TRACK", track: shuffled[0] });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track: shuffled[0] });
    dispatch({ type: "SET_PREFS", prefs: { shuffle: true } });
    toast.success("Shuffle play started");
  };

  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    dispatch({ type: "ADD_TO_PLAYLIST", playlistId, track });
    const pl = state.playlists.find((p) => p.id === playlistId);
    toast.success(`Added to "${pl?.name}"`);
  };

  const handleRequestNewPlaylist = (track: Track) => {
    setPendingTrack(track);
    setNewPlaylistName("");
    setNewPlaylistOpen(true);
  };

  const handleCreateAndAdd = () => {
    if (!newPlaylistName.trim() || !pendingTrack) return;
    const newPl: Playlist = {
      id: `pl_${Date.now()}`,
      name: newPlaylistName.trim(),
      tracks: [],
      createdAt: Date.now(),
    };
    dispatch({ type: "ADD_PLAYLIST", playlist: newPl });
    dispatch({
      type: "ADD_TO_PLAYLIST",
      playlistId: newPl.id,
      track: pendingTrack,
    });
    toast.success(`Created "${newPl.name}" and added track`);
    setNewPlaylistOpen(false);
    setPendingTrack(null);
    setNewPlaylistName("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-5 border-b border-border">
        <div>
          <h1 className="font-outfit text-2xl font-bold">Favourites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {state.favourites.length}{" "}
            {state.favourites.length === 1 ? "track" : "tracks"}
          </p>
        </div>
        {state.favourites.length > 0 && (
          <div className="flex items-center gap-2">
            <Button onClick={handlePlayAll} className="rounded-pill">
              <Play className="h-4 w-4 mr-2" fill="currentColor" />
              Play All
            </Button>
            <Button
              variant="outline"
              onClick={handleShufflePlay}
              className="rounded-pill"
              data-ocid="favourites.shuffle_button"
            >
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {state.favourites.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-16 gap-3"
            data-ocid="favourites.empty_state"
          >
            <div className="w-16 h-16 rounded-full bg-card flex items-center justify-center">
              <Heart className="h-8 w-8 text-muted-foreground/30" />
            </div>
            <p className="text-muted-foreground font-medium">
              No favourites yet
            </p>
            <p className="text-xs text-muted-foreground/60">
              Tap the heart icon on any track to save it here
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {state.favourites.map((track, idx) => (
              <motion.div
                key={track.videoId}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className={`group flex items-center gap-3 p-3 rounded-md hover:bg-card transition-colors ${
                  state.currentTrack?.videoId === track.videoId
                    ? "bg-card border border-primary/30"
                    : ""
                }`}
                data-ocid={`favourites.item.${idx + 1}`}
              >
                {/* Play / index */}
                <div className="w-6 text-center shrink-0">
                  <span className="text-xs text-muted-foreground group-hover:hidden block">
                    {state.currentTrack?.videoId === track.videoId ? (
                      <span className="text-primary">▶</span>
                    ) : (
                      idx + 1
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
                        data-ocid={`favourites.add_playlist_button.${idx + 1}`}
                        aria-label="Add to playlist"
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
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleRequestNewPlaylist(track)}
                        className="font-medium text-primary focus:text-primary"
                      >
                        <Plus className="h-3.5 w-3.5 mr-2" />
                        New playlist…
                      </DropdownMenuItem>
                      {state.playlists.length > 0 && <DropdownMenuSeparator />}
                      {state.playlists.map((pl) => (
                        <DropdownMenuItem
                          key={pl.id}
                          onClick={() => handleAddToPlaylist(pl.id, track)}
                        >
                          {pl.name}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <button
                    type="button"
                    className="p-1.5 rounded text-red-400 hover:text-red-300 transition-colors"
                    onClick={() =>
                      dispatch({ type: "TOGGLE_FAVOURITE", track })
                    }
                    data-ocid={`favourites.delete_button.${idx + 1}`}
                    aria-label="Remove from favourites"
                  >
                    <Heart className="h-3.5 w-3.5" fill="currentColor" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* New Playlist Dialog */}
      <Dialog open={newPlaylistOpen} onOpenChange={setNewPlaylistOpen}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="favourites.new_playlist.dialog"
        >
          <DialogHeader>
            <DialogTitle>New Playlist</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <Input
              placeholder="Playlist name…"
              value={newPlaylistName}
              onChange={(e) => setNewPlaylistName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreateAndAdd()}
              autoFocus
              data-ocid="favourites.new_playlist.input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewPlaylistOpen(false)}
              data-ocid="favourites.new_playlist.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAndAdd}
              disabled={!newPlaylistName.trim()}
              data-ocid="favourites.new_playlist.confirm_button"
            >
              Create &amp; Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
