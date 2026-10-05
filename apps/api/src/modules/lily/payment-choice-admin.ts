import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin, requireLilyStaff } from "./admin-security";
import { cookLilyPixConfiguration } from "./cooklily-pix-provider";
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

const adminChoiceSettingsSchema = z.object({
  paymentsEnabled: z.boolean().optional(),
  manualPixEnabled: z.boolean().optional(),
  manualPixInstructions: z.string().trim().max(2000).nullable().optional(),
  mercadoPagoPixEnabled: z.boolean().optional(),
  mercadoPagoCardEnabled: z.boolean().optional(),
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
  return {
    paymentsEnabled: settings.paymentsEnabled,
    manualPixEnabled: settings.manualPixEnabled,
    manualPixInstructions: settings.manualPixInstructions,
    mercadoPagoPixEnabled: settings.mercadoPagoPixEnabled,
    mercadoPagoCardEnabled: settings.mercadoPagoCardEnabled,
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
        mercadoPagoCardEnabled: next.mercadoPagoCardEnabled
      }
    });
    if (input.methods) await saveLilyPaymentMethodSettings(input.methods);

    await auditLilyAdmin(context.user.id, "update", "payment-method-settings", "default", {
      paymentsEnabled: input.paymentsEnabled,
      manualPixEnabled: input.manualPixEnabled,
      manualPixInstructionsChanged: input.manualPixInstructions !== undefined,
      mercadoPagoPixEnabled: input.mercadoPagoPixEnabled,
      mercadoPagoCardEnabled: input.mercadoPagoCardEnabled,
      methods: input.methods
    });
    return adminSettingsPayload();
  });
}
