import { useAppState } from "@/store/useAppStore";
import type { AppState, Track } from "@/store/useAppStore";
import { Clock, Grid, Heart, List, Music, Play } from "lucide-react";
import { motion } from "motion/react";

type Page = AppState["activePage"];

export default function LibraryPage() {
  const { state, dispatch } = useAppState();

  const navigate = (page: Page) => {
    dispatch({ type: "SET_ACTIVE_PAGE", page });
  };

  const playTrack = (track: Track, queue: Track[], idx: number) => {
    dispatch({ type: "SET_QUEUE", queue, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  const sections = [
    {
      title: "Favourites",
      icon: Heart,
      page: "favourites" as Page,
      count: state.favourites.length,
      tracks: state.favourites.slice(0, 4),
      color: "text-red-400",
      bg: "bg-red-500/10",
    },
    {
      title: "Recently Played",
      icon: Clock,
      page: "recent" as Page,
      count: state.recentlyPlayed.length,
      tracks: state.recentlyPlayed.slice(0, 4),
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      title: "Playlists",
      icon: List,
      page: "playlists" as Page,
      count: state.playlists.length,
      tracks: state.playlists.flatMap((p) => p.tracks).slice(0, 4),
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-5 border-b border-border">
        <h1 className="font-outfit text-2xl font-bold">Library</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Your music collection
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4">
          {sections.map(({ title, icon: Icon, count, color, bg, page }) => (
            <motion.button
              key={title}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={`p-4 rounded-card ${bg} border border-border text-left transition-all hover:border-primary/30`}
              onClick={() => navigate(page)}
            >
              <Icon className={`h-6 w-6 ${color} mb-2`} />
              <p className="font-outfit text-2xl font-bold">{count}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
            </motion.button>
          ))}
        </div>

        {/* Favourites */}
        {state.favourites.length > 0 && (
          <LibrarySection
            title="Favourites"
            onSeeAll={() => navigate("favourites")}
            tracks={state.favourites.slice(0, 6)}
            currentVideoId={state.currentTrack?.videoId}
            onPlay={(t, i) => playTrack(t, state.favourites, i)}
          />
        )}

        {/* Recently played */}
        {state.recentlyPlayed.length > 0 && (
          <LibrarySection
            title="Recently Played"
            onSeeAll={() => navigate("recent")}
            tracks={state.recentlyPlayed.slice(0, 6)}
            currentVideoId={state.currentTrack?.videoId}
            onPlay={(t, i) => playTrack(t, state.recentlyPlayed, i)}
          />
        )}

        {/* Playlists */}
        {state.playlists.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-outfit font-semibold">Playlists</h2>
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => navigate("playlists")}
              >
                See all
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {state.playlists.slice(0, 6).map((pl, idx) => (
                <motion.button
                  key={pl.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group bg-card rounded-card border border-border hover:border-primary/30 transition-all text-left overflow-hidden"
                  onClick={() => {
                    navigate("playlists");
                    dispatch({ type: "SET_SELECTED_PLAYLIST", id: pl.id });
                  }}
                >
                  <div className="aspect-video bg-muted relative overflow-hidden">
                    {pl.tracks[0] ? (
                      <img
                        src={pl.tracks[0].thumbnail}
                        alt={pl.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Music className="h-8 w-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <p className="text-xs font-medium line-clamp-1">
                      {pl.name}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {pl.tracks.length} tracks
                    </p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {state.favourites.length === 0 &&
          state.recentlyPlayed.length === 0 &&
          state.playlists.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Grid className="h-12 w-12 text-muted-foreground/20" />
              <p className="text-muted-foreground">Your library is empty</p>
              <p className="text-xs text-muted-foreground/60">
                Search for music and start building your collection
              </p>
            </div>
          )}
      </div>
    </div>
  );
}

function LibrarySection({
  title,
  onSeeAll,
  tracks,
  currentVideoId,
  onPlay,
}: {
  title: string;
  onSeeAll: () => void;
  tracks: Track[];
  currentVideoId?: string;
  onPlay: (track: Track, idx: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-outfit font-semibold">{title}</h2>
        <button
          type="button"
          className="text-xs text-primary hover:underline"
          onClick={onSeeAll}
        >
          See all
        </button>
      </div>
      <div className="space-y-1">
        {tracks.map((track, idx) => (
          <motion.div
            key={`${track.videoId}-${idx}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.04 }}
            className={`group flex items-center gap-3 p-2.5 rounded-md hover:bg-card transition-colors cursor-pointer ${
              currentVideoId === track.videoId
                ? "bg-card border border-primary/20"
                : ""
            }`}
            onClick={() => onPlay(track, idx)}
          >
            <div className="relative w-9 h-9 rounded overflow-hidden bg-muted shrink-0">
              <img
                src={track.thumbnail}
                alt={track.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 bg-black/0 hover:bg-black/40 flex items-center justify-center">
                <Play
                  className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  fill="currentColor"
                />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p
                className={`text-sm font-medium line-clamp-1 ${currentVideoId === track.videoId ? "text-primary" : ""}`}
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
          </motion.div>
        ))}
      </div>
    </div>
  );
}
