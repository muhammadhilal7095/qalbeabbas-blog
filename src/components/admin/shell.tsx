"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3, ChevronsLeft, ChevronsRight, ExternalLink, FileText, FolderTree, Image as ImageIcon, LayoutDashboard,
  LogOut, Menu, MessageSquare, PenSquare, PlusCircle, Search, Settings, Tags, Users, X,
} from "lucide-react";
import { logout } from "@/actions/auth";
import { can, ROLE_LABELS, type Permission, type Role } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NavigationProgress } from "./navigation-progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ className?: string }>; permission?: Permission; exact?: boolean; badge?: "comments" | "posts" };

const NAV: { section?: string; items: NavItem[] }[] = [
  { items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true }] },
  {
    section: "Content",
    items: [
      { href: "/admin/posts", label: "All Blog Posts", icon: FileText, badge: "posts" },
      { href: "/admin/posts/new", label: "Create New Post", icon: PlusCircle, permission: "posts.create", exact: true },
      { href: "/admin/categories", label: "Categories", icon: FolderTree, permission: "taxonomy.manage" },
      { href: "/admin/tags", label: "Tags", icon: Tags, permission: "taxonomy.manage" },
      { href: "/admin/media", label: "Media Library", icon: ImageIcon, permission: "media.upload" },
      { href: "/admin/comments", label: "Comments", icon: MessageSquare, permission: "comments.moderate", badge: "comments" },
    ],
  },
  {
    section: "Insights",
    items: [
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3, permission: "analytics.view" },
      { href: "/admin/seo", label: "SEO Management", icon: Search, permission: "seo.manage" },
    ],
  },
  {
    section: "Administration",
    items: [
      { href: "/admin/users", label: "Users & Roles", icon: Users, permission: "users.manage" },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  if (item.href === "/admin/posts") return pathname === "/admin/posts" || (pathname.startsWith("/admin/posts/") && pathname !== "/admin/posts/new");
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

export function AdminShell({ user, siteName, badges, children }: {
  user: SessionUser; siteName: string; badges: { comments: number; posts: number }; children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  React.useEffect(() => {
    try { setCollapsed(localStorage.getItem("sidebar-collapsed") === "1"); } catch {}
  }, []);
  React.useEffect(() => setMobileOpen(false), [pathname]);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("sidebar-collapsed", c ? "0" : "1"); } catch {}
      return !c;
    });
  };

  const sidebar = (isMobile: boolean) => {
    const mini = collapsed && !isMobile;
    return (
      <div className="flex h-full flex-col">
        <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-white/10 px-4", mini && "justify-center px-0")}>
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white"><PenSquare className="size-4" /></span>
          {!mini && <span className="truncate text-sm font-semibold text-white">{siteName}</span>}
          {isMobile && (
            <button onClick={() => setMobileOpen(false)} className="ml-auto rounded-md p-1.5 text-slate-300 hover:bg-white/10" aria-label="Close menu"><X className="size-5" /></button>
          )}
        </div>
        <nav className="flex-1 overflow-y-auto px-3 py-4" aria-label="Main">
          {NAV.map((group, gi) => {
            const items = group.items.filter((i) => !i.permission || can(user.role, i.permission));
            if (!items.length) return null;
            return (
              <div key={gi} className={cn(gi > 0 && "mt-5")}>
                {group.section && !mini && <p className="mb-1.5 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">{group.section}</p>}
                {group.section && mini && <div className="mx-3 mb-2 h-px bg-white/10" />}
                <ul className="space-y-0.5">
                  {items.map((item) => {
                    const active = isActive(pathname, item);
                    const count = item.badge ? badges[item.badge] : 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          title={mini ? item.label : undefined}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                            active ? "bg-primary text-white shadow-sm" : "text-slate-300 hover:bg-white/5 hover:text-white",
                            mini && "justify-center px-0",
                          )}
                        >
                          <item.icon className="size-[18px] shrink-0" />
                          {!mini && <span className="truncate">{item.label}</span>}
                          {count > 0 && (mini
                            ? <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-400" aria-label={`${count} pending`} />
                            : <span className={cn("ml-auto rounded-full px-1.5 text-[11px] font-semibold", active ? "bg-white/20" : "bg-amber-400/20 text-amber-300")} title={item.badge === "comments" ? "Comments awaiting moderation" : "Posts awaiting review"}>{count}</span>)}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </nav>
        <div className="space-y-0.5 border-t border-white/10 p-3">
          <a href="/blog" target="_blank" rel="noreferrer" title={mini ? "View Website" : undefined}
            className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white", mini && "justify-center px-0")}>
            <ExternalLink className="size-[18px] shrink-0" />{!mini && "View Website"}
          </a>
          <form action={logout}>
            <button type="submit" title={mini ? "Logout" : undefined}
              className={cn("flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 hover:bg-white/5 hover:text-white", mini && "justify-center px-0")}>
              <LogOut className="size-[18px] shrink-0" />{!mini && "Logout"}
            </button>
          </form>
          {!isMobile && (
            <button onClick={toggle} className={cn("mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2 text-xs text-slate-400 hover:bg-white/5 hover:text-white", mini && "justify-center px-0")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <ChevronsRight className="size-4" /> : <><ChevronsLeft className="size-4" />Collapse</>}
            </button>
          )}
        </div>
      </div>
    );
  };

  const initials = user.name.split(/\s+/).map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen bg-surface">
      <React.Suspense fallback={null}><NavigationProgress /></React.Suspense>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-white focus:px-3 focus:py-2 focus:shadow-pop">Skip to content</a>
      <aside className={cn("fixed inset-y-0 left-0 z-30 hidden bg-navy-900 transition-[width] duration-200 lg:block", collapsed ? "w-[72px]" : "w-64")}>
        {sidebar(false)}
      </aside>
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <div className="absolute inset-0 bg-navy-950/50" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-72 bg-navy-900 shadow-pop">{sidebar(true)}</aside>
        </div>
      )}
      <div className={cn("transition-[padding] duration-200", collapsed ? "lg:pl-[72px]" : "lg:pl-64")}>
        <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-white/90 px-4 backdrop-blur sm:px-6">
          <button onClick={() => setMobileOpen(true)} className="rounded-md p-2 text-navy-700 hover:bg-surface lg:hidden" aria-label="Open menu"><Menu className="size-5" /></button>
          <div className="ml-auto flex items-center gap-2">
            {can(user.role, "posts.create") && (
              <Link href="/admin/posts/new" className="hidden h-9 items-center gap-2 rounded-lg bg-primary px-3.5 text-sm font-medium text-white shadow-sm hover:bg-primary-hover sm:inline-flex">
                <PlusCircle className="size-4" /> New post
              </Link>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2.5 rounded-lg p-1 pr-2 hover:bg-surface" aria-label="Account menu">
                <span className="flex size-8 items-center justify-center rounded-full bg-primary-soft text-xs font-semibold text-primary">{initials}</span>
                <span className="hidden text-left sm:block">
                  <span className="block text-sm font-medium leading-tight">{user.name}</span>
                  <span className="block text-xs leading-tight text-muted">{ROLE_LABELS[user.role as Role] ?? user.role}</span>
                </span>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/admin/settings"><Settings />Settings & profile</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><a href="/blog" target="_blank" rel="noreferrer"><ExternalLink />View website</a></DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => { void logout(); }}><LogOut />Logout</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
