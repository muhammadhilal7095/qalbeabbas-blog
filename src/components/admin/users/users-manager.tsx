"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { KeyRound, MoreHorizontal, Pencil, Plus, Search, Trash2, UserCheck, UserX, Users } from "lucide-react";
import { createUser, deleteUser, updateUser } from "@/actions/users";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, type Role } from "@/lib/permissions";
import { cn, formatDate } from "@/lib/utils";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Field, Input, Select, Switch } from "@/components/ui/input";
import { Badge, type BadgeTone } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/misc";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type U = { id: string; name: string; email: string; role: string; active: boolean; lastLoginAt: string | null; createdAt: string; posts: number; manageable: boolean };
const ROLE_TONE: Record<string, BadgeTone> = { super_admin: "violet", administrator: "blue", editor: "green", author: "amber", contributor: "gray" };

function generatePassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const arr = new Uint32Array(14);
  crypto.getRandomValues(arr);
  return Array.from(arr, (n) => chars[n % chars.length]).join("") + "7";
}

export function UsersManager({ users, meId, assignableRoles }: { users: U[]; meId: string; assignableRoles: readonly Role[] }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [role, setRole] = React.useState("");
  const [editing, setEditing] = React.useState<U | "new" | null>(null);
  const [deleting, setDeleting] = React.useState<U | null>(null);
  const filtered = users.filter((u) => (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())));

  const toggleActive = async (u: U) => {
    const res = await updateUser({ id: u.id, name: u.name, email: u.email, role: u.role as Role, active: !u.active, password: "" });
    if (res.ok) { toast.success(u.active ? `${u.name} was deactivated and signed out.` : `${u.name} was reactivated.`); router.refresh(); } else toast.error(res.error);
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative min-w-0 flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email…" className="pl-9" aria-label="Search users" type="search" />
        </div>
        <Select value={role} onChange={(e) => setRole(e.target.value)} className="w-auto" aria-label="Filter by role">
          <option value="">All roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <Button className="ml-auto" onClick={() => setEditing("new")}><Plus />Add user</Button>
      </div>
      {filtered.length === 0 ? <EmptyState icon={Users} title="No users match" description="Try a different search or role." /> : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b border-border bg-surface/60 text-left text-xs font-medium uppercase tracking-wide text-muted">
              <th className="px-4 py-3">User</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Status</th><th className="px-3 py-3 text-right">Posts</th><th className="px-3 py-3">Last sign-in</th><th className="w-12 px-3 py-3"><span className="sr-only">Actions</span></th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id} className={cn("hover:bg-surface/60", !u.active && "opacity-60")}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex size-9 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{u.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase()}</span>
                      <div><p className="font-medium">{u.name}{u.id === meId && <span className="ml-1.5 text-xs font-normal text-muted">(you)</span>}</p><p className="text-xs text-muted">{u.email}</p></div>
                    </div>
                  </td>
                  <td className="px-3 py-3"><Badge tone={ROLE_TONE[u.role]}>{ROLE_LABELS[u.role as Role] ?? u.role}</Badge></td>
                  <td className="px-3 py-3">{u.active ? <Badge tone="green">Active</Badge> : <Badge tone="gray">Deactivated</Badge>}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{u.posts}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-muted">{u.lastLoginAt ? formatDate(u.lastLoginAt, true) : "Never"}</td>
                  <td className="px-3 py-3">
                    {u.manageable && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className={buttonClasses("ghost", "icon-sm")} aria-label={`Actions for ${u.name}`}><MoreHorizontal /></DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onSelect={() => setEditing(u)}><Pencil />Edit user</DropdownMenuItem>
                          {u.id !== meId && <DropdownMenuItem onSelect={() => toggleActive(u)}>{u.active ? <><UserX />Deactivate</> : <><UserCheck />Reactivate</>}</DropdownMenuItem>}
                          {u.id !== meId && <><DropdownMenuSeparator /><DropdownMenuItem destructive onSelect={() => setDeleting(u)}><Trash2 />Delete user</DropdownMenuItem></>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <UserDialog key={editing === "new" ? "new" : editing?.id ?? "none"} user={editing} isSelf={editing !== "new" && editing?.id === meId} roles={assignableRoles}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); router.refresh(); }} />
      <DeleteUserDialog user={deleting} users={users.filter((u) => u.active && u.id !== deleting?.id)} onClose={() => setDeleting(null)} onDone={() => { setDeleting(null); router.refresh(); }} />
    </Card>
  );
}

