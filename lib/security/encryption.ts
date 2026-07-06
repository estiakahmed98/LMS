// AES-256-GCM field-level encryption for sensitive columns
// (User.phoneEnc, StudentProfile.nidNumberEnc).
//
// Server-only: uses node:crypto and reads ENCRYPTION_KEY from the environment.
// Never import this from a client component.
//
// Stored format: "v1:<iv b64>:<authTag b64>:<ciphertext b64>"

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM standard nonce size
const KEY_LENGTH = 32; // 256 bits
const PREFIX = "v1";

function getKey(): Buffer {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    throw new Error(
      "ENCRYPTION_KEY is not set. Generate one with: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    );
  }
  const key = Buffer.from(raw, "hex");
  if (key.length !== KEY_LENGTH) {
    throw new Error(
      `ENCRYPTION_KEY must be ${KEY_LENGTH} bytes of hex (${KEY_LENGTH * 2} hex chars), got ${key.length} bytes.`,
    );
  }
  return key;
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return [
    PREFIX,
    iv.toString("base64"),
    authTag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptField(payload: string): string {
  const [prefix, ivB64, tagB64, dataB64] = payload.split(":");
  if (prefix !== PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted payload format.");
  }
  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === "string" && value.startsWith(`${PREFIX}:`);
}

/** Encrypt only if a non-empty value is present (convenience for optional PII fields). */
export function encryptOptional(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? encryptField(trimmed) : null;
}

/** Decrypt only if the value is present and encrypted. */
export function decryptOptional(value: string | null | undefined): string | null {
  if (!value) return null;
  return isEncrypted(value) ? decryptField(value) : value;
}
