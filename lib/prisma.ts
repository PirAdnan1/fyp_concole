import { PrismaClient } from "@prisma/client";

// Prevent multiple Prisma Client instances in dev (Next.js hot reload)
// and in serverless environments on Vercel.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
