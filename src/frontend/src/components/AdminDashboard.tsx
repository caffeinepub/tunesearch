import AdminConsole from "@/components/AdminConsole";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import { useAppState } from "@/store/useAppStore";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Home,
  Key,
  LayoutDashboard,
  Lock,
  Palette,
  Save,
  Shield,
  Sliders,
  Terminal,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

const KEYBOARD_SHORTCUTS = [
  { key: "Space", action: "Play / Pause" },
  { key: "←", action: "Seek back 10s" },
  { key: "→", action: "Seek forward 10s" },
  { key: "N", action: "Next track" },
  { key: "P", action: "Previous track" },
  { key: "M", action: "Mute / Unmute" },
  { key: "F", action: "Toggle favourite" },
];

export default function AdminDashboard() {
  const { state, dispatch } = useAppState();
  const { identity } = useInternetIdentity();
  const principal = identity?.getPrincipal().toString();

  const navigate = (page: typeof state.activePage) =>
    dispatch({ type: "SET_ACTIVE_PAGE", page });

  if (!state.isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <Shield className="h-12 w-12 text-muted-foreground/30 mx-auto" />
          <p className="text-muted-foreground">Admin access required</p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("search")}
          >
            Go back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border shrink-0 bg-card/50 backdrop-blur-sm">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("search")}
          className="gap-2 text-muted-foreground hover:text-foreground"
          data-ocid="dashboard.back_button"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </Button>
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-5 w-5 text-primary" />
          <h1 className="font-outfit text-xl font-bold">Admin Dashboard</h1>
        </div>
        <Badge
          variant="outline"
          className="ml-auto text-primary border-primary/30 bg-primary/10 text-xs"
        >
          Admin
        </Badge>
      </div>

      {/* Tabs */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="appearance" className="h-full flex flex-col">
          <div className="border-b border-border px-6 shrink-0 overflow-x-auto">
            <TabsList className="h-10 bg-transparent gap-1 p-0 w-max">
              {[
                {
                  value: "appearance",
                  icon: <Palette className="h-3.5 w-3.5" />,
                  label: "Appearance",
                },
                {
                  value: "theme",
                  icon: <Sliders className="h-3.5 w-3.5" />,
                  label: "Theme",
                },
                {
                  value: "homepage",
                  icon: <Home className="h-3.5 w-3.5" />,
                  label: "Homepage",
                },
                {
                  value: "users",
                  icon: <Users className="h-3.5 w-3.5" />,
                  label: "Users",
                },
                {
                  value: "content",
                  icon: <Key className="h-3.5 w-3.5" />,
                  label: "Content",
                },
                {
                  value: "info",
                  icon: <Shield className="h-3.5 w-3.5" />,
                  label: "App Info",
                },
                {
                  value: "console",
                  icon: <Terminal className="h-3.5 w-3.5" />,
                  label: "Console",
                },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="flex items-center gap-1.5 text-xs h-10 px-3 rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:text-primary"
                  data-ocid={`dashboard.${tab.value}_tab`}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="appearance" className="mt-0 h-full">
              <AppearanceTab />
            </TabsContent>
            <TabsContent value="theme" className="mt-0 h-full">
              <ThemeTab />
            </TabsContent>
            <TabsContent value="homepage" className="mt-0 h-full">
              <HomepageTab />
            </TabsContent>
            <TabsContent value="users" className="mt-0 h-full">
              <UsersTab principal={principal} />
            </TabsContent>
            <TabsContent value="content" className="mt-0 h-full">
              <ContentTab />
            </TabsContent>
            <TabsContent value="info" className="mt-0 h-full">
              <AppInfoTab />
            </TabsContent>
            <TabsContent value="console" className="mt-0 h-full p-4">
              <div className="h-[calc(100vh-220px)] min-h-[400px]">
                <AdminConsole />
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
}

// --- Appearance Tab ---
function AppearanceTab() {
  const { state, dispatch } = useAppState();
  const cfg = state.appCustomConfig;

  const [form, setForm] = useState({
    appName: cfg.appName,
    tagline: cfg.tagline,
    logoUrl: cfg.logoUrl,
    bannerUrl: cfg.bannerUrl,
    creditsHtml: cfg.creditsHtml,
  });

  const handleSave = () => {
    dispatch({ type: "SET_APP_CONFIG", config: form });
    toast.success("Appearance settings saved");
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <SectionHeader
        title="Appearance Settings"
        description="Customize the app's visual identity and branding"
      />

      <div className="space-y-4">
        <FormField label="App Name">
          <Input
            value={form.appName}
            onChange={(e) =>
              setForm((f) => ({ ...f, appName: e.target.value }))
            }
            placeholder="TuneSearch"
            data-ocid="dashboard.app_name_input"
          />
        </FormField>

        <FormField label="Tagline">
          <Input
            value={form.tagline}
            onChange={(e) =>
              setForm((f) => ({ ...f, tagline: e.target.value }))
            }
            placeholder="Search and play music"
            data-ocid="dashboard.tagline_input"
          />
        </FormField>

        <FormField label="Logo URL">
          <Input
            value={form.logoUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, logoUrl: e.target.value }))
            }
            placeholder="/assets/generated/tunesearch-logo-transparent.dim_200x200.png"
            data-ocid="dashboard.logo_url_input"
          />
        </FormField>

        {/* Live logo preview */}
        {form.logoUrl && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
            <img
              src={form.logoUrl}
              alt="Logo preview"
              className="w-12 h-12 object-contain rounded"
              onError={(e) => {
                (e.target as HTMLImageElement).style.opacity = "0.3";
              }}
            />
            <p className="text-xs text-muted-foreground">Logo preview</p>
          </div>
        )}

        <FormField
          label="Banner URL"
          description="Full-width header banner image (optional)"
        >
          <Input
            value={form.bannerUrl}
            onChange={(e) =>
              setForm((f) => ({ ...f, bannerUrl: e.target.value }))
            }
            placeholder="https://…/banner.jpg"
            data-ocid="dashboard.banner_url_input"
          />
        </FormField>

        <FormField
          label="Credits Text"
          description="Shown in the About section of Settings"
        >
          <Textarea
            value={form.creditsHtml}
            onChange={(e) =>
              setForm((f) => ({ ...f, creditsHtml: e.target.value }))
            }
            placeholder="Developed by…"
            rows={2}
            data-ocid="dashboard.credits_input"
          />
        </FormField>
      </div>

      <Button
        onClick={handleSave}
        className="gap-2"
        data-ocid="dashboard.appearance_save_button"
      >
        <Save className="h-4 w-4" />
        Save Changes
      </Button>
    </div>
  );
}

