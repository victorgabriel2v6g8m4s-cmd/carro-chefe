CREATE TABLE "LilyWhatsAppConversation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "contactHash" TEXT NOT NULL,
    "contactCiphertext" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'human',
    "assignedToUserId" TEXT,
    "lastInboundAt" DATETIME,
    "windowExpiresAt" DATETIME,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LilyWhatsAppConversation_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "LilyUser" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "LilyWhatsAppConversation_status_updatedAt_idx" ON "LilyWhatsAppConversation"("status", "updatedAt");
CREATE INDEX "LilyWhatsAppConversation_contactHash_updatedAt_idx" ON "LilyWhatsAppConversation"("contactHash", "updatedAt");
CREATE INDEX "LilyWhatsAppConversation_expiresAt_idx" ON "LilyWhatsAppConversation"("expiresAt");
CREATE INDEX "LilyWhatsAppConversation_assignedToUserId_status_updatedAt_idx" ON "LilyWhatsAppConversation"("assignedToUserId", "status", "updatedAt");

CREATE TABLE "LilyWhatsAppConversationMessage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "conversationId" TEXT NOT NULL,
    "providerMessageId" TEXT,
    "direction" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "bodyCiphertext" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'received',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" DATETIME NOT NULL,
    CONSTRAINT "LilyWhatsAppConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "LilyWhatsAppConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyWhatsAppConversationMessage_providerMessageId_key" ON "LilyWhatsAppConversationMessage"("providerMessageId");
CREATE INDEX "LilyWhatsAppConversationMessage_conversationId_createdAt_idx" ON "LilyWhatsAppConversationMessage"("conversationId", "createdAt");
CREATE INDEX "LilyWhatsAppConversationMessage_expiresAt_idx" ON "LilyWhatsAppConversationMessage"("expiresAt");

CREATE TABLE "LilyWhatsAppAIJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "messageId" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" DATETIME,
    "lastErrorCode" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "LilyWhatsAppAIJob_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "LilyWhatsAppConversationMessage" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "LilyWhatsAppAIJob_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "LilyWhatsAppConversation" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyWhatsAppAIJob_messageId_key" ON "LilyWhatsAppAIJob"("messageId");
CREATE INDEX "LilyWhatsAppAIJob_status_nextAttemptAt_idx" ON "LilyWhatsAppAIJob"("status", "nextAttemptAt");
CREATE INDEX "LilyWhatsAppAIJob_leaseUntil_idx" ON "LilyWhatsAppAIJob"("leaseUntil");

CREATE TABLE "LilyWhatsAppAIContactPreference" (
    "contactHash" TEXT NOT NULL PRIMARY KEY,
    "aiOptedOut" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    "optedOutAt" DATETIME
);

CREATE TABLE "LilyWhatsAppKnowledgeArticle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
CREATE UNIQUE INDEX "LilyWhatsAppKnowledgeArticle_slug_key" ON "LilyWhatsAppKnowledgeArticle"("slug");
CREATE INDEX "LilyWhatsAppKnowledgeArticle_status_updatedAt_idx" ON "LilyWhatsAppKnowledgeArticle"("status", "updatedAt");

CREATE TABLE "LilyWhatsAppKnowledgeEmbedding" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "articleId" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vectorJson" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LilyWhatsAppKnowledgeEmbedding_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "LilyWhatsAppKnowledgeArticle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "LilyWhatsAppKnowledgeEmbedding_articleId_contentHash_model_dimensions_key" ON "LilyWhatsAppKnowledgeEmbedding"("articleId", "contentHash", "model", "dimensions");
CREATE INDEX "LilyWhatsAppKnowledgeEmbedding_contentHash_model_dimensions_idx" ON "LilyWhatsAppKnowledgeEmbedding"("contentHash", "model", "dimensions");

CREATE TABLE "LilyWhatsAppAIEmbeddingCache" (
    "cacheKey" TEXT NOT NULL PRIMARY KEY,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "vectorJson" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LilyWhatsAppAIEmbeddingCache_expiresAt_idx" ON "LilyWhatsAppAIEmbeddingCache"("expiresAt");

CREATE TABLE "LilyWhatsAppAIResponseCache" (
    "cacheKey" TEXT NOT NULL PRIMARY KEY,
    "responseText" TEXT NOT NULL,
    "sourceRevision" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "LilyWhatsAppAIResponseCache_expiresAt_idx" ON "LilyWhatsAppAIResponseCache"("expiresAt");
CREATE TABLE "LilyWhatsAppAIUsage" (
    "dateKey" TEXT NOT NULL PRIMARY KEY,
    "requests" INTEGER NOT NULL DEFAULT 0,
    "responseInputTokens" INTEGER NOT NULL DEFAULT 0,
    "responseOutputTokens" INTEGER NOT NULL DEFAULT 0,
    "embeddingInputTokens" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" DATETIME NOT NULL
);
ALTER TABLE "LilyWhatsAppConversationMessage" ADD COLUMN "idempotencyKey" TEXT;
CREATE UNIQUE INDEX "LilyWhatsAppConversationMessage_idempotencyKey_key" ON "LilyWhatsAppConversationMessage"("idempotencyKey");
