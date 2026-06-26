// Tracks whether the Games sections (Tycoon / Twists / Other) are unlocked.
// Education is always unlocked. Games unlock after the secret persistence
// dance with Sir Wafflington completes.

import { useEffect, useState } from "react";

const KEY = "apocalypse-waffle:games-unlocked";
const EVT = "apocalypse-waffle:games-unlocked-changed";

export const areGamesUnlocked = (): boolean => {
  try { return localStorage.getItem(KEY) === "1"; } catch { return false; }
};

export const unlockGames = () => {
  try {
    localStorage.setItem(KEY, "1");
    window.dispatchEvent(new Event(EVT));
  } catch {}
};

export const lockGames = () => {
  try {
    localStorage.removeItem(KEY);
    window.dispatchEvent(new Event(EVT));
  } catch {}
};

export const useGamesUnlocked = (): boolean => {
  const [v, setV] = useState<boolean>(() => areGamesUnlocked());
  useEffect(() => {
    const sync = () => setV(areGamesUnlocked());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return v;
};
