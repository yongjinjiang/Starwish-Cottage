# 星愿小屋 · Starwish Cottage

A private family birthday space for Sonya, with a guest quiz and a shared collection of letters, greetings and artwork.

- Frontend: React + TypeScript + Vite, hosted on Vercel.
- Backend: Supabase Auth, PostgreSQL functions/transactions and RLS.
- Artwork: a private Supabase Storage bucket with matching release rules.
- Reveal: **October 26, 2026, 6:00 PM America/Denver** (`2026-10-27T00:00:00Z`).
- Family accounts: `sonya12`, `Mia14`, `Aletheia10`, `mom45`, `dad51`.

## Local development

Node 22.12+ is required. Use a current Node LTS release for deployment.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `.env.local`. Only publishable values belong in the frontend. Do not put a secret/service-role key in any `VITE_` variable.

`http://localhost:5173/?preview=1` enables a **development-only** design sandbox with an explicit banner and identity/time controls. It contains no real family data and keeps data only in memory. Production builds remove the sandbox entirely; `?preview=1` cannot grant an identity or change release time in production.

## Deploy the backend

Create a dedicated Supabase project. Apply both files in `supabase/migrations/` in filename order with the Supabase migration tool, SQL editor or linked CLI. Do not run it twice against an initialized project. This installs the tables, functions, permissions, private image bucket and release setting.

This app uses Postgres RPC functions as its server API, so quiz grading and publishing do not require a separate Edge Function or Vercel backend. Server functions check authenticated identity and ownership explicitly, with an empty search path and restricted EXECUTE grants. Anonymous callers can only read a quiz by its random active token and submit validated answers; they cannot read drafts, keys, gallery data or submission records.

### Provision the invited family accounts

Run this **in your own local terminal**:

```sh
npm run provision:family
```

The script asks for a Supabase server secret without echoing or saving it. Find it in the project's API key settings. It calls the official Supabase Auth Admin API and prints unique generated passwords for the five accounts. Save those privately, outside the repository. Do not paste server secrets or passwords into a public issue or commit.

The script can also read `SUPABASE_SECRET_KEY` from the process environment. The example file contains a placeholder; remove that placeholder line to use the hidden prompt. `SUPABASE_URL` can fall back to `VITE_SUPABASE_URL`.

Re-running preserves existing passwords and repairs a missing family membership if account creation previously stopped midway. `npm run provision:family -- --reset-passwords` deliberately resets all five passwords; use this for parent-managed recovery. Login aliases use reserved `@family.starwish.example` addresses, so no child email address or email delivery is required. There is no public signup or email-based recovery flow.

In hosted Supabase Auth settings, **disable new user signups** and anonymous sign-ins. The local `supabase/config.toml` sets signup off for CLI/local use but does not automatically change hosted settings. The membership allowlist protects family content even if signup is accidentally left on.

## Deploy the frontend to Vercel

Import `yongjinjiang/Starwish-Cottage`, select the Vite framework and set:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

Use `npm run build` and output directory `dist`. `vercel.json` defines SPA routing and security headers. Configure the frontend URL in Supabase Auth's site URL. The app uses password login, not redirect callbacks. Keep real family records out of preview deployments; use a separate test Supabase project if you need to test real accounts on a branch.

## Privacy and access rules

| Resource | Before reveal | After reveal |
| --- | --- | --- |
| Gift draft | Its author only | Its author only |
| Published letter/art page | Its author only | All five invited members |
| Artwork file | Its contributor owner only | Owner and members who can read a published page referencing it |
| Quiz draft and private answer key | Sonya only | Sonya only |
| Full quiz results and gift tracking | Sonya only, immediately | Sonya only |
| Active quiz questions without answer keys | Holder of its random link | Same |

Parents are contributors inside the app and have **no access to quiz results**. Infrastructure administrators with database/server credentials retain administrative access; do not share those credentials with family member accounts.

Publishing a gift snapshots the text, theme and image paths. Editing the draft does not change the snapshot until another publication. Published image objects cannot be overwritten through the client. Unpublishing revokes future authenticated reads; content or short-lived signed image URLs already received by a reader cannot be recalled. Image links expire after 60 seconds.

Release uses database `now()` on every read; changing a phone clock or URL does not unlock content. The UI's server-synchronized countdown re-fetches when returning to a tab. Release does not depend on a cron job, an open browser, a new deployment or a parent clicking at 6 PM. An offline/suspended browser receives released content when it next connects.

Publishing a quiz creates an immutable question/answer version and a fresh random token, closing previous links. Old results retain their original question set. Submissions are validated and scored on the server in a transaction. A UUID idempotency key prevents retries of the same request from adding records. Each published paper accepts at most 200 records. **Nicknames and browser identifiers do not enforce one real person per attempt**; gift decisions require Sonya's confirmation. Questions, choice lengths and payload shapes are bounded. This private small-event version is not intended as a public high-traffic quiz platform.

Only nicknames, answers, scores, timestamps and gift status are collected by the quiz. The app does not collect contact information, addresses, ages or advertising analytics. Hosting and backend providers may retain request/security logs. Obtain appropriate family/guardian agreement before collecting children's information and define a deletion date; suggested retention is 30–90 days after the event. Cloud deletion must be performed by the project owner using the dashboard; an automatic retention job is not included in this first version.

## Verification

```sh
npm test
npm run test:db
npx playwright install chromium
npm run test:e2e
npm run build
```

Database tests run the actual migration against an isolated PostgreSQL-compatible PGlite instance with emulated Supabase Auth and Storage schemas. They verify real RLS policies, author-only editing, hidden artwork, release timing, publication snapshots, private answer keys, grading, retries, link rotation and Sonya-only results. They do not replace hosted Supabase integration checks for Auth/Storage behavior.

Browser tests use the explicit development sandbox to cover family publishing, reveal behavior, quiz participation, gift tracking and mobile layout. No preview identity mechanism is shipped in production.

## Structure

- `src/components/`: family editor, quiz editor/player, private results, shared components.
- `src/lib/api.ts`: real Supabase client integration.
- `src/lib/preview.ts`: development-only, in-memory design preview.
- `supabase/migrations/`: authoritative server schema and access policies.
- `scripts/provision-family.mjs`: local-only Auth Admin API provisioning.
- `scripts/test-database.mjs`: database policy and server behavior verification.
