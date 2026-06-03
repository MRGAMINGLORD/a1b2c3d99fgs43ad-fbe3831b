type PasswordGateId = "admin-login" | "test-access" | "edit-access" | "defcon-access";

export type { PasswordGateId };

export const PASSWORD_GATE_LABELS: Record<PasswordGateId, string> = {
  "admin-login": "Admin Login",
  "test-access": "Tester Access",
  "edit-access": "Editor Access",
  "defcon-access": "DEFCON Bunker",
};

export const PASSWORD_GATE_LOCKED_OUT_EVENT = "password-gate:locked-out";

export interface PasswordGateLockedOutDetail {
  id: PasswordGateId;
  label: string;
  lockoutUntil: number;
  lockoutMs: number;
}

export type PasswordGateResult =
  | { ok: true; remaining: number; lockoutUntil: 0; lockoutMs: 0 }
  | {
      ok: false;
      lockedOut: boolean;
      remaining: number;
      lockoutUntil: number;
      lockoutMs: number;
    };

const MAX_ATTEMPTS = 3;
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const MAX_LOCKOUT_MS = 30 * ONE_DAY_MS;

const gateKey = (id: PasswordGateId, suffix: string) =>
  `apocalypse-waffle:${id}:${suffix}`;

const readNumber = (key: string): number => {
  try {
    const value = Number(localStorage.getItem(key) ?? "0");
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
};

const writeNumber = (key: string, value: number) => {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    /* ignore */
  }
};

const removeKey = (key: string) => {
  try {
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
};

export const getPasswordGateAttempts = (id: PasswordGateId): number =>
  readNumber(gateKey(id, "attempts"));

export const getPasswordGateLockoutUntil = (id: PasswordGateId): number =>
  readNumber(gateKey(id, "lockout-until"));

export const getPasswordGateLockoutCount = (id: PasswordGateId): number =>
  readNumber(gateKey(id, "lockout-count"));

export const isPasswordGateLockedOut = (id: PasswordGateId): boolean =>
  getPasswordGateLockoutUntil(id) > Date.now();

export const remainingPasswordGateAttempts = (id: PasswordGateId): number =>
  Math.max(0, MAX_ATTEMPTS - getPasswordGateAttempts(id));

export const getPasswordGateNextLockoutMs = (id: PasswordGateId): number =>
  Math.min(MAX_LOCKOUT_MS, ONE_DAY_MS * Math.pow(2, Math.max(0, getPasswordGateLockoutCount(id))));

export const clearPasswordGateAttempts = (id: PasswordGateId) => {
  removeKey(gateKey(id, "attempts"));
  removeKey(gateKey(id, "lockout-until"));
};

export const submitPasswordGateAttempt = (
  id: PasswordGateId,
  isValid: boolean,
): PasswordGateResult => {
  const existingLockoutUntil = getPasswordGateLockoutUntil(id);
  if (existingLockoutUntil > Date.now()) {
    return {
      ok: false,
      lockedOut: true,
      remaining: 0,
      lockoutUntil: existingLockoutUntil,
      lockoutMs: Math.max(0, existingLockoutUntil - Date.now()),
    };
  }

  if (isValid) {
    clearPasswordGateAttempts(id);
    return { ok: true, remaining: MAX_ATTEMPTS, lockoutUntil: 0, lockoutMs: 0 };
  }

  const attempts = getPasswordGateAttempts(id) + 1;
  writeNumber(gateKey(id, "attempts"), attempts);

  if (attempts >= MAX_ATTEMPTS) {
    const nextCount = getPasswordGateLockoutCount(id) + 1;
    const lockoutMs = Math.min(MAX_LOCKOUT_MS, ONE_DAY_MS * Math.pow(2, Math.max(0, nextCount - 1)));
    const lockoutUntil = Date.now() + lockoutMs;
    writeNumber(gateKey(id, "lockout-count"), nextCount);
    writeNumber(gateKey(id, "lockout-until"), lockoutUntil);
    removeKey(gateKey(id, "attempts"));
    return {
      ok: false,
      lockedOut: true,
      remaining: 0,
      lockoutUntil,
      lockoutMs,
    };
  }

  return {
    ok: false,
    lockedOut: false,
    remaining: Math.max(0, MAX_ATTEMPTS - attempts),
    lockoutUntil: 0,
    lockoutMs: 0,
  };
};

export const formatPasswordGateLockout = (until: number): string => {
  const ms = Math.max(0, until - Date.now());
  const days = Math.floor(ms / ONE_DAY_MS);
  const hours = Math.floor((ms % ONE_DAY_MS) / (60 * 60 * 1000));
  const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};
