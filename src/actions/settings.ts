"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createHash } from "node:crypto";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword, requireUser, SESSION_COOKIE, verifyPassword } from "@/lib/auth";
import { run, UserError } from "@/lib/action";
import { saveSettings } from "@/lib/settings";
import { passwordChangeSchema, settingsSchema } from "@/lib/validation";

export async function saveSiteSettings(input: z.input<typeof settingsSchema>) {
  return run(async () => {
    await requireUser("settings.manage");
    const data = settingsSchema.parse(input);
    await saveSettings(data);
    revalidatePath("/", "layout");
    return { message: "Settings saved." };
  });
}

const profileSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  bio: z.string().trim().max(500, "Bio must be 500 characters or fewer."),
});

export async function updateProfile(input: z.input<typeof profileSchema>) {
  return run(async () => {
    const user = await requireUser();
    const data = profileSchema.parse(input);
    const clash = await db.user.findFirst({ where: { email: data.email, NOT: { id: user.id } } });
    if (clash) throw new UserError("Another account already uses this email.", { email: "Email already in use." });
    await db.user.update({ where: { id: user.id }, data: { name: data.name, email: data.email, bio: data.bio || null } });
    revalidatePath("/admin", "layout");
    return { message: "Profile updated." };
  });
}

export async function changePassword(input: z.input<typeof passwordChangeSchema>) {
  return run(async () => {
    const user = await requireUser();
    const data = passwordChangeSchema.parse(input);
    const row = await db.user.findUniqueOrThrow({ where: { id: user.id } });
    if (!(await verifyPassword(data.current, row.passwordHash))) throw new UserError("Your current password is incorrect.", { current: "Incorrect password." });
    if (data.current === data.next) throw new UserError("Choose a password different from your current one.", { next: "Must be different." });
    await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(data.next) } });
    // Sign out all other sessions; keep this one.
    const token = (await cookies()).get(SESSION_COOKIE)?.value ?? "";
    const currentHash = createHash("sha256").update(token).digest("hex");
    await db.session.deleteMany({ where: { userId: user.id, NOT: { tokenHash: currentHash } } });
    return { message: "Password changed. Other devices have been signed out." };
  });
}
