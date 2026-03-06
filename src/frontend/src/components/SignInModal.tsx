import { Button } from "@/components/ui/button";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import type { ConsoleLogEntry } from "@/store/useAppStore";
import { Loader2, Music2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

interface SignInModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional prompt shown above the main heading */
  promptMessage?: string;
}

export default function SignInModal({
  open,
  onClose,
  promptMessage,
}: SignInModalProps) {
  const {
    identity,
    login,
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

  // When identity is first acquired, log and close
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
      onClose();
      toast.success("Welcome to TuneSearch! Your library is ready.");
    }
    prevIdentityRef.current = identity;
  }, [isAuthenticated, principal, identity, dispatch, onClose]);

  // Login error toast
  useEffect(() => {
    if (isLoginError && loginError) {
      toast.error(`Sign in failed: ${loginError.message}`);
    }
  }, [isLoginError, loginError]);

  // Auto-close if already authenticated when modal opens
  useEffect(() => {
    if (open && isAuthenticated) {
      onClose();
    }
  }, [open, isAuthenticated, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="fixed inset-0 z-[101] flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              role="presentation"
              className="relative w-full max-w-sm rounded-2xl bg-card border border-border/80 shadow-2xl pointer-events-auto overflow-hidden"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                type="button"
                onClick={onClose}
                className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/8 transition-colors"
                data-ocid="signin.close_button"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-8 pt-10 pb-8">
                {/* Logo + App name */}
                <div className="flex flex-col items-center mb-7">
                  <div className="relative mb-4">
                    <div className="absolute inset-0 rounded-full bg-primary/25 blur-xl scale-150 animate-pulse" />
                    <div className="relative z-10 w-16 h-16 rounded-[18px] overflow-hidden border border-primary/30 flex items-center justify-center bg-primary/10">
                      <img
                        src="/assets/uploads/tunesearch-logo-user.jpg"
                        alt="TuneSearch"
                        className="w-16 h-16 object-cover rounded-[18px]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    </div>
                  </div>
                  <h1 className="font-outfit text-2xl font-bold text-foreground">
                    {state.appCustomConfig?.appName || "TuneSearch"}
                  </h1>
                  <p className="text-sm text-muted-foreground mt-1 text-center">
                    {promptMessage ||
                      state.appCustomConfig?.tagline ||
                      "Your music, your library"}
                  </p>
                </div>

                {/* Sign in content */}
                {isInitializing ? (
                  <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Loading…</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <Button
                      className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm shadow-glow-sm gap-3"
                      onClick={login}
                      disabled={isLoggingIn}
                      data-ocid="signin.sign_in_button"
                    >
                      {isLoggingIn ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Signing in…
                        </>
                      ) : (
                        <>
                          <Music2 className="h-4 w-4" />
                          Continue with Internet Identity
                        </>
                      )}
                    </Button>

                    <p className="text-xs text-muted-foreground text-center leading-relaxed pt-1">
                      Secure, private sign-in. No password required.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
