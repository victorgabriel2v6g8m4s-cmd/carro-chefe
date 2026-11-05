const PREFIX = "cooklily:order-token:";
const EDIT_KEY = "cooklily:order-edit";

export function parseOrderAccessLink(value: string): { orderId: string; token: string } | null {
  const [encodedId, expiresAt, signature, ...extra] = value.split("~");
  if (!encodedId || !expiresAt || !signature || extra.length || !/^\d{13}$/.test(expiresAt)
    || !/^[A-Za-z0-9_-]{43}$/.test(signature)) return null;
  try {
    const base64 = encodedId.replace(/-/g, "+").replace(/_/g, "/");
    const bytes = Uint8Array.from(atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")), (char) => char.charCodeAt(0));
    const orderId = new TextDecoder().decode(bytes);
    return orderId && orderId.length <= 120 ? { orderId, token: value } : null;
  } catch {
    return null;
  }
}

export function guestOrderTokenKey(orderId: string) {
  return `${PREFIX}${orderId}`;
}

export function storeGuestOrderToken(orderId: string, token: string) {
  sessionStorage.setItem(guestOrderTokenKey(orderId), token);
}

export function readGuestOrderToken(orderId: string) {
  return sessionStorage.getItem(guestOrderTokenKey(orderId));
}

export function removeGuestOrderToken(orderId: string) {
  sessionStorage.removeItem(guestOrderTokenKey(orderId));
}

export function rememberOrderEdit(orderId: string, token: string) {
  sessionStorage.setItem(EDIT_KEY, JSON.stringify({ orderId, token }));
}

export function readOrderEdit() {
  try {
    const value = JSON.parse(sessionStorage.getItem(EDIT_KEY) ?? "null");
    return typeof value?.orderId === "string" && typeof value?.token === "string"
      ? { orderId: value.orderId, token: value.token }
      : null;
  } catch {
    return null;
  }
}

export function clearOrderEdit() {
  sessionStorage.removeItem(EDIT_KEY);
}

export function consumeOrderAccessLink(orderId: string, token: string, searchParam?: string) {
  storeGuestOrderToken(orderId, token);
  const url = new URL(window.location.href);
  url.pathname = url.pathname.replace(encodeURIComponent(token), encodeURIComponent(orderId));
  if (searchParam && url.searchParams.get(searchParam) === token) url.searchParams.set(searchParam, orderId);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}
