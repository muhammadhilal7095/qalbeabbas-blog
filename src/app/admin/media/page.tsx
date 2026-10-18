import { requirePageUser } from "@/lib/auth";
import { listMedia } from "@/actions/media";
import { can } from "@/lib/permissions";
import { param } from "@/lib/utils";
import { MAX_UPLOAD_BYTES } from "@/lib/storage";
import { PageHeader, Pagination } from "@/components/ui/misc";
import { Card } from "@/components/ui/card";
import { MediaLibrary } from "@/components/admin/media/media-library";
import { db } from "@/lib/db";

export const metadata = { title: "Media Library" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requirePageUser("media.upload");
  const sp = await searchParams;
  const q = param(sp, "q")?.trim() || undefined;
  const type = param(sp, "type") || undefined;
  const view = param(sp, "view") === "list" ? "list" : "grid";
  const page = Math.max(1, Number(param(sp, "page")) || 1);
  const pageSize = 30;
  const [res, totalAll] = await Promise.all([listMedia({ q, type, page, pageSize }), db.media.count()]);
  return (
    <>
      <PageHeader title="Media Library" description={`Images, videos and documents for your posts. Max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB per file.`} />
      <Card>
        <MediaLibrary items={res.items} q={q} type={type} view={view} isEmpty={totalAll === 0}
          currentUserId={user.id} canManageAll={can(user.role, "media.manage_all")} />
        <Pagination page={res.page} pageCount={res.pageCount} total={res.total} pageSize={pageSize} basePath="/admin/media" params={{ q, type, view: view === "grid" ? undefined : view }} />
      </Card>
    </>
  );
}
