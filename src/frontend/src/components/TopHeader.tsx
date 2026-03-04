import { useAppState } from "@/store/useAppStore";
import { Crown, Settings } from "lucide-react";

const PAGE_LABELS: Record<string, string> = {
  search: "Search",
  library: "Library",
  favourites: "Favourites",
  playlists: "Playlists",
  recent: "Recently Played",
  queue: "Queue",
  dashboard: "Dashboard",
};

export default function TopHeader() {
  const { state, dispatch } = useAppState();
  const pageTitle = PAGE_LABELS[state.activePage] ?? state.activePage;

  return (
    <header className="hidden md:flex h-14 shrink-0 items-center justify-between px-6 border-b border-border/50 bg-background/80 backdrop-blur-md z-30">
      {/* Left: Page title */}
      <div className="flex items-center gap-2">
        <h2 className="text-base font-semibold font-outfit text-foreground">
          {pageTitle}
        </h2>
        {state.activePage === "dashboard" && (
          <span className="flex items-center gap-1 text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/30 px-2 py-0.5 rounded-full">
            <Crown className="h-3 w-3" />
            Dashboard
          </span>
        )}
      </div>

      {/* Right: Settings */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-colors"
          onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: true })}
          data-ocid="header.settings_button"
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
