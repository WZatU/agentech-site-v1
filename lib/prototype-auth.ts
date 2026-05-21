import { promises as fs } from "fs";
import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import path from "path";

export type StoredAccount = {
  email: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  verifiedAt: string;
};

export type VerificationCode = {
  email: string;
  code: string;
  expiresAt: string;
  createdAt: string;
};

const dataDir = path.join(process.cwd(), "data");
const accountsPath = path.join(dataDir, "accounts.json");
const codesPath = path.join(dataDir, "verification-codes.json");

export function normalizeEmail(email: unknown) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

export function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidPassword(password: unknown) {
  return typeof password === "string" && password.length >= 8;
}

async function readJson<T>(filePath: string, fallback: T) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson<T>(filePath: string, value: T) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

export async function readAccounts() {
  return readJson<StoredAccount[]>(accountsPath, []);
}

export async function writeAccounts(accounts: StoredAccount[]) {
  await writeJson(accountsPath, accounts);
}

export async function findAccount(email: string) {
  const accounts = await readAccounts();
  return accounts.find((account) => account.email === email) ?? null;
}

export function createPasswordHash(password: string) {
  const salt = randomBytes(16).toString("hex");
  const passwordHash = scryptSync(password, salt, 64).toString("hex");
  return { passwordHash, salt };
}

export function verifyPassword(password: string, account: StoredAccount) {
  const candidate = scryptSync(password, account.salt, 64);
  const stored = Buffer.from(account.passwordHash, "hex");

  return stored.length === candidate.length && timingSafeEqual(stored, candidate);
}

export async function createVerificationCode(email: string) {
  const codes = await readJson<VerificationCode[]>(codesPath, []);
  const code = String(Math.floor(100000 + Math.random() * 900000));
  const now = new Date();
  const nextCodes = codes.filter((entry) => entry.email !== email);

  nextCodes.push({
    email,
    code,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + 10 * 60 * 1000).toISOString()
  });

  await writeJson(codesPath, nextCodes);
  return code;
}

export async function verifyCode(email: string, code: string) {
  const codes = await readJson<VerificationCode[]>(codesPath, []);
  const match = codes.find((entry) => entry.email === email);

  if (!match) {
    return false;
  }

  if (Date.now() > new Date(match.expiresAt).getTime()) {
    return false;
  }

  return match.code === code.trim();
}

export async function clearVerificationCode(email: string) {
  const codes = await readJson<VerificationCode[]>(codesPath, []);
  await writeJson(
    codesPath,
    codes.filter((entry) => entry.email !== email)
  );
}
