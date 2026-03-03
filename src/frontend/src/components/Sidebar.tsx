import AuthButton from "@/components/AuthButton";
import { useAppState } from "@/store/useAppStore";
import type { AppState } from "@/store/useAppStore";
import {
  Clock,
  Grid,
  Heart,
  LayoutDashboard,
  List,
  ListMusic,
  Music,
  Search,
  Settings,
} from "lucide-react";
import { motion } from "motion/react";

type Page = AppState["activePage"];

interface NavItem {
  page: Page;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  ocid: string;
}

const navItems: NavItem[] = [
  {
    page: "search",
    icon: Search,
    label: "Search",
    ocid: "sidebar.search_link",
  },
  {
    page: "library",
    icon: Grid,
    label: "Library",
    ocid: "sidebar.library_link",
  },
  {
    page: "favourites",
    icon: Heart,
    label: "Favourites",
    ocid: "sidebar.favourites_link",
  },
  {
    page: "playlists",
    icon: List,
    label: "Playlists",
    ocid: "sidebar.playlists_link",
  },
  { page: "recent", icon: Clock, label: "Recent", ocid: "sidebar.recent_link" },
  {
    page: "queue",
    icon: ListMusic,
    label: "Queue",
    ocid: "sidebar.queue_link",
  },
];

export default function Sidebar() {
  const { state, dispatch } = useAppState();

  const navigate = (page: Page) => {
    dispatch({ type: "SET_ACTIVE_PAGE", page });
  };

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 h-full bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        <img
          src={
            state.appCustomConfig?.logoUrl ||
            "/assets/generated/tunesearch-logo-transparent.dim_200x200.png"
          }
          alt={state.appCustomConfig?.appName || "TuneSearch"}
          className="w-9 h-9 object-contain"
        />
        <span className="font-outfit text-lg font-bold text-gradient">
          {state.appCustomConfig?.appName || "TuneSearch"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 overflow-y-auto">
        <ul className="space-y-1">
          {navItems.map(({ page, icon: Icon, label, ocid }) => (
            <li key={page}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 relative group ${
                  state.activePage === page
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
                }`}
                onClick={() => navigate(page)}
                data-ocid={ocid}
              >
                {state.activePage === page && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
                  />
                )}
                <Icon
                  className={`h-4 w-4 shrink-0 transition-colors ${
                    state.activePage === page ? "text-primary" : ""
                  }`}
                />
                {label}
                {page === "favourites" && state.favourites.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {state.favourites.length}
                  </span>
                )}
                {page === "queue" && state.queue.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    {state.queue.length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Playlists quick list */}
        {state.playlists.length > 0 && (
          <div className="mt-6">
            <p className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
              Playlists
            </p>
            <ul className="space-y-0.5">
              {state.playlists.slice(0, 8).map((pl) => (
                <li key={pl.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
                    onClick={() => {
                      dispatch({ type: "SET_ACTIVE_PAGE", page: "playlists" });
                      dispatch({ type: "SET_SELECTED_PLAYLIST", id: pl.id });
                    }}
                  >
                    <div className="w-7 h-7 rounded bg-muted flex items-center justify-center overflow-hidden shrink-0">
                      {pl.tracks[0] ? (
                        <img
                          src={pl.tracks[0].thumbnail}
                          alt={pl.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const div = document.createElement("div");
                            (e.target as HTMLElement).replaceWith(div);
                          }}
                        />
                      ) : (
                        <Music className="h-3 w-3 text-muted-foreground" />
                      )}
                    </div>
                    <span className="line-clamp-1">{pl.name}</span>
                    <span className="ml-auto shrink-0">{pl.tracks.length}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Settings + Auth */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* Dashboard - admin only */}
        {state.isAdmin && (
          <button
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-150 relative group ${
              state.activePage === "dashboard"
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent/50"
            }`}
            onClick={() => navigate("dashboard")}
            data-ocid="sidebar.dashboard_link"
          >
            {state.activePage === "dashboard" && (
              <motion.div
                layoutId="nav-indicator-bottom"
                className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r"
              />
            )}
            <LayoutDashboard
              className={`h-4 w-4 shrink-0 ${state.activePage === "dashboard" ? "text-primary" : ""}`}
            />
            Dashboard
          </button>
        )}

        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/50 transition-colors"
          onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: true })}
          data-ocid="sidebar.settings_button"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>

        {/* Auth Button */}
        <div className="pt-1">
          <AuthButton />
        </div>
      </div>
    </aside>
  );
}

// Mobile bottom tab bar
export function MobileTabBar() {
  const { state, dispatch } = useAppState();

  const mobileItems = navItems.slice(0, 4);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border">
      <div
        className="flex items-center justify-around py-2"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {mobileItems.map(({ page, icon: Icon, label, ocid }) => (
          <button
            type="button"
            key={page}
            className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
              state.activePage === page
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() => dispatch({ type: "SET_ACTIVE_PAGE", page })}
            data-ocid={ocid}
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
        {state.isAdmin && (
          <button
            type="button"
            className={`flex flex-col items-center gap-1 px-3 py-1 transition-colors ${
              state.activePage === "dashboard"
                ? "text-primary"
                : "text-muted-foreground"
            }`}
            onClick={() =>
              dispatch({ type: "SET_ACTIVE_PAGE", page: "dashboard" })
            }
            data-ocid="sidebar.dashboard_link"
          >
            <LayoutDashboard className="h-5 w-5" />
            <span className="text-[10px]">Admin</span>
          </button>
        )}
        <button
          type="button"
          className="flex flex-col items-center gap-1 px-3 py-1 text-muted-foreground"
          onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: true })}
          data-ocid="sidebar.settings_button"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </button>
      </div>
    </nav>
  );
}
