import { useInternetIdentity } from "@/hooks/useInternetIdentity";
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
  User,
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

  const isEffectivelyAdmin = state.isAdmin;

  const navigate = (page: Page) => {
    dispatch({ type: "SET_ACTIVE_PAGE", page });
  };

  return (
    <aside className="hidden md:flex flex-col w-52 lg:w-60 h-full bg-sidebar border-r border-sidebar-border shrink-0">
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-sidebar-border">
        <div className="relative shrink-0">
          <div className="w-9 h-9 rounded-xl overflow-hidden border-2 border-primary/40 shadow-[0_0_12px_rgba(var(--primary-raw,139,92,246),0.4)] relative z-10 bg-muted">
            <img
              src={
                state.appCustomConfig?.logoUrl ||
                "/assets/uploads/tunesearch-logo-user.jpg"
              }
              alt={state.appCustomConfig?.appName || "TuneSearch"}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 blur-md bg-primary/30 rounded-xl scale-125 z-0" />
        </div>
        <span className="font-outfit text-lg font-bold text-gradient">
          {state.appCustomConfig?.appName || "TuneSearch"}
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-3 px-2.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground/50 px-2 mb-1.5 uppercase tracking-widest">
          Menu
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ page, icon: Icon, label, ocid }) => (
            <li key={page}>
              <button
                type="button"
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.97] relative ${
                  state.activePage === page
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground/80 hover:text-foreground hover:bg-white/5"
                }`}
                onClick={() => navigate(page)}
                data-ocid={ocid}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
                {page === "favourites" && state.favourites.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
                    {state.favourites.length}
                  </span>
                )}
                {page === "queue" && state.queue.length > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground/60 tabular-nums">
                    {state.queue.length}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        {/* Playlists quick list */}
        {state.playlists.length > 0 && (
          <div className="mt-5">
            <p className="text-[10px] font-semibold text-muted-foreground/50 px-2 mb-1.5 uppercase tracking-widest">
              Library
            </p>
            <ul className="space-y-0.5">
              {state.playlists.slice(0, 8).map((pl) => (
                <li key={pl.id}>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs text-muted-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors"
                    onClick={() => {
                      dispatch({ type: "SET_ACTIVE_PAGE", page: "playlists" });
                      dispatch({ type: "SET_SELECTED_PLAYLIST", id: pl.id });
                    }}
                  >
                    <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center overflow-hidden shrink-0">
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
                    <span className="line-clamp-1 flex-1 text-left">
                      {pl.name}
                    </span>
                    <span className="shrink-0 text-muted-foreground/50 tabular-nums">
                      {pl.tracks.length}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Settings + Dashboard (admin only) — no auth button here */}
      <div className="p-2.5 border-t border-sidebar-border space-y-0.5">
        {/* Dashboard - admin only */}
        {isEffectivelyAdmin && (
          <button
            type="button"
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              state.activePage === "dashboard"
                ? "bg-primary/15 text-primary"
                : "text-amber-400/80 hover:text-amber-400 hover:bg-amber-400/10"
            }`}
            onClick={() => navigate("dashboard")}
            data-ocid="sidebar.dashboard_link"
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" />
            Dashboard
          </button>
        )}

        <button
          type="button"
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground/80 hover:text-foreground hover:bg-white/5 transition-colors"
          onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: true })}
          data-ocid="sidebar.settings_button"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
      </div>
    </aside>
  );
}

// Mobile bottom tab bar
export function MobileTabBar({
  onOpenSignIn,
}: { onOpenSignIn?: () => void } = {}) {
  const { state, dispatch } = useAppState();
  const { identity } = useInternetIdentity();

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  const isMobileAdmin = state.isAdmin;

  const mobileItems = navItems.slice(0, 4);

  // Build tab items, cap at 5 total to prevent overflow on small phones
  const allTabs = [
    ...mobileItems,
    ...(isMobileAdmin
      ? [
          {
            page: "dashboard" as Page,
            icon: LayoutDashboard,
            label: "Panel",
            ocid: "sidebar.dashboard_link",
          },
        ]
      : []),
  ];
  // Always include account + settings as the last two, within a 5-item cap
  const maxContent = 3; // slots for nav items
  const contentTabs = allTabs.slice(0, maxContent);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-xl border-t border-border">
      <div
        className="flex items-center overflow-x-auto scroll-snap-x-mandatory scrollbar-none"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {contentTabs.map(({ page, icon: Icon, label, ocid }) => {
          const isActive = state.activePage === page;
          return (
            <motion.button
              type="button"
              key={page}
              className={`flex flex-col items-center gap-0.5 flex-1 min-w-[52px] px-2 py-1.5 rounded-lg transition-colors duration-200 scroll-snap-align-center ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => dispatch({ type: "SET_ACTIVE_PAGE", page })}
              whileTap={{ scale: 0.85 }}
              data-ocid={ocid}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px]">{label}</span>
              {isActive && (
                <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
              )}
            </motion.button>
          );
        })}
        {/* Account / Sign In button */}
        <motion.button
          type="button"
          className={`flex flex-col items-center gap-0.5 flex-1 min-w-[52px] px-2 py-1.5 rounded-lg transition-colors duration-200 ${
            isAuthenticated
              ? "text-primary"
              : "text-muted-foreground hover:text-primary"
          }`}
          onClick={onOpenSignIn}
          whileTap={{ scale: 0.85 }}
          data-ocid="sidebar.account_button"
        >
          <User className="h-5 w-5" />
          <span className="text-[10px]">
            {isAuthenticated
              ? state.userEmail
                ? state.userEmail.split("@")[0].slice(0, 6)
                : "Me"
              : "Sign In"}
          </span>
          {isAuthenticated && (
            <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
          )}
        </motion.button>
        <motion.button
          type="button"
          className="flex flex-col items-center gap-0.5 flex-1 min-w-[52px] px-2 py-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors duration-200"
          onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: true })}
          whileTap={{ scale: 0.85 }}
          data-ocid="sidebar.settings_button"
        >
          <Settings className="h-5 w-5" />
          <span className="text-[10px]">More</span>
        </motion.button>
      </div>
    </nav>
  );
}
