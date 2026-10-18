"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession, destroySession, hashPassword, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/validation";

// Basic in-memory brute-force protection (per email + IP). Use a shared store (e.g. Redis) when running multiple instances.
const attempts = new Map<string, { count: number; until: number }>();
const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60_000;
let dummyHash: Promise<string> | null = null;

export type LoginState = { error?: string; fieldErrors?: Record<string, string>; email?: string } | undefined;

export async function login(_: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({ email: formData.get("email"), password: formData.get("password") });
  const email = String(formData.get("email") ?? "");
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { fieldErrors, email };
  }
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const key = `${parsed.data.email}|${ip}`;
  const rec = attempts.get(key);
  if (rec && rec.count >= MAX_ATTEMPTS && rec.until > Date.now()) {
    const mins = Math.ceil((rec.until - Date.now()) / 60_000);
    return { error: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? "" : "s"}.`, email };
  }

  const user = await db.user.findUnique({ where: { email: parsed.data.email } });
  // Always run a bcrypt comparison so response time doesn't reveal whether the email exists.
  dummyHash ??= hashPassword("not-a-real-password");
  const valid = await verifyPassword(parsed.data.password, user?.passwordHash ?? (await dummyHash));
  if (!user || !valid || !user.active) {
    const next = { count: (rec && rec.until > Date.now() ? rec.count : 0) + 1, until: Date.now() + LOCK_MS };
    attempts.set(key, next);
    return { error: user && valid && !user.active ? "This account has been deactivated. Contact an administrator." : "Incorrect email or password.", email };
  }
  attempts.delete(key);
  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await db.session.deleteMany({ where: { userId: user.id, expiresAt: { lt: new Date() } } });
  await createSession(user.id);

  const nextPath = String(formData.get("next") ?? "");
  redirect(nextPath.startsWith("/admin") && !nextPath.startsWith("//") ? nextPath : "/admin");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