function UserDialog({ user, isSelf, roles, onClose, onSaved }: { user: U | "new" | null; isSelf: boolean; roles: readonly Role[]; onClose: () => void; onSaved: () => void }) {
  const existing = user && user !== "new" ? user : null;
  const [f, setF] = React.useState({ name: existing?.name ?? "", email: existing?.email ?? "", role: (existing?.role ?? "author") as Role, active: existing?.active ?? true, password: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const [showPw, setShowPw] = React.useState(!existing);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.name.trim()) errs.name = "Name is required.";
    if (!/^\S+@\S+\.\S+$/.test(f.email)) errs.email = "Enter a valid email address.";
    if (!existing || f.password) {
      if (f.password.length < 8) errs.password = "At least 8 characters.";
      else if (!/[A-Za-z]/.test(f.password) || !/\d/.test(f.password)) errs.password = "Include a letter and a number.";
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const res = existing ? await updateUser({ id: existing.id, ...f }) : await createUser(f);
    setSaving(false);
    if (res.ok) { toast.success(res.message); onSaved(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };

  return (
    <Dialog open={user !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent title={existing ? "Edit user" : "Add user"} description={existing ? undefined : "Create an account and share the temporary password with them securely."}>
        <form onSubmit={submit} noValidate>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full name" htmlFor="u-name" error={errors.name}><Input id="u-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoFocus aria-invalid={!!errors.name} /></Field>
              <Field label="Email" htmlFor="u-email" error={errors.email}><Input id="u-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} aria-invalid={!!errors.email} /></Field>
            </div>
            <Field label="Role" htmlFor="u-role" hint={ROLE_DESCRIPTIONS[f.role]}>
              <Select id="u-role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })} disabled={isSelf}>
                {roles.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </Select>
            </Field>
            {isSelf && <p className="text-xs text-muted">You can't change your own role.</p>}
            {existing && !showPw ? (
              <Button variant="outline" size="sm" onClick={() => setShowPw(true)}><KeyRound />Reset password</Button>
            ) : (
              <Field label={existing ? "New password" : "Temporary password"} htmlFor="u-pw" error={errors.password} hint="At least 8 characters with a letter and a number.">
                <div className="flex gap-2">
                  <Input id="u-pw" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" className="font-mono" aria-invalid={!!errors.password} />
                  <Button variant="outline" onClick={() => setF({ ...f, password: generatePassword() })}>Generate</Button>
                </div>
              </Field>
            )}
            {existing && !isSelf && (
              <label className="flex items-center justify-between gap-3 text-sm">
                <span><span className="font-medium">Account active</span><span className="block text-xs text-muted">Deactivated users can't sign in. Their posts stay.</span></span>
                <Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} label="Account active" />
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving}>{existing ? "Save changes" : "Create user"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function DeleteUserDialog({ user, users, onClose, onDone }: { user: U | null; users: U[]; onClose: () => void; onDone: () => void }) {
  const [heir, setHeir] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  React.useEffect(() => setHeir(users[0]?.id ?? ""), [user, users]);
  if (!user) return null;
  const go = async () => {
    setBusy(true);
    const res = await deleteUser(user.id, heir);
    setBusy(false);
    if (res.ok) { toast.success(res.message); onDone(); } else toast.error(res.error);
  };
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent title={`Delete ${user.name}?`} size="sm">
        <div className="space-y-4 p-5 text-sm">
          <p className="text-navy-700">This permanently deletes the account. Consider deactivating it instead if you might need it later.</p>
          {user.posts > 0 && (
            <Field label={`Reassign their ${user.posts} post${user.posts === 1 ? "" : "s"} to`} htmlFor="heir">
              <Select id="heir" value={heir} onChange={(e) => setHeir(e.target.value)}>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({ROLE_LABELS[u.role as Role]})</option>)}
              </Select>
            </Field>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button variant="destructive" onClick={go} loading={busy}><Trash2 />Delete user</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
