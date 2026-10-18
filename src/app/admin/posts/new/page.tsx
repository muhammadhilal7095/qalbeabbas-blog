import { requirePageUser } from "@/lib/auth";
import { emptyPost, getEditorContext } from "@/lib/editor-data";
import { PostEditor } from "@/components/editor/post-editor";

export const metadata = { title: "Create New Post" };

export default async function NewPostPage() {
  const user = await requirePageUser("posts.create");
  const ctx = await getEditorContext(user);
  return <PostEditor key="new" initial={emptyPost(user.id)} {...ctx} />;
}
