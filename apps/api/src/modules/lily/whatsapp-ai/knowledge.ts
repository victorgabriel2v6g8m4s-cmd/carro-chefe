import { createHash } from "node:crypto";
import { lilyPrisma } from "@lily-acai/database";
import { createKnowledgeEmbedding } from "./providers";

const MAX_RETRIEVAL_ARTICLES = 3;
const MINIMUM_SIMILARITY = 0.22;

function articleText(article: { title: string; body: string }) {
  return `${article.title.trim()}\n${article.body.trim()}`.normalize("NFKC");
}

function cosineSimilarity(a: number[], b: number[]) {
  if (!a.length || a.length !== b.length) return 0;
  let dot = 0;
  let magnitudeA = 0;
  let magnitudeB = 0;
  for (let index = 0; index < a.length; index += 1) {
    const left = a[index] ?? 0;
    const right = b[index] ?? 0;
    dot += left * right;
    magnitudeA += left * left;
    magnitudeB += right * right;
  }
  if (!magnitudeA || !magnitudeB) return 0;
  return dot / Math.sqrt(magnitudeA * magnitudeB);
}

export async function retrievePublicWhatsAppKnowledge(query: string) {
  const queryEmbedding = await createKnowledgeEmbedding({ text: query, source: "ephemeral_query" });
  const articles = await lilyPrisma.lilyWhatsAppKnowledgeArticle.findMany({
    where: { status: "published" },
    select: { id: true, slug: true, title: true, body: true, revision: true },
    orderBy: { updatedAt: "desc" },
    take: 100
  });
  const results = [];
  for (const article of articles) {
    const text = articleText(article);
    const contentHash = createHash("sha256").update(text).digest("hex");
    const model = process.env.COOKLILY_OPENAI_EMBEDDING_MODEL?.trim() || "text-embedding-3-small";
    const dimensions = Number(process.env.COOKLILY_OPENAI_EMBEDDING_DIMENSIONS || 512);
    let vector: number[] | null = null;
    const stored = await lilyPrisma.lilyWhatsAppKnowledgeEmbedding.findFirst({ where: { articleId: article.id, contentHash, model, dimensions }, select: { vectorJson: true } });
    if (stored) {
      try {
        const parsed = JSON.parse(stored.vectorJson);
        if (Array.isArray(parsed) && parsed.length === dimensions && parsed.every((entry) => typeof entry === "number" && Number.isFinite(entry))) vector = parsed;
      } catch { /* corrupted vectors are regenerated below */ }
    }
    // Publish flow creates the vector. Never fan out embedding calls while answering
    // a customer; missing/corrupt vectors simply reduce recall and may cause handoff.
    if (!vector) continue;
    results.push({
      title: article.title,
      slug: article.slug,
      revision: article.revision,
      body: article.body,
      score: cosineSimilarity(queryEmbedding.vector, vector)
    });
  }
  const selected = results.filter((item) => item.score >= MINIMUM_SIMILARITY)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVAL_ARTICLES);
  return {
    articles: selected,
    context: selected.map((item) => `Fonte pública: ${item.title}\n${item.body}`).join("\n\n").slice(0, 6000),
    sourceRevision: selected.map((item) => `${item.slug}:${item.revision}`).join("|")
  };
}

export async function saveWhatsAppKnowledgeArticle(input: {
  id?: string;
  slug: string;
  title: string;
  body: string;
  status: "draft" | "published" | "archived";
  actorUserId: string;
}) {
  const now = new Date();
  const existing = input.id ? await lilyPrisma.lilyWhatsAppKnowledgeArticle.findUnique({ where: { id: input.id } }) : null;
  if (input.id && !existing) throw new Error("WHATSAPP_KNOWLEDGE_ARTICLE_NOT_FOUND");
  const revision = (existing?.revision ?? 0) + 1;
  let pendingEmbedding: Awaited<ReturnType<typeof createKnowledgeEmbedding>> | null = null;
  if (input.status === "published") {
    // Generate the public-knowledge vector before publishing: a failed provider call
    // must never leave a published article outside the reviewed retrieval path.
    pendingEmbedding = await createKnowledgeEmbedding({ text: articleText(input), source: "public_knowledge" });
  }
  const article = await lilyPrisma.$transaction(async (tx) => {
    const saved = input.id
      ? await tx.lilyWhatsAppKnowledgeArticle.update({
        where: { id: input.id },
        data: { slug: input.slug, title: input.title, body: input.body, status: input.status, revision, updatedAt: now }
      })
      : await tx.lilyWhatsAppKnowledgeArticle.create({
        data: { slug: input.slug, title: input.title, body: input.body, status: "draft", revision, createdBy: input.actorUserId, updatedAt: now }
      });
    if (pendingEmbedding) {
      await tx.lilyWhatsAppKnowledgeEmbedding.upsert({
        where: { articleId_contentHash_model_dimensions: {
          articleId: saved.id,
          contentHash: pendingEmbedding.contentHash,
          model: pendingEmbedding.model,
          dimensions: pendingEmbedding.vector.length
        } },
        update: { vectorJson: JSON.stringify(pendingEmbedding.vector) },
        create: {
          articleId: saved.id,
          contentHash: pendingEmbedding.contentHash,
          model: pendingEmbedding.model,
          dimensions: pendingEmbedding.vector.length,
          vectorJson: JSON.stringify(pendingEmbedding.vector)
        }
      });
      if (saved.status !== "published") {
        return tx.lilyWhatsAppKnowledgeArticle.update({ where: { id: saved.id }, data: { status: "published" } });
      }
    }
    return saved;
  });
  if (input.status === "published" && !pendingEmbedding) {
    throw new Error("WHATSAPP_KNOWLEDGE_EMBEDDING_REQUIRED");
  }
  return article;
}

export function validPublicKnowledgeArticle(input: { title: string; body: string }) {
  const combined = `${input.title}\n${input.body}`;
  return !/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/u.test(combined)
    && !/\+?\d[\d ()-]{8,}\d/u.test(combined)
    && !/\b(?:senha|password|token secreto|cartão de crédito|cartao de credito)\b/iu.test(combined);
}

