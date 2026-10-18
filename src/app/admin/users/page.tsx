import { requirePageUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS, ROLE_PERMISSIONS, ROLES, canManageRole, type Permission } from "@/lib/permissions";
import { PageHeader } from "@/components/ui/misc";
import { Card, CardHeader } from "@/components/ui/card";
import { UsersManager } from "@/components/admin/users/users-manager";
import { Check, Minus } from "lucide-react";

export const metadata = { title: "Users & Roles" };

export default async function UsersPage() {
  const me = await requirePageUser("users.manage");
  const users = await db.user.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, active: true, lastLoginAt: true, createdAt: true, _count: { select: { posts: true } } },
  });
  const assignable = ROLES.filter((r) => canManageRole(me.role, r));
  return (
    <>
      <PageHeader title="Users & Roles" description="Invite your team and control what each person can do." />
      <UsersManager
        meId={me.id}
        assignableRoles={assignable}
        users={users.map((u) => ({ ...u, posts: u._count.posts, lastLoginAt: u.lastLoginAt?.toISOString() ?? null, createdAt: u.createdAt.toISOString(), manageable: canManageRole(me.role, u.role) }))}
      />
      <Card className="mt-6">
        <CardHeader title="Role permissions" description="What each role can do. Contributors can never publish on their own." />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Permission</th>
                {ROLES.map((r) => <th key={r} className="px-3 py-3 text-center" title={ROLE_DESCRIPTIONS[r]}>{ROLE_LABELS[r]}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(Object.keys(PERMISSIONS) as Permission[]).map((p) => (
                <tr key={p}>
                  <td className="px-4 py-2.5">{PERMISSIONS[p]}</td>
                  {ROLES.map((r) => (
                    <td key={r} className="px-3 py-2.5 text-center">
                      {ROLE_PERMISSIONS[r].includes(p) ? <Check className="mx-auto size-4 text-emerald-600" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-slate-300" aria-label="Not allowed" />}
                    </td>
                  ))}
                </tr>
              ))}
              <tr><td className="px-4 py-2.5">Manage Super Admin accounts</td>{ROLES.map((r) => <td key={r} className="px-3 py-2.5 text-center">{r === "super_admin" ? <Check className="mx-auto size-4 text-emerald-600" aria-label="Allowed" /> : <Minus className="mx-auto size-4 text-slate-300" aria-label="Not allowed" />}</td>)}</tr>
            </tbody>
          </table>
        </div>
        <p className="border-t border-border px-4 py-3 text-xs text-muted">Users who can only edit their own posts (Authors, Contributors) see only their own posts. Contributors can only edit drafts and posts pending review.</p>
      </Card>
    </>
  );
}
