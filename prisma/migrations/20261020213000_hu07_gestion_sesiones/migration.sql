-- HU07: cada refresh token persistido representa una sesión administrable.
-- sessionId se incorpora en dos fases para conservar las sesiones existentes.
ALTER TABLE "refresh_tokens"
ADD COLUMN "sessionId" TEXT,
ADD COLUMN "deviceName" TEXT NOT NULL DEFAULT 'Dispositivo desconocido',
ADD COLUMN "userAgent" TEXT,
ADD COLUMN "ipAddress" TEXT,
ADD COLUMN "lastUsedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "refresh_tokens"
SET "sessionId" = md5(random()::text || clock_timestamp()::text || "id"::text)
WHERE "sessionId" IS NULL;

ALTER TABLE "refresh_tokens"
ALTER COLUMN "sessionId" SET NOT NULL;

CREATE UNIQUE INDEX "refresh_tokens_sessionId_key"
ON "refresh_tokens"("sessionId");

CREATE INDEX "refresh_tokens_usuarioId_revokedAt_expiresAt_idx"
ON "refresh_tokens"("usuarioId", "revokedAt", "expiresAt");
