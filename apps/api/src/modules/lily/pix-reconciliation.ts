import crypto from "node:crypto";
import https from "node:https";
import { existsSync, readFileSync } from "node:fs";
import type { FastifyInstance } from "fastify";
import type { Prisma, PrismaClient } from "@lily-acai/database";
import { lilyPrisma } from "@lily-acai/database";
import { z } from "zod";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { enqueueLilyWhatsAppStage } from "./whatsapp";

type DbClient = Prisma.TransactionClient | PrismaClient;

const SOURCE = "pix_api_v2";
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const DEFAULT_POLL_INTERVAL_MS = 60_000;
const DEFAULT_TIMEOUT_MS = 10_000;
const DEFAULT_LOOKBACK_MINUTES = 60;
const OVERLAP_MS = 2 * 60_000;

type PixReceived = {
  endToEndId: string;
  txid: string | null;
  amountCents: number;
  occurredAt: Date;
  payloadHash: string;
};

type JsonRequestOptions = {
  method: "GET" | "POST";
  headers?: Record<string, string>;
  body?: string;
};

let tokenCache: { accessToken: string; expiresAt: number } | null = null;

function env(name: string) {
  return process.env[name]?.trim() || "";
}

function safeErrorMessage(error: unknown) {
  return (error instanceof Error ? error.message : String(error ?? "erro desconhecido"))
    .replace(/Basic\s+[^\s]+/gi, "Basic [redacted]")
    .replace(/Bearer\s+[^\s]+/gi, "Bearer [redacted]")
    .slice(0, 300);
}

function centsFromDecimal(input: unknown) {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const value = String(input).trim();
  if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ""] = value.split(".");
  const cents = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return Number.isSafeInteger(cents) && cents > 0 ? cents : null;
}

