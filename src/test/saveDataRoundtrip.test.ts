/**
 * Roundtrip test for the hub's per-device save export/import.
 *
 * Guarantees:
 *   - Every game's progress (any localStorage key the game writes) is captured
 *     by exportGameData()
 *   - importGameData() restores those values byte-for-byte
 *   - Hub-only keys (auth tokens, last-game pointer) are NOT exported or
 *     stomped on import
 *
 * The tests use an in-memory localStorage shim and DO NOT touch the network,
 * so they are safe to run in CI on every push.
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  exportGameData,
  importGameData,
  LAST_GAME_KEY,
  SAVE_META_KEY,
} from "@/lib/gameStorage";

// ---- in-memory localStorage shim ----
class MemStorage {
  private store = new Map<string, string>();
  get length() {
    return this.store.size;
  }
  key(i: number) {
    return Array.from(this.store.keys())[i] ?? null;
  }
  getItem(k: string) {
    return this.store.has(k) ? this.store.get(k)! : null;
  }
  setItem(k: string, v: string) {
    this.store.set(k, String(v));
  }
  removeItem(k: string) {
    this.store.delete(k);
  }
  clear() {
    this.store.clear();
  }
}

const installLocalStorage = () => {
  const mem = new MemStorage();
  Object.defineProperty(globalThis, "localStorage", {
    value: mem,
    configurable: true,
    writable: true,
  });
  return mem;
};

// Stub URL.createObjectURL / Blob bits used by downloadGameData (we don't
// call it here — only the pure data path).
beforeEach(() => {
  installLocalStorage();
});

describe("save data export → import roundtrip", () => {
  it("captures every game's localStorage progress in the export", () => {
    // Simulate progress written by several different games.
    localStorage.setItem(
      "ttc:save:v1",
      JSON.stringify({ wood: 42, turtles: 7, day: 12 }),
    );
    localStorage.setItem(
      "dob:save:v1",
      JSON.stringify({ year: 1940, morale: 88, units: ["1st Div", "2nd Div"] }),
    );
    localStorage.setItem(
      "waffle-works:state",
      JSON.stringify({ batter: 1234, irons: 3 }),
    );
    localStorage.setItem("custom-game-xyz:save", "raw-string-progress");
    // Hub-meta should still be exported (it's per-device save metadata that
    // belongs with the player's progress)
    localStorage.setItem(
      SAVE_META_KEY,
      JSON.stringify({ "turtle-trade-co": { savedAt: 1700000000000 } }),
    );

    const exp = exportGameData();
    expect(exp.app).toBe("apocalypse-waffle");
    expect(exp.version).toBe(1);
    expect(Object.keys(exp.data)).toEqual(
      expect.arrayContaining([
        "ttc:save:v1",
        "dob:save:v1",
        "waffle-works:state",
        "custom-game-xyz:save",
        SAVE_META_KEY,
      ]),
    );
    expect(exp.data["ttc:save:v1"]).toBe(localStorage.getItem("ttc:save:v1"));
    expect(exp.data["dob:save:v1"]).toBe(localStorage.getItem("dob:save:v1"));
  });

  it("excludes hub-reserved keys (auth, last-game pointer) from export", () => {
    localStorage.setItem("ttc:save:v1", "x");
    localStorage.setItem(LAST_GAME_KEY, "turtle-trade-co");
    localStorage.setItem("sb-hllwbnovtjpauzwnrwfh-auth-token", "secret-jwt");

    const exp = exportGameData();
    const keys = Object.keys(exp.data);
    expect(keys).toContain("ttc:save:v1");
    expect(keys).not.toContain(LAST_GAME_KEY);
    expect(keys).not.toContain("sb-hllwbnovtjpauzwnrwfh-auth-token");
  });

  it("restores every game's progress byte-for-byte after import", () => {
    // 1. Seed some saves and export.
    const games: Record<string, string> = {
      "ttc:save:v1": JSON.stringify({ wood: 99, turtles: 4 }),
      "dob:save:v1": JSON.stringify({ year: 1940, morale: 100 }),
      "waffle-works:state": JSON.stringify({ batter: 50000 }),
      "defense-of-belgium:hi-score": "9001",
    };
    for (const [k, v] of Object.entries(games)) localStorage.setItem(k, v);
    const exported = JSON.stringify(exportGameData());

    // 2. New device: wipe storage, then import.
    installLocalStorage();
    expect(localStorage.length).toBe(0);

    const result = importGameData(exported);
    expect(result.imported).toBe(Object.keys(games).length);
    expect(result.skipped).toBe(0);

    // 3. Every game's value must match exactly.
    for (const [k, v] of Object.entries(games)) {
      expect(localStorage.getItem(k), `game key ${k} not restored`).toBe(v);
    }
  });

  it("import skips hub-reserved keys even if present in the file", () => {
    // Hand-craft an export file that tries to overwrite an auth token.
    const malicious = JSON.stringify({
      app: "apocalypse-waffle",
      version: 1,
      exportedAt: new Date().toISOString(),
      data: {
        "ttc:save:v1": "legit-game-data",
        [LAST_GAME_KEY]: "should-be-skipped",
        "sb-hllwbnovtjpauzwnrwfh-auth-token": "attacker-jwt",
      },
    });

    // Pre-existing auth token on the device should NOT be replaced.
    localStorage.setItem("sb-hllwbnovtjpauzwnrwfh-auth-token", "real-jwt");

    const result = importGameData(malicious);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(2);
    expect(localStorage.getItem("ttc:save:v1")).toBe("legit-game-data");
    expect(localStorage.getItem(LAST_GAME_KEY)).toBeNull();
    expect(localStorage.getItem("sb-hllwbnovtjpauzwnrwfh-auth-token")).toBe(
      "real-jwt",
    );
  });

  it("rejects files that aren't an Apocalypse Waffle save", () => {
    expect(() => importGameData("not json at all {")).toThrow(
      /not valid json/i,
    );
    expect(() =>
      importGameData(JSON.stringify({ app: "some-other-app", data: {} })),
    ).toThrow(/not an apocalypse waffle save/i);
    expect(() =>
      importGameData(JSON.stringify({ app: "apocalypse-waffle", data: null })),
    ).toThrow(/not an apocalypse waffle save/i);
  });

  it("full roundtrip preserves the entire snapshot for many games at once", () => {
    // Stress test with 25 different game keys.
    const snapshot: Record<string, string> = {};
    for (let i = 0; i < 25; i++) {
      const key = `game-${i}:save`;
      const value = JSON.stringify({ id: i, score: i * 1000, items: [i, i + 1, i + 2] });
      snapshot[key] = value;
      localStorage.setItem(key, value);
    }
    const exported = JSON.stringify(exportGameData());

    installLocalStorage();
    const { imported } = importGameData(exported);
    expect(imported).toBe(25);
    for (const [k, v] of Object.entries(snapshot)) {
      expect(localStorage.getItem(k)).toBe(v);
    }
  });
});
