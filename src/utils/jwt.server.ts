import jwt from "jsonwebtoken";
import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const { verify, sign } = jwt;

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "auth_token";

export interface JWTPayload {
  userId: string;
  email: string;
  name: string;
}

export function createToken(payload: JWTPayload): string {
  return sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    return null;
  }
}

export function setAuthCookie(token: string): void {
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
  });
}

export function getAuthCookie(): string | null {
  return getCookie(COOKIE_NAME) || null;
}

export function deleteAuthCookie(): void {
  deleteCookie(COOKIE_NAME);
}

export function getCurrentUserFromCookie(): JWTPayload | null {
  const token = getAuthCookie();
  if (!token) return null;
  return verifyToken(token);
}
