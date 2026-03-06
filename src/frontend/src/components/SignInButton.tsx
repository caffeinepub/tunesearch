import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";

interface SignInButtonProps {
  onOpenSignIn: () => void;
}

export default function SignInButton({ onOpenSignIn }: SignInButtonProps) {
  const { identity, clear, isInitializing } = useInternetIdentity();
  const { state, dispatch } = useAppState();

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  const handleSignOut = () => {
    clear();
    dispatch({ type: "SET_ADMIN", isAdmin: false });
    dispatch({ type: "SET_USER_EMAIL", email: "" });
    toast.info("Signed out");
  };

  const avatarLetter = state.userEmail
    ? state.userEmail[0].toUpperCase()
    : principal
      ? principal[0].toUpperCase()
      : "?";

  if (isInitializing) {
    return (
      <div className="fixed top-[57px] right-4 z-[60] w-9 h-9 rounded-full bg-muted animate-pulse" />
    );
  }

  if (!isAuthenticated) {
    return (
      <button
        type="button"
        className="fixed top-[57px] right-4 z-[60] flex items-center gap-2 h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold shadow-glow-sm hover:bg-primary/90 transition-all duration-200 hover:scale-105 active:scale-95"
        onClick={onOpenSignIn}
        data-ocid="auth.sign_in_button"
        aria-label="Sign in"
      >
        <User className="h-3.5 w-3.5" />
        Sign In
      </button>
    );
  }

  // Signed in — show avatar circle dropdown
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="fixed top-[57px] right-4 z-[60] w-9 h-9 rounded-full bg-primary/20 border-2 border-primary/50 hover:border-primary transition-colors flex items-center justify-center text-sm font-bold text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary shadow-glow-sm"
          data-ocid="auth.avatar_button"
          aria-label={state.userEmail || "Account"}
          title={state.userEmail || "Account"}
        >
          {state.userEmail ? (
            <span className="text-xs font-bold">{avatarLetter}</span>
          ) : (
            <User className="h-4 w-4" />
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="w-56 mt-1"
        data-ocid="auth.dropdown_menu"
      >
        <div className="flex items-center gap-3 px-3 py-2.5">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            {state.userEmail ? (
              <p className="text-sm font-medium truncate">{state.userEmail}</p>
            ) : (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {principal?.slice(0, 16)}…
              </p>
            )}
            {!state.userEmail && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={onOpenSignIn}
              >
                Add email
              </button>
            )}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="text-muted-foreground hover:text-destructive focus:text-destructive gap-2"
          data-ocid="auth.sign_out_button"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
