import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { ApiError } from "../../lib/errors";

type ResolvedAddress = { address: string };
export type AddressResolver = (hostname: string) => Promise<readonly ResolvedAddress[]>;

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function ipv4Parts(address: string) {
  const parts = address.split(".").map(Number);
  return parts.length === 4 && parts.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) ? parts : null;
}

function isBlockedIpv4(address: string) {
  const parts = ipv4Parts(address);
  if (!parts) return true;
  const [first, second] = parts;
  return first === 0 || first === 10 || first === 127 || first >= 224
    || (first === 100 && second >= 64 && second <= 127)
    || (first === 169 && second === 254)
    || (first === 172 && second >= 16 && second <= 31)
    || (first === 192 && [0, 168].includes(second))
    || (first === 198 && [18, 19, 51].includes(second))
    || (first === 203 && second === 0);
}

export function isPublicAddress(input: string) {
  const address = input.toLowerCase().replace(/^\[|\]$/g, "");
  const version = isIP(address);
  if (version === 4) return !isBlockedIpv4(address);
  if (version !== 6) return false;
  const mappedIpv4 = address.match(/::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
  if (mappedIpv4) return !isBlockedIpv4(mappedIpv4);
  return address !== "::" && address !== "::1"
    && !address.startsWith("fc") && !address.startsWith("fd")
    && !/^fe[89ab]/.test(address) && !address.startsWith("ff")
    && !address.startsWith("2001:db8:");
}

const systemResolver: AddressResolver = async (hostname) => dns.lookup(hostname, { all: true, verbatim: true });

export async function validateWebhookDestination(input: string, resolveAddresses: AddressResolver = systemResolver) {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    throw new ApiError(400, "URL de webhook inválida.", { code: "WEBHOOK_URL_INVALID" });
  }
  if (url.protocol !== "https:") throw new ApiError(400, "Webhooks de saída exigem HTTPS.", { code: "WEBHOOK_HTTPS_REQUIRED" });
  if (url.username || url.password) throw new ApiError(400, "A URL do webhook não pode conter credenciais.", { code: "WEBHOOK_CREDENTIALS_FORBIDDEN" });
  const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new ApiError(400, "O destino do webhook não pode apontar para a rede local.", { code: "WEBHOOK_LOCAL_DESTINATION" });
  }
  const literalVersion = isIP(hostname);
  const addresses = literalVersion ? [{ address: hostname }] : await resolveAddresses(hostname).catch(() => []);
  if (!addresses.length) throw new ApiError(400, "Não foi possível resolver o destino do webhook.", { code: "WEBHOOK_DNS_UNRESOLVED" });
  if (addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new ApiError(400, "O destino do webhook resolve para um endereço não público.", { code: "WEBHOOK_PRIVATE_ADDRESS" });
  }
  url.hash = "";
  return url.toString();
}
