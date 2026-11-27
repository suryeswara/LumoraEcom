// Small, dependency-free helpers for the JWT the backend issues.
// NOTE: decoding is only for UX (show name, know when the session ends). The browser can NOT verify the
// signature (it has no secret): the server verifies it on every request and is the only authority.

const STORAGE_KEY = "auth";

export function decodeJwt(token) {
  try {
    const part = token.split(".")[1];
    const b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
    const bytes = Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

export function isTokenExpired(token, skewSeconds = 5) {
  const payload = decodeJwt(token);
  if (!payload || typeof payload.exp !== "number") return true;
  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function loadAuth() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveAuth(auth) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(auth));
}

export function clearAuth() {
  localStorage.removeItem(STORAGE_KEY);
}

export function getToken() {
  return loadAuth()?.token ?? null;
}
