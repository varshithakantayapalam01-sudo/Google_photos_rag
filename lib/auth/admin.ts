/**
 * Admin authentication utilities using HMAC-SHA256 session tokens
 */

import { createHmac, timingSafeEqual } from "crypto";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.ADMIN_JWT_SECRET || "default-dev-secret-key-32-chars-long";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

export interface AdminSession {
  role: "admin";
  issuedAt: number;
  expiresAt: number;
}

/**
 * Validates admin password and creates a signed session token (valid for 24 hours)
 */
export function authenticateAdminPassword(password: string): string | null {
  if (!password || password !== ADMIN_PASSWORD) {
    return null;
  }

  const now = Date.now();
  const session: AdminSession = {
    role: "admin",
    issuedAt: now,
    expiresAt: now + 24 * 60 * 60 * 1000, // 24 hours
  };

  const payload = Buffer.from(JSON.stringify(session)).toString("base64url");
  const signature = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");

  return `${payload}.${signature}`;
}

/**
 * Verifies a signed session token
 */
export function verifyAdminToken(token: string | null | undefined): AdminSession | null {
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 2) return null;

  const [payload, signature] = parts;

  try {
    const expectedSignature = createHmac("sha256", JWT_SECRET).update(payload).digest("base64url");
    const sigBuffer = Buffer.from(signature);
    const expectedSigBuffer = Buffer.from(expectedSignature);

    if (sigBuffer.length !== expectedSigBuffer.length || !timingSafeEqual(sigBuffer, expectedSigBuffer)) {
      return null;
    }

    const session: AdminSession = JSON.parse(Buffer.from(payload, "base64url").toString("utf-8"));

    if (Date.now() > session.expiresAt || session.role !== "admin") {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies admin auth from Request headers or cookies
 */
export function checkAdminAuth(req: NextRequest): boolean {
  // Check Authorization header: Bearer <token>
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    if (verifyAdminToken(token)) return true;
  }

  // Check Cookie: admin_token=<token>
  const cookieToken = req.cookies.get("admin_token")?.value;
  if (cookieToken && verifyAdminToken(cookieToken)) {
    return true;
  }

  return false;
}
