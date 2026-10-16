import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@/generated/prisma/client";

// Cache on globalThis in every environment: in development this survives hot
// reloads, and in production it keeps one client (and pool) per server instance.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  globalForPrisma.prisma = new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
  });
  return globalForPrisma.prisma;
}
