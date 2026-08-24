import { randomUUID } from "crypto";
import { createReadStream } from "fs";
import { mkdir, readFile, unlink, writeFile } from "fs/promises";
import path from "path";

/**
 * Storage adapter.
 *
 * v1 writes to local disk. Everything above this file deals only in opaque
 * `storageKey` strings, so swapping in Cloudinary/S3 later — and adding video,
 * which is the eventual sizing driver (§7) — is a change to this file alone,
 * with no data migration.
 */
export interface StoredObject {
  storageKey: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageAdapter {
  put(file: File, folder: string): Promise<StoredObject>;
  read(storageKey: string): Promise<Buffer>;
  stream(storageKey: string): ReturnType<typeof createReadStream>;
  remove(storageKey: string): Promise<void>;
}

// The storage root is configurable, which the bundler can't statically prove
// stays inside one folder — the ignore comment stops it from tracing (and
// shipping) the entire project as a result.
const STORAGE_DIR = path.resolve(
  /* turbopackIgnore: true */ process.env.STORAGE_DIR ?? "./storage",
);

/** Reject keys that try to escape the storage root. */
function resolveKey(storageKey: string): string {
  const full = path.resolve(STORAGE_DIR, storageKey);
  if (full !== STORAGE_DIR && !full.startsWith(STORAGE_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return full;
}

function extensionFor(file: File): string {
  const fromName = path.extname(file.name ?? "");
  if (fromName) return fromName.toLowerCase();

  const fromMime: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "audio/webm": ".webm",
    "audio/ogg": ".ogg",
    "audio/mpeg": ".mp3",
    "audio/mp4": ".m4a",
    "audio/wav": ".wav",
  };
  return fromMime[file.type] ?? "";
}

const localDisk: StorageAdapter = {
  async put(file, folder) {
    const key = path.posix.join(folder, `${randomUUID()}${extensionFor(file)}`);
    const full = resolveKey(key);
    await mkdir(path.dirname(full), { recursive: true });

    const bytes = Buffer.from(await file.arrayBuffer());
    await writeFile(full, bytes);

    return {
      storageKey: key,
      sizeBytes: bytes.byteLength,
      mimeType: file.type || "application/octet-stream",
    };
  },

  async read(storageKey) {
    return readFile(resolveKey(storageKey));
  },

  stream(storageKey) {
    return createReadStream(resolveKey(storageKey));
  },

  async remove(storageKey) {
    await unlink(resolveKey(storageKey)).catch(() => {
      /* already gone — deleting an attachment twice is not an error */
    });
  },
};

export const storage: StorageAdapter = localDisk;