function validHttpsUrl(input: string) {
  try {
    const url = new URL(input);
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function configuredNumber(name: string, fallback: number, min: number, max: number) {
  const value = Number(process.env[name] || fallback);
  return Number.isFinite(value) ? Math.min(max, Math.max(min, Math.round(value))) : fallback;
}

export function lilyPixAutoReconciliationConfiguration() {
  const provider = env("COOKLILY_PIX_RECONCILIATION_PROVIDER") || "disabled";
  const apiBaseUrl = env("COOKLILY_PIX_API_BASE_URL");
  const oauthUrl = env("COOKLILY_PIX_API_OAUTH_URL")
    || (apiBaseUrl ? `${apiBaseUrl.replace(/\/+$/, "")}/oauth/token` : "");
  const receivedPath = env("COOKLILY_PIX_API_RECEIVED_PATH") || "/v2/pix";
  const pfxPath = env("COOKLILY_PIX_API_PFX_PATH");

  const supported = provider === "disabled" || provider === SOURCE;
  const apiBaseUrlValid = Boolean(validHttpsUrl(apiBaseUrl));
  const oauthUrlValid = Boolean(validHttpsUrl(oauthUrl));
  const clientIdConfigured = Boolean(env("COOKLILY_PIX_API_CLIENT_ID"));
  const clientSecretConfigured = Boolean(env("COOKLILY_PIX_API_CLIENT_SECRET"));
  const pfxConfigured = Boolean(pfxPath && existsSync(pfxPath));
  const receivedPathValid = /^\/[A-Za-z0-9._~!$&'()*+,;=:@%/-]+$/.test(receivedPath);

  return {
    provider,
    supported,
    apiBaseUrlValid,
    oauthUrlValid,
    clientIdConfigured,
    clientSecretConfigured,
    pfxConfigured,
    receivedPathValid,
    ready: provider === SOURCE
      && supported
      && apiBaseUrlValid
      && oauthUrlValid
      && clientIdConfigured
      && clientSecretConfigured
      && pfxConfigured
      && receivedPathValid,
    pollIntervalMs: configuredNumber(
      "COOKLILY_PIX_RECONCILIATION_POLL_INTERVAL_MS",
      DEFAULT_POLL_INTERVAL_MS,
      30_000,
      15 * 60_000
    ),
    timeoutMs: configuredNumber(
      "COOKLILY_PIX_API_TIMEOUT_MS",
      DEFAULT_TIMEOUT_MS,
      2_000,
      30_000
    ),
    initialLookbackMinutes: configuredNumber(
      "COOKLILY_PIX_RECONCILIATION_LOOKBACK_MINUTES",
      DEFAULT_LOOKBACK_MINUTES,
      5,
      24 * 60
    )
  };
}

function mtlsJsonRequest(url: URL, options: JsonRequestOptions) {
  const pfxPath = env("COOKLILY_PIX_API_PFX_PATH");
  const pfx = readFileSync(pfxPath);
  const passphrase = process.env.COOKLILY_PIX_API_PFX_PASSPHRASE || undefined;
  const timeoutMs = lilyPixAutoReconciliationConfiguration().timeoutMs;

  return new Promise<any>((resolve, reject) => {
    const request = https.request(url, {
      method: options.method,
      pfx,
      passphrase,
      minVersion: "TLSv1.2",
      rejectUnauthorized: true,
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "identity",
        ...(options.headers ?? {}),
        ...(options.body ? { "Content-Length": String(Buffer.byteLength(options.body)) } : {})
      }
    }, (response) => {
      const chunks: Buffer[] = [];
      let bytes = 0;

      response.on("data", (chunk: Buffer) => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) {
          request.destroy(new Error("Resposta Pix API excedeu o limite de tamanho."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => {
        const raw = Buffer.concat(chunks).toString("utf8");
        let body: any = {};
        try {
          body = raw ? JSON.parse(raw) : {};
        } catch {
          reject(new Error("Pix API retornou JSON inválido."));
          return;
        }
        const status = response.statusCode ?? 0;
        if (status < 200 || status >= 300) {
          const error = new Error(`Pix API retornou HTTP ${status}.`);
          (error as Error & { code?: string }).code = `HTTP_${status}`;
          reject(error);
          return;
        }
        resolve(body);
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error("Timeout na Pix API."));
    });
    request.on("error", reject);
    if (options.body) request.write(options.body);
    request.end();
  });
}

async function accessToken() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt - 30_000 > now) return tokenCache.accessToken;

  const config = lilyPixAutoReconciliationConfiguration();
  if (!config.ready) throw new Error("Conciliação Pix automática não está configurada.");

  const oauthUrl = new URL(env("COOKLILY_PIX_API_OAUTH_URL")
    || `${env("COOKLILY_PIX_API_BASE_URL").replace(/\/+$/, "")}/oauth/token`);
  const basic = Buffer.from(
    `${env("COOKLILY_PIX_API_CLIENT_ID")}:${env("COOKLILY_PIX_API_CLIENT_SECRET")}`
  ).toString("base64");
  const body = JSON.stringify({ grant_type: "client_credentials" });

  const response = await mtlsJsonRequest(oauthUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/json"
    },
    body
  });

  if (typeof response?.access_token !== "string" || !response.access_token) {
    throw new Error("Pix API não retornou access_token.");
  }
  const expiresIn = Number(response.expires_in);
  tokenCache = {
    accessToken: response.access_token,
    expiresAt: now + (Number.isFinite(expiresIn) ? Math.max(60, expiresIn) : 300) * 1000
  };
  return tokenCache.accessToken;
}

export function parsePixApiV2Received(input: unknown): PixReceived[] {
  const root = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const list = Array.isArray(root.pix) ? root.pix : [];

  return list.flatMap((row): PixReceived[] => {
    if (!row || typeof row !== "object") return [];
    const value = row as Record<string, unknown>;
    const endToEndId = typeof value.endToEndId === "string" ? value.endToEndId.trim() : "";
    const txid = typeof value.txid === "string" && value.txid.trim() ? value.txid.trim() : null;
    const amountCents = centsFromDecimal(value.valor);
    const occurredAt = typeof value.horario === "string" ? new Date(value.horario) : null;
    if (!/^E[A-Za-z0-9]{20,40}$/.test(endToEndId)
      || amountCents === null
      || !occurredAt
      || Number.isNaN(occurredAt.getTime())) {
      return [];
    }

    const canonical = JSON.stringify({
      endToEndId,
      txid,
      amountCents,
      occurredAt: occurredAt.toISOString()
    });
    return [{
      endToEndId,
      txid,
      amountCents,
      occurredAt,
      payloadHash: crypto.createHash("sha256").update(canonical).digest("hex")
    }];
  });
}

async function fetchReceivedPixWindow(start: Date, end: Date) {
  const config = lilyPixAutoReconciliationConfiguration();
  if (!config.ready) return [] as PixReceived[];
  const token = await accessToken();
  const base = env("COOKLILY_PIX_API_BASE_URL").replace(/\/+$/, "");
  const path = env("COOKLILY_PIX_API_RECEIVED_PATH") || "/v2/pix";
  const all: PixReceived[] = [];

  for (let page = 0; page < 20; page += 1) {
    const url = new URL(`${base}${path}`);
    url.searchParams.set("inicio", start.toISOString());
    url.searchParams.set("fim", end.toISOString());
    url.searchParams.set("paginacao.paginaAtual", String(page));
    url.searchParams.set("paginacao.itensPorPagina", "100");

    const body = await mtlsJsonRequest(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}` }
    });
    all.push(...parsePixApiV2Received(body));

    const pages = Number(body?.parametros?.paginacao?.quantidadeDePaginas);
    if (!Number.isFinite(pages) || page + 1 >= pages) break;
  }

  return all;
}

async function insertSettlement(
  db: DbClient,
  input: PixReceived & {
    source: string;
    matchStatus: string;
    paymentId?: string | null;
    matchedAt?: Date | null;
  }
) {
  return db.lilyPixSettlement.create({
    data: {
      source: input.source,
      providerEventId: `${input.source}:${input.endToEndId}`,
      endToEndId: input.endToEndId,
      txid: input.txid,
      amountCents: input.amountCents,
      occurredAt: input.occurredAt,
      payloadHash: input.payloadHash,
      matchStatus: input.matchStatus,
      paymentId: input.paymentId ?? null,
      matchedAt: input.matchedAt ?? null
    }
  });
}

export async function reconcileReceivedPix(
  input: PixReceived,
  source = SOURCE
) {
  const providerEventId = `${source}:${input.endToEndId}`;
  const existing = await lilyPrisma.lilyPixSettlement.findUnique({ where: { providerEventId } });
  if (existing) return existing;

  if (!input.txid) {
    return insertSettlement(lilyPrisma, { ...input, source, matchStatus: "no_txid" });
  }

  const candidates = await lilyPrisma.lilyPayment.findMany({
    where: {
      provider: "cooklily_pix",
      method: "pix",
      providerReference: input.txid
    },
    include: { order: true },
    take: 2
  });

  if (candidates.length === 0) {
    return insertSettlement(lilyPrisma, { ...input, source, matchStatus: "unmatched" });
  }
  if (candidates.length > 1) {
    return insertSettlement(lilyPrisma, { ...input, source, matchStatus: "ambiguous" });
  }

  const payment = candidates[0]!;
  if (payment.amountCents !== input.amountCents) {
    return lilyPrisma.$transaction(async (tx) => {
      const settlement = await insertSettlement(tx, {
        ...input,
        source,
        matchStatus: "discrepant",
        paymentId: payment.id
      });
      await tx.lilyPaymentReconciliation.create({
        data: {
          paymentId: payment.id,
          expectedGrossCents: payment.amountCents,
          reportedGrossCents: input.amountCents,
          feeCents: 0,
          netCents: input.amountCents,
          discrepancyCents: input.amountCents - payment.amountCents,
          status: "discrepant",
          providerReference: input.endToEndId,
          note: "Pix recebido com txid correspondente, mas valor divergente.",
          reconciledBy: `provider:${source}`
        }
      });
      return settlement;
    });
  }

  if (payment.status !== "pending" || payment.order.status !== "awaiting_payment") {
    return insertSettlement(lilyPrisma, {
      ...input,
      source,
      matchStatus: payment.status === "approved" ? "duplicate_payment" : "late_payment",
      paymentId: payment.id
    });
  }

  const now = new Date();
  try {
    return await lilyPrisma.$transaction(async (tx) => {
      const current = await tx.lilyPayment.findUnique({
        where: { id: payment.id },
        include: { order: true }
      });
      if (!current) throw new Error("Pagamento não encontrado durante conciliação.");

      if (current.status !== "pending" || current.order.status !== "awaiting_payment") {
        return insertSettlement(tx, {
          ...input,
          source,
          matchStatus: current.status === "approved" ? "duplicate_payment" : "late_payment",
          paymentId: current.id
        });
      }

      const updated = await tx.lilyPayment.updateMany({
        where: { id: current.id, status: "pending" },
        data: {
          status: "approved",
          approvedAt: now
        }
      });
      if (updated.count !== 1) {
        return insertSettlement(tx, {
          ...input,
          source,
          matchStatus: "race_lost",
          paymentId: current.id
        });
      }

      await tx.lilyPaymentEvent.create({
        data: {
          paymentId: current.id,
          source: `provider:${source}`,
          eventType: "payment.approved",
          providerEventId,
          fromStatus: "pending",
          toStatus: "approved",
          payloadHash: input.payloadHash,
          payloadJson: JSON.stringify({
            txid: input.txid,
            endToEndId: input.endToEndId,
            amountCents: input.amountCents,
            occurredAt: input.occurredAt.toISOString()
          })
        }
      });

      await tx.lilyPaymentReconciliation.create({
        data: {
          paymentId: current.id,
          expectedGrossCents: current.amountCents,
          reportedGrossCents: input.amountCents,
          feeCents: 0,
          netCents: input.amountCents,
          discrepancyCents: 0,
          status: "matched",
          providerReference: input.endToEndId,
          note: "Conciliação automática por Pix recebido; tarifas bancárias não são inferidas deste evento.",
          reconciledBy: `provider:${source}`
        }
      });

      await tx.lilyOrder.update({
        where: { id: current.orderId },
        data: {
          status: "paid",
          paidAt: current.order.paidAt ?? input.occurredAt
        }
      });
      await tx.lilyOrderStatusEvent.create({
        data: {
          orderId: current.orderId,
          fromStatus: "awaiting_payment",
          toStatus: "paid",
          actor: `provider:${source}`,
          createdAt: now
        }
      });
      await enqueueLilyWhatsAppStage(tx, {
        orderId: current.orderId,
        optedIn: current.order.whatsappUpdatesOptIn,
        stage: "payment_confirmed",
        at: now
      });

      return insertSettlement(tx, {
        ...input,
        source,
        matchStatus: "matched",
        paymentId: current.id,
        matchedAt: now
      });
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      const raced = await lilyPrisma.lilyPixSettlement.findUnique({ where: { providerEventId } });
      if (raced) return raced;
    }
    throw error;
  }
}

export async function runPixAutoReconciliation() {
  const config = lilyPixAutoReconciliationConfiguration();
  const attemptAt = new Date();
  if (!config.ready) {
    return { ready: false, received: 0, matched: 0, discrepant: 0, unmatched: 0 };
  }

  const state = await lilyPrisma.lilyPixReconciliationState.upsert({
    where: { source: SOURCE },
    update: { lastAttemptAt: attemptAt },
    create: { source: SOURCE, lastAttemptAt: attemptAt }
  });

  const start = state.lastSuccessfulAt
    ? new Date(state.lastSuccessfulAt.getTime() - OVERLAP_MS)
    : new Date(attemptAt.getTime() - config.initialLookbackMinutes * 60_000);

  try {
    const received = await fetchReceivedPixWindow(start, attemptAt);
    let matched = 0;
    let discrepant = 0;
    let unmatched = 0;

    for (const pix of received) {
      const row = await reconcileReceivedPix(pix);
      if (row.matchStatus === "matched") matched += 1;
      else if (row.matchStatus === "discrepant") discrepant += 1;
      else if (["unmatched", "no_txid", "ambiguous"].includes(row.matchStatus)) unmatched += 1;
    }

    await lilyPrisma.lilyPixReconciliationState.update({
      where: { source: SOURCE },
      data: {
        lastSuccessfulAt: attemptAt,
        lastErrorCode: null,
        lastErrorMessage: null
      }
    });

    return { ready: true, received: received.length, matched, discrepant, unmatched };
  } catch (error) {
    await lilyPrisma.lilyPixReconciliationState.update({
      where: { source: SOURCE },
      data: {
        lastErrorCode: typeof (error as any)?.code === "string"
          ? String((error as any).code).slice(0, 80)
          : "POLL_FAILED",
        lastErrorMessage: safeErrorMessage(error)
      }
    });
    throw error;
  }
}

export function startLilyPixReconciliationWorker(log?: {
  info?: (value: unknown) => void;
  error?: (value: unknown) => void;
}) {
  let running = false;
  let stopped = false;

  const tick = async () => {
    if (running || stopped || !lilyPixAutoReconciliationConfiguration().ready) return;
    running = true;
    try {
      const result = await runPixAutoReconciliation();
      if (result.received > 0) {
        log?.info?.({
          event: "lily.pix_reconciliation.worker",
          received: result.received,
          matched: result.matched,
          discrepant: result.discrepant,
          unmatched: result.unmatched
        });
      }
    } catch (error) {
      log?.error?.({
        event: "lily.pix_reconciliation.worker_error",
        message: safeErrorMessage(error)
      });
    } finally {
      running = false;
    }
  };

  const intervalMs = lilyPixAutoReconciliationConfiguration().pollIntervalMs;
  const startup = setTimeout(() => { void tick(); }, 2_000);
  const interval = setInterval(() => { void tick(); }, intervalMs);
  startup.unref?.();
  interval.unref?.();

  return () => {
    stopped = true;
    clearTimeout(startup);
    clearInterval(interval);
  };
}

export async function lilyPixReconciliationRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/pix-reconciliation/settings", async (request) => {
    await requireLilyStaff(request);
    const config = lilyPixAutoReconciliationConfiguration();
    const state = await lilyPrisma.lilyPixReconciliationState.findUnique({ where: { source: SOURCE } });
    const [unmatched, discrepant, matched] = await Promise.all([
      lilyPrisma.lilyPixSettlement.count({ where: { matchStatus: { in: ["unmatched", "no_txid", "ambiguous"] } } }),
      lilyPrisma.lilyPixSettlement.count({ where: { matchStatus: "discrepant" } }),
      lilyPrisma.lilyPixSettlement.count({ where: { matchStatus: "matched" } })
    ]);

    return {
      provider: config.provider,
      ready: config.ready,
      supported: config.supported,
      credentials: {
        apiBaseUrlValid: config.apiBaseUrlValid,
        oauthUrlValid: config.oauthUrlValid,
        clientIdConfigured: config.clientIdConfigured,
        clientSecretConfigured: config.clientSecretConfigured,
        pfxConfigured: config.pfxConfigured,
        receivedPathValid: config.receivedPathValid
      },
      state: state ? {
        lastSuccessfulAt: state.lastSuccessfulAt,
        lastAttemptAt: state.lastAttemptAt,
        lastErrorCode: state.lastErrorCode,
        lastErrorMessage: state.lastErrorMessage
      } : null,
      settlements: { unmatched, discrepant, matched }
    };
  });

  app.get("/api/v1/lily/admin/pix-reconciliation/settlements", async (request) => {
    await requireLilyStaff(request);
    const query = z.object({
      status: z.string().trim().max(40).optional(),
      limit: z.coerce.number().int().min(1).max(200).default(100)
    }).parse(request.query);

    const rows = await lilyPrisma.lilyPixSettlement.findMany({
      where: query.status ? { matchStatus: query.status } : {},
      include: {
        payment: {
          select: {
            id: true,
            status: true,
            amountCents: true,
            order: { select: { orderNumber: true } }
          }
        }
      },
      orderBy: { occurredAt: "desc" },
      take: query.limit
    });

    return {
      settlements: rows.map((row) => ({
        id: row.id,
        source: row.source,
        endToEndId: row.endToEndId,
        txid: row.txid,
        amountCents: row.amountCents,
        occurredAt: row.occurredAt,
        matchStatus: row.matchStatus,
        matchedAt: row.matchedAt,
        payment: row.payment ? {
          id: row.payment.id,
          status: row.payment.status,
          amountCents: row.payment.amountCents,
          orderNumber: row.payment.order.orderNumber
        } : null
      }))
    };
  });

  app.post("/api/v1/lily/admin/pix-reconciliation/run", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const result = await runPixAutoReconciliation();
    await auditLilyAdmin(context.user.id, "pix.reconciliation.run", "pix-reconciliation", SOURCE, result);
    return result;
  });
}
