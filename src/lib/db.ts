import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/**
 * Case-insensitive `contains` filter. SQLite's LIKE is already case-insensitive for ASCII
 * and does not accept `mode`; PostgreSQL needs `mode: "insensitive"`.
 */
export function ci(value: string) {
  const isPostgres = /^postgres(ql)?:/.test(process.env.DATABASE_URL ?? "");
  return isPostgres ? { contains: value, mode: "insensitive" as const } : { contains: value };
}
