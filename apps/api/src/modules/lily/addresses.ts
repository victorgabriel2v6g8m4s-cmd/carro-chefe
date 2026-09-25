import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { lilyPrisma } from "@lily-acai/database";
import { ApiError } from "../../lib/errors";
import { requireLilyCsrf, requireLilySession } from "./auth";

const nullableShortText = (max: number) => z.string().trim().max(max).nullable().optional();

export const lilyAddressInputSchema = z.object({
  label: nullableShortText(60),
  postalCode: z.string().trim().min(8).max(12),
  street: z.string().trim().min(2).max(180),
  number: z.string().trim().min(1).max(40),
  complement: nullableShortText(120),
  neighborhood: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().length(2),
  reference: nullableShortText(240)
}).strict();

const addressCreateSchema = lilyAddressInputSchema.extend({
  isDefault: z.boolean().default(false)
}).strict();

const addressPatchSchema = addressCreateSchema.partial().strict();

export type LilyAddressInput = z.infer<typeof lilyAddressInputSchema>;

function cleanText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeLilyAddress(input: LilyAddressInput) {
  const postalCode = input.postalCode.replace(/\D/g, "");
  if (postalCode.length !== 8) {
    throw new ApiError(400, "CEP inválido.", { code: "LILY_INVALID_POSTAL_CODE" });
  }
  return {
    label: input.label ? cleanText(input.label) : null,
    postalCode,
    street: cleanText(input.street),
    number: cleanText(input.number),
    complement: input.complement ? cleanText(input.complement) : null,
    neighborhood: cleanText(input.neighborhood),
    city: cleanText(input.city),
    state: input.state.trim().toUpperCase(),
    reference: input.reference ? cleanText(input.reference) : null
  };
}

export async function lilyAddressRoutes(app: FastifyInstance) {
  app.get("/api/v1/lily/customer/addresses", async (request) => {
    const context = await requireLilySession(request);
    return {
      addresses: await lilyPrisma.lilyAddress.findMany({
        where: { userId: context.user.id },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }]
      })
    };
  });

  app.post("/api/v1/lily/customer/addresses", async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const input = addressCreateSchema.parse(request.body);
    const normalized = normalizeLilyAddress(input);
    const count = await lilyPrisma.lilyAddress.count({ where: { userId: context.user.id } });
    const shouldDefault = input.isDefault || count === 0;
    const created = await lilyPrisma.$transaction(async (tx) => {
      if (shouldDefault) {
        await tx.lilyAddress.updateMany({ where: { userId: context.user.id }, data: { isDefault: false } });
      }
      return tx.lilyAddress.create({ data: { ...normalized, userId: context.user.id, isDefault: shouldDefault } });
    });
    return reply.code(201).send(created);
  });

  app.patch("/api/v1/lily/customer/addresses/:id", async (request) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const input = addressPatchSchema.parse(request.body);
    const existing = await lilyPrisma.lilyAddress.findFirst({ where: { id, userId: context.user.id } });
    if (!existing) throw new ApiError(404, "Endereço não encontrado.");

    const normalized = normalizeLilyAddress(lilyAddressInputSchema.parse({
      label: input.label === undefined ? existing.label : input.label,
      postalCode: input.postalCode ?? existing.postalCode,
      street: input.street ?? existing.street,
      number: input.number ?? existing.number,
      complement: input.complement === undefined ? existing.complement : input.complement,
      neighborhood: input.neighborhood ?? existing.neighborhood,
      city: input.city ?? existing.city,
      state: input.state ?? existing.state,
      reference: input.reference === undefined ? existing.reference : input.reference
    }));

    return lilyPrisma.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.lilyAddress.updateMany({ where: { userId: context.user.id }, data: { isDefault: false } });
      }
      return tx.lilyAddress.update({
        where: { id },
        data: { ...normalized, ...(input.isDefault === undefined ? {} : { isDefault: input.isDefault }) }
      });
    });
  });

  app.delete("/api/v1/lily/customer/addresses/:id", async (request, reply) => {
    const context = await requireLilySession(request);
    requireLilyCsrf(request, context);
    const { id } = z.object({ id: z.string().trim().min(1).max(120) }).parse(request.params);
    const existing = await lilyPrisma.lilyAddress.findFirst({ where: { id, userId: context.user.id } });
    if (!existing) throw new ApiError(404, "Endereço não encontrado.");

    await lilyPrisma.$transaction(async (tx) => {
      await tx.lilyAddress.delete({ where: { id } });
      if (existing.isDefault) {
        const next = await tx.lilyAddress.findFirst({ where: { userId: context.user.id }, orderBy: { createdAt: "asc" } });
        if (next) await tx.lilyAddress.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    });
    return reply.code(204).send();
  });
}
