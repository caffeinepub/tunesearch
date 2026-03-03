import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import type { ConsoleLogEntry } from "@/store/useAppStore";
import { Loader2, Music2, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

  const [step, setStep] = useState<"signin" | "email">("signin");
  const [emailInput, setEmailInput] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const prevIdentityRef = useRef<typeof identity>(undefined);

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  // Move to email step when identity first acquired (and no email stored)
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

      // Only show email step if no email stored yet
      if (!state.userEmail) {
        setStep("email");
      } else {
        // Already have email — close modal immediately
        onClose();
      }
    }
    if (!isAuthenticated && prevIdentityRef.current) {
      setStep("signin");
      setEmailInput("");
    }
    prevIdentityRef.current = identity;
  }, [
    isAuthenticated,
    principal,
    identity,
    dispatch,
    state.userEmail,
    onClose,
  ]);

  // Show email input focused when step changes
  useEffect(() => {
    if (step === "email" && open) {
      setTimeout(() => emailRef.current?.focus(), 100);
    }
  }, [step, open]);

  // Login error toast
  useEffect(() => {
    if (isLoginError && loginError) {
      toast.error(`Sign in failed: ${loginError.message}`);
    }
  }, [isLoginError, loginError]);

  // Reset step when modal closes
  useEffect(() => {
    if (!open) {
      setStep("signin");
      setEmailInput("");
    }
  }, [open]);

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    dispatch({ type: "SET_USER_EMAIL", email: trimmed });

    // Silent admin check — no mention of "admin" to user
    const willBePrivileged = state.adminEmails.some(
      (ae) => ae.toLowerCase() === trimmed.toLowerCase(),
    );
    if (willBePrivileged) {
      const adminEntry: ConsoleLogEntry = {
        id: `${Date.now()}-priv`,
        timestamp: Date.now(),
        level: "ADMIN",
        message: `Privileged access granted to ${trimmed}`,
        output: principal,
      };
      dispatch({ type: "ADD_CONSOLE_LOG", entry: adminEntry });
    }

    setEmailInput("");
    onClose();
    toast.success("Welcome to TuneSearch! Your library is ready.");
  };

  const handleSkip = () => {
    onClose();
  };

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
                    <div className="relative z-10 w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center overflow-hidden">
                      <img
                        src="/assets/generated/tunesearch-logo-transparent.dim_200x200.png"
                        alt="TuneSearch"
                        className="w-12 h-12 object-contain"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                          const icon = document.createElement("div");
                          icon.innerHTML =
                            '<svg class="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>';
                          (e.target as HTMLElement).parentElement?.appendChild(
                            icon,
                          );
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

                <AnimatePresence mode="wait">
                  {step === "signin" ? (
                    <motion.div
                      key="step-signin"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3"
                    >
                      {isInitializing ? (
                        <div className="flex items-center justify-center gap-2 py-6 text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-sm">Loading…</span>
                        </div>
                      ) : isAuthenticated ? (
                        // Already signed in — shouldn't normally show but handle gracefully
                        <div className="text-center py-4">
                          <p className="text-sm text-muted-foreground">
                            You are already signed in.
                          </p>
                          <button
                            type="button"
                            className="mt-3 text-sm text-primary hover:underline"
                            onClick={onClose}
                          >
                            Continue
                          </button>
                        </div>
                      ) : (
                        <>
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
                        </>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="step-email"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="mb-5">
                        <h2 className="text-base font-semibold text-foreground">
                          Personalize your experience
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1">
                          Add your email to sync your library and playlists
                          across devices.
                        </p>
                      </div>

                      <form onSubmit={handleEmailSubmit} className="space-y-3">
                        <Input
                          ref={emailRef}
                          type="email"
                          placeholder="you@example.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          className="h-11 rounded-xl bg-background border-border text-sm"
                          data-ocid="signin.email_input"
                          autoComplete="email"
                        />
                        <Button
                          type="submit"
                          className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-sm"
                          data-ocid="signin.email_submit_button"
                          disabled={!emailInput.trim()}
                        >
                          Continue
                        </Button>
                        <button
                          type="button"
                          className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
                          onClick={handleSkip}
                          data-ocid="signin.skip_button"
                        >
                          Skip for now
                        </button>
                      </form>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
