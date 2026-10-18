"use client";
import { useActionState } from "react";
import { submitComment, type CommentState } from "@/actions/public";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";

export function CommentForm({ postId, moderated }: { postId: string; moderated: boolean }) {
  const [state, action, pending] = useActionState<CommentState, FormData>(submitComment, undefined);
  if (state?.ok) {
    return <p role="status" className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">{state.message}</p>;
  }
  const fe = state?.fieldErrors ?? {};
  return (
    <form action={action} className="mt-8 space-y-4 rounded-xl border border-border bg-surface/50 p-5" noValidate>
      <h3 className="font-semibold">Leave a comment</h3>
      {state?.error && <p role="alert" className="text-sm text-red-600">{state.error}</p>}
      <input type="hidden" name="postId" value={postId} />
      <div className="hidden" aria-hidden><label>Leave empty<input name="website2" tabIndex={-1} autoComplete="off" /></label></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name" htmlFor="c-name" error={fe.authorName}><Input id="c-name" name="authorName" required maxLength={80} autoComplete="name" /></Field>
        <Field label="Email" htmlFor="c-email" error={fe.authorEmail} hint="Never published."><Input id="c-email" name="authorEmail" type="email" required autoComplete="email" /></Field>
      </div>
      <Field label="Website (optional)" htmlFor="c-url" error={fe.authorUrl}><Input id="c-url" name="authorUrl" type="url" placeholder="https://" /></Field>
      <Field label="Comment" htmlFor="c-content" error={fe.content}><Textarea id="c-content" name="content" rows={4} required maxLength={5000} /></Field>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-muted">{moderated ? "Comments are reviewed before they appear." : ""}</p>
        <Button type="submit" loading={pending}>Post comment</Button>
      </div>
    </form>
  );
}