// --- Theme Tab ---
const ACCENT_PRESETS = [
  { label: "Purple", value: "oklch(0.65 0.28 290)", color: "#a855f7" },
  { label: "Blue", value: "oklch(0.60 0.22 240)", color: "#3b82f6" },
  { label: "Green", value: "oklch(0.65 0.20 150)", color: "#22c55e" },
  { label: "Orange", value: "oklch(0.70 0.22 55)", color: "#f97316" },
  { label: "Pink", value: "oklch(0.68 0.26 350)", color: "#ec4899" },
  { label: "Red", value: "oklch(0.60 0.26 25)", color: "#ef4444" },
];

const FONT_OPTIONS = [
  { label: "Outfit (default)", value: "Outfit" },
  { label: "Figtree", value: "Figtree" },
  { label: "General Sans", value: "General Sans" },
];

function ThemeTab() {
  const { state, dispatch } = useAppState();
  const cfg = state.appCustomConfig;

  const [accentColor, setAccentColor] = useState(cfg.accentColor || "");
  const [fontFamily, setFontFamily] = useState(cfg.fontFamily || "Outfit");
  const [customHex, setCustomHex] = useState("");

  // Live preview: apply while editing
  useEffect(() => {
    if (accentColor) {
      document.documentElement.style.setProperty("--primary", accentColor);
    }
  }, [accentColor]);

  useEffect(() => {
    if (fontFamily) {
      document.documentElement.style.setProperty("--font-sans", fontFamily);
      document.documentElement.style.setProperty(
        "--font-body",
        `"${fontFamily}", sans-serif`,
      );
    }
  }, [fontFamily]);

  const handleSave = () => {
    dispatch({
      type: "SET_APP_CONFIG",
      config: { accentColor, fontFamily },
    });
    toast.success("Theme settings saved");
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="Theme Settings"
        description="Customise accent colour and typography"
      />

      {/* Accent Color */}
      <div className="space-y-4">
        <Label className="text-sm font-medium text-foreground">
          Accent Color
        </Label>
        <div className="flex flex-wrap gap-3">
          {ACCENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              title={preset.label}
              onClick={() => setAccentColor(preset.value)}
              className={`w-9 h-9 rounded-full border-2 transition-all ${
                accentColor === preset.value
                  ? "border-foreground scale-110"
                  : "border-transparent hover:scale-105"
              }`}
              style={{ backgroundColor: preset.color }}
            />
          ))}
        </div>
        {/* Custom hex */}
        <div className="flex gap-2 items-center">
          <Input
            placeholder="#hex or oklch(…)"
            value={customHex}
            onChange={(e) => setCustomHex(e.target.value)}
            className="max-w-xs"
            data-ocid="dashboard.theme.accent_input"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (customHex.trim()) setAccentColor(customHex.trim());
            }}
          >
            Apply
          </Button>
          {accentColor && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setAccentColor("");
                document.documentElement.style.removeProperty("--primary");
              }}
              className="text-muted-foreground"
            >
              Reset
            </Button>
          )}
        </div>
        {accentColor && (
          <p className="text-xs text-muted-foreground">
            Current:{" "}
            <span className="font-mono text-foreground">{accentColor}</span>
          </p>
        )}
      </div>

      {/* Font Family */}
      <div className="space-y-3">
        <Label className="text-sm font-medium text-foreground">Font</Label>
        <div className="flex flex-wrap gap-2">
          {FONT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setFontFamily(opt.value)}
              className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                fontFamily === opt.value
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card hover:border-primary/50 text-muted-foreground hover:text-foreground"
              }`}
              data-ocid="dashboard.theme.font_button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <Button
        onClick={handleSave}
        className="gap-2"
        data-ocid="dashboard.theme_save_button"
      >
        <Save className="h-4 w-4" />
        Save Theme
      </Button>
    </div>
  );
}

// --- Homepage Tab ---
function HomepageTab() {
  const { state, dispatch } = useAppState();
  const cfg = state.appCustomConfig;

  const [form, setForm] = useState({
    showTrending: cfg.showTrending !== false,
    showPopular: cfg.showPopular !== false,
    trendingLabel: cfg.trendingLabel || "Trending Now",
    popularLabel: cfg.popularLabel || "Popular Picks",
    maxTrending: cfg.maxTrending || 10,
    maxPopular: cfg.maxPopular || 6,
  });

  const handleSave = () => {
    dispatch({ type: "SET_APP_CONFIG", config: form });
    toast.success("Homepage settings saved");
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="Homepage Settings"
        description="Control what appears on the home / discovery screen"
      />

      {/* Section toggles */}
      <div className="space-y-3">
        <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">Show Trending section</Label>
            <p className="text-xs text-muted-foreground">
              Horizontal scroll row of trending tracks
            </p>
          </div>
          <Switch
            checked={form.showTrending}
            onCheckedChange={(v) => setForm((f) => ({ ...f, showTrending: v }))}
            data-ocid="dashboard.homepage.trending_toggle"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
          <div className="space-y-0.5">
            <Label className="text-sm font-medium">
              Show Popular Picks section
            </Label>
            <p className="text-xs text-muted-foreground">
              Vertical track list of popular music
            </p>
          </div>
          <Switch
            checked={form.showPopular}
            onCheckedChange={(v) => setForm((f) => ({ ...f, showPopular: v }))}
            data-ocid="dashboard.homepage.popular_toggle"
          />
        </div>
      </div>

      {/* Labels */}
      <div className="space-y-4">
        <FormField label="Trending section label">
          <Input
            value={form.trendingLabel}
            onChange={(e) =>
              setForm((f) => ({ ...f, trendingLabel: e.target.value }))
            }
            placeholder="Trending Now"
            data-ocid="dashboard.homepage.trending_label_input"
          />
        </FormField>

        <FormField label="Popular section label">
          <Input
            value={form.popularLabel}
            onChange={(e) =>
              setForm((f) => ({ ...f, popularLabel: e.target.value }))
            }
            placeholder="Popular Picks"
            data-ocid="dashboard.homepage.popular_label_input"
          />
        </FormField>
      </div>

      {/* Max items */}
      <div className="grid grid-cols-2 gap-4">
        <FormField label="Max trending items" description="1–20">
          <Input
            type="number"
            min={1}
            max={20}
            value={form.maxTrending}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                maxTrending: Math.min(
                  20,
                  Math.max(1, Number.parseInt(e.target.value) || 1),
                ),
              }))
            }
            data-ocid="dashboard.homepage.max_trending_input"
          />
        </FormField>

        <FormField label="Max popular items" description="1–20">
          <Input
            type="number"
            min={1}
            max={20}
            value={form.maxPopular}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                maxPopular: Math.min(
                  20,
                  Math.max(1, Number.parseInt(e.target.value) || 1),
                ),
              }))
            }
            data-ocid="dashboard.homepage.max_popular_input"
          />
        </FormField>
      </div>

      <Button
        onClick={handleSave}
        className="gap-2"
        data-ocid="dashboard.homepage_save_button"
      >
        <Save className="h-4 w-4" />
        Save Homepage Settings
      </Button>
    </div>
  );
}

// --- Users Tab ---
function UsersTab({ principal }: { principal?: string }) {
  const { state, dispatch } = useAppState();
  const [grantEmail, setGrantEmail] = useState("");

  const handleGrant = (e: React.FormEvent) => {
    e.preventDefault();
    const email = grantEmail.trim();
    if (!email) return;
    if (state.adminEmails.includes(email)) {
      toast.info(`${email} is already an admin`);
      return;
    }
    dispatch({ type: "GRANT_ADMIN", email });
    toast.success(`Admin granted to ${email}`);
    setGrantEmail("");
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="Users & Admins"
        description="Manage admin access and view current user info"
      />

      {/* Current user */}
      <div className="p-4 rounded-lg bg-muted/20 border border-border space-y-2">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Your Account
        </h3>
        <div className="space-y-1 text-xs">
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Principal:</span>{" "}
            <span className="font-mono">{principal ?? "Not connected"}</span>
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Email:</span>{" "}
            {state.userEmail || <span className="italic">not set</span>}
          </p>
          <p className="text-muted-foreground">
            <span className="text-foreground font-medium">Status:</span>{" "}
            <span className="text-primary font-semibold">Admin</span>
          </p>
        </div>
      </div>

      {/* Admin list */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">Admin Emails</h3>
        <div className="space-y-2">
          {state.adminEmails.map((email, idx) => {
            const isSuperAdmin = email === "Prajwol9847@gmail.com";
            return (
              <div
                key={email}
                className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                data-ocid={`dashboard.admin.item.${idx + 1}`}
              >
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  {isSuperAdmin ? (
                    <Lock className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <p className="flex-1 text-sm text-foreground truncate font-mono text-xs">
                  {email}
                </p>
                {isSuperAdmin ? (
                  <Badge
                    variant="outline"
                    className="text-[10px] shrink-0 border-primary/30 text-primary"
                  >
                    Super Admin
                  </Badge>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={() => {
                      dispatch({ type: "REVOKE_ADMIN", email });
                      toast.success(`Admin revoked from ${email}`);
                    }}
                    data-ocid={`dashboard.admin.delete_button.${idx + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Grant admin form */}
      <form onSubmit={handleGrant} className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <UserPlus className="h-4 w-4 text-primary" />
          Grant Admin Access
        </h3>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="user@email.com"
            value={grantEmail}
            onChange={(e) => setGrantEmail(e.target.value)}
            className="flex-1"
            data-ocid="dashboard.grant_admin_input"
          />
          <Button
            type="submit"
            disabled={!grantEmail.trim()}
            className="gap-2"
            data-ocid="dashboard.grant_admin_button"
          >
            <UserPlus className="h-4 w-4" />
            Grant
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The user must sign in and enter this email to gain admin access.
        </p>
      </form>
    </div>
  );
}

