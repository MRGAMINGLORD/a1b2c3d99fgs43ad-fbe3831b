// Simple session-scoped password gates for the TEST area.
// IMPORTANT: these are CLIENT-SIDE passwords baked into the JS bundle.
// They will NOT stop a determined user — they only prevent casual access.
// For real protection, log in as admin (server-validated).

const TEST_PASSWORD = "TESTER67";
const EDIT_CODE_PASSWORD = "LATTEISCUTE";

const TEST_KEY = "apocalypse-waffle:test-unlocked";
const EDIT_KEY = "apocalypse-waffle:edit-unlocked";

export const isTestUnlocked = (): boolean => {
  try { return sessionStorage.getItem(TEST_KEY) === "1"; } catch { return false; }
};
export const unlockTest = (input: string): boolean => {
  if (input === TEST_PASSWORD) {
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
