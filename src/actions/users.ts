"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { AuthError, hashPassword, requireUser } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { canManageRole } from "@/lib/permissions";
import { userCreateSchema, userUpdateSchema } from "@/lib/validation";

async function ensureNotLastSuperAdmin(userId: string) {
  const u = await db.user.findUnique({ where: { id: userId }, select: { role: true, active: true } });
  if (u?.role === "super_admin" && u.active) {
    const others = await db.user.count({ where: { role: "super_admin", active: true, NOT: { id: userId } } });
    if (others === 0) throw new UserError("You can't remove or demote the last active Super Admin.");
  }
}

export async function createUser(input: z.input<typeof userCreateSchema>) {
  return run(async () => {
    const actor = await requireUser("users.manage");
    const data = userCreateSchema.parse(input);
    if (!canManageRole(actor.role, data.role)) throw new AuthError("Only a Super Admin can create Super Admin accounts.");
    if (await db.user.findUnique({ where: { email: data.email } })) throw new UserError("A user with this email already exists.", { email: "Email already in use." });
    await db.user.create({ data: { name: data.name, email: data.email, role: data.role, passwordHash: await hashPassword(data.password) } });
    revalidatePath("/admin/users");
    return { message: `${data.name} was added. Share their temporary password securely.` };
  });
}

export async function updateUser(input: z.input<typeof userUpdateSchema>) {
  return run(async () => {
    const actor = await requireUser("users.manage");
    const data = userUpdateSchema.parse(input);
    const target = await db.user.findUnique({ where: { id: data.id } });
    if (!target) throw new UserError("User not found.");
    if (!canManageRole(actor.role, target.role) || !canManageRole(actor.role, data.role)) throw new AuthError("Only a Super Admin can manage Super Admin accounts.");
    if (target.id === actor.id && (data.role !== target.role || !data.active)) throw new UserError("You can't change your own role or deactivate yourself.");
    if (data.role !== "super_admin" || !data.active) await ensureNotLastSuperAdmin(target.id);
    const clash = await db.user.findFirst({ where: { email: data.email, NOT: { id: target.id } } });
    if (clash) throw new UserError("Another user already uses this email.", { email: "Email already in use." });
    await db.user.update({
      where: { id: target.id },
      data: { name: data.name, email: data.email, role: data.role, active: data.active, ...(data.password ? { passwordHash: await hashPassword(data.password) } : {}) },
    });
    // Sign the user out everywhere when access is reduced or credentials change.
    if (!data.active || data.password || data.role !== target.role) await db.session.deleteMany({ where: { userId: target.id } });
    revalidatePath("/admin/users");
    return { message: "User updated." };
  });
}

export async function deleteUser(id: string, reassignTo: string) {
  return run(async () => {
    const actor = await requireUser("users.manage");
    if (id === actor.id) throw new UserError("You can't delete your own account.");
    const target = await db.user.findUnique({ where: { id }, include: { _count: { select: { posts: true } } } });
    if (!target) throw new UserError("User not found.");
    if (!canManageRole(actor.role, target.role)) throw new AuthError("Only a Super Admin can delete Super Admin accounts.");
    await ensureNotLastSuperAdmin(id);
    if (target._count.posts > 0) {
      const heir = await db.user.findFirst({ where: { id: reassignTo, active: true } });
      if (!heir || heir.id === id) throw new UserError("Choose an active user to take over this user's posts.");
    }
    await db.$transaction([
      db.post.updateMany({ where: { authorId: id }, data: { authorId: reassignTo } }),
      db.user.delete({ where: { id } }),
    ]);
    revalidatePath("/admin/users");
    revalidatePath("/admin/posts");
    return { message: `${target.name} was deleted.${target._count.posts ? ` ${target._count.posts} post(s) reassigned.` : ""}` };
  });
}
