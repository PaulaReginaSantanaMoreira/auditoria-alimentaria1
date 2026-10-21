import { SignJWT } from "jose/jwt/sign";
import { jwtVerify } from "jose/jwt/verify";
import { UserRole, AuditAccessScope } from "@/domain/security/roles-and-permissions";

export interface SessionTokenPayload {
  sub: string; // User ID
  email: string;
  role: UserRole | string;
  tenantId?: string;
  scope?: AuditAccessScope | string;
  [key: string]: any;
}

const TOKEN_EXPIRATION_SECONDS = 24 * 60 * 60; // 1 dia (24 horas = 86400s)
const ISSUER = "bioaudit-pro";
const AUDIENCE = "bioaudit-client";

async function getJwtCryptoKey(): Promise<CryptoKey> {
  const secret =
    process.env.SUPABASE_JWT_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "bioaudit-pro-enterprise-secure-jwt-secret-key-min-32-chars-2026";

  const rawKey = new Uint8Array(Buffer.from(secret, "utf-8"));

  return await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Emite um JWT criptograficamente assinado com algoritmo HS256 e expiração estrita de 1 dia (24h).
 */
export async function signSessionToken(payload: SessionTokenPayload): Promise<{
  token: string;
  expiresIn: number;
  expiresAt: number;
}> {
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + TOKEN_EXPIRATION_SECONDS;
  const secretKey = await getJwtCryptoKey();

  const token = await new SignJWT({
    email: payload.email,
    role: payload.role,
    tenantId: payload.tenantId,
    scope: payload.scope || (payload.role === "PLATFORM_SUPERADMIN" ? "CONFIDENTIAL" : "TENANT"),
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(payload.sub)
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt(now)
    .setExpirationTime(expiresAt)
    .sign(secretKey);

  return {
    token,
    expiresIn: TOKEN_EXPIRATION_SECONDS,
    expiresAt: expiresAt * 1000, // em milissegundos
  };
}

/**
 * Verifica a assinatura criptográfica e a expiração do JWT.
 * Retorna o payload decodificado ou lança erro caso inválido ou expirado.
 */
export async function verifySessionToken(token: string): Promise<SessionTokenPayload> {
  const secretKey = await getJwtCryptoKey();

  const { payload } = await jwtVerify(token, secretKey, {
    issuer: ISSUER,
    audience: AUDIENCE,
  });

  return {
    sub: payload.sub as string,
    email: payload.email as string,
    role: payload.role as string,
    tenantId: payload.tenantId as string | undefined,
    exp: payload.exp,
    iat: payload.iat,
  };
}
