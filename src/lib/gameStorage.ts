// Utilities for tracking the last opened game and importing/exporting all
// game data persisted in the browser's localStorage.
//
// Because the static game HTML files are served from the same origin as the
// hub (just from /games/...), any localStorage they write is shared with the
// hub. We export everything by default and let the user pick a key prefix
// convention if they want to scope it later.

export const LAST_GAME_KEY = "apocalypse-waffle:last-game";
export const SAVE_META_KEY = "apocalypse-waffle:save-meta";

// Keys that belong to the hub itself and should NOT be considered "game data".
const HUB_RESERVED_KEYS = new Set<string>([
  LAST_GAME_KEY,
  "sb-access-token",
  "sb-refresh-token",
]);

const isHubKey = (key: string) => {
  if (HUB_RESERVED_KEYS.has(key)) return true;
  // Supabase auth tokens use a sb-<ref>-auth-token pattern.
  if (key.startsWith("sb-") && key.includes("-auth-token")) return true;
  return false;
};

export const setLastGame = (gameId: string) => {
  try {
    localStorage.setItem(LAST_GAME_KEY, gameId);
  } catch {
    // ignore storage quota / privacy mode
  }
};

export const getLastGame = (): string | null => {
  try {
    return localStorage.getItem(LAST_GAME_KEY);
  } catch {
    return null;
  }
};

export interface SaveMeta {
  [gameId: string]: { savedAt: number };
}

export const getSaveMeta = (): SaveMeta => {
  try {
    const raw = localStorage.getItem(SAVE_META_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

// Returns true if any game has actually persisted save data
export const hasAnySave = (): boolean => {
  try {
    if (Object.keys(getSaveMeta()).length > 0) return true;
    // Fallback: check known game keys directly
    return Boolean(
      localStorage.getItem("ttc:save:v1") ||
        localStorage.getItem("dob:save:v1") ||
        localStorage.getItem("gg:save:v1"),
    );
  } catch {
    return false;
  }
};

export interface GameDataExport {
  app: "apocalypse-waffle";
  version: 1;
  exportedAt: string;
  data: Record<string, string>;
}

export const exportGameData = (): GameDataExport => {
  const data: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || isHubKey(key)) continue;
    const value = localStorage.getItem(key);
    if (value !== null) data[key] = value;
  }
  return {
    app: "apocalypse-waffle",
    version: 1,
    exportedAt: new Date().toISOString(),
    data,
  };
};

export const downloadGameData = () => {
  const payload = exportGameData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  a.download = `apocalypse-waffle-save-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return Object.keys(payload.data).length;
};

export interface ImportResult {
  imported: number;
  skipped: number;
}

export const importGameData = (raw: string): ImportResult => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("File is not valid JSON.");
  }
  if (
    !parsed ||
    typeof parsed !== "object" ||
    (parsed as GameDataExport).app !== "apocalypse-waffle" ||
    typeof (parsed as GameDataExport).data !== "object"
  ) {
    throw new Error("This file is not an Apocalypse Waffle save.");
  }
  const entries = Object.entries((parsed as GameDataExport).data);
  let imported = 0;
  let skipped = 0;
  for (const [key, value] of entries) {
    if (typeof value !== "string" || isHubKey(key)) {
      skipped++;
      continue;
    }
    try {
      localStorage.setItem(key, value);
      imported++;
    } catch {
      skipped++;
    }
  }
  return { imported, skipped };
};
