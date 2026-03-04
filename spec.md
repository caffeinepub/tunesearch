# TuneSearch

## Current State
Full-stack music app on ICP. React + Tailwind frontend, Motoko backend. Features:
- YouTube search via hardcoded API key
- In-app YouTube iframe player with Media Session API
- Playlists, favourites, recently played, search history (localStorage + backend sync)
- Admin dashboard (Appearance, Theme, Homepage, Users, Content, App Info, Console tabs)
- Internet Identity sign-in modal
- PWA manifest + service worker
- Warm amber-gold OKLCH color theme

## Requested Changes (Diff)

### Add
- **12-key rotation pool** with automatic fallback: when a key returns 403/quotaExceeded, rotate to the next key silently. Pool stored in the store; all 12 keys hardcoded.
- **Cold/vivid/classic UI redesign**: Replace warm amber tones with a cool, vivid, clean palette (deep navy/midnight background, electric blue/cyan primary, crisp whites). Animated particle/orb background on the main layout. Smooth, polished animations throughout.
- **Animated background**: Subtle animated gradient orbs / particle field behind the main content area.
- **Admin dashboard fully working**: Ensure isAdmin check resolves correctly on load from localStorage. Dashboard button visible in sidebar for admins.

### Modify
- `index.css`: Replace warm OKLCH tokens with cool vivid tokens (navy backgrounds, electric blue primary, cyan secondary).
- `useAppStore.ts`: Add `apiKeys: string[]` array with all 12 keys + current key index. `SET_API_KEY` and `ROTATE_API_KEY` actions. `getInitialState` seeds all 12 keys.
- `SearchPage.tsx`: Use key rotation — on 403 or quota error, dispatch `ROTATE_API_KEY` and retry with the next key automatically.
- `App.tsx`: Add animated background orbs layer behind content.
- `AdminDashboard.tsx`: Fix the `ContentTab` to show all 12 keys and allow admin to rotate/manage them. Ensure admin check uses the same logic as `getInitialState`.

### Remove
- Warm/amber CSS tokens (replaced by cool palette)

## Implementation Plan
1. Update `index.css` with cool vivid OKLCH palette + animated background keyframes
2. Update `useAppStore.ts` with 12-key pool, rotation logic, and ROTATE_API_KEY action
3. Update `SearchPage.tsx` to use key rotation on quota errors
4. Update `App.tsx` to add animated background orbs
5. Update `AdminDashboard.tsx` ContentTab to show all API keys managed by admins
6. Fix admin detection to be consistent between initial state and SET_USER_EMAIL reducer
