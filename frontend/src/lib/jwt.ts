// Client-side JWT inspection. This only reads the payload (no signature check): the backend remains the authority,
// this lets the UI skip requests that are certain to be rejected.
interface JwtPayload {
  exp?: number;
}

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64)) as JwtPayload;
  } catch {
    return null;
  }
}

export function isJwtExpired(token: string, skewSeconds = 10): boolean {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp !== "number" || exp * 1000 <= Date.now() + skewSeconds * 1000;
}
