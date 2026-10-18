/**
 * Creates the first Super Admin account if the database has no users.
 * Deliberately seeds no posts, comments or analytics: the dashboard only ever shows real data.
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync, existsSync } from "node:fs";

// Minimal .env loader so `npm run db:seed` works without extra dependencies.
if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const db = new PrismaClient();

async function main() {
  const count = await db.user.count();
  if (count > 0) {
    console.log(`Skipping seed: ${count} user(s) already exist.`);
    return;
  }
  const email = (process.env.SEED_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "";
  const name = process.env.SEED_ADMIN_NAME?.trim() || "Site Admin";
  if (!email || password.length < 8) {
    throw new Error("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (min 8 chars) in .env before seeding.");
  }
  await db.user.create({ data: { email, name, role: "super_admin", passwordHash: await bcrypt.hash(password, 12) } });
  console.log(`Created Super Admin ${email}. Sign in at /login and change the password under Settings.`);
}

main()
  .catch((e) => { console.error(e.message ?? e); process.exitCode = 1; })
  .finally(() => db.$disconnect());
