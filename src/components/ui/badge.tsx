import { cn } from "@/lib/utils";

const tones = {
  gray: "bg-slate-100 text-slate-700 ring-slate-500/20",
  blue: "bg-blue-50 text-blue-700 ring-blue-600/20",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  amber: "bg-amber-50 text-amber-800 ring-amber-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  violet: "bg-violet-50 text-violet-700 ring-violet-600/20",
} as const;
export type BadgeTone = keyof typeof tones;

export function Badge({ tone = "gray", className, children }: { tone?: BadgeTone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap", tones[tone], className)}>
      {children}
    </span>
  );
}

const POST_STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  published: { tone: "green", label: "Published" },
  draft: { tone: "gray", label: "Draft" },
  pending: { tone: "violet", label: "Pending review" },
  scheduled: { tone: "blue", label: "Scheduled" },
  archived: { tone: "amber", label: "Archived" },
};
export function PostStatusBadge({ status }: { status: string }) {
  const s = POST_STATUS[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={s.tone}><span className="size-1.5 rounded-full bg-current" aria-hidden />{s.label}</Badge>;
}

const COMMENT_STATUS: Record<string, { tone: BadgeTone; label: string }> = {
  approved: { tone: "green", label: "Approved" },
  pending: { tone: "amber", label: "Pending" },
  spam: { tone: "red", label: "Spam" },
  rejected: { tone: "gray", label: "Rejected" },
};
export function CommentStatusBadge({ status }: { status: string }) {
  const s = COMMENT_STATUS[status] ?? { tone: "gray" as const, label: status };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
