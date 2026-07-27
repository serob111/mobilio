-- CreateEnum
CREATE TYPE "ScreenOrientation" AS ENUM ('PORTRAIT', 'LANDSCAPE', 'ANY');

-- CreateEnum
CREATE TYPE "StatusBarStyle" AS ENUM ('DEFAULT', 'LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "AndroidPermission" AS ENUM ('CAMERA', 'LOCATION', 'MICROPHONE', 'STORAGE', 'NOTIFICATIONS');

-- AlterEnum
ALTER TYPE "BuildArtifactKind" ADD VALUE 'ANDROID_PROJECT';

-- CreateTable
CREATE TABLE "project_configs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "appName" TEXT,
    "packageName" TEXT NOT NULL,
    "versionName" TEXT NOT NULL DEFAULT '1.0.0',
    "versionCode" INTEGER NOT NULL DEFAULT 1,
    "iconStorageKey" TEXT,
    "splashStorageKey" TEXT,
    "themeColor" TEXT NOT NULL DEFAULT '#4F46E5',
    "orientation" "ScreenOrientation" NOT NULL DEFAULT 'ANY',
    "statusBarStyle" "StatusBarStyle" NOT NULL DEFAULT 'DEFAULT',
    "allowedNavigationDomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deepLinkScheme" TEXT,
    "customUserAgent" TEXT,
    "permissions" "AndroidPermission"[] DEFAULT ARRAY[]::"AndroidPermission"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_configs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_configs_projectId_key" ON "project_configs"("projectId");

-- AddForeignKey
ALTER TABLE "project_configs" ADD CONSTRAINT "project_configs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
