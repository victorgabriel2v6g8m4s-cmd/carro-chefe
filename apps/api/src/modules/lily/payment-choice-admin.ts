import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { buildStaticPixPayload, cookLilyPixConfiguration } from "./cooklily-pix-provider";
import { getLilyOperationalSettings } from "./fulfillment";
import { mercadoPagoConfiguration } from "./mercado-pago-provider";
import { lilyPaymentMethodAvailability, lilyPixProviderChain } from "./payment-choice-routing";
import {
  getLilyPaymentMethodSettings,
  paymentMethodSettingsPatchSchema,
  saveLilyPaymentMethodSettings,
  type LilyPaymentMethodSetting
} from "./payment-method-rules";
import { lilyPixAutoReconciliationConfiguration } from "./pix-reconciliation";
import { decryptLilySecret, encryptLilySecret } from "./secret-crypto";
import { sicrediPixConfiguration } from "./sicredi-pix-provider";

const adminChoiceSettingsSchema = z.object({
  paymentsEnabled: z.boolean().optional(),
  manualPixEnabled: z.boolean().optional(),
  manualPixInstructions: z.string().trim().max(2000).nullable().optional(),
  mercadoPagoPixEnabled: z.boolean().optional(),
  mercadoPagoCardEnabled: z.boolean().optional(),
  activePixProvider: z.enum(["cooklily_pix", "sicredi_pix"]).optional(),
  sicrediPixKey: z.string().trim().min(1).max(77).nullable().optional(),
  sicrediPixMerchantName: z.string().trim().min(2).max(80).optional(),
  sicrediPixMerchantCity: z.string().trim().min(2).max(60).optional(),
  methods: paymentMethodSettingsPatchSchema.shape.methods.optional()
}).strict();

function mergeMethodSettings(current: LilyPaymentMethodSetting[], updates?: LilyPaymentMethodSetting[]) {
  if (!updates) return current;
  const byMethod = new Map(current.map((row) => [row.method, row]));
  for (const row of updates) byMethod.set(row.method, row);
  return current.map((row) => byMethod.get(row.method)!);
}

async function adminSettingsPayload() {
  const settings = await getLilyOperationalSettings();
  const methods = await getLilyPaymentMethodSettings();
  const mercadoPago = mercadoPagoConfiguration();
  const cookLily = cookLilyPixConfiguration();
  const reconciliation = lilyPixAutoReconciliationConfiguration();
  const sicredi = sicrediPixConfiguration(settings);
  return {
    paymentsEnabled: settings.paymentsEnabled,
    manualPixEnabled: settings.manualPixEnabled,
    manualPixInstructions: settings.manualPixInstructions,
    mercadoPagoPixEnabled: settings.mercadoPagoPixEnabled,
    mercadoPagoCardEnabled: settings.mercadoPagoCardEnabled,
    activePixProvider: settings.activePixProvider,
    sicrediPix: sicredi,
    methods,
    readiness: {
      cookLilyPix: { ...cookLily, reconciliationReady: reconciliation.ready },
      mercadoPago: {
        accessTokenConfigured: mercadoPago.accessTokenConfigured,
        publicKeyConfigured: Boolean(mercadoPago.publicKey),
        webhookSecretConfigured: mercadoPago.webhookSecretConfigured,
        pixReady: mercadoPago.pixReady,
        cardReady: mercadoPago.cardReady
      },
      pixFallbackChain: lilyPixProviderChain(settings)
    }
  };
}

export async function lilyPaymentChoiceAdminRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/admin/payment-options/settings", async (request) => {
    await requireLilyStaff(request);
    return adminSettingsPayload();
  });

  app.get("/api/v1/lily/admin/payment-options/pix-qr", async (request) => {
    await requireLilyStaff(request);
    const input = z.object({ provider: z.enum(["cooklily_pix", "sicredi_pix"]).optional() }).parse(request.query);
    const settings = await getLilyOperationalSettings();
    const provider = input.provider ?? settings.activePixProvider;
    if (provider === "sicredi_pix") {
      const config = sicrediPixConfiguration(settings);
      if (!config.ready) throw new ApiError(409, "Configure o Pix Sicredi antes de gerar o QR da chave.", { code: "LILY_SICREDI_PIX_INCOMPLETE" });
      return { provider, qrCode: buildStaticPixPayload({
        key: decryptLilySecret(settings.sicrediPixKeyEncrypted!, "sicredi-pix-key"),
        merchantName: config.merchantName,
        merchantCity: config.merchantCity
      }) };
    }
    const config = cookLilyPixConfiguration();
    if (!config.ready) throw new ApiError(409, "Pix CookLily não está configurado no servidor.", { code: "LILY_COOKLILY_PIX_NOT_CONFIGURED" });
    return { provider, qrCode: buildStaticPixPayload({
      key: process.env.COOKLILY_PIX_KEY ?? "",
      merchantName: process.env.COOKLILY_PIX_MERCHANT_NAME ?? "",
      merchantCity: process.env.COOKLILY_PIX_MERCHANT_CITY ?? ""
    }) };
  });

  app.patch("/api/v1/lily/admin/payment-options/settings", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = adminChoiceSettingsSchema.parse(request.body);
    const current = await getLilyOperationalSettings();
    const currentMethods = await getLilyPaymentMethodSettings();
    const nextMethods = mergeMethodSettings(currentMethods, input.methods);
    const next = {
      paymentsEnabled: input.paymentsEnabled ?? current.paymentsEnabled,
      manualPixEnabled: input.manualPixEnabled ?? current.manualPixEnabled,
      manualPixInstructions: input.manualPixInstructions === undefined ? current.manualPixInstructions : input.manualPixInstructions,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled ?? current.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled ?? current.mercadoPagoCardEnabled
    };
    const nextPixProvider = input.activePixProvider ?? current.activePixProvider;
    const keyEncrypted = input.sicrediPixKey === undefined
      ? current.sicrediPixKeyEncrypted
      : input.sicrediPixKey === null ? null : encryptLilySecret(input.sicrediPixKey, "sicredi-pix-key");
    const nextSicredi = sicrediPixConfiguration({
      sicrediPixKeyEncrypted: keyEncrypted,
      sicrediPixMerchantName: input.sicrediPixMerchantName ?? current.sicrediPixMerchantName,
      sicrediPixMerchantCity: input.sicrediPixMerchantCity ?? current.sicrediPixMerchantCity
    });
    if (nextPixProvider === "sicredi_pix" && !nextSicredi.ready) {
      throw new ApiError(400, "Configure chave, nome do recebedor e cidade Sicredi antes de ativar esse Pix.", {
        code: "LILY_SICREDI_PIX_INCOMPLETE"
      });
    }

    if (next.manualPixEnabled && !next.manualPixInstructions?.trim()) {
      throw new ApiError(400, "Informe as instruções antes de habilitar o fallback Pix manual.", {
        code: "LILY_MANUAL_PIX_INSTRUCTIONS_REQUIRED"
      });
    }

    const simulated = { ...current, ...next };
    if (next.paymentsEnabled && nextMethods.every((rule) => !lilyPaymentMethodAvailability(simulated, rule).available)) {
      throw new ApiError(400, "Nenhum método habilitado possui provider pronto para uso.", {
        code: "LILY_PAYMENT_CONFIGURATION_REQUIRED"
      });
    }

    await lilyPrisma.lilyOperationalSettings.update({
      where: { id: "default" },
      data: {
        paymentsEnabled: next.paymentsEnabled,
        manualPixEnabled: next.manualPixEnabled,
        manualPixInstructions: next.manualPixInstructions?.trim() || null,
        mercadoPagoPixEnabled: next.mercadoPagoPixEnabled,
        mercadoPagoCardEnabled: next.mercadoPagoCardEnabled,
        activePixProvider: nextPixProvider,
        sicrediPixKeyEncrypted: keyEncrypted,
        sicrediPixMerchantName: nextSicredi.merchantName || null,
        sicrediPixMerchantCity: nextSicredi.merchantCity || null
      }
    });
    if (input.methods) await saveLilyPaymentMethodSettings(input.methods);

    await auditLilyAdmin(context.user.id, "update", "payment-method-settings", "default", {
      paymentsEnabled: input.paymentsEnabled,
      manualPixEnabled: input.manualPixEnabled,
      manualPixInstructionsChanged: input.manualPixInstructions !== undefined,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled,
      activePixProvider: input.activePixProvider,
      sicrediPixKeyChanged: input.sicrediPixKey !== undefined,
      sicrediPixMerchantNameChanged: input.sicrediPixMerchantName !== undefined,
      sicrediPixMerchantCityChanged: input.sicrediPixMerchantCity !== undefined,
      methods: input.methods
    });
    return adminSettingsPayload();
  });
}
