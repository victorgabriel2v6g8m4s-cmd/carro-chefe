const PREFIX = "cooklily:order-token:";

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
