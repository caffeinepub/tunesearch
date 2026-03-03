import { createContext, useContext } from "react";

export interface Track {
  videoId: string;
  title: string;
  thumbnail: string;
  channelName: string;
  duration: string;
  isCreativeCommons: boolean;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
}

export type RepeatMode = "off" | "all" | "one";

export interface Prefs {
  theme: "dark" | "light";
  equalizerPreset: string;
  sleepTimerMinutes: number;
  repeatMode: RepeatMode;
  shuffle: boolean;
  autoplay: boolean;
}

export interface AppCustomConfig {
  appName: string;
  tagline: string;
  logoUrl: string;
  bannerUrl: string;
  creditsHtml: string;
}

export interface ConsoleLogEntry {
  id: string;
  timestamp: number;
  level: "INFO" | "WARN" | "ERROR" | "ADMIN" | "CMD";
  message: string;
  output?: string;
}

export interface AppState {
  // Playback
  currentTrack: Track | null;
  isPlayerExpanded: boolean;
  queue: Track[];
  queueIndex: number;

  // UI
  activePage:
    | "search"
    | "library"
    | "favourites"
    | "playlists"
    | "recent"
    | "queue"
    | "dashboard";
  isSettingsOpen: boolean;
  isQueueOpen: boolean;
  selectedPlaylistId: string | null;

  // Auth & Admin
  isAdmin: boolean;
  userEmail: string;
  adminEmails: string[];

  // App Config
  appCustomConfig: AppCustomConfig;

  // Console logs (not persisted)
  consoleLogs: ConsoleLogEntry[];

  // Data (synced with localStorage)
  apiKey: string;
  favourites: Track[];
  playlists: Playlist[];
  recentlyPlayed: Track[];
  searchHistory: string[];
  prefs: Prefs;
}

export type AppAction =
  | { type: "SET_CURRENT_TRACK"; track: Track | null }
  | { type: "SET_PLAYER_EXPANDED"; expanded: boolean }
  | { type: "SET_QUEUE"; queue: Track[]; index?: number }
  | { type: "SET_QUEUE_INDEX"; index: number }
  | { type: "ADD_TO_QUEUE"; track: Track }
  | { type: "REMOVE_FROM_QUEUE"; index: number }
  | { type: "REORDER_QUEUE"; fromIndex: number; toIndex: number }
  | { type: "CLEAR_QUEUE" }
  | { type: "SET_ACTIVE_PAGE"; page: AppState["activePage"] }
  | { type: "SET_SETTINGS_OPEN"; open: boolean }
  | { type: "SET_QUEUE_OPEN"; open: boolean }
  | { type: "SET_SELECTED_PLAYLIST"; id: string | null }
  | { type: "SET_API_KEY"; key: string }
  | { type: "TOGGLE_FAVOURITE"; track: Track }
  | { type: "SET_PLAYLISTS"; playlists: Playlist[] }
  | { type: "ADD_PLAYLIST"; playlist: Playlist }
  | { type: "DELETE_PLAYLIST"; id: string }
  | { type: "RENAME_PLAYLIST"; id: string; name: string }
  | { type: "ADD_TO_PLAYLIST"; playlistId: string; track: Track }
  | { type: "REMOVE_FROM_PLAYLIST"; playlistId: string; trackVideoId: string }
  | { type: "ADD_RECENTLY_PLAYED"; track: Track }
  | { type: "ADD_SEARCH_HISTORY"; query: string }
  | { type: "REMOVE_SEARCH_HISTORY"; query: string }
  | { type: "CLEAR_SEARCH_HISTORY" }
  | { type: "SET_PREFS"; prefs: Partial<Prefs> }
  | { type: "SET_ADMIN"; isAdmin: boolean }
  | { type: "SET_USER_EMAIL"; email: string }
  | { type: "SET_APP_CONFIG"; config: Partial<AppCustomConfig> }
  | { type: "SET_ADMIN_EMAILS"; emails: string[] }
  | { type: "GRANT_ADMIN"; email: string }
  | { type: "REVOKE_ADMIN"; email: string }
  | { type: "ADD_CONSOLE_LOG"; entry: ConsoleLogEntry }
  | { type: "CLEAR_CONSOLE_LOGS" };

