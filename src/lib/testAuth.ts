// Simple session-scoped password gates for the TEST area.
// IMPORTANT: these are CLIENT-SIDE passwords baked into the JS bundle.
// They will NOT stop a determined user — they only prevent casual access.
// For real protection, log in as admin (server-validated).

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

export const isTestUnlocked = (): boolean => {
  try { return sessionStorage.getItem(TEST_KEY) === "1"; } catch { return false; }
};
export const unlockTest = (username: string, password: string): boolean => {
  if (password === TEST_PASSWORD && isAllowedTestUsername(username)) {
    try { sessionStorage.setItem(TEST_KEY, "1"); } catch {}
    return true;
  }
  return false;
};
export const lockTest = () => {
  try { sessionStorage.removeItem(TEST_KEY); } catch {}
};

export const isEditUnlocked = (): boolean => {
  try { return sessionStorage.getItem(EDIT_KEY) === "1"; } catch { return false; }
};
export const unlockEdit = (input: string): boolean => {
  if (input === EDIT_CODE_PASSWORD) {
    try { sessionStorage.setItem(EDIT_KEY, "1"); } catch {}
    return true;
  }
  return false;
};
