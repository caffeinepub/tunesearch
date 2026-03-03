# TuneSearch

## Current State
- Full-stack music search app (React + Motoko backend)
- YouTube search with built-in API key
- In-app audio player via YouTube IFrame API
- Playlists, favourites, recently played, queue, search history (all localStorage)
- PWA support, settings drawer, keyboard shortcuts, dark/light theme
- `InternetIdentityProvider` already wraps the app in `main.tsx`
- `useInternetIdentity` hook available for login/logout/identity
- `useActor` hook available for backend calls
- No sign-in UI, no admin system, no dashboard, no console/log
- Audio pauses when browser is minimized (no Media Session API)
- Download button only opens YouTube URL in new tab (not real audio download)

## Requested Changes (Diff)

### Add
1. **Sign-in button** in Sidebar (desktop) and MobileTabBar — uses `useInternetIdentity`. Shows "Sign In" when logged out, shows principal (truncated) + logout when logged in.
2. **Admin system (frontend-only)**: A hardcoded admin email check. Since ICP uses Principals, admin identity is determined by: user enters their email after signing in; if email matches "Prajwol9847@gmail.com", they are treated as super-admin. Store email in localStorage keyed by principal. Admin state stored in AppState.
3. **Admin Dashboard page** (`activePage: "dashboard"`): Full-screen page with organized tabs/sections — only visible and accessible when user is an admin. Dashboard button shown in sidebar/mobile bar ONLY for admins.
4. **Admin Dashboard sections** (tabbed layout, clean):
   - **Appearance** — Edit: App Name, Tagline, Logo URL, Banner/Hero image URL. Changes stored in localStorage and applied live to the app.
   - **Users & Admins** — Show current admin email list (starting with Prajwol9847@gmail.com). Grant admin to another email, revoke admin (can't revoke Prajwol9847@gmail.com). All stored in localStorage.
   - **Content** — View/edit the embedded YouTube API key, toggle CC-only search default.
   - **App Info** — Edit credits text, show version, keyboard shortcuts reference.
   - **Console** — Admin-only interactive console/terminal panel.
5. **Admin Console (within Dashboard)**: Terminal-style panel with:
   - Log output area (dark background, monospace font, auto-scroll to bottom)
   - Command input field
   - Available commands (show with `help`):
     - `help` — lists all commands
     - `clear` — clears the console output
     - `status` — prints app status (version, user count placeholder, API key set yes/no, admin emails)
     - `whoami` — prints current user's principal and email
     - `list-admins` — lists all admin emails
     - `grant-admin <email>` — grants admin role to an email
     - `revoke-admin <email>` — revokes admin role (cannot revoke Prajwol9847@gmail.com)
     - `set-config <key> <value>` — sets an app config value (appName, tagline, logoUrl, bannerUrl, creditsHtml)
     - `get-config` — prints full app config
     - `log <message>` — appends a custom INFO log entry
     - `export-logs` — downloads the current log as a .txt file
     - `set-api-key <key>` — updates the YouTube API key
     - `reset-config` — resets app config to defaults
   - Each command shows a timestamped output line
   - System logs auto-appear (admin grant, revoke, config changes, sign-in events)
6. **Media Session API** in `useYouTubePlayer.ts`: When a track loads/plays, call `navigator.mediaSession.metadata = new MediaMetadata(...)` with title, artist, artwork (thumbnail). Register handlers: `play`, `pause`, `previoustrack`, `nexttrack`, `seekbackward`, `seekforward`. This enables OS notification bar controls including Next/Prev buttons.
7. **Download button fix**: For Creative Commons tracks, instead of just opening YouTube URL, use the `cobalt.tools` public API (`https://co.wuk.sh/api/json`) to request audio-only download. POST `{url: "https://youtube.com/watch?v=<videoId>", isAudioOnly: true, aFormat: "mp3"}` with header `Accept: application/json`. If response has a `url` field, trigger `<a download>` for that URL. If cobalt fails (network error or non-CC), fall back to opening YouTube URL with a toast explaining it.

### Modify
- `useAppStore.ts`: Add `"dashboard"` to `activePage` union. Add to AppState: `isAdmin: boolean`, `userEmail: string`, `appCustomConfig: AppCustomConfig` (logoUrl, bannerUrl, appName, tagline, creditsHtml), `adminEmails: string[]`, `consoleLogs: ConsoleLogEntry[]`. Add corresponding actions.
- `App.tsx`: Add `activePage === "dashboard"` rendering. Read `appCustomConfig` from state and apply `appName`/`tagline` dynamically.
- `Sidebar.tsx`: Add sign-in button at bottom. Add Dashboard nav item that only shows when `state.isAdmin`. Update logo/app name to use `state.appCustomConfig`.
- `Player.tsx`: Pass `currentTrack` to `useYouTubePlayer` for Media Session.
- `useYouTubePlayer.ts`: Accept optional `currentTrack` param; set Media Session metadata and action handlers.
- `SearchPage.tsx`: Fix download button to use cobalt.tools API for real MP3 download.
- `SettingsDrawer.tsx`: Read `creditsHtml` from `state.appCustomConfig` for the credits display.

### Remove
- Nothing removed

## Implementation Plan
1. Update `useAppStore.ts` — add dashboard page, admin state, appCustomConfig, adminEmails, consoleLogs, and all related actions
2. Update `useYouTubePlayer.ts` — add Media Session API support
3. Update `Player.tsx` — pass currentTrack to player hook
4. Create `AuthButton.tsx` — sign in/out button using `useInternetIdentity`
5. Create `AdminConsole.tsx` — terminal-style console component with command parser
6. Create `AdminDashboard.tsx` — tabbed admin dashboard with all sections including embedded AdminConsole
7. Update `App.tsx` — add dashboard page rendering
8. Update `Sidebar.tsx` — add auth button and admin-only dashboard link, dynamic app name/logo
9. Update `SearchPage.tsx` — fix download button with cobalt.tools API
10. Update `SettingsDrawer.tsx` — use dynamic credits from appCustomConfig
