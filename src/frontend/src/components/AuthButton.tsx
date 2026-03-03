import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import type { ConsoleLogEntry } from "@/store/useAppStore";
import { Loader2, LogIn, LogOut, Shield, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
  const [emailInput, setEmailInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
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

  // Log sign-in event and show email form when identity is first acquired
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
      if (!state.userEmail) {
        setShowEmailForm(true);
      }
    }
    if (!isAuthenticated && prevIdentityRef.current) {
      setShowEmailForm(false);
      setEmailInput("");
    }
    prevIdentityRef.current = identity;
  }, [isAuthenticated, principal, identity, dispatch, state.userEmail]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    dispatch({ type: "SET_USER_EMAIL", email: trimmed });

    // Check if this email grants admin access and log it
    const willBeAdmin = state.adminEmails.some(
      (adminEmail) => adminEmail.toLowerCase() === trimmed.toLowerCase(),
    );
    if (willBeAdmin) {
      const adminEntry: ConsoleLogEntry = {
        id: `${Date.now()}-admin`,
        timestamp: Date.now(),
        level: "ADMIN",
        message: `Admin access granted to ${trimmed}`,
        output: principal,
      };
      dispatch({ type: "ADD_CONSOLE_LOG", entry: adminEntry });
      toast.success("Admin access granted!");
    }

    setShowEmailForm(false);
    setEmailInput("");
  };

  const handleSignOut = () => {
    clear();
    dispatch({ type: "SET_ADMIN", isAdmin: false });
    dispatch({ type: "SET_USER_EMAIL", email: "" });
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
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            {state.isAdmin ? (
              <Shield className="h-3 w-3 text-primary" />
            ) : (
              <User className="h-3 w-3 text-muted-foreground" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            {state.userEmail ? (
              <p className="text-xs font-medium truncate text-foreground">
                {state.userEmail}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground font-mono truncate">
                {principal?.slice(0, 10)}…
              </p>
            )}
            {state.isAdmin && (
              <p className="text-[10px] text-primary font-semibold">Admin</p>
            )}
          </div>
        </div>
      </div>

      {/* Email form (shown if no email set) */}
      {showEmailForm && !state.userEmail && (
        <form onSubmit={handleEmailSubmit} className="space-y-1.5">
          <p className="text-[10px] text-muted-foreground px-1">
            Enter your email to unlock admin access:
          </p>
          <Input
            type="email"
            placeholder="your@email.com"
            value={emailInput}
            onChange={(e) => setEmailInput(e.target.value)}
            className="h-7 text-xs rounded-md"
            data-ocid="auth.email_input"
          />
          <div className="flex gap-1">
            <Button
              type="submit"
              size="sm"
              className="flex-1 h-7 text-xs rounded-md"
              data-ocid="auth.email_submit_button"
            >
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-xs rounded-md px-2"
              onClick={() => setShowEmailForm(false)}
              data-ocid="auth.email_cancel_button"
            >
              Skip
            </Button>
          </div>
        </form>
      )}

      {/* Set email button if logged in but no email */}
      {!showEmailForm && !state.userEmail && isAuthenticated && (
        <Button
          size="sm"
          variant="ghost"
          className="w-full h-7 text-xs rounded-md text-muted-foreground hover:text-foreground"
          onClick={() => setShowEmailForm(true)}
          data-ocid="auth.set_email_button"
        >
          + Set email
        </Button>
      )}

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
