import AdminDashboard from "@/components/AdminDashboard";
import FavouritesPage from "@/components/FavouritesPage";
import LibraryPage from "@/components/LibraryPage";
import Player, { playerActions } from "@/components/Player";
import PlaylistsPage from "@/components/PlaylistsPage";
import QueuePage from "@/components/QueuePage";
import QueuePanel from "@/components/QueuePanel";
import RecentlyPlayedPage from "@/components/RecentlyPlayedPage";
import SearchPage from "@/components/SearchPage";
import SettingsDrawer from "@/components/SettingsDrawer";
import Sidebar, { MobileTabBar } from "@/components/Sidebar";
import { Toaster } from "@/components/ui/sonner";
import { AppContext, appReducer, getInitialState } from "@/store/useAppStore";
import { useEffect, useReducer } from "react";

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  // Apply theme class to document
  useEffect(() => {
    const root = document.documentElement;
    if (state.prefs.theme === "dark") {
      root.classList.remove("light");
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
      root.classList.add("light");
    }
  }, [state.prefs.theme]);

  // Initialize dark theme on mount
  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when in an input/textarea
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (!playerActions) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          playerActions.togglePlay();
          break;
        case "ArrowLeft":
          e.preventDefault();
          playerActions.seekBy(-10);
          break;
        case "ArrowRight":
          e.preventDefault();
          playerActions.seekBy(10);
          break;
        case "n":
        case "N":
          playerActions.nextTrack();
          break;
        case "p":
        case "P":
          playerActions.prevTrack();
          break;
        case "m":
        case "M":
          playerActions.toggleMute();
          break;
        case "f":
        case "F":
          if (state.currentTrack) {
            dispatch({ type: "TOGGLE_FAVOURITE", track: state.currentTrack });
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.currentTrack]);

  const hasPlayer = !!state.currentTrack;
  // On mobile with player: 72px player + ~56px mobile tabs = 128px. On desktop: just 72px player
  const bottomPad = hasPlayer ? "pb-[132px] md:pb-[72px]" : "pb-[56px] md:pb-0";

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <div className="flex h-screen overflow-hidden bg-background text-foreground">
        {/* Desktop Sidebar */}
        <Sidebar />

        {/* Main Content */}
        <div className={`flex flex-col flex-1 overflow-hidden ${bottomPad}`}>
          <main className="flex-1 overflow-hidden relative">
            <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
              {state.activePage === "search" && <SearchPage />}
              {state.activePage === "library" && <LibraryPage />}
              {state.activePage === "favourites" && <FavouritesPage />}
              {state.activePage === "playlists" && <PlaylistsPage />}
              {state.activePage === "recent" && <RecentlyPlayedPage />}
              {state.activePage === "queue" && <QueuePage />}
              {state.activePage === "dashboard" && <AdminDashboard />}
            </div>
          </main>
        </div>

        {/* Player (fixed bottom) */}
        <Player />

        {/* Queue Slide Panel */}
        <QueuePanel />

        {/* Settings Drawer */}
        <SettingsDrawer />

        {/* Mobile Bottom Tabs — always show, player sits above on mobile */}
        <MobileTabBar />

        <Toaster richColors position="top-right" />
      </div>
    </AppContext.Provider>
  );
}
