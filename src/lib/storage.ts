import "server-only";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Uploaded documents live on disk under ./uploads (git-ignored). For a cloud
// deployment later, swap these two functions for an S3/GCS client — the rest of
// the app only ever deals with the stored name.

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

async function ensureDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Persist an uploaded file, returning the opaque stored name. */
export async function saveUpload(originalName: string, bytes: Buffer): Promise<string> {
  await ensureDir();
  const ext = path.extname(originalName).slice(0, 12); // keep a sane extension
  const storedName = `${crypto.randomUUID()}${ext}`;
  await fs.writeFile(path.join(UPLOAD_DIR, storedName), bytes);
  return storedName;
}

/** Read a stored file back. Guards against path traversal via basename. */
export async function readUpload(storedName: string): Promise<Buffer> {
  const safe = path.basename(storedName);
  return fs.readFile(path.join(UPLOAD_DIR, safe));
}

/** Best-effort delete; missing files are ignored. */
export async function deleteUpload(storedName: string): Promise<void> {
  const safe = path.basename(storedName);
  try {
    await fs.unlink(path.join(UPLOAD_DIR, safe));
  } catch {
    /* already gone */
  }
}
