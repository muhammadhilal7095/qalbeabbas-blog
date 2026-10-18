"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saveSiteSettings } from "@/actions/settings";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Field, Input, Switch } from "@/components/ui/input";

type S = {
  siteName: string; siteTagline: string; postsPerPage: number; commentsEnabled: boolean; commentsRequireApproval: boolean;
  trackingEnabled: boolean; searchIndexing: boolean; titleSuffix: string; defaultMetaDescription: string;
};

function Toggle({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start justify-between gap-4 py-3 text-sm">
      <span><span className="font-medium">{label}</span><span className="block text-xs text-muted">{description}</span></span>
      <Switch checked={checked} onCheckedChange={onChange} label={label} />
    </label>
  );
}

export function SiteSettingsForm({ initial }: { initial: S }) {
  const router = useRouter();
  const [f, setF] = React.useState(initial);
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [saving, setSaving] = React.useState(false);
  const dirty = JSON.stringify(f) !== JSON.stringify(initial);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.siteName.trim()) { setErrors({ siteName: "Site name is required." }); return; }
    setSaving(true);
    const res = await saveSiteSettings(f);
    setSaving(false);
    if (res.ok) { toast.success(res.message); setErrors({}); router.refresh(); } else { setErrors(res.fieldErrors ?? {}); toast.error(res.error); }
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="General" description="Basic information about your blog." />
          <CardBody className="space-y-4">
            <Field label="Site name" htmlFor="s-name" error={errors.siteName}><Input id="s-name" value={f.siteName} maxLength={80} onChange={(e) => setF({ ...f, siteName: e.target.value })} aria-invalid={!!errors.siteName} /></Field>
            <Field label="Tagline" htmlFor="s-tagline" error={errors.siteTagline}><Input id="s-tagline" value={f.siteTagline} maxLength={160} onChange={(e) => setF({ ...f, siteTagline: e.target.value })} /></Field>
            <Field label="Posts per page on the blog" htmlFor="s-ppp" error={errors.postsPerPage}>
              <Input id="s-ppp" type="number" min={1} max={50} value={f.postsPerPage} onChange={(e) => setF({ ...f, postsPerPage: Number(e.target.value) })} className="w-32" aria-invalid={!!errors.postsPerPage} />
            </Field>
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Comments & privacy" description="How readers interact with your posts." />
          <CardBody className="divide-y divide-border py-2">
            <Toggle label="Allow comments" description="Show a comment form on published posts." checked={f.commentsEnabled} onChange={(v) => setF({ ...f, commentsEnabled: v })} />
            <Toggle label="Hold comments for approval" description="New comments stay pending until a moderator approves them." checked={f.commentsRequireApproval} onChange={(v) => setF({ ...f, commentsRequireApproval: v })} />
            <Toggle label="Visitor analytics" description="Record anonymous page views and reading time. Respects Do Not Track; no IPs stored." checked={f.trackingEnabled} onChange={(v) => setF({ ...f, trackingEnabled: v })} />
            <Toggle label="Search engine visibility" description="Allow search engines to index your blog." checked={f.searchIndexing} onChange={(v) => setF({ ...f, searchIndexing: v })} />
          </CardBody>
        </Card>
      </div>
      <div className="mt-4 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-700">You have unsaved changes</span>}
        <Button variant="outline" disabled={!dirty || saving} onClick={() => setF(initial)}>Discard</Button>
        <Button type="submit" loading={saving} disabled={!dirty}>Save settings</Button>
      </div>
    </form>
  );
}
