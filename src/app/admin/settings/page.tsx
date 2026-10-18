import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { can, ROLE_LABELS, type Role } from "@/lib/permissions";
import { getSettings } from "@/lib/settings";
import { PageHeader } from "@/components/ui/misc";
import { SiteSettingsForm } from "@/components/admin/settings/site-settings-form";
import { ProfileForm, PasswordForm } from "@/components/admin/settings/profile-forms";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await requirePageUser();
  const [settings, me] = await Promise.all([getSettings(), db.user.findUniqueOrThrow({ where: { id: user.id }, select: { name: true, email: true, bio: true } })]);
  return (
    <>
      <PageHeader title="Settings" description={can(user.role, "settings.manage") ? "Configure your blog and your account." : "Manage your account."} />
      <div className="space-y-6">
        {can(user.role, "settings.manage") && (
          <SiteSettingsForm initial={{
            siteName: settings.siteName, siteTagline: settings.siteTagline, postsPerPage: Number(settings.postsPerPage) || 10,
            commentsEnabled: settings.commentsEnabled === "true", commentsRequireApproval: settings.commentsRequireApproval === "true",
            trackingEnabled: settings.trackingEnabled === "true", searchIndexing: settings.searchIndexing === "true",
            titleSuffix: settings.titleSuffix, defaultMetaDescription: settings.defaultMetaDescription,
          }} />
        )}
        <div className="grid gap-6 lg:grid-cols-2">
          <ProfileForm initial={{ name: me.name, email: me.email, bio: me.bio ?? "" }} roleLabel={ROLE_LABELS[user.role as Role] ?? user.role} />
          <PasswordForm />
        </div>
      </div>
    </>
  );
}
