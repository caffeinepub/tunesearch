/**
 * useBackendSync — syncs favourites and playlists with the backend canister.
 *
 * On sign-in: loads favourites + playlists from backend and merges into local state.
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
        // Parallel fetch
        const [favsResult, playlistsResult] = await Promise.all([
          (
            actor as unknown as { getFavourites?: () => Promise<string[]> }
          ).getFavourites?.() ?? Promise.resolve([]),
          (
            actor as unknown as { getPlaylists?: () => Promise<string[]> }
          ).getPlaylists?.() ?? Promise.resolve([]),
        ]);

        // Parse favourites
        if (Array.isArray(favsResult) && favsResult.length > 0) {
          const remoteItems: Track[] = [];
          for (const item of favsResult) {
            try {
              const parsed = typeof item === "string" ? JSON.parse(item) : item;
              if (parsed?.videoId) remoteItems.push(parsed as Track);
            } catch {
              // ignore malformed entries
            }
          }
          if (remoteItems.length > 0) {
            const localIds = new Set(remoteItems.map((t) => t.videoId));
            const localOnly = favouritesRef.current.filter(
              (t) => !localIds.has(t.videoId),
            );
            const merged = [...remoteItems, ...localOnly];
            localStorage.setItem("ts_favourites", JSON.stringify(merged));
            // Trigger a lightweight re-render so favourites re-load from localStorage
            dispatch({ type: "SET_PREFS", prefs: {} });
          }
        }

        // Parse playlists
        if (Array.isArray(playlistsResult) && playlistsResult.length > 0) {
          const remotePlaylists: Playlist[] = [];
          for (const item of playlistsResult) {
            try {
              const parsed = typeof item === "string" ? JSON.parse(item) : item;
              if (parsed?.id && parsed?.name)
                remotePlaylists.push(parsed as Playlist);
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
