import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  ChevronDown,
  Download,
  Heart,
  Loader2,
  Music,
  Play,
  Plus,
  Search,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
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

export default function SearchPage() {
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
          throw new Error(data.error.message || "YouTube API error");
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

  const handlePlay = (track: Track, idx: number) => {
    dispatch({ type: "SET_QUEUE", queue: results, index: idx });
    dispatch({ type: "SET_CURRENT_TRACK", track });
    dispatch({ type: "ADD_RECENTLY_PLAYED", track });
  };

  const isFavourite = (videoId: string) =>
    state.favourites.some((f) => f.videoId === videoId);

  const handleDownload = async (track: Track) => {
    if (!track.isCreativeCommons) return;

    toast.loading("Preparing download…", { id: `dl-${track.videoId}` });

    try {
      const res = await fetch("https://co.wuk.sh/api/json", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: `https://www.youtube.com/watch?v=${track.videoId}`,
          isAudioOnly: true,
          aFormat: "mp3",
          filenamePattern: "basic",
        }),
      });
      const data = await res.json();
      if (data.url) {
        const a = document.createElement("a");
        a.href = data.url;
        a.download = `${track.title}.mp3`;
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        toast.success("Download started!", { id: `dl-${track.videoId}` });
      } else {
        throw new Error("No download URL returned");
      }
    } catch {
      toast.dismiss(`dl-${track.videoId}`);
      window.open(`https://www.youtube.com/watch?v=${track.videoId}`, "_blank");
      toast.info("Direct download unavailable — opened YouTube instead.", {
        duration: 5000,
      });
    }
  };

  const handleAddToPlaylist = (playlistId: string, track: Track) => {
    dispatch({ type: "ADD_TO_PLAYLIST", playlistId, track });
    const playlist = state.playlists.find((p) => p.id === playlistId);
    toast.success(`Added to "${playlist?.name || "Playlist"}"`);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar Area */}
      <div
        className={`flex flex-col items-center transition-all duration-500 ${
          !hasSearched ? "flex-1 justify-center pb-16" : "py-6"
        }`}
      >
        {!hasSearched && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center gap-3"
          >
            <img
              src="/assets/generated/tunesearch-logo-transparent.dim_200x200.png"
              alt="TuneSearch"
              className="w-20 h-20 object-contain drop-shadow-[0_0_20px_oklch(0.65_0.28_290/0.5)]"
            />
            <h1 className="font-outfit text-4xl font-bold text-gradient">
              TuneSearch
            </h1>
            <p className="text-muted-foreground text-sm">
              Search and play music from YouTube
            </p>
          </motion.div>
        )}

        <div className="w-full max-w-2xl px-4">
          {/* Mode Toggle */}
          <div className="flex gap-2 mb-3 justify-center">
            <Button
              size="sm"
              variant={!ccOnly ? "default" : "outline"}
              className="rounded-pill text-xs h-7"
              onClick={() => {
                setCcOnly(false);
              }}
              data-ocid="search.cc_toggle"
            >
              All Videos
            </Button>
            <Button
              size="sm"
              variant={ccOnly ? "default" : "outline"}
              className="rounded-pill text-xs h-7"
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, albums…"
                className="pl-10 h-12 rounded-pill bg-card border-border text-base focus-visible:ring-1 focus-visible:ring-primary"
                data-ocid="search.search_input"
              />
            </div>
            <Button
              type="submit"
              disabled={loading || !query.trim()}
              className="h-12 px-6 rounded-pill bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm"
              data-ocid="search.submit_button"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Search"
              )}
            </Button>
          </form>

          {/* Search History */}
          {!hasSearched && state.searchHistory.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-4 flex flex-wrap gap-2"
            >
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
              <p className="text-muted-foreground text-sm">
                Searching YouTube…
              </p>
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
              {/* Search History chip for current query */}
              {hasSearched && state.searchHistory.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {state.searchHistory.slice(0, 6).map((h) => (
                    <button
                      type="button"
                      key={h}
                      className="flex items-center gap-1 bg-card border border-border rounded-pill px-3 py-1 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
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

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {results.map((track, idx) => (
                  <ResultCard
                    key={`${track.videoId}-${idx}`}
                    track={track}
                    index={idx + 1}
                    isFav={isFavourite(track.videoId)}
                    playlists={state.playlists}
                    onPlay={() => handlePlay(track, idx)}
                    onFavourite={() =>
                      dispatch({ type: "TOGGLE_FAVOURITE", track })
                    }
                    onAddToPlaylist={(plId) => handleAddToPlaylist(plId, track)}
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
    </div>
  );
}

interface ResultCardProps {
  track: Track;
  index: number;
  isFav: boolean;
  playlists: import("@/store/useAppStore").Playlist[];
  onPlay: () => void;
  onFavourite: () => void;
  onAddToPlaylist: (playlistId: string) => void;
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
  onAddToQueue,
  onDownload,
}: ResultCardProps) {
  const [imgError, setImgError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.5) }}
      className="group bg-card rounded-card border border-border hover:border-primary/30 transition-all duration-200 hover:shadow-card-hover overflow-hidden"
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
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onAddToQueue}>
                Add to queue
              </DropdownMenuItem>
              {playlists.length > 0 && (
                <div className="border-t border-border my-1" />
              )}
              {playlists.map((pl) => (
                <DropdownMenuItem
                  key={pl.id}
                  onClick={() => onAddToPlaylist(pl.id)}
                >
                  {pl.name}
                </DropdownMenuItem>
              ))}
              {playlists.length === 0 && (
                <DropdownMenuItem
                  disabled
                  className="text-xs text-muted-foreground"
                >
                  No playlists yet
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {track.isCreativeCommons && (
            <button
              type="button"
              className="p-2 rounded-full text-muted-foreground hover:text-secondary transition-colors"
              onClick={onDownload}
              data-ocid={`search.result.download_button.${index}`}
              title="Download (Creative Commons)"
            >
              <Download className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
