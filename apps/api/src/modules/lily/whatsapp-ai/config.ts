const FLAG_ON = "true";

function value(name: string) {
  return process.env[name]?.trim() ?? "";
}

function hasEncryptionKey() {
  try {
    return Buffer.from(value("COOKLILY_WHATSAPP_AI_ENCRYPTION_KEY"), "base64url").length === 32;
  } catch {
    return false;
  }
}

function retentionDays() {
  const parsed = Number(value("COOKLILY_WHATSAPP_RETENTION_DAYS"));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 90 ? parsed : null;
}

function maxDailyRequests() {
  const parsed = Number(value("COOKLILY_WHATSAPP_AI_MAX_DAILY_REQUESTS"));
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 10_000 ? parsed : null;
}

export function lilyWhatsAppAIConfiguration() {
  const inboxRequested = value("COOKLILY_WHATSAPP_INBOX_ENABLED") === FLAG_ON;
  const aiRequested = value("COOKLILY_WHATSAPP_AI_ENABLED") === FLAG_ON;
  const encryptionKeyConfigured = hasEncryptionKey();
  const retentionDaysConfigured = retentionDays() !== null;
  const dailyRequestBudgetConfigured = maxDailyRequests() !== null;
  const metaReady = Boolean(
    value("COOKLILY_WHATSAPP_ACCESS_TOKEN")
      && value("COOKLILY_WHATSAPP_PHONE_NUMBER_ID")
      && /^v\d+\.\d+$/.test(value("COOKLILY_WHATSAPP_GRAPH_VERSION"))
      && value("COOKLILY_WHATSAPP_APP_SECRET")
  );
  const openAIReady = Boolean(value("COOKLILY_OPENAI_API_KEY") && value("COOKLILY_OPENAI_MODEL"));
  const customerEmbeddingConsent = value("COOKLILY_WHATSAPP_AI_QUERY_EMBEDDINGS_ENABLED") === FLAG_ON;
  const inboxReady = inboxRequested && encryptionKeyConfigured && retentionDaysConfigured;
  const ready = aiRequested && inboxReady && metaReady && openAIReady && dailyRequestBudgetConfigured && customerEmbeddingConsent;

  return {
    inboxRequested,
    aiRequested,
    encryptionKeyConfigured,
    retentionDaysConfigured,
    retentionDays: retentionDays(),
    dailyRequestBudgetConfigured,
    maxDailyRequests: maxDailyRequests(),
    metaReady,
    openAIReady,
    customerEmbeddingConsent,
    inboxReady,
    ready,
    enabled: ready
  };
}

export function getWhatsAppAIProviderConfiguration() {
  return {
    openAIKey: value("COOKLILY_OPENAI_API_KEY"),
    model: value("COOKLILY_OPENAI_MODEL"),
    embeddingModel: value("COOKLILY_OPENAI_EMBEDDING_MODEL") || "text-embedding-3-small",
    embeddingDimensions: Number(value("COOKLILY_OPENAI_EMBEDDING_DIMENSIONS") || 512),
    graphVersion: value("COOKLILY_WHATSAPP_GRAPH_VERSION"),
    phoneNumberId: value("COOKLILY_WHATSAPP_PHONE_NUMBER_ID"),
    accessToken: value("COOKLILY_WHATSAPP_ACCESS_TOKEN"),
    retentionDays: retentionDays()
  };
}

