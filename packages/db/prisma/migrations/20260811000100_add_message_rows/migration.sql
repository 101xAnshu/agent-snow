CREATE TABLE IF NOT EXISTS "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "messages" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Session_userId_updatedAt_idx" ON "Session"("userId", "updatedAt");

CREATE TABLE "Message" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "parts" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Message_sessionId_createdAt_idx" ON "Message"("sessionId", "createdAt");
ALTER TABLE "Message" ADD CONSTRAINT "Message_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "Message" ("id", "sessionId", "role", "parts", "metadata", "createdAt")
SELECT item->>'id', s."id", COALESCE(item->>'role', 'user'), COALESCE(item->'parts', jsonb_build_array(jsonb_build_object('type', 'text', 'text', COALESCE(item->>'content', '')))), item->'metadata', s."updatedAt"
FROM "Session" s, jsonb_array_elements(CASE WHEN jsonb_typeof(s."messages") = 'array' THEN s."messages" ELSE '[]'::jsonb END) item
WHERE item->>'id' IS NOT NULL
ON CONFLICT ("id") DO NOTHING;
