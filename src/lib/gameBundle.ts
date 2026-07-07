// Shared helpers for uploading game bundles (folders, ZIPs) to Supabase Storage.
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";

const EXT_CONTENT_TYPES: Record<string, string> = {
  html: "text/html; charset=utf-8",
  htm: "text/html; charset=utf-8",
  css: "text/css; charset=utf-8",
  js: "application/javascript; charset=utf-8",
  mjs: "application/javascript; charset=utf-8",
  json: "application/json; charset=utf-8",
  svg: "image/svg+xml",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  ico: "image/x-icon",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  webm: "video/webm",
  mp4: "video/mp4",
  wasm: "application/wasm",
  txt: "text/plain; charset=utf-8",
  md: "text/plain; charset=utf-8",
  tsx: "text/plain; charset=utf-8",
  ts: "text/plain; charset=utf-8",
  jsx: "text/plain; charset=utf-8",
  gitignore: "text/plain; charset=utf-8",
};

export const contentTypeFor = (file: File, relPath: string): string => {
  if (file.type) return file.type;
  const ext = relPath.split(".").pop()?.toLowerCase() ?? "";
  return EXT_CONTENT_TYPES[ext] ?? "application/octet-stream";
};

/** Get the relative path of a file — from webkitRelativePath or __relPath (ZIP import). */
export const relPathOf = (f: File): string => {
  const custom = (f as unknown as { __relPath?: string }).__relPath;
  if (custom && custom.length > 0) return custom;
  const rel = (f as unknown as { webkitRelativePath?: string }).webkitRelativePath;
  if (rel && rel.length > 0) {
    const idx = rel.indexOf("/");
    return idx >= 0 ? rel.slice(idx + 1) : rel;
  }
  return f.name;
};

/** Expand any .zip files into their contents, flattening a shared top-level folder. */
export const expandZips = async (files: File[]): Promise<File[]> => {
  const out: File[] = [];
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      out.push(file);
      continue;
    }
    const zip = await JSZip.loadAsync(file);
    const entries = Object.values(zip.files).filter((e) => !e.dir);
    const topLevels = new Set(
      entries.map((e) => {
        const idx = e.name.indexOf("/");
        return idx >= 0 ? e.name.slice(0, idx) : "";
      })
    );
    const stripTop = topLevels.size === 1 && !topLevels.has("");
    for (const entry of entries) {
      const rel = stripTop ? entry.name.slice(entry.name.indexOf("/") + 1) : entry.name;
      if (!rel) continue;
      const blob = await entry.async("blob");
      const inner = new File([blob], rel.split("/").pop() ?? rel);
      Object.defineProperty(inner, "__relPath", { value: rel, enumerable: false });
      out.push(inner);
    }
  }
  return out;
};

const GAME_FILES_BUCKET = "game-files";

/**
 * Upload a bundle of files to game-files/<prefix>/<slug>/.
 * @param slug Game slug.
 * @param files Array of Files with __relPath or webkitRelativePath.
 * @param prefix Optional path prefix (e.g. "__test__" for test games).
 * @returns Public URL of the entry file (index.html or first .html).
 */
export const uploadBundle = async (
  slug: string,
  files: File[],
  prefix = ""
): Promise<string> => {
  const base = prefix ? `${prefix}/${slug}` : slug;

  // Clean up existing folder
  const existing = await supabase.storage.from(GAME_FILES_BUCKET).list(base, { limit: 1000 });
  if (existing.data && existing.data.length > 0) {
    const toRemove = existing.data.map((o) => `${base}/${o.name}`);
    await supabase.storage.from(GAME_FILES_BUCKET).remove(toRemove).catch(() => {});
  }

  let entryPath: string | null = null;
  for (const file of files) {
    const rel = relPathOf(file);
    const path = `${base}/${rel}`;
    const type = contentTypeFor(file, rel);
    const { error } = await supabase.storage
      .from(GAME_FILES_BUCKET)
      .upload(path, file, { upsert: true, contentType: type, cacheControl: "60" });
    if (error) throw new Error(`${rel}: ${error.message}`);
    if (rel === "index.html") entryPath = path;
    else if (!entryPath && rel.toLowerCase().endsWith(".html")) entryPath = path;
  }
  if (!entryPath) {
    entryPath = `${base}/${relPathOf(files[0])}`;
  }
  const { data } = supabase.storage.from(GAME_FILES_BUCKET).getPublicUrl(entryPath);
  return `${data.publicUrl}?v=${Date.now()}`;
};

/** Check if a string is a URL pointing at our game-files bucket. */
export const isStoredGameUrl = (s: string) =>
  /^https?:\/\//i.test(s.trim()) && s.includes("/game-files/");
