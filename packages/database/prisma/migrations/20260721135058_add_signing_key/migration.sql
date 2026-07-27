-- CreateTable
CREATE TABLE "signing_keys" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "keystoreStorageKey" TEXT NOT NULL,
    "storePasswordEncrypted" TEXT NOT NULL,
    "keyPasswordEncrypted" TEXT NOT NULL,
    "sha256Fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "signing_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "signing_keys_projectId_key" ON "signing_keys"("projectId");

-- AddForeignKey
ALTER TABLE "signing_keys" ADD CONSTRAINT "signing_keys_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
