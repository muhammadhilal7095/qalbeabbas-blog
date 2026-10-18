"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { changePassword, updateProfile } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Textarea } from "@/components/ui/input";

export function ProfileForm({ initial, roleLabel }: { initial: { name: string; email: string; bio: string }; roleLabel: string }) {
  const router = useRouter();
  const [f, setF] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateProfile(f);
    setSaving(false);
    if (res.ok) { toast.success(res.message); setErrors({}); router.refresh(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };
  return (
    <Card>
      <CardHeader title="Your profile" description={`Signed in as ${roleLabel}`} />
      <form onSubmit={submit} noValidate>
        <CardBody className="space-y-4">
          <Field label="Name" htmlFor="p-name" error={errors.name}><Input id="p-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} autoComplete="name" /></Field>
          <Field label="Email" htmlFor="p-email" error={errors.email}><Input id="p-email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} autoComplete="email" /></Field>
          <Field label="Bio" htmlFor="p-bio" error={errors.bio} hint="Optional. Shown with your posts in the future."><Textarea id="p-bio" value={f.bio} rows={3} maxLength={500} onChange={(e) => setF({ ...f, bio: e.target.value })} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={saving} disabled={JSON.stringify(f) === JSON.stringify(initial)}>Save profile</Button></div>
        </CardBody>
      </form>
    </Card>
  );
}

export function PasswordForm() {
  const [f, setF] = React.useState({ current: "", next: "", confirm: "" });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!f.current) errs.current = "Enter your current password.";
    if (f.next.length < 8) errs.next = "At least 8 characters.";
    else if (!/[A-Za-z]/.test(f.next) || !/\d/.test(f.next)) errs.next = "Include a letter and a number.";
    if (f.next !== f.confirm) errs.confirm = "Passwords don't match.";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    const res = await changePassword({ current: f.current, next: f.next });
    setSaving(false);
    if (res.ok) { toast.success(res.message); setF({ current: "", next: "", confirm: "" }); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };
  return (
    <Card>
      <CardHeader title="Change password" description="Use at least 8 characters with a letter and a number." />
      <form onSubmit={submit} noValidate>
        <CardBody className="space-y-4">
          <Field label="Current password" htmlFor="pw-cur" error={errors.current}><Input id="pw-cur" type="password" autoComplete="current-password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} aria-invalid={!!errors.current} /></Field>
          <Field label="New password" htmlFor="pw-new" error={errors.next}><Input id="pw-new" type="password" autoComplete="new-password" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} aria-invalid={!!errors.next} /></Field>
          <Field label="Confirm new password" htmlFor="pw-conf" error={errors.confirm}><Input id="pw-conf" type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} aria-invalid={!!errors.confirm} /></Field>
          <div className="flex justify-end"><Button type="submit" loading={saving}>Update password</Button></div>
        </CardBody>
      </form>
    </Card>
  );
}
