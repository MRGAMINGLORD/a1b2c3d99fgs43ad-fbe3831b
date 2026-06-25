// Tracks whether Sir Wafflington the 67th has been "summoned" by the visitor.
// He stays hidden until the user types the secret phrase
// ("I want Sir Wafflington", case-insensitive) into the feedback form.
import { useEffect, useState } from "react";

const KEY = "apocalypse-waffle:wafflington-unlocked";
const EVENT = "wafflington:unlock-change";

export const WAFFLINGTON_SECRET_PHRASE = "i want sir wafflington";

export const isWafflingtonUnlocked = (): boolean => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
};

export const setWafflingtonUnlocked = (val: boolean) => {
  try {
    if (val) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
};

export const messageContainsSecret = (msg: string): boolean =>
  msg.toLowerCase().includes(WAFFLINGTON_SECRET_PHRASE);

export const useWafflingtonUnlocked = (): boolean => {
  const [unlocked, setUnlocked] = useState<boolean>(() => isWafflingtonUnlocked());
  useEffect(() => {
    const sync = () => setUnlocked(isWafflingtonUnlocked());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  return unlocked;
};
