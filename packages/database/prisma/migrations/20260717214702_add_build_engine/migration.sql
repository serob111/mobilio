-- CreateEnum
CREATE TYPE "BuildTargetPlatform" AS ENUM ('ANDROID', 'IOS');

-- CreateEnum
CREATE TYPE "BuildArtifactType" AS ENUM ('APK', 'AAB', 'IPA');

-- CreateEnum
CREATE TYPE "BuildJobStatus" AS ENUM ('QUEUED', 'IN_PROGRESS', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BuildArtifactKind" AS ENUM ('MANIFEST', 'APK', 'AAB', 'IPA');

-- CreateTable
CREATE TABLE "builds" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "triggeredByUserId" TEXT NOT NULL,
    "platform" "BuildTargetPlatform" NOT NULL,
    "artifactType" "BuildArtifactType" NOT NULL,
    "status" "BuildJobStatus" NOT NULL DEFAULT 'QUEUED',
    "errorMessage" TEXT,
    "logStorageKey" TEXT,
    "queuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_artifacts" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "kind" "BuildArtifactKind" NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "checksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "build_artifacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "builds_organizationId_createdAt_idx" ON "builds"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "builds_projectId_createdAt_idx" ON "builds"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "build_artifacts_buildId_idx" ON "build_artifacts"("buildId");

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "builds" ADD CONSTRAINT "builds_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_artifacts" ADD CONSTRAINT "build_artifacts_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
