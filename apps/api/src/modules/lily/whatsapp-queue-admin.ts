import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { auditLilyAdmin, requireLilyAdmin } from "./admin-security";

export function lilyWhatsAppQueueAdminRoutes(app: FastifyInstance) {
  app.post("/api/v1/lily/admin/whatsapp/skip", async (request) => {
    const context = await requireLilyAdmin(request, true);
    const input = z.object({ notificationId: z.string().trim().min(1).max(120) }).strict().parse(request.body ?? {});
    const notification = await lilyPrisma.lilyWhatsAppNotification.findUnique({ where: { id: input.notificationId } });
    if (!notification) throw new ApiError(404, "Notificação não encontrada.", { code: "WHATSAPP_NOTIFICATION_NOT_FOUND" });

    const skipped = await lilyPrisma.lilyWhatsAppNotification.updateMany({
      where: { id: notification.id, status: "pending" },
      data: {
        status: "skipped",
        lastErrorCode: "ADMIN_SKIPPED",
        lastErrorMessage: "Admin descartou esta notificação pendente sem alterar o consentimento do cliente."
      }
    });
    if (skipped.count !== 1) {
      throw new ApiError(409, "Somente notificações ainda pendentes podem ser descartadas.", {
        code: "WHATSAPP_NOTIFICATION_NOT_PENDING"
      });
    }

    await auditLilyAdmin(context.user.id, "whatsapp.notification.skip", "whatsapp-notification", notification.id, {
      orderId: notification.orderId,
      stage: notification.stage
    });
    return { skipped: 1, consentChanged: false };
  });
}