const SUPER_ADMIN = "Prajwol9847@gmail.com";

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_CURRENT_TRACK":
      return { ...state, currentTrack: action.track };
    case "SET_PLAYER_EXPANDED":
      return { ...state, isPlayerExpanded: action.expanded };
    case "SET_QUEUE":
      return {
        ...state,
        queue: action.queue,
        queueIndex: action.index ?? 0,
      };
    case "SET_QUEUE_INDEX":
      return { ...state, queueIndex: action.index };
    case "ADD_TO_QUEUE":
      return { ...state, queue: [...state.queue, action.track] };
    case "REMOVE_FROM_QUEUE": {
      const newQueue = state.queue.filter((_, i) => i !== action.index);
      const newIndex =
        action.index < state.queueIndex
          ? state.queueIndex - 1
          : Math.min(state.queueIndex, newQueue.length - 1);
      return { ...state, queue: newQueue, queueIndex: Math.max(0, newIndex) };
    }
    case "REORDER_QUEUE": {
      const q = [...state.queue];
      const [item] = q.splice(action.fromIndex, 1);
      q.splice(action.toIndex, 0, item);
      let newIdx = state.queueIndex;
      if (action.fromIndex === state.queueIndex) newIdx = action.toIndex;
      else if (
        action.fromIndex < state.queueIndex &&
        action.toIndex >= state.queueIndex
      )
        newIdx--;
      else if (
        action.fromIndex > state.queueIndex &&
        action.toIndex <= state.queueIndex
      )
        newIdx++;
      return { ...state, queue: q, queueIndex: newIdx };
    }
    case "CLEAR_QUEUE":
      return { ...state, queue: [], queueIndex: 0 };
    case "SET_ACTIVE_PAGE":
      return { ...state, activePage: action.page };
    case "SET_SETTINGS_OPEN":
      return { ...state, isSettingsOpen: action.open };
    case "SET_QUEUE_OPEN":
      return { ...state, isQueueOpen: action.open };
    case "SET_SELECTED_PLAYLIST":
      return { ...state, selectedPlaylistId: action.id };
    case "SET_API_KEY": {
      localStorage.setItem("ts_api_key", action.key);
      return { ...state, apiKey: action.key };
    }
    case "TOGGLE_FAVOURITE": {
      const exists = state.favourites.some(
        (t) => t.videoId === action.track.videoId,
      );
      const updated = exists
        ? state.favourites.filter((t) => t.videoId !== action.track.videoId)
        : [action.track, ...state.favourites];
      localStorage.setItem("ts_favourites", JSON.stringify(updated));
      return { ...state, favourites: updated };
    }
    case "SET_PLAYLISTS": {
      localStorage.setItem("ts_playlists", JSON.stringify(action.playlists));
      return { ...state, playlists: action.playlists };
    }
    case "ADD_PLAYLIST": {
      const updated = [action.playlist, ...state.playlists];
      localStorage.setItem("ts_playlists", JSON.stringify(updated));
      return { ...state, playlists: updated };
    }
    case "DELETE_PLAYLIST": {
      const updated = state.playlists.filter((p) => p.id !== action.id);
      localStorage.setItem("ts_playlists", JSON.stringify(updated));
      return {
        ...state,
        playlists: updated,
        selectedPlaylistId:
          state.selectedPlaylistId === action.id
            ? null
            : state.selectedPlaylistId,
      };
    }
    case "RENAME_PLAYLIST": {
      const updated = state.playlists.map((p) =>
        p.id === action.id ? { ...p, name: action.name } : p,
      );
      localStorage.setItem("ts_playlists", JSON.stringify(updated));
      return { ...state, playlists: updated };
    }
    case "ADD_TO_PLAYLIST": {
      const updated = state.playlists.map((p) => {
        if (p.id !== action.playlistId) return p;
        if (p.tracks.some((t) => t.videoId === action.track.videoId)) return p;
        return { ...p, tracks: [...p.tracks, action.track] };
      });
      localStorage.setItem("ts_playlists", JSON.stringify(updated));
      return { ...state, playlists: updated };
    }
    case "REMOVE_FROM_PLAYLIST": {
      const updated = state.playlists.map((p) => {
        if (p.id !== action.playlistId) return p;
        return {
          ...p,
          tracks: p.tracks.filter((t) => t.videoId !== action.trackVideoId),
        };
      });
      localStorage.setItem("ts_playlists", JSON.stringify(updated));
      return { ...state, playlists: updated };
    }
    case "ADD_RECENTLY_PLAYED": {
      const filtered = state.recentlyPlayed.filter(
        (t) => t.videoId !== action.track.videoId,
      );
      const updated = [action.track, ...filtered].slice(0, 50);
      localStorage.setItem("ts_recently_played", JSON.stringify(updated));
      return { ...state, recentlyPlayed: updated };
    }
    case "ADD_SEARCH_HISTORY": {
      const filtered = state.searchHistory.filter((q) => q !== action.query);
      const updated = [action.query, ...filtered].slice(0, 20);
      localStorage.setItem("ts_search_history", JSON.stringify(updated));
      return { ...state, searchHistory: updated };
    }
    case "REMOVE_SEARCH_HISTORY": {
      const updated = state.searchHistory.filter((q) => q !== action.query);
      localStorage.setItem("ts_search_history", JSON.stringify(updated));
      return { ...state, searchHistory: updated };
    }
    case "CLEAR_SEARCH_HISTORY": {
      localStorage.setItem("ts_search_history", JSON.stringify([]));
      return { ...state, searchHistory: [] };
    }
    case "SET_PREFS": {
      const updated = { ...state.prefs, ...action.prefs };
      localStorage.setItem("ts_prefs", JSON.stringify(updated));
      return { ...state, prefs: updated };
    }
    case "SET_ADMIN": {
      if (!action.isAdmin) {
        localStorage.removeItem("ts_user_email");
        return { ...state, isAdmin: false, userEmail: "" };
      }
      return { ...state, isAdmin: true };
    }
    case "SET_USER_EMAIL": {
      const isAdmin = state.adminEmails.some(
        (e) => e.toLowerCase() === action.email.toLowerCase(),
      );
      if (action.email) {
        localStorage.setItem("ts_user_email", action.email);
      } else {
        localStorage.removeItem("ts_user_email");
      }
      return { ...state, userEmail: action.email, isAdmin };
    }
    case "SET_APP_CONFIG": {
      const updated = { ...state.appCustomConfig, ...action.config };
      localStorage.setItem("ts_app_config", JSON.stringify(updated));
      return { ...state, appCustomConfig: updated };
    }
    case "SET_ADMIN_EMAILS": {
      localStorage.setItem("ts_admin_emails", JSON.stringify(action.emails));
      return { ...state, adminEmails: action.emails };
    }
    case "GRANT_ADMIN": {
      if (state.adminEmails.includes(action.email)) return state;
      const updated = [...state.adminEmails, action.email];
      localStorage.setItem("ts_admin_emails", JSON.stringify(updated));
      return { ...state, adminEmails: updated };
    }
    case "REVOKE_ADMIN": {
      if (action.email === SUPER_ADMIN) return state; // never revoke super admin
      const updated = state.adminEmails.filter((e) => e !== action.email);
      localStorage.setItem("ts_admin_emails", JSON.stringify(updated));
      return { ...state, adminEmails: updated };
    }
    case "ADD_CONSOLE_LOG": {
      const updated = [action.entry, ...state.consoleLogs].slice(0, 500);
      return { ...state, consoleLogs: updated };
    }
    case "CLEAR_CONSOLE_LOGS":
      return { ...state, consoleLogs: [] };
    default:
      return state;
  }
}

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? (JSON.parse(item) as T) : fallback;
  } catch {
    return fallback;
  }
}

