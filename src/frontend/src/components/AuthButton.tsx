import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import type { ConsoleLogEntry } from "@/store/useAppStore";
import { Loader2, LogIn, LogOut, Shield, User } from "lucide-react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

export default function AuthButton() {
  const {
    identity,
    login,
    clear,
    isInitializing,
    isLoggingIn,
    isLoginError,
    loginError,
  } = useInternetIdentity();
  const { state, dispatch } = useAppState();
  const prevIdentityRef = useRef<typeof identity>(undefined);

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  // Show toast on login error
  useEffect(() => {
    if (isLoginError && loginError) {
      toast.error(`Sign in failed: ${loginError.message}`);
    }
  }, [isLoginError, loginError]);

  // Log sign-in event
  useEffect(() => {
    if (isAuthenticated && !prevIdentityRef.current) {
      const entry: ConsoleLogEntry = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        level: "INFO",
        message: "User signed in",
        output: principal,
      };
      dispatch({ type: "ADD_CONSOLE_LOG", entry });
    }
    prevIdentityRef.current = identity;
  }, [isAuthenticated, principal, identity, dispatch]);

  const handleSignOut = () => {
    clear();
    // Do NOT revoke admin on sign out — admin is promo-code based and persists
  };

  if (isInitializing) {
    return (
      <div className="px-3 py-2 flex items-center gap-2 text-muted-foreground text-xs">
        <Loader2 className="h-3 w-3 animate-spin" />
        <span>Loading…</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Button
        size="sm"
        variant="default"
        className="w-full rounded-md text-xs h-9 gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-glow-sm"
        onClick={login}
        disabled={isLoggingIn}
        data-ocid="auth.sign_in_button"
      >
        {isLoggingIn ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <LogIn className="h-3.5 w-3.5" />
        )}
        {isLoggingIn ? "Signing in…" : "Sign In"}
      </Button>
    );
  }

  return (
    <div className="space-y-2">
      {/* User info card */}
      <div className="px-3 py-2 rounded-md bg-muted/30 border border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {state.isAdmin ? (
              <Shield className="h-3 w-3 text-primary" />
            ) : (
              <User className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-mono text-muted-foreground truncate">
              {principal?.slice(0, 14)}…
            </p>
          </div>
        </div>
      </div>

      {/* Sign out */}
      <Button
        size="sm"
        variant="ghost"
        className="w-full h-7 text-xs rounded-md text-muted-foreground hover:text-destructive gap-1.5"
        onClick={handleSignOut}
        data-ocid="auth.sign_out_button"
      >
        <LogOut className="h-3 w-3" />
        Sign Out
      </Button>
    </div>
  );
}
