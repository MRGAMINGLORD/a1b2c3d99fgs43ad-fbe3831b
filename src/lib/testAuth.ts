// Simple session-scoped password gates for the TEST area.
// IMPORTANT: these are CLIENT-SIDE passwords baked into the JS bundle.
// They will NOT stop a determined user — they only prevent casual access.
// For real protection, log in as admin (server-validated).

import { submitPasswordGateAttempt, type PasswordGateResult } from "@/lib/passwordGate";

const TEST_PASSWORD = "TESTER";
const EDIT_CODE_PASSWORD = "LATTEISCUTE";

// Allowed tester usernames (case-sensitive — exactly as written).
export const ALLOWED_TEST_USERNAMES = [
  "THEADMIN",
  "TURTLES RULE!!!",
  "67'er",
] as const;

export const isAllowedTestUsername = (input: string): boolean =>
  (ALLOWED_TEST_USERNAMES as readonly string[]).includes(input);

const TEST_KEY = "apocalypse-waffle:test-unlocked";
const EDIT_KEY = "apocalypse-waffle:edit-unlocked";
const TEST_UNLOCK_EVENT = "apocalypse-waffle:test-unlocked";

export const isTestUnlocked = (): boolean => {
  try { return sessionStorage.getItem(TEST_KEY) === "1"; } catch { return false; }
};

export const unlockTestAttempt = (username: string, password: string): PasswordGateResult => {
  const valid = password === TEST_PASSWORD && isAllowedTestUsername(username);
  const result = submitPasswordGateAttempt("test-access", valid);
  if (result.ok) {
    try {
      sessionStorage.setItem(TEST_KEY, "1");
      window.dispatchEvent(new Event(TEST_UNLOCK_EVENT));
    } catch {}
  }
  return result;
};

export const unlockTest = (username: string, password: string): boolean => {
  const result = unlockTestAttempt(username, password);
  return result.ok;
};
export const lockTest = () => {
  try {
    sessionStorage.removeItem(TEST_KEY);
    window.dispatchEvent(new Event(TEST_UNLOCK_EVENT));
  } catch {}
};

export const isEditUnlocked = (): boolean => {
  try { return sessionStorage.getItem(EDIT_KEY) === "1"; } catch { return false; }
};

export const unlockEditAttempt = (input: string): PasswordGateResult =>
  {
    const result = submitPasswordGateAttempt("edit-access", input === EDIT_CODE_PASSWORD);
    if (result.ok) {
      try { sessionStorage.setItem(EDIT_KEY, "1"); } catch {}
    }
    return result;
  };

export const unlockEdit = (input: string): boolean => {
  const result = unlockEditAttempt(input);
  return result.ok;
};
