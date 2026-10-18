import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { publishDuePosts } from "@/lib/scheduler";

// Always render fresh: scheduled posts go live and comments appear without a rebuild.
export const dynamic = "force-dynamic";

export default async function BlogLayout({ children }: { children: React.ReactNode }) {
  await publishDuePosts();
  const settings = await getSettings();
  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/blog" className="text-lg font-semibold tracking-tight text-navy-900">{settings.siteName}</Link>
          <nav className="flex items-center gap-5 text-sm text-navy-700">
            <Link href="/blog" className="hover:text-primary">All posts</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border py-8 text-center text-sm text-muted">
        © {new Date().getFullYear()} {settings.siteName}. {settings.siteTagline}
      </footer>
    </div>
  );
}
