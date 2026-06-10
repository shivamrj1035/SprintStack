import { createServerFn } from "@tanstack/react-start";
import { getRequest, setResponseHeader } from "@tanstack/react-start/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ensurePersonalWorkspace } from "@/server-fns/workspace";

// --- Base64URL Helpers ---
function base64UrlToBytes(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function utf8ToBase64Url(str: string): string {
  const bytes = new TextEncoder().encode(str);
  let binString = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binString += String.fromCharCode(bytes[i]);
  }
  return btoa(binString)
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlToUtf8(base64url: string): string {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// --- JWT Secrets & Key Management ---
function getJWTSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.VITE_JWT_SECRET;
  if (!secret) {
    return "dev-secret-key-please-replace-in-production-12345678";
  }
  return secret;
}

// --- Custom JWT Sessions ---
export async function signSessionToken(payload: {
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
}): Promise<string> {
  const secret = getJWTSecret();
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = utf8ToBase64Url(JSON.stringify(header));
  
  // 30 days expiration
  const exp = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
  const encodedPayload = utf8ToBase64Url(JSON.stringify({ ...payload, exp }));
  
  const tokenInput = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign(
    "HMAC",
    secretKey,
    encoder.encode(tokenInput)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
    
  return `${tokenInput}.${encodedSignature}`;
}

export async function verifySessionToken(token: string): Promise<{
  userId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
} | null> {
  try {
    const secret = getJWTSecret();
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerStr, payloadStr, signatureStr] = parts;
    
    const encoder = new TextEncoder();
    const secretKey = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );
    
    const tokenInput = `${headerStr}.${payloadStr}`;
    const sigBytes = base64UrlToBytes(signatureStr);
    
    const verified = await crypto.subtle.verify(
      "HMAC",
      secretKey,
      sigBytes,
      encoder.encode(tokenInput)
    );
    
    if (!verified) return null;
    
    const payload = JSON.parse(base64UrlToUtf8(payloadStr));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// --- Google ID Token Verification ---
let cachedGoogleCerts: any = null;
let cachedGoogleCertsFetchTime = 0;

async function getGoogleCerts() {
  const now = Date.now();
  if (cachedGoogleCerts && now - cachedGoogleCertsFetchTime < 3600 * 1000) {
    return cachedGoogleCerts;
  }
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!res.ok) throw new Error("Failed to fetch Google public certs");
  cachedGoogleCerts = await res.json();
  cachedGoogleCertsFetchTime = now;
  return cachedGoogleCerts;
}

export interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
  aud: string;
  iss: string;
  exp: number;
}

export async function verifyGoogleIdToken(idToken: string): Promise<GoogleIdTokenPayload> {
  const parts = idToken.split(".");
  if (parts.length !== 3) {
    throw new Error("Invalid JWT token format");
  }

  const [headerB64, payloadB64, signatureB64] = parts;
  const header = JSON.parse(base64UrlToUtf8(headerB64));
  const payload: GoogleIdTokenPayload = JSON.parse(base64UrlToUtf8(payloadB64));

  // 1. Basic checks
  if (payload.iss !== "https://accounts.google.com" && payload.iss !== "accounts.google.com") {
    throw new Error("Invalid issuer");
  }

  const clientId = process.env.VITE_GOOGLE_CLIENT_ID;
  if (clientId && payload.aud !== clientId) {
    throw new Error("Invalid audience");
  }

  if (payload.exp < Math.floor(Date.now() / 1000)) {
    throw new Error("Token expired");
  }

  // 2. Signature verification
  const kid = header.kid;
  if (!kid) throw new Error("Missing kid in header");

  const certs = await getGoogleCerts();
  const jwk = certs.keys.find((key: any) => key.kid === kid);
  if (!jwk) throw new Error("Matching JWK not found for kid");

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["verify"]
  );

  const encoder = new TextEncoder();
  const data = encoder.encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlToBytes(signatureB64);

  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signatureBytes,
    data
  );

  if (!verified) {
    throw new Error("Signature verification failed");
  }

  return payload;
}

// --- Cookie Parser Helper ---
export function parseCookies(cookieHeader: string | null): Record<string, string> {
  if (!cookieHeader) return {};
  return Object.fromEntries(
    cookieHeader.split(";").map((c) => {
      const [key, ...val] = c.trim().split("=");
      return [key, val.join("=")];
    })
  );
}

// --- Server Functions ---
export const loginWithGoogle = createServerFn({ method: "POST" })
  .inputValidator((d: { credential: string }) => d)
  .handler(async ({ data: { credential } }) => {
    try {
      const payload = await verifyGoogleIdToken(credential);
      const email = payload.email.toLowerCase();
      const userId = payload.sub; // Using Google's sub as profiles.id
      const name = payload.name || `${payload.given_name || ""} ${payload.family_name || ""}`.trim() || "Google User";
      const avatarUrl = payload.picture || null;

      // Ensure user profile in database
      const [userProfile] = await db
        .insert(profiles)
        .values({
          id: userId,
          email,
          name,
          avatar_url: avatarUrl,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { email, name, avatar_url: avatarUrl, updated_at: new Date() },
        })
        .returning();

      if (userProfile?.blocked) {
        throw new Error("Your account has been blocked by the administrator.");
      }

      // Ensure personal workspace
      await ensurePersonalWorkspace({
        userId,
        email,
        name,
        avatarUrl,
        isSuperAdmin: email === "srjtheinfinity1035@gmail.com",
      });

      // Sign custom session token
      const sessionToken = await signSessionToken({
        userId,
        email,
        name,
        avatarUrl,
      });

      // Set cookie
      setResponseHeader(
        "Set-Cookie",
        `session=${sessionToken}; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=${30 * 24 * 60 * 60}`
      );

      return { success: true };
    } catch (err: any) {
      console.error("Login with Google error:", err);
      return { success: false, error: err.message };
    }
  });

export const logoutUser = createServerFn({ method: "POST" })
  .handler(async () => {
    setResponseHeader(
      "Set-Cookie",
      `session=; HttpOnly; Path=/; SameSite=Lax; Secure; Max-Age=0`
    );
    return { success: true };
  });

export const getCurrentSession = createServerFn({ method: "GET" })
  .handler(async () => {
    const request = getRequest();
    const cookies = parseCookies(request.headers.get("cookie"));
    const sessionToken = cookies.session;

    if (!sessionToken) return null;
    const session = await verifySessionToken(sessionToken);
    if (!session) return null;

    // Check if user is blocked in the database
    const userProfile = await db.query.profiles.findFirst({
      where: eq(profiles.id, session.userId),
    });

    if (!userProfile || userProfile.blocked) {
      return null;
    }

    return session;
  });
