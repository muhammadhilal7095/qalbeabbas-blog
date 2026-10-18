import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PenSquare } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (await getCurrentUser()) redirect("/admin");
  const { next } = await searchParams;
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-navy-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary"><PenSquare className="size-5" /></span>
          Blog Dashboard
        </div>
        <div>
          <h2 className="text-3xl font-semibold leading-tight">Write, publish and grow<br />your blog from one place.</h2>
          <p className="mt-4 max-w-md text-blue-100/80">Drafts, scheduling, SEO, comments and analytics, all in a single workspace for your editorial team.</p>
        </div>
        <p className="text-sm text-blue-100/60">Authorized personnel only.</p>
      </div>
      <div className="flex items-center justify-center bg-surface px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 text-lg font-semibold lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-white"><PenSquare className="size-5" /></span>
            Blog Dashboard
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
          <p className="mt-1 text-sm text-muted">Enter your credentials to access the dashboard.</p>
          <LoginForm next={next} />
        </div>
      </div>
    </main>
  );
}
