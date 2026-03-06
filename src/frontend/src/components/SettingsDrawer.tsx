import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PROMO_CODE, useAppState } from "@/store/useAppStore";
import {
  CheckCircle2,
  Download,
  ExternalLink,
  Info,
  Keyboard,
  Loader2,
  Lock,
  Moon,
  Sliders,
  Sun,
  Timer,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const EQ_PRESETS = ["Flat", "Bass Boost", "Pop", "Rock", "Jazz", "Classical"];
const SLEEP_TIMERS = [
  { label: "Off", value: 0 },
  { label: "15 minutes", value: 15 },
  { label: "30 minutes", value: 30 },
  { label: "45 minutes", value: 45 },
  { label: "60 minutes", value: 60 },
];

const KEYBOARD_SHORTCUTS = [
  { key: "Space", action: "Play / Pause" },
  { key: "←", action: "Seek back 10s" },
  { key: "→", action: "Seek forward 10s" },
  { key: "N", action: "Next track" },
  { key: "P", action: "Previous track" },
  { key: "M", action: "Mute / Unmute" },
  { key: "F", action: "Toggle favourite" },
];

declare global {
  interface Window {
    deferredInstallPrompt?: BeforeInstallPromptEvent;
  }
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export default function SettingsDrawer() {
  const { state, dispatch } = useAppState();
  const [canInstall, setCanInstall] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [promoSubmitted, setPromoSubmitted] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      window.deferredInstallPrompt = e as BeforeInstallPromptEvent;
      setCanInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!window.deferredInstallPrompt) {
      toast.info(
        "To install: tap your browser's share/menu button → 'Add to Home Screen'",
      );
      return;
    }
    setInstalling(true);
    await window.deferredInstallPrompt.prompt();
    const { outcome } = await window.deferredInstallPrompt.userChoice;
    if (outcome === "accepted") {
      toast.success("TuneSearch installed!");
      setCanInstall(false);
    }
    setInstalling(false);
    window.deferredInstallPrompt = undefined;
  };

  const isDark = state.prefs.theme === "dark";

  const handlePromoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim();
    if (!code) return;
    if (code === PROMO_CODE) {
      dispatch({ type: "SET_ADMIN", isAdmin: true });
      setPromoSubmitted(true);
      setPromoInput("");
      toast.success("Access granted.");
    } else if (code.toLowerCase() === "revoke" && state.isAdmin) {
      // Allow admin to revoke their own access by typing "revoke"
      dispatch({ type: "SET_ADMIN", isAdmin: false });
      setPromoSubmitted(false);
      setPromoInput("");
      toast.info("Access revoked.");
    } else {
      toast.error("Invalid code. Please try again.");
      setPromoInput("");
    }
  };

  return (
    <AnimatePresence>
      {state.isSettingsOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => dispatch({ type: "SET_SETTINGS_OPEN", open: false })}
          />

          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-card border-l border-border z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
              <h2 className="font-outfit text-xl font-bold">Settings</h2>
              <button
                type="button"
                className="p-2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() =>
                  dispatch({ type: "SET_SETTINGS_OPEN", open: false })
                }
                data-ocid="settings.close_button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-5 space-y-8">
                {/* Appearance */}
                <Section icon={<Sun className="h-4 w-4" />} title="Appearance">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Theme</Label>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {isDark ? "Dark mode" : "Light mode"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4 text-muted-foreground" />
                      <Switch
                        checked={isDark}
                        onCheckedChange={(checked) =>
                          dispatch({
                            type: "SET_PREFS",
                            prefs: { theme: checked ? "dark" : "light" },
                          })
                        }
                        data-ocid="settings.theme_toggle"
                      />
                      <Moon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </Section>

                {/* Promo Code */}
                <Section
                  icon={<Lock className="h-4 w-4" />}
                  title="Enter Promo-code"
                >
                  {state.isAdmin || promoSubmitted ? (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/30">
                      <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm text-primary font-medium">
                        Special access active
                      </span>
                    </div>
                  ) : (
                    <form onSubmit={handlePromoSubmit} className="flex gap-2">
                      <Input
                        type="password"
                        placeholder="Enter promo-code"
                        value={promoInput}
                        onChange={(e) => setPromoInput(e.target.value)}
                        className="h-10 text-sm rounded-lg bg-background border-border flex-1"
                        data-ocid="settings.promo_input"
                        autoComplete="off"
                      />
                      <Button
                        type="submit"
                        size="sm"
                        className="h-10 px-4 rounded-lg"
                        disabled={!promoInput.trim()}
                        data-ocid="settings.promo_submit_button"
                      >
                        Apply
                      </Button>
                    </form>
                  )}
                </Section>

                <Separator />

                {/* Equalizer */}
                <Section
                  icon={<Sliders className="h-4 w-4" />}
                  title="Equalizer"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    Audio preset for playback tone
                  </p>
                  <Select
                    value={state.prefs.equalizerPreset}
                    onValueChange={(v) => {
                      dispatch({
                        type: "SET_PREFS",
                        prefs: { equalizerPreset: v },
                      });
                      toast.success(`Equalizer: ${v}`);
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-ocid="settings.equalizer_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQ_PRESETS.map((p) => (
                        <SelectItem
                          key={p}
                          value={p.toLowerCase().replace(" ", "_")}
                        >
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground/60 mt-2">
                    Note: Browser limitations mean only basic EQ adjustments are
                    applied.
                  </p>
                </Section>

                <Separator />

                {/* Sleep Timer */}
                <Section
                  icon={<Timer className="h-4 w-4" />}
                  title="Sleep Timer"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    Auto-pause playback after the selected duration
                  </p>
                  <Select
                    value={String(state.prefs.sleepTimerMinutes)}
                    onValueChange={(v) => {
                      const mins = Number.parseInt(v);
                      dispatch({
                        type: "SET_PREFS",
                        prefs: { sleepTimerMinutes: mins },
                      });
                      if (mins > 0) {
                        toast.success(`Sleep timer set for ${mins} minutes`);
                      } else {
                        toast.info("Sleep timer off");
                      }
                    }}
                  >
                    <SelectTrigger
                      className="w-full"
                      data-ocid="settings.sleep_timer_select"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SLEEP_TIMERS.map((t) => (
                        <SelectItem key={t.value} value={String(t.value)}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Section>

                <Separator />

                {/* Keyboard shortcuts */}
                <Section
                  icon={<Keyboard className="h-4 w-4" />}
                  title="Keyboard Shortcuts"
                >
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Key</TableHead>
                        <TableHead className="text-xs">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {KEYBOARD_SHORTCUTS.map((s) => (
                        <TableRow key={s.key}>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className="font-mono text-xs"
                            >
                              {s.key}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {s.action}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Section>

                <Separator />

                {/* PWA Install */}
                <Section
                  icon={<Download className="h-4 w-4" />}
                  title="Install App"
                >
                  <p className="text-xs text-muted-foreground mb-3">
                    Install TuneSearch to your device for a native app
                    experience. On iOS, use Safari → Share → Add to Home Screen.
                  </p>
                  <Button
                    onClick={handleInstall}
                    variant="outline"
                    className="w-full rounded-pill"
                    data-ocid="settings.install_button"
                    disabled={installing}
                  >
                    {installing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    {canInstall ? "Install TuneSearch" : "Add to Home Screen"}
                  </Button>
                </Section>

                <Separator />

                {/* About */}
                <Section icon={<Info className="h-4 w-4" />} title="About">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          state.appCustomConfig?.logoUrl ||
                          "/assets/uploads/tunesearch-logo-user.jpg"
                        }
                        alt={state.appCustomConfig?.appName || "TuneSearch"}
                        className="w-10 h-10 object-cover rounded-xl"
                      />
                      <div>
                        <p className="font-outfit font-bold text-gradient">
                          {state.appCustomConfig?.appName || "TuneSearch"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          YouTube Music Player
                        </p>
                      </div>
                    </div>
                    <div className="p-3 rounded-lg bg-background/50 border border-border">
                      <p className="text-sm font-medium">
                        {state.appCustomConfig?.creditsHtml ? (
                          state.appCustomConfig.creditsHtml.includes(
                            "DemonXEnma",
                          ) ? (
                            <>
                              Developed by{" "}
                              <a
                                href="https://youtube.com/@demonxenma?si=goxTj9M7Lv6YGqVV"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:text-primary/80 underline inline-flex items-center gap-0.5 font-semibold"
                              >
                                DemonXEnma
                                <ExternalLink className="h-3 w-3" />
                              </a>{" "}
                              in Sponser with Caffeine
                            </>
                          ) : (
                            state.appCustomConfig.creditsHtml
                          )
                        ) : (
                          <>
                            Developed by{" "}
                            <a
                              href="https://youtube.com/@demonxenma?si=goxTj9M7Lv6YGqVV"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:text-primary/80 underline inline-flex items-center gap-0.5 font-semibold"
                            >
                              DemonXEnma
                              <ExternalLink className="h-3 w-3" />
                            </a>{" "}
                            in Sponser with Caffeine
                          </>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Subscribe on YouTube for more content
                      </p>
                    </div>
                  </div>
                </Section>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-primary">{icon}</span>
        <h3 className="font-outfit font-semibold text-sm uppercase tracking-wide text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}
