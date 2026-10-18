# Blog Management Dashboard

A full blog admin: write, schedule, publish, optimize for SEO, moderate comments and track real traffic. It ships with a small public blog at `/blog`, which is where readers comment and where page views are recorded.

**Stack:** Next.js 15 (App Router, Server Actions) · TypeScript · Tailwind CSS v4 · shadcn-style components on Radix UI · TipTap editor · Prisma ORM (SQLite by default, PostgreSQL/Supabase supported) · Recharts · Zod

## Quick start

Requires Node.js 20+.

```bash
npm install
cp .env.example .env          # then edit the values (see below)
npm run setup                 # applies migrations + creates the first Super Admin
npm run dev                   # http://localhost:3000/login
```

Sign in with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` from `.env`, then **change the password right away** (Settings → Change password).

If npm 11 reports blocked install scripts, approve the ones Prisma and tsx need:

```bash
npm install-scripts approve @prisma/client @prisma/engines prisma esbuild && npm rebuild
```

Production:

```bash
npm run build && npm run db:deploy && npm start
```

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Database connection. `file:./dev.db` for SQLite. |
| `NEXT_PUBLIC_SITE_URL` | Public URL, used for canonical URLs, Open Graph, sitemap and SEO previews. |
| `UPLOAD_DIR` | Where uploaded media is stored (default `./storage/uploads`, outside `/public`). |
| `MAX_UPLOAD_MB` | Per-file upload limit (default 20). |
| `ANALYTICS_SALT` | Secret salt for hashing visitor/IP identifiers. Generate with `openssl rand -hex 32`. |
| `CRON_SECRET` | Bearer token for `/api/cron/publish`. Generate with `openssl rand -hex 32`. |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` | First Super Admin. Used only when the database has no users. |

All secrets stay server-side. Nothing secret is prefixed with `NEXT_PUBLIC_`.

## Using PostgreSQL / Supabase

1. In `prisma/schema.prisma`, change `provider = "sqlite"` to `provider = "postgresql"`.
2. Set `DATABASE_URL` to your Postgres connection string. For Supabase, use the connection string from Project Settings → Database.
3. Delete `prisma/migrations` (they are SQLite-specific) and run `npx prisma migrate dev --name init`, then `npm run db:seed`.

Search automatically switches to case-insensitive mode on Postgres (`src/lib/db.ts`).

## Scheduled publishing

Posts scheduled for a time in the past are promoted to *published* whenever an admin or blog page loads. For exact timing on a quiet site, call the cron endpoint every minute:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://your-site.com/api/cron/publish
```

On Vercel, add this as a Cron Job. Elsewhere, use crontab or GitHub Actions.

## Media storage

Files go to `UPLOAD_DIR` with random names and are served by `/uploads/[filename]`. Only files registered in the database are served, with `nosniff` and a sandboxing CSP. The real file type is checked from its contents. Allowed types: JPG, PNG, GIF, WebP, AVIF, MP4, WebM and PDF. SVG is rejected because it can contain scripts.

On serverless hosts with ephemeral disks (e.g. Vercel), point storage at persistent storage instead: mount a volume, or swap `storeFile` / `readUpload` / `deleteUpload` in `src/lib/storage.ts` for S3 or Supabase Storage.

## Roles & permissions

| | Super Admin | Administrator | Editor | Author | Contributor |
|---|:-:|:-:|:-:|:-:|:-:|
| Write posts | ✓ | ✓ | ✓ | ✓ | ✓ (drafts only) |
| Publish / schedule | ✓ | ✓ | ✓ | own posts | — (submits for review) |
| Edit / delete others' posts | ✓ | ✓ | ✓ | — | — |
| Categories, tags, comments, SEO | ✓ | ✓ | ✓ | — | — |
| Upload media | ✓ | ✓ | ✓ | ✓ | — |
| Analytics | ✓ | ✓ | ✓ | ✓ | — |
| Users & settings | ✓ | ✓ (not Super Admins) | — | — | — |

Permissions are enforced on the server in every page, server action and API route (`src/lib/permissions.ts`). Hiding navigation items is only a convenience. Safeguards: you can't delete yourself or change your own role; the last active Super Admin can't be removed or demoted; a deleted user's posts are reassigned.

## Analytics: real data only

No sample or estimated analytics are seeded or shown. The public post page sends one first-party request per view to `/api/track`, and later reports active reading time when the reader leaves. The following are excluded or protected:

- Bots/crawlers, signed-in staff, and browsers that send Do Not Track are not counted.
- Raw IP addresses are never stored. Visitors are identified by a salted hash of a random first-party cookie.
- Traffic sources come from the referrer and UTM tags (search, social, referral, email, campaign, direct).

Tracking can be turned off in Settings. Mention the analytics cookie in your site's privacy policy.

## Security notes

- Passwords are hashed with bcrypt (cost 12). Sessions are random tokens stored hashed in the database, in `httpOnly`, `SameSite=Lax` cookies (`Secure` in production), and expire after 7 days.
- Login is rate-limited per email and IP (in memory; use a shared store such as Redis for multi-instance deployments).
- Changing a password, deactivating a user or changing a role signs that user out everywhere.
- Post HTML is whitelist-sanitized on save. Embeds are limited to YouTube (privacy mode) and Vimeo.
- Comments are plain text, rate-limited, protected by a honeypot field, and held for moderation by default.
- Edits are guarded against conflicts: a save is refused if someone else changed the post after you opened it.

## Project structure

```
prisma/              schema, migrations, seed (creates first admin only)
src/app/admin/       dashboard pages (server components)
src/app/blog/        public blog (renders posts, records views, accepts comments)
src/app/api/         upload, tracking and cron endpoints
src/app/uploads/     media file serving
src/actions/         server actions (validation + permission checks)
src/components/ui/   reusable UI primitives
src/components/admin dashboard feature components
src/components/editor post editor, TipTap, SEO panel, media picker
src/lib/             auth, db, permissions, validation, SEO scoring, analytics queries
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build / server |
| `npm run typecheck` | TypeScript check |
| `npm run db:migrate` | Create/apply a migration in development |
| `npm run db:deploy` | Apply migrations in production |
| `npm run db:seed` | Create the first Super Admin (if none exist) |
| `npm run db:studio` | Browse the database |
