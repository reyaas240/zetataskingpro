import { PrismaClient } from "@prisma/client";

declare global {
  // Allows reuse of Prisma client across serverless invocations in development
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    // Optional: enable query logging during development
    log: ["query"],
  });

if (process.env.NODE_ENV !== "production") {
  // @ts-ignore – assign to global for subsequent imports
  global.prisma = prisma;
}


const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
