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
import SignInButton from "@/components/SignInButton";
import SignInModal from "@/components/SignInModal";
import TopHeader from "@/components/TopHeader";
import { Toaster } from "@/components/ui/sonner";
import { useBackendSync } from "@/hooks/useBackendSync";
import {
  AppContext,
  appReducer,
  getInitialState,
  useAppState,
} from "@/store/useAppStore";
import type { AppAction, AppState } from "@/store/useAppStore";
import { useEffect, useReducer, useState } from "react";

// Wrapper that provides keyboard shortcuts + state access
function KeyboardShortcutsWrapper({
  children,
}: {
  children: (
    state: AppState,
    dispatch: React.Dispatch<AppAction>,
  ) => React.ReactNode;
}) {
  const { state, dispatch } = useAppState();

  // Apply theme
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

  useEffect(() => {
    document.documentElement.classList.add("dark");
  }, []);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
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
  }, [state.currentTrack, dispatch]);

  return <>{children(state, dispatch)}</>;
}

interface InnerLayoutProps {
  signInOpen: boolean;
  onOpenSignIn: () => void;
  onCloseSignIn: () => void;
}

function InnerLayout({
  signInOpen,
  onOpenSignIn,
  onCloseSignIn,
}: InnerLayoutProps) {
  return (
    <KeyboardShortcutsWrapper>
      {(state, _dispatch) => {
        const hasPlayer = !!state.currentTrack;
        const bottomPad = hasPlayer
          ? "pb-[132px] md:pb-[72px]"
          : "pb-[56px] md:pb-0";

        return (
          <div className="flex h-screen overflow-hidden bg-background text-foreground">
            <Sidebar />
            <div
              className={`flex flex-col flex-1 overflow-hidden ${bottomPad}`}
            >
              <TopHeader />
              <main className="flex-1 overflow-hidden relative">
                <div className="absolute inset-0 overflow-y-auto scrollbar-thin">
                  {state.activePage === "search" && (
                    <SearchPage onSignIn={onOpenSignIn} />
                  )}
                  {state.activePage === "library" && <LibraryPage />}
                  {state.activePage === "favourites" && <FavouritesPage />}
                  {state.activePage === "playlists" && <PlaylistsPage />}
                  {state.activePage === "recent" && <RecentlyPlayedPage />}
                  {state.activePage === "queue" && <QueuePage />}
                  {state.activePage === "dashboard" && <AdminDashboard />}
                </div>
              </main>
            </div>
            <Player />
            <QueuePanel />
            <SettingsDrawer />
            <MobileTabBar onOpenSignIn={onOpenSignIn} />
            <SignInButton onOpenSignIn={onOpenSignIn} />
            <SignInModal open={signInOpen} onClose={onCloseSignIn} />
            <Toaster richColors position="top-right" />
          </div>
        );
      }}
    </KeyboardShortcutsWrapper>
  );
}

// Inner app component that has access to AppContext
function AppContent() {
  const [signInOpen, setSignInOpen] = useState(false);

  // Backend sync — runs inside AppContext
  useBackendSync();

  return (
    <InnerLayout
      signInOpen={signInOpen}
      onOpenSignIn={() => setSignInOpen(true)}
      onCloseSignIn={() => setSignInOpen(false)}
    />
  );
}

export default function App() {
  const [state, dispatch] = useReducer(appReducer, undefined, getInitialState);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      <AppContent />
    </AppContext.Provider>
  );
}
