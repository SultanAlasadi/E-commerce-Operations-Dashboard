/**
 * One-time setup: creates the real workspace and makes an existing Clerk user its
 * owner. Invitations need an existing owner, so the first one is provisioned here.
 *
 * Usage:
 *   npm run owner:provision -- --email you@example.com --name "Brand" --currency SAR --time-zone Asia/Riyadh
 *
 * The user must already exist in Clerk (Dashboard → Users → Create user).
 * Safe to re-run: if that Clerk user is already an active member anywhere, nothing changes.
 */
import { parseArgs } from "node:util";
import { loadEnvConfig } from "@next/env";
import { createClerkClient } from "@clerk/nextjs/server";
import { ROLE_DEFAULT_PERMISSIONS } from "@/lib/permissions";
import { getPrisma } from "@/lib/prisma";
import { workspaceSettingsSchema } from "@/lib/validation/workspace";

loadEnvConfig(process.cwd());

async function main() {
  const { values } = parseArgs({
    options: {
      email: { type: "string" },
      name: { type: "string" },
      currency: { type: "string" },
      "time-zone": { type: "string" },
    },
  });
  const email = values.email?.trim().toLowerCase();
  if (!email) throw new Error("Pass --email.");

  const settings = workspaceSettingsSchema.parse({
    name: values.name,
    currency: values.currency,
    timeZone: values["time-zone"],
  });

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not configured.");
  const clerk = createClerkClient({ secretKey });
  const { data: users } = await clerk.users.getUserList({ emailAddress: [email] });
  if (users.length !== 1) {
    throw new Error(`Expected one Clerk user with ${email}, found ${users.length}.`);
  }
  const user = users[0];
  const displayName = [user.firstName, user.lastName].filter(Boolean).join(" ") || email;

  console.log(`Neon branch: ${process.env.NEON_BRANCH ?? "(unset)"}`);

  const db = getPrisma();
  const existing = await db.member.findFirst({
    where: { clerkUserId: user.id, removedAt: null },
    include: { workspace: true },
  });
  if (existing) {
    console.log(
      `${email} is already ${existing.role} of "${existing.workspace.name}" (${existing.workspaceId}). Nothing changed.`,
    );
    return;
  }

  const workspace = await db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { ...settings, setupCompletedAt: new Date() },
    });
    await tx.member.create({
      data: {
        workspaceId: workspace.id,
        clerkUserId: user.id,
        email,
        displayName,
        role: "OWNER",
        permissions: {
          create: ROLE_DEFAULT_PERMISSIONS.OWNER.map((permission) => ({ permission })),
        },
      },
    });
    return workspace;
  });

  console.log(
    `Created "${workspace.name}" (${workspace.currency}, ${workspace.timeZone}) with ${email} as owner. Workspace id: ${workspace.id}`,
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => getPrisma().$disconnect());
