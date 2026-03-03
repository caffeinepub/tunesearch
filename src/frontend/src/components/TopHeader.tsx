import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import { Crown, LogOut, Settings, User } from "lucide-react";
import { toast } from "sonner";

const PAGE_LABELS: Record<string, string> = {
  search: "Search",
  library: "Library",
  favourites: "Favourites",
  playlists: "Playlists",
  recent: "Recently Played",
  queue: "Queue",
  dashboard: "Dashboard",
};

interface TopHeaderProps {
  onOpenSignIn?: () => void;
}

export default function TopHeader({ onOpenSignIn }: TopHeaderProps) {
  const { state, dispatch } = useAppState();
  const { identity, clear, isInitializing } = useInternetIdentity();
  const pageTitle = PAGE_LABELS[state.activePage] ?? state.activePage;

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  const avatarLetter = state.userEmail
    ? state.userEmail[0].toUpperCase()
    : principal
      ? principal[0].toUpperCase()
      : "?";

  const handleSignOut = () => {
    clear();
    dispatch({ type: "SET_ADMIN", isAdmin: false });
    dispatch({ type: "SET_USER_EMAIL", email: "" });
    toast.info("Signed out");
  };

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

      {/* Right: Auth + Settings */}
      <div className="flex items-center gap-2">
        {/* Sign-in / Avatar */}
        {isInitializing ? (
          <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse" />
        ) : !isAuthenticated ? (
          <button
            type="button"
            onClick={onOpenSignIn}
            data-ocid="auth.sign_in_button"
            aria-label="Sign in"
            className="flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold hover:bg-primary/20 hover:border-primary/60 transition-all duration-200 active:scale-95"
          >
            <User className="h-3 w-3" />
            Sign In
          </button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                data-ocid="auth.avatar_button"
                aria-label={state.userEmail || "Account"}
                title={state.userEmail || "Account"}
                className="w-8 h-8 rounded-full bg-primary/20 border-2 border-primary/40 hover:border-primary/80 transition-all duration-200 flex items-center justify-center text-xs font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-95"
              >
                {state.userEmail ? (
                  <span>{avatarLetter}</span>
                ) : (
                  <User className="h-3.5 w-3.5" />
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 mt-1"
              data-ocid="auth.dropdown_menu"
            >
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                  {avatarLetter}
                </div>
                <div className="flex-1 min-w-0">
                  {state.userEmail ? (
                    <p className="text-sm font-medium truncate">
                      {state.userEmail}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {principal?.slice(0, 14)}…
                    </p>
                  )}
                  {state.isAdmin && (
                    <span className="text-[10px] text-amber-400 font-semibold">
                      ✦ Privileged
                    </span>
                  )}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleSignOut}
                className="gap-2 text-muted-foreground hover:text-destructive focus:text-destructive"
                data-ocid="auth.sign_out_button"
              >
                <LogOut className="h-3.5 w-3.5" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Settings */}
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
