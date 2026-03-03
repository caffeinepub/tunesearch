/**
 * useBackendSync — syncs favourites and playlists with the backend canister.
 *
 * On sign-in: loads favourites + playlists from backend and merges into local state.
 * The backend returns a single JSON string (e.g. "[{...}, {...}]"), not an array.
 * Uses a ref guard so it only runs once per identity session.
 */

import { useActor } from "@/hooks/useActor";
import { useInternetIdentity } from "@/hooks/useInternetIdentity";
import type { Playlist, Track } from "@/store/useAppStore";
import { useAppState } from "@/store/useAppStore";
import { useEffect, useRef } from "react";

export function useBackendSync() {
  const { state, dispatch } = useAppState();
  const { identity } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const hasSyncedRef = useRef(false);
  const prevPrincipal = useRef<string | undefined>(undefined);
  // Snapshot refs — so we can read latest state inside async without deps
  const favouritesRef = useRef(state.favourites);
  const playlistsRef = useRef(state.playlists);

  useEffect(() => {
    favouritesRef.current = state.favourites;
  }, [state.favourites]);
  useEffect(() => {
    playlistsRef.current = state.playlists;
  }, [state.playlists]);

  const principal = identity?.getPrincipal().toString();
  const isAuthenticated =
    !!principal && !identity?.getPrincipal().isAnonymous();

  // On sign-in (identity becomes available), pull data from backend
  useEffect(() => {
    if (!isAuthenticated || !actor || isFetching) return;
    if (hasSyncedRef.current && prevPrincipal.current === principal) return;

    prevPrincipal.current = principal;
    hasSyncedRef.current = true;

    const syncFromBackend = async () => {
      try {
        // Parallel fetch — backend methods return a single JSON string
        const [favsResult, playlistsResult] = await Promise.all([
          (
            actor as unknown as { getFavourites?: () => Promise<string> }
          ).getFavourites?.() ?? Promise.resolve(""),
          (
            actor as unknown as { getPlaylists?: () => Promise<string> }
          ).getPlaylists?.() ?? Promise.resolve(""),
        ]);

        // Parse favourites — favsResult is a JSON array string like "[{...}]"
        if (typeof favsResult === "string" && favsResult.trim().length > 2) {
          try {
            const remoteItems: Track[] = JSON.parse(favsResult);
            if (Array.isArray(remoteItems) && remoteItems.length > 0) {
              const remoteIds = new Set(remoteItems.map((t) => t.videoId));
              const localOnly = favouritesRef.current.filter(
                (t) => !remoteIds.has(t.videoId),
              );
              const merged = [...remoteItems, ...localOnly];
              dispatch({ type: "SET_FAVOURITES", favourites: merged });
            }
          } catch {
            // ignore malformed JSON
          }
        } else if (
          Array.isArray(favsResult) &&
          (favsResult as unknown[]).length > 0
        ) {
          // Fallback: backend might still return an array in some versions
          const remoteItems: Track[] = [];
          for (const item of favsResult as unknown[]) {
            try {
              const parsed =
                typeof item === "string" ? JSON.parse(item as string) : item;
              if (parsed && typeof parsed === "object" && "videoId" in parsed) {
                remoteItems.push(parsed as Track);
              }
            } catch {
              // ignore malformed entries
            }
          }
          if (remoteItems.length > 0) {
            const remoteIds = new Set(remoteItems.map((t) => t.videoId));
            const localOnly = favouritesRef.current.filter(
              (t) => !remoteIds.has(t.videoId),
            );
            const merged = [...remoteItems, ...localOnly];
            dispatch({ type: "SET_FAVOURITES", favourites: merged });
          }
        }

        // Parse playlists — playlistsResult is a JSON array string like "[{...}]"
        if (
          typeof playlistsResult === "string" &&
          playlistsResult.trim().length > 2
        ) {
          try {
            const remotePlaylists: Playlist[] = JSON.parse(playlistsResult);
            if (Array.isArray(remotePlaylists) && remotePlaylists.length > 0) {
              dispatch({ type: "SET_PLAYLISTS", playlists: remotePlaylists });
            }
          } catch {
            // ignore malformed JSON
          }
        } else if (
          Array.isArray(playlistsResult) &&
          (playlistsResult as unknown[]).length > 0
        ) {
          // Fallback: backend might still return an array in some versions
          const remotePlaylists: Playlist[] = [];
          for (const item of playlistsResult as unknown[]) {
            try {
              const parsed =
                typeof item === "string" ? JSON.parse(item as string) : item;
              if (
                parsed &&
                typeof parsed === "object" &&
                "id" in parsed &&
                "name" in parsed
              ) {
                remotePlaylists.push(parsed as Playlist);
              }
            } catch {
              // ignore malformed entries
            }
          }
          if (remotePlaylists.length > 0) {
            dispatch({ type: "SET_PLAYLISTS", playlists: remotePlaylists });
          }
        }
      } catch {
        // Silent failure — local data stays intact
      }
    };

    void syncFromBackend();
  }, [isAuthenticated, actor, isFetching, principal, dispatch]);

  // On sign-out, reset sync flag so next login re-syncs
  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedRef.current = false;
      prevPrincipal.current = undefined;
    }
  }, [isAuthenticated]);
}
