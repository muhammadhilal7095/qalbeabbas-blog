import { ShieldAlert } from "lucide-react";

export function DeniedNotice() {
  return (
    <div role="alert" className="mb-6 flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
      <ShieldAlert className="size-4 shrink-0" />
      You don&apos;t have permission to open that page. Ask an administrator if you need access.
    </div>
  );
}
