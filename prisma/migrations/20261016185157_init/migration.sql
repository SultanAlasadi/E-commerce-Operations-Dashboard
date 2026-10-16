-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OWNER', 'MANAGER', 'USER');

-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW_DASHBOARD', 'VIEW_SALES', 'ADD_SALES', 'EDIT_SALES', 'DELETE_SALES', 'MANAGE_PLATFORMS', 'MANAGE_TEAM');

-- CreateEnum
CREATE TYPE "SalesOrigin" AS ENUM ('MANUAL', 'IMPORT');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATED', 'CORRECTED', 'DELETED');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REVOKED', 'EXPIRED');

-- CreateTable
CREATE TABLE "Workspace" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "timeZone" TEXT NOT NULL,
    "setupCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "clerkUserId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "removedAt" TIMESTAMP(3),
    "removedById" UUID,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MemberPermission" (
    "memberId" UUID NOT NULL,
    "permission" "Permission" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MemberPermission_pkey" PRIMARY KEY ("memberId","permission")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "permissions" "Permission"[],
    "invitedById" UUID NOT NULL,
    "clerkInvitationId" TEXT,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Platform" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT,
    "trackingStartDate" DATE NOT NULL,
    "archivedAt" TIMESTAMP(3),
    "archivedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Platform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailySales" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "platformId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "orders" INTEGER NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "origin" "SalesOrigin" NOT NULL DEFAULT 'MANUAL',
    "createdById" UUID NOT NULL,
    "updatedById" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailySales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesAudit" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "platformId" UUID NOT NULL,
    "businessDate" DATE NOT NULL,
    "salesRecordId" UUID,
    "action" "AuditAction" NOT NULL,
    "actorId" UUID NOT NULL,
    "beforeOrders" INTEGER,
    "beforeAmount" DECIMAL(14,2),
    "afterOrders" INTEGER,
    "afterAmount" DECIMAL(14,2),
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalesAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Member_clerkUserId_idx" ON "Member"("clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_workspaceId_clerkUserId_key" ON "Member"("workspaceId", "clerkUserId");

-- CreateIndex
CREATE UNIQUE INDEX "Member_one_active_owner" ON "Member"("workspaceId") WHERE ("role" = 'OWNER' AND "removedAt" IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_clerkInvitationId_key" ON "Invitation"("clerkInvitationId");

-- CreateIndex
CREATE INDEX "Invitation_workspaceId_status_idx" ON "Invitation"("workspaceId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_one_pending_per_email" ON "Invitation"("workspaceId", "email") WHERE ("status" = 'PENDING');

-- CreateIndex
CREATE UNIQUE INDEX "Platform_workspaceId_name_key" ON "Platform"("workspaceId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Platform_workspaceId_id_key" ON "Platform"("workspaceId", "id");

-- CreateIndex
CREATE INDEX "DailySales_workspaceId_businessDate_idx" ON "DailySales"("workspaceId", "businessDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailySales_workspaceId_platformId_businessDate_key" ON "DailySales"("workspaceId", "platformId", "businessDate");

-- CreateIndex
CREATE INDEX "SalesAudit_workspaceId_platformId_businessDate_createdAt_idx" ON "SalesAudit"("workspaceId", "platformId", "businessDate", "createdAt");

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_removedById_fkey" FOREIGN KEY ("removedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MemberPermission" ADD CONSTRAINT "MemberPermission_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Platform" ADD CONSTRAINT "Platform_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_workspaceId_platformId_fkey" FOREIGN KEY ("workspaceId", "platformId") REFERENCES "Platform"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailySales" ADD CONSTRAINT "DailySales_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAudit" ADD CONSTRAINT "SalesAudit_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAudit" ADD CONSTRAINT "SalesAudit_workspaceId_platformId_fkey" FOREIGN KEY ("workspaceId", "platformId") REFERENCES "Platform"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesAudit" ADD CONSTRAINT "SalesAudit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "Member"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------
-- Hand-written rules Prisma cannot express. Prisma ignores CHECK constraints
-- when diffing, so later migrations will not try to drop these.
-- ---------------------------------------------------------------------------

ALTER TABLE "Workspace"
  ADD CONSTRAINT "Workspace_currency_iso4217" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "Workspace_timeZone_not_blank" CHECK (btrim("timeZone") <> '');

ALTER TABLE "Member"
  ADD CONSTRAINT "Member_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "Invitation"
  ADD CONSTRAINT "Invitation_email_lowercase" CHECK ("email" = lower("email"));

ALTER TABLE "Platform"
  ADD CONSTRAINT "Platform_name_not_blank" CHECK (btrim("name") <> '');

ALTER TABLE "DailySales"
  ADD CONSTRAINT "DailySales_orders_nonnegative" CHECK ("orders" >= 0),
  ADD CONSTRAINT "DailySales_amount_nonnegative" CHECK ("amount" >= 0),
  ADD CONSTRAINT "DailySales_amount_requires_orders" CHECK (NOT ("amount" > 0 AND "orders" = 0));

ALTER TABLE "SalesAudit"
  ADD CONSTRAINT "SalesAudit_values_by_action" CHECK (
    ("action" = 'CREATED'   AND "beforeOrders" IS NULL     AND "afterOrders" IS NOT NULL) OR
    ("action" = 'CORRECTED' AND "beforeOrders" IS NOT NULL AND "afterOrders" IS NOT NULL) OR
    ("action" = 'DELETED'   AND "beforeOrders" IS NOT NULL AND "afterOrders" IS NULL)
  );
