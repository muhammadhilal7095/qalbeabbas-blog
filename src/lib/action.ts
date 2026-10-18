import "server-only";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { AuthError } from "./auth";

export type ActionResult<T = undefined> =
  | { ok: true; message?: string; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export class UserError extends Error {
  constructor(message: string, public fieldErrors?: Record<string, string>) {
    super(message);
  }
}

/** Wrap a server action body so every failure becomes a typed, user-safe result. */
export async function run<T>(fn: () => Promise<{ message?: string; data?: T } | void>): Promise<ActionResult<T>> {
  try {
    const r = await fn();
    return { ok: true, ...(r ?? {}) };
  } catch (e) {
    if (e instanceof AuthError) return { ok: false, error: e.message };
    if (e instanceof UserError) return { ok: false, error: e.message, fieldErrors: e.fieldErrors };
    if (e instanceof ZodError) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of e.issues) fieldErrors[issue.path.join(".")] ??= issue.message;
      return { ok: false, error: e.issues[0]?.message ?? "Please check the form.", fieldErrors };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { ok: false, error: "That value is already in use. Please choose another." };
    }
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2025") {
      return { ok: false, error: "That item no longer exists. Refresh the page and try again." };
    }
    console.error(e);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
