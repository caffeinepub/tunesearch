import { Badge } from "@/components/ui/badge";
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
import {
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  Heart,
  Loader2,
  Lock,
  Music,
  Play,
  Plus,
  Search,
  TrendingUp,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface YouTubeSearchResult {
  id: { videoId: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high: { url: string }; medium: { url: string } };
  };
}

interface YouTubeVideoDetails {
  id: string;
  contentDetails: { duration: string };
  status: { license: string };
  snippet: {
    title: string;
    channelTitle: string;
    thumbnails: { high: { url: string } };
  };
}

function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return "0:00";
  const h = Number.parseInt(match[1] || "0");
  const m = Number.parseInt(match[2] || "0");
  const s = Number.parseInt(match[3] || "0");
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

async function fetchTracksFromYT(
  query: string,
  apiKey: string,
  maxResults = 12,
): Promise<Track[]> {
  const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=${maxResults}&q=${encodeURIComponent(query)}&key=${apiKey}`;
  const res = await fetch(searchUrl);
  const data = await res.json();
  if (data.error) return [];

  const items: YouTubeSearchResult[] = data.items || [];
  const videoIds = items.map((i) => i.id.videoId).filter(Boolean);
  if (!videoIds.length) return [];

  const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${videoIds.join(",")}&key=${apiKey}`;
  const detailsRes = await fetch(detailsUrl);
  const detailsData = await detailsRes.json();
  const detailsMap = new Map<string, YouTubeVideoDetails>(
    (detailsData.items || []).map((item: YouTubeVideoDetails) => [
      item.id,
      item,
    ]),
  );

  return items
    .filter((item) => item.id.videoId && detailsMap.has(item.id.videoId))
    .map((item) => {
      const details = detailsMap.get(item.id.videoId)!;
      return {
        videoId: item.id.videoId,
        title: item.snippet.title,
        thumbnail:
          item.snippet.thumbnails.high?.url ||
          item.snippet.thumbnails.medium?.url ||
          `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
        channelName: item.snippet.channelTitle,
        duration: parseDuration(details.contentDetails?.duration || "PT0S"),
        isCreativeCommons: details.status?.license === "creativeCommon",
      };
    });
}

interface SearchPageProps {
  onSignIn?: () => void;
}

export default function SearchPage({ onSignIn: _onSignIn }: SearchPageProps) {
  const { state, dispatch } = useAppState();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ccOnly, setCcOnly] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // New playlist inline creation
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [pendingTrackForNewPlaylist, setPendingTrackForNewPlaylist] =
    useState<Track | null>(null);

  // Trending / recommendations
  const cfg = state.appCustomConfig;
  const showTrending = cfg.showTrending !== false;
  const showPopular = cfg.showPopular !== false;
  const trendingLabel = cfg.trendingLabel || "Trending Now";
  const popularLabel = cfg.popularLabel || "Popular Picks";
  const maxTrending = cfg.maxTrending || 10;
  const maxPopular = cfg.maxPopular || 6;

  const [trendingTracks, setTrendingTracks] = useState<Track[]>([]);
  const [popularTracks, setPopularTracks] = useState<Track[]>([]);
  const [trendingLoading, setTrendingLoading] = useState(false);
  const trendingFetched = useRef(false);

  // Fetch trending on mount
  useEffect(() => {
    if (trendingFetched.current || !state.apiKey) return;
    trendingFetched.current = true;

    const fetchTrending = async () => {
      setTrendingLoading(true);
      try {
        const [trending, popular] = await Promise.all([
          fetchTracksFromYT("trending music 2024", state.apiKey, maxTrending),
          fetchTracksFromYT(
            "popular hits songs 2024",
            state.apiKey,
            maxPopular,
          ),
        ]);
        setTrendingTracks(trending);
        setPopularTracks(popular);
      } catch {
        // silent — trending is optional
      } finally {
        setTrendingLoading(false);
      }
    };

    void fetchTrending();
  }, [state.apiKey, maxTrending, maxPopular]);

  const searchYouTube = useCallback(
    async (q: string, pageToken = "", append = false) => {
      if (!state.apiKey) {
        setError("no_api_key");
        return;
      }
      if (!q.trim()) return;

      if (append) setLoadingMore(true);
      else setLoading(true);
      setError(null);

      try {
        const licenseParam = ccOnly ? "&videoLicense=creativeCommon" : "";
        const pageParam = pageToken ? `&pageToken=${pageToken}` : "";
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=20&q=${encodeURIComponent(q)}${licenseParam}${pageParam}&key=${state.apiKey}`;
        const res = await fetch(searchUrl);
        const data = await res.json();

        if (data.error) {
          throw new Error(data.error.message || "API error");
        }

        const items: YouTubeSearchResult[] = data.items || [];
        const videoIds = items.map((i) => i.id.videoId).filter(Boolean);
        setNextPageToken(data.nextPageToken || null);

        if (videoIds.length === 0) {
          if (!append) setResults([]);
          setHasSearched(true);
          return;
        }

        // Get video details (duration + license)
        const detailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,status&id=${videoIds.join(",")}&key=${state.apiKey}`;
        const detailsRes = await fetch(detailsUrl);
        const detailsData = await detailsRes.json();
        const detailsMap = new Map<string, YouTubeVideoDetails>(
          (detailsData.items || []).map((item: YouTubeVideoDetails) => [
            item.id,
            item,
          ]),
        );

        const tracks: Track[] = items
          .filter((item) => item.id.videoId && detailsMap.has(item.id.videoId))
          .map((item) => {
            const details = detailsMap.get(item.id.videoId)!;
            return {
              videoId: item.id.videoId,
              title: item.snippet.title,
              thumbnail:
                item.snippet.thumbnails.high?.url ||
                item.snippet.thumbnails.medium?.url ||
                `https://i.ytimg.com/vi/${item.id.videoId}/hqdefault.jpg`,
              channelName: item.snippet.channelTitle,
              duration: parseDuration(
                details.contentDetails?.duration || "PT0S",
              ),
              isCreativeCommons: details.status?.license === "creativeCommon",
            };
          });

        if (append) {
          setResults((prev) => [...prev, ...tracks]);
        } else {
          setResults(tracks);
        }
        setHasSearched(true);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Search failed");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [state.apiKey, ccOnly],
  );

  const handleSearch = useCallback(
    (q?: string) => {
      const searchQ = q ?? query;
      if (!searchQ.trim()) return;
      dispatch({ type: "ADD_SEARCH_HISTORY", query: searchQ });
      searchYouTube(searchQ);
    },
    [query, searchYouTube, dispatch],
  );

  const handleLoadMore = () => {
    if (nextPageToken) {
      searchYouTube(query, nextPageToken, true);
    }
  };

  const handlePlay = (track: Track, idx: number, trackList: Track[]) => {
    dispatch({ type: "SET_QUEUE", queue: trackList, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
    toast(`Now playing: ${track.title}`, { duration: 2500 });
  };

  const isFavourite = (videoId: string) =>
    state.favourites.some((f) => f.videoId === videoId);

  // Allow guests to favourite — no blocking
  const handleToggleFavourite = (track: Track) => {
    const isCurrentlyFav = isFavourite(track.videoId);
    dispatch({ type: "TOGGLE_FAVOURITE", track });
    if (!state.userEmail && !isCurrentlyFav) {
      toast("Saved! Sign in to sync across devices.", { duration: 3000 });
    }
  };

  const handleDownload = async (track: Track) => {
    if (!track.isCreativeCommons) return;

    toast.loading("Preparing download…", { id: `dl-${track.videoId}` });

    const ytUrl = `https://www.youtube.com/watch?v=${track.videoId}`;
    const payload = {
      url: ytUrl,
      isAudioOnly: true,
      aFormat: "mp3",
      filenamePattern: "basic",
    };

    const tryEndpoint = async (endpoint: string): Promise<string | null> => {
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

    // Try primary then fallback endpoint
    const downloadUrl =
      (await tryEndpoint("https://co.wuk.sh/api/json")) ||
      (await tryEndpoint("https://cobalt.tools/api/json"));

    if (downloadUrl) {
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `${track.title}.mp3`;
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast.success("Download started!", { id: `dl-${track.videoId}` });
    } else {
      toast.dismiss(`dl-${track.videoId}`);
      toast.error(
        "Download service temporarily unavailable. Try again later.",
        { duration: 5000 },
      );
    }
  };

  // Allow guests to add to playlist — no blocking
  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    dispatch({ type: "ADD_TO_PLAYLIST", playlistId, track });
    const playlist = state.playlists.find((p) => p.id === playlistId);
    toast.success(`Added to "${playlist?.name || "Playlist"}"`);
    if (!state.userEmail) {
      toast("Sign in to sync your playlists across devices.", {
        duration: 3000,
      });
    }
  };

  // "New playlist" quick-create from the dropdown
  const handleRequestNewPlaylist = (track: Track) => {
    setPendingTrackForNewPlaylist(track);
    setNewPlaylistName("");
    setNewPlaylistOpen(true);
  };

  const handleCreateAndAdd = () => {
    if (!newPlaylistName.trim() || !pendingTrackForNewPlaylist) return;
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
      track: pendingTrackForNewPlaylist,
    });
    toast.success(`Created "${newPl.name}" and added track`);
    setNewPlaylistOpen(false);
    setPendingTrackForNewPlaylist(null);
    setNewPlaylistName("");
  };

  const GENRE_CHIPS = [
    { label: "Lo-fi", query: "lofi hip hop chill" },
    { label: "Hip Hop", query: "hip hop beats 2024" },
    { label: "Pop", query: "pop music hits 2024" },
    { label: "Chill", query: "chill vibes playlist" },
    { label: "Electronic", query: "electronic music mix" },
    { label: "Classical", query: "classical music relaxing" },
    { label: "Indie", query: "indie music 2024" },
    { label: "R&B", query: "r&b soul music" },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar Area */}
      <div
        className={`flex flex-col items-center transition-all duration-500 ${
          !hasSearched ? "flex-1 justify-center pb-8" : "pt-5 pb-4"
        }`}
      >
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: -24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mb-8 flex flex-col items-center gap-4"
          >
            {/* Logo with glow ring */}
            <div className="relative">
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-2xl animate-glow-pulse" />
              <div className="absolute inset-0 rounded-full border-2 border-primary/20 scale-110" />
              <img
                src="/assets/generated/tunesearch-logo-transparent.dim_200x200.png"
                alt="TuneSearch"
                className="w-28 h-28 object-contain relative z-10 drop-shadow-[0_0_24px_oklch(0.65_0.28_290/0.6)]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            </div>
            <div className="text-center">
              <h1 className="font-outfit text-5xl font-bold text-gradient leading-tight">
                {state.appCustomConfig?.appName || "TuneSearch"}
              </h1>
              <p className="text-muted-foreground/70 text-sm mt-2 font-medium tracking-wide">
                {state.appCustomConfig?.tagline || "Search and play music"}
              </p>
            </div>
          </motion.div>
        )}

        <div className="w-full max-w-2xl px-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-4 justify-center">
            <Button
              size="sm"
              variant={!ccOnly ? "default" : "outline"}
              className="rounded-pill text-xs h-7 px-4"
              onClick={() => {
                setCcOnly(false);
              }}
              data-ocid="search.cc_toggle"
            >
              All
            </Button>
            <Button
              size="sm"
              variant={ccOnly ? "default" : "outline"}
              className="rounded-pill text-xs h-7 px-4"
              onClick={() => {
                setCcOnly(true);
              }}
            >
              🎵 Free (CC)
            </Button>
          </div>

          {/* Search Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSearch();
            }}
            className="relative flex gap-2"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, albums…"
                className="pl-11 h-14 rounded-pill bg-card border-border text-base focus-visible:ring-2 focus-visible:ring-primary shadow-glow-sm"
                data-ocid="search.search_input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-14 px-7 rounded-pill bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm font-semibold"
              data-ocid="search.submit_button"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>

          {/* Genre chips — shown before first search */}
          {!hasSearched && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mt-5 flex flex-wrap gap-2 justify-center"
            >
              {GENRE_CHIPS.map((chip) => (
                <button
                  type="button"
                  key={chip.label}
                  className="flex items-center gap-1.5 bg-card/60 border border-border/70 hover:border-primary/50 hover:bg-primary/10 hover:text-primary rounded-full px-4 py-1.5 text-xs text-muted-foreground transition-all duration-150 font-medium active:scale-95"
                  onClick={() => {
                    setQuery(chip.query);
                    handleSearch(chip.query);
                  }}
                  data-ocid="search.genre.button"
                >
                  {chip.label}
                </button>
              ))}
            </motion.div>
          )}

          {/* Search History */}
          {!hasSearched && state.searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mt-4 flex flex-wrap gap-2"
            >
              <p className="w-full text-xs text-muted-foreground/60 mb-1">
                Recent searches
              </p>
              {state.searchHistory.slice(0, 8).map((h) => (
                <button
                  type="button"
                  key={h}
                  className="flex items-center gap-1 bg-card border border-border rounded-pill px-3 py-1 text-xs text-muted-foreground cursor-pointer hover:border-primary/50 hover:text-foreground transition-colors"
                  onClick={() => {
                    setQuery(h);
                    handleSearch(h);
                  }}
                >
                  <Search className="h-3 w-3" />
                  <span>{h}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dispatch({ type: "REMOVE_SEARCH_HISTORY", query: h });
                    }}
                    className="ml-1 hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </button>
              ))}
              {state.searchHistory.length > 0 && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors"
                  onClick={() => dispatch({ type: "CLEAR_SEARCH_HISTORY" })}
                >
                  Clear all
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Trending / Recommendations — Spotify-style, shown before first search */}
      {!hasSearched && (
        <div className="px-4 pb-8 space-y-10 overflow-y-auto">
          {/* Trending Now — horizontal scroll row */}
          {showTrending && (
            <section>
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border/50">
                <TrendingUp className="h-3.5 w-3.5 text-primary shrink-0" />
                <h2 className="text-sm font-medium text-foreground/80 tracking-wide">
                  {trendingLabel}
                </h2>
              </div>

              {trendingLoading ? (
                <div className="flex gap-3 overflow-x-hidden">
                  {Array.from({ length: 6 }).map((_, i) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton
                    <div key={i} className="shrink-0 w-[140px]">
                      <div className="aspect-square rounded-lg bg-muted animate-pulse mb-2" />
                      <div className="h-3 bg-muted animate-pulse rounded mb-1.5" />
                      <div className="h-2.5 bg-muted/60 animate-pulse rounded w-2/3" />
                    </div>
                  ))}
                </div>
              ) : trendingTracks.length > 0 ? (
                <div
                  className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin"
                  data-ocid="search.trending.list"
                >
                  {trendingTracks.map((track, idx) => (
                    <TrendingCard
                      key={`trending-${track.videoId}`}
                      track={track}
                      index={idx + 1}
                      isFav={isFavourite(track.videoId)}
                      playlists={state.playlists}
                      onPlay={() => handlePlay(track, idx, trendingTracks)}
                      onFavourite={() => handleToggleFavourite(track)}
                      onAddToPlaylist={(plId) =>
                        handleAddToPlaylist(plId, track)
                      }
                      onRequestNewPlaylist={() =>
                        handleRequestNewPlaylist(track)
                      }
                    />
                  ))}
                </div>
              ) : null}
            </section>
          )}

          {/* Popular Picks — vertical track list (Spotify style) */}
          {showPopular && (trendingLoading || popularTracks.length > 0) && (
            <section>
              <div className="flex items-center gap-3 mb-4 pb-2 border-b border-border/50">
                <Music className="h-3.5 w-3.5 text-secondary shrink-0" />
                <h2 className="text-sm font-medium text-foreground/80 tracking-wide">
                  {popularLabel}
                </h2>
              </div>

              {trendingLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div
                      // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton
                      key={i}
                      className="flex items-center gap-3 p-2"
                    >
                      <div className="w-10 h-10 rounded bg-muted animate-pulse shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-muted animate-pulse rounded" />
                        <div className="h-2.5 bg-muted/60 animate-pulse rounded w-1/2" />
                      </div>
                      <div className="h-3 w-10 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-1" data-ocid="search.popular.list">
                  {popularTracks.map((track, idx) => (
                    <PopularTrackRow
                      key={`popular-${track.videoId}`}
                      track={track}
                      index={idx + 1}
                      isFav={isFavourite(track.videoId)}
                      playlists={state.playlists}
                      isPlaying={state.currentTrack?.videoId === track.videoId}
                      onPlay={() => handlePlay(track, idx, popularTracks)}
                      onFavourite={() => handleToggleFavourite(track)}
                      onAddToPlaylist={(plId) =>
                        handleAddToPlaylist(plId, track)
                      }
                      onRequestNewPlaylist={() =>
                        handleRequestNewPlaylist(track)
                      }
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}

      {/* Results */}
      {hasSearched && (
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {error && (
            <div
              className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/30 mb-4"
              data-ocid="search.error_state"
            >
              <p className="text-sm text-destructive-foreground">{error}</p>
            </div>
          )}

          {loading ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-4"
              data-ocid="search.loading_state"
            >
              <div className="w-12 h-12 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              <p className="text-muted-foreground text-sm">Searching…</p>
            </div>
          ) : results.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-16 gap-3"
              data-ocid="search.empty_state"
            >
              <Music className="h-12 w-12 text-muted-foreground/30" />
              <p className="text-muted-foreground">
                No results found for "{query}"
              </p>
              <p className="text-xs text-muted-foreground/60">
                Try a different search term
              </p>
            </div>
          ) : (
            <>
              {/* Results count + recent searches row */}
              <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="text-foreground font-semibold">
                    {results.length}
                  </span>{" "}
                  results for{" "}
                  <span className="text-primary font-semibold">"{query}"</span>
                </p>
                {state.searchHistory.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {state.searchHistory.slice(0, 4).map((h) => (
                      <button
                        type="button"
                        key={h}
                        className="flex items-center gap-1 bg-card border border-border rounded-pill px-2.5 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                        onClick={() => {
                          setQuery(h);
                          handleSearch(h);
                        }}
                      >
                        <Search className="h-3 w-3" />
                        {h}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((track, idx) => (
                  <ResultCard
                    key={`${track.videoId}-${idx}`}
                    track={track}
                    index={idx + 1}
                    isFav={isFavourite(track.videoId)}
                    playlists={state.playlists}
                    onPlay={() => handlePlay(track, idx, results)}
                    onFavourite={() => handleToggleFavourite(track)}
                    onAddToPlaylist={(plId) => handleAddToPlaylist(plId, track)}
                    onRequestNewPlaylist={() => handleRequestNewPlaylist(track)}
                    onAddToQueue={() => {
                      dispatch({ type: "ADD_TO_QUEUE", track });
                      toast.success("Added to queue");
                    }}
                    onDownload={() => handleDownload(track)}
                  />
                ))}
              </div>

              {nextPageToken && (
                <div className="flex justify-center mt-6">
                  <Button
                    variant="outline"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="rounded-pill"
                    data-ocid="search.load_more_button"
                  >
                    {loadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <ChevronDown className="h-4 w-4 mr-2" />
                    )}
                    Load more
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* New Playlist Dialog */}
      <Dialog open={newPlaylistOpen} onOpenChange={setNewPlaylistOpen}>
        <DialogContent
          className="sm:max-w-sm"
          data-ocid="search.new_playlist.dialog"
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
              data-ocid="search.new_playlist.input"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNewPlaylistOpen(false)}
              data-ocid="search.new_playlist.cancel_button"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateAndAdd}
              disabled={!newPlaylistName.trim()}
              data-ocid="search.new_playlist.confirm_button"
            >
              Create &amp; Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Compact horizontal trending card (square aspect, no rank badge)
interface TrendingCardProps {
  track: Track;
  index: number;
  isFav: boolean;
  playlists: Playlist[];
  onPlay: () => void;
  onFavourite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRequestNewPlaylist: () => void;
}

function TrendingCard({
  track,
  index,
  isFav,
  playlists,
  onPlay,
  onFavourite,
  onAddToPlaylist,
  onRequestNewPlaylist,
}: TrendingCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.03 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 20,
        delay: Math.min(index * 0.05, 0.4),
      }}
      className="group shrink-0 w-[140px]"
      data-ocid={`search.trending.item.${index}`}
    >
      <button
        type="button"
        className="relative aspect-square rounded-lg overflow-hidden bg-muted mb-2 w-full block"
        onClick={onPlay}
      >
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Music className="h-6 w-6 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        )}
        {/* Duration */}
        <div className="absolute bottom-1.5 right-1.5 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
          {track.duration}
        </div>
        {/* CC badge */}
        {track.isCreativeCommons && (
          <div className="absolute top-1.5 left-1.5 bg-secondary/90 text-secondary-foreground text-[10px] px-1.5 py-0.5 rounded-pill font-semibold">
            CC
          </div>
        )}
        {/* Play overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
          <div className="w-9 h-9 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-75 group-hover:scale-100 transition-all duration-200 shadow-glow-sm">
            <Play
              className="h-4 w-4 text-primary-foreground ml-0.5"
              fill="currentColor"
            />
          </div>
        </div>
      </button>

      <div className="flex items-start gap-1">
        <button
          type="button"
          className="flex-1 min-w-0 text-left"
          onClick={onPlay}
        >
          <p className="text-xs font-medium line-clamp-2 leading-snug">
            {track.title}
          </p>
          <p className="text-[10px] text-muted-foreground line-clamp-1 mt-0.5">
            {track.channelName}
          </p>
        </button>
        {/* Heart */}
        <button
          type="button"
          className={`p-1 shrink-0 transition-colors ${isFav ? "text-red-400" : "text-muted-foreground/50 hover:text-red-400"}`}
          onClick={(e) => {
            e.stopPropagation();
            onFavourite();
          }}
          aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
          data-ocid={`search.trending.favourite_button.${index}`}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={isFav ? "currentColor" : "none"}
          />
        </button>
        {/* Add to playlist */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1 shrink-0 text-muted-foreground/50 hover:text-foreground transition-colors"
              aria-label="Add to playlist"
              data-ocid={`search.trending.add_playlist_button.${index}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onRequestNewPlaylist}
              className="font-medium text-primary focus:text-primary"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              New playlist…
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator />}
            {playlists.map((pl) => (
              <DropdownMenuItem
                key={pl.id}
                onClick={() => onAddToPlaylist(pl.id)}
              >
                {pl.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

// Spotify-style horizontal track row for Popular Picks
interface PopularTrackRowProps {
  track: Track;
  index: number;
  isFav: boolean;
  playlists: Playlist[];
  isPlaying: boolean;
  onPlay: () => void;
  onFavourite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRequestNewPlaylist: () => void;
}

function PopularTrackRow({
  track,
  index,
  isFav,
  playlists,
  isPlaying,
  onPlay,
  onFavourite,
  onAddToPlaylist,
  onRequestNewPlaylist,
}: PopularTrackRowProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      className={`group flex items-center gap-3 p-2 rounded-md hover:bg-card/80 transition-colors cursor-pointer ${isPlaying ? "bg-card border border-primary/30" : ""}`}
      data-ocid={`search.popular.item.${index}`}
    >
      {/* Index / play icon */}
      <div className="w-5 text-center shrink-0">
        <span
          className={`text-xs font-mono group-hover:hidden block ${isPlaying ? "text-primary" : "text-muted-foreground"}`}
        >
          {isPlaying ? "▶" : index}
        </span>
        <button
          type="button"
          onClick={onPlay}
          className="hidden group-hover:block mx-auto text-foreground"
          aria-label="Play"
        >
          <Play className="h-3 w-3" fill="currentColor" />
        </button>
      </div>

      {/* Thumbnail */}
      <div className="w-10 h-10 rounded overflow-hidden bg-muted shrink-0">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="h-4 w-4 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
      </div>

      {/* Info */}
      <button
        type="button"
        className="flex-1 min-w-0 text-left"
        onClick={onPlay}
      >
        <p
          className={`text-sm font-medium line-clamp-1 ${isPlaying ? "text-primary" : ""}`}
        >
          {track.title}
        </p>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {track.channelName}
        </p>
      </button>

      {/* Duration */}
      <span className="text-xs text-muted-foreground font-mono shrink-0 hidden sm:block">
        {track.duration}
      </span>

      {/* Actions */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        {/* Heart */}
        <button
          type="button"
          className={`p-1.5 rounded transition-colors ${isFav ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
          onClick={(e) => {
            e.stopPropagation();
            onFavourite();
          }}
          aria-label={isFav ? "Remove from favourites" : "Add to favourites"}
          data-ocid={`search.popular.favourite_button.${index}`}
        >
          <Heart
            className="h-3.5 w-3.5"
            fill={isFav ? "currentColor" : "none"}
          />
        </button>
        {/* Add to playlist */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="p-1.5 rounded text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Add to playlist"
              data-ocid={`search.popular.add_playlist_button.${index}`}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={onRequestNewPlaylist}
              className="font-medium text-primary focus:text-primary"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              New playlist…
            </DropdownMenuItem>
            {playlists.length > 0 && <DropdownMenuSeparator />}
            {playlists.map((pl) => (
              <DropdownMenuItem
                key={pl.id}
                onClick={() => onAddToPlaylist(pl.id)}
              >
                {pl.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.div>
  );
}

interface ResultCardProps {
  track: Track;
  index: number;
  isFav: boolean;
  playlists: Playlist[];
  onPlay: () => void;
  onFavourite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
  onRequestNewPlaylist: () => void;
  onAddToQueue: () => void;
  onDownload: () => void;
}

function ResultCard({
  track,
  index,
  isFav,
  playlists,
  onPlay,
  onFavourite,
  onAddToPlaylist,
  onRequestNewPlaylist,
  onAddToQueue,
  onDownload,
}: ResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadWithSpinner = async () => {
    setDownloading(true);
    await onDownload();
    setDownloading(false);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
        delay: Math.min(index * 0.04, 0.5),
      }}
      className="group bg-card rounded-xl border border-border hover:border-primary/30 transition-colors duration-200 hover:shadow-card-hover overflow-hidden"
      data-ocid={`search.result.item.${index}`}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video bg-muted overflow-hidden">
        {imgError ? (
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Music className="h-8 w-8 text-muted-foreground/30" />
          </div>
        ) : (
          <img
            src={track.thumbnail}
            alt={track.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={() => setImgError(true)}
          />
        )}
        {/* Duration badge */}
        <div className="absolute bottom-2 right-2 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded font-mono">
          {track.duration}
        </div>
        {/* CC badge */}
        {track.isCreativeCommons && (
          <div className="absolute top-2 left-2 bg-secondary/90 text-secondary-foreground text-xs px-2 py-0.5 rounded-pill font-semibold">
            CC
          </div>
        )}
        {/* Play overlay */}
        <button
          type="button"
          className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors group/play"
          onClick={onPlay}
          data-ocid={`search.result.play_button.${index}`}
        >
          <div className="w-12 h-12 rounded-full bg-primary/90 flex items-center justify-center opacity-0 group-hover/play:opacity-100 transform scale-75 group-hover/play:scale-100 transition-all duration-200 shadow-glow-sm">
            <Play
              className="h-5 w-5 text-primary-foreground ml-0.5"
              fill="currentColor"
            />
          </div>
        </button>
      </div>

      {/* Info */}
      <div className="p-3">
        <h3
          className="text-sm font-medium line-clamp-2 mb-1 leading-snug"
          title={track.title}
        >
          {track.title}
        </h3>
        <p className="text-xs text-muted-foreground line-clamp-1">
          {track.channelName}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-1 mt-3">
          <Button
            size="sm"
            className="flex-1 h-8 text-xs rounded-pill bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground border border-primary/30"
            onClick={onPlay}
          >
            <Play className="h-3 w-3 mr-1" fill="currentColor" />
            Play
          </Button>

          <button
            type="button"
            className={`p-2 rounded-full transition-colors ${isFav ? "text-red-400" : "text-muted-foreground hover:text-red-400"}`}
            onClick={onFavourite}
            data-ocid={`search.result.favourite_button.${index}`}
            title={isFav ? "Remove from favourites" : "Add to favourites"}
          >
            <Heart className="h-4 w-4" fill={isFav ? "currentColor" : "none"} />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-2 rounded-full text-muted-foreground hover:text-foreground transition-colors"
                data-ocid={`search.result.add_playlist_button.${index}`}
                title="Add to playlist / queue"
              >
                <Plus className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onAddToQueue}>
                <Clock className="h-3.5 w-3.5 mr-2" />
                Add to queue
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRequestNewPlaylist}
                className="font-medium text-primary focus:text-primary"
              >
                <Plus className="h-3.5 w-3.5 mr-2" />
                New playlist…
              </DropdownMenuItem>
              {playlists.length > 0 && <DropdownMenuSeparator />}
              {playlists.map((pl) => (
                <DropdownMenuItem
                  key={pl.id}
                  onClick={() => onAddToPlaylist(pl.id)}
                >
                  {pl.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {track.isCreativeCommons ? (
            <button
              type="button"
              className="p-2 rounded-full text-muted-foreground hover:text-secondary transition-colors"
              onClick={handleDownloadWithSpinner}
              disabled={downloading}
              data-ocid={`search.result.download_button.${index}`}
              title="Download MP3 (Creative Commons)"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
            </button>
          ) : (
            <button
              type="button"
              className="p-2 rounded-full text-muted-foreground/40 cursor-not-allowed"
              disabled
              title="Download not available for copyrighted tracks"
              aria-label="Download not available — copyrighted content"
            >
              <Lock className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// Keep Badge import used for future use
export { Badge };
// Keep ChevronRight for potential future use
export { ChevronRight };
