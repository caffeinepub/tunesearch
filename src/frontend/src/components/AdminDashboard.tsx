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
  Key,
  LayoutDashboard,
  Lock,
  Palette,
  Save,
  Shield,
  Terminal,
  Trash2,
  UserPlus,
  Users,
} from "lucide-react";
import { useState } from "react";
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
          <div className="border-b border-border px-6 shrink-0">
            <TabsList className="h-10 bg-transparent gap-1 p-0">
              {[
                {
                  value: "appearance",
                  icon: <Palette className="h-3.5 w-3.5" />,
                  label: "Appearance",
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
            placeholder="Search and play music from YouTube"
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
  const [apiKey, setApiKey] = useState(state.apiKey);
  const [showKey, setShowKey] = useState(false);
  const [ccDefault, setCcDefault] = useState(false);

  const handleSaveApiKey = () => {
    dispatch({ type: "SET_API_KEY", key: apiKey });
    toast.success("API key updated");
  };

  return (
    <div className="p-6 max-w-2xl space-y-8">
      <SectionHeader
        title="Content Settings"
        description="Manage API configuration and content preferences"
      />

      {/* API Key */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Key className="h-4 w-4 text-primary" />
          YouTube API Key
        </h3>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="AIza…"
              className="pr-10"
              data-ocid="dashboard.api_key_input"
            />
            <button
              type="button"
              onClick={() => setShowKey((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showKey ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <Button
            onClick={handleSaveApiKey}
            className="gap-2"
            data-ocid="dashboard.api_key_save_button"
          >
            <Save className="h-4 w-4" />
            Save
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          The embedded key works for all users. Update only if you need a
          different quota.
        </p>
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