const DEFAULT_APP_CONFIG: AppCustomConfig = {
  appName: "TuneSearch",
  tagline: "Search and play music from YouTube",
  logoUrl: "/assets/generated/tunesearch-logo-transparent.dim_200x200.png",
  bannerUrl: "",
  creditsHtml: "Developed by DemonXEnma in Sponser with Caffeine",
};

const DEFAULT_ADMIN_EMAILS = [SUPER_ADMIN];

export function getInitialState(): AppState {
  const loadedEmails = loadFromStorage<string[]>(
    "ts_admin_emails",
    DEFAULT_ADMIN_EMAILS,
  );
  const adminEmails = loadedEmails.some(
    (e) => e.toLowerCase() === SUPER_ADMIN.toLowerCase(),
  )
    ? loadedEmails
    : [SUPER_ADMIN, ...loadedEmails];

  const userEmail = loadFromStorage<string>("ts_user_email", "");
  const isAdmin = userEmail
    ? adminEmails.some((e) => e.toLowerCase() === userEmail.toLowerCase())
    : false;

  return {
    currentTrack: null,
    isPlayerExpanded: false,
    queue: loadFromStorage<Track[]>("ts_queue", []),
    queueIndex: 0,
    activePage: "search",
    isSettingsOpen: false,
    isQueueOpen: false,
    selectedPlaylistId: null,
    isAdmin,
    userEmail,
    adminEmails,
    appCustomConfig: loadFromStorage<AppCustomConfig>(
      "ts_app_config",
      DEFAULT_APP_CONFIG,
    ),
    consoleLogs: [],
    apiKey:
      loadFromStorage<string>("ts_api_key", "") ||
      "AIzaSyDo7AkNZUqlAz11qjn5wJf3DgLh6p8v7K0",
    favourites: loadFromStorage<Track[]>("ts_favourites", []),
    playlists: loadFromStorage<Playlist[]>("ts_playlists", []),
    recentlyPlayed: loadFromStorage<Track[]>("ts_recently_played", []),
    searchHistory: loadFromStorage<string[]>("ts_search_history", []),
    prefs: {
      theme: "dark",
      equalizerPreset: "flat",
      sleepTimerMinutes: 0,
      repeatMode: "off",
      shuffle: false,
      autoplay: true,
      ...loadFromStorage<Partial<Prefs>>("ts_prefs", {}),
    } as Prefs,
  };
}

export const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
} | null>(null);

export function useAppState() {
  const ctx = useContext(AppContext);
  if (!ctx)
    throw new Error("useAppState must be used within AppContext.Provider");
  return ctx;
}
