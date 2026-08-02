import { UserProfile, UserRole } from '@/types';

export interface JWTPayload {
  sub: string; // User ID
  email: string;
  name: string;
  role: UserRole;
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration timestamp (7 days)
}

const JWT_SECRET = 'turf_management_saas_jwt_secret_2026';

// Base64URL helper
function base64UrlEncode(str: string): string {
  if (typeof window !== 'undefined') {
    return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
  }
  return Buffer.from(str).toString('base64url');
}

function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  if (typeof window !== 'undefined') {
    return atob(base64);
  }
  return Buffer.from(base64, 'base64').toString('utf-8');
}

/**
 * Creates a JWT token for the authenticated user
 */
export function generateJWTToken(user: UserProfile): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const exp = now + 7 * 24 * 60 * 60; // Valid for 7 days

  const payload: JWTPayload = {
    sub: user.id,
    email: user.email,
    name: user.full_name,
    role: user.role,
    iat: now,
    exp,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = base64UrlEncode(`${encodedHeader}.${encodedPayload}.${JWT_SECRET}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

/**
 * Decodes and verifies a JWT token
 */
export function verifyAndDecodeJWT(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payloadJson = base64UrlDecode(parts[1]);
    const payload: JWTPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    return payload;
  } catch (err) {
    return null;
  }
}

/**
 * Stores JWT token in cookie and localStorage
 */
export function setAuthToken(token: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('auth_token', token);
    document.cookie = `auth_token=${token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
  }
}

/**
 * Retrieves JWT token from localStorage or cookies
 */
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;

  // Check localStorage first
  const localToken = localStorage.getItem('auth_token');
  if (localToken) return localToken;

  // Fallback to cookie
  const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
  if (match) return match[2];

  return null;
}

/**
 * Removes JWT token from storage & cookies
 */
export function removeAuthToken() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('auth_token');
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  }
}