// --- Content Tab ---
function ContentTab() {
  const { state, dispatch } = useAppState();
  const [showKeys, setShowKeys] = useState<Record<number, boolean>>({});
  const [newKey, setNewKey] = useState("");
  const [ccDefault, setCcDefault] = useState(false);

  const maskKey = (key: string) => `${key.slice(0, 8)}…${key.slice(-4)}`;

  const handleAddKey = () => {
    const trimmed = newKey.trim();
    if (!trimmed || state.apiKeys.includes(trimmed)) return;
    dispatch({ type: "SET_API_KEYS", keys: [...state.apiKeys, trimmed] });
    toast.success("API key added to pool");
    setNewKey("");
  };

  const handleUseKey = (index: number) => {
    dispatch({ type: "SET_API_KEY_INDEX", index });
    toast.success(`Switched to key ${index + 1}`);
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="Content Settings"
        description="Manage API key rotation pool and content preferences"
      />

      {/* API Key Pool */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Key className="h-4 w-4 text-primary" />
            API Key Pool ({state.apiKeys.length} keys)
          </h3>
          <span className="text-xs text-muted-foreground">
            Active: Key {state.apiKeyIndex + 1}
          </span>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto scrollbar-thin">
          {state.apiKeys.map((key, idx) => {
            const isActive = idx === state.apiKeyIndex;
            const isVisible = showKeys[idx];
            return (
              <div
                key={key.slice(0, 16)}
                className={`flex items-center gap-2 p-3 rounded-lg border transition-colors ${
                  isActive
                    ? "bg-primary/10 border-primary/40"
                    : "bg-card border-border"
                }`}
                data-ocid={`dashboard.api_key.item.${idx + 1}`}
              >
                <span
                  className={`text-xs font-mono w-5 shrink-0 ${isActive ? "text-primary font-bold" : "text-muted-foreground"}`}
                >
                  {idx + 1}
                </span>
                <span className="flex-1 text-xs font-mono text-muted-foreground truncate">
                  {isVisible ? key : maskKey(key)}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setShowKeys((prev) => ({ ...prev, [idx]: !prev[idx] }))
                  }
                  className="text-muted-foreground hover:text-foreground shrink-0"
                  title={isVisible ? "Hide key" : "Show key"}
                >
                  {isVisible ? (
                    <EyeOff className="h-3.5 w-3.5" />
                  ) : (
                    <Eye className="h-3.5 w-3.5" />
                  )}
                </button>
                {isActive ? (
                  <span className="text-[10px] font-semibold text-primary border border-primary/30 bg-primary/10 px-1.5 py-0.5 rounded shrink-0">
                    Active
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-6 px-2 text-[10px] shrink-0"
                    onClick={() => handleUseKey(idx)}
                    data-ocid={`dashboard.api_key.use_button.${idx + 1}`}
                  >
                    Use
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Keys rotate automatically when quota is exceeded. Each key allows ~100
          searches/day.
        </p>

        {/* Add new key */}
        <div className="flex gap-2 pt-1">
          <Input
            placeholder="Add new API key (AIza…)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddKey()}
            className="flex-1 text-xs font-mono"
            data-ocid="dashboard.api_key_add_input"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={handleAddKey}
            disabled={!newKey.trim()}
            data-ocid="dashboard.api_key_add_button"
          >
            Add Key
          </Button>
        </div>
      </div>

      {/* CC default toggle */}
      <div className="flex items-center justify-between p-4 rounded-lg bg-card border border-border">
        <div className="space-y-0.5">
          <Label className="text-sm font-medium">
            Default to CC-only search
          </Label>
          <p className="text-xs text-muted-foreground">
            Show only Creative Commons results by default
          </p>
        </div>
        <Switch
          checked={ccDefault}
          onCheckedChange={setCcDefault}
          data-ocid="dashboard.cc_default_toggle"
        />
      </div>
    </div>
  );
}

// --- App Info Tab ---
function AppInfoTab() {
  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="App Information"
        description="Platform details and keyboard shortcuts reference"
      />

      {/* Version info */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: "Version", value: "1.0.0" },
          { label: "Platform", value: "TuneSearch PWA" },
          { label: "Build", value: "Production" },
          { label: "Engine", value: "React 19 + Vite" },
        ].map((item) => (
          <div
            key={item.label}
            className="p-3 rounded-lg bg-card border border-border"
          >
            <p className="text-xs text-muted-foreground mb-0.5">{item.label}</p>
            <p className="text-sm font-semibold font-mono text-foreground">
              {item.value}
            </p>
          </div>
        ))}
      </div>

      {/* Keyboard shortcuts */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">
          Keyboard Shortcuts
        </h3>
        <div className="rounded-lg border border-border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="text-xs w-24">Key</TableHead>
                <TableHead className="text-xs">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {KEYBOARD_SHORTCUTS.map((s) => (
                <TableRow key={s.key}>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-xs">
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
        </div>
      </div>
    </div>
  );
}

// --- Helpers ---
function SectionHeader({
  title,
  description,
}: { title: string; description?: string }) {
  return (
    <div>
      <h2 className="font-outfit text-lg font-bold text-foreground">{title}</h2>
      {description && (
        <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
      )}
    </div>
  );
}

function FormField({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {children}
    </div>
  );
}
