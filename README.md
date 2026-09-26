# Festival Lucky Draw

A mobile-first lucky-draw application built with Next.js, Supabase, Cloudflare Turnstile, and Resend. It provides public registration, secure automatic and manual draws, winner notification, physical claim tracking, CSV export, and a protected single-admin dashboard.

## Stack

- Next.js 16 App Router and TypeScript
- Supabase Postgres and Auth
- Cloudflare Turnstile
- Resend transactional email
- Vercel hosting and cron retry

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

The registration form uses a development-only Turnstile bypass when no Turnstile key is configured. Production fails closed when the secret is missing.

## Supabase setup

1. Create a Supabase project.
2. Open the SQL Editor and run [`supabase/migrations/202609260001_initial_schema.sql`](supabase/migrations/202609260001_initial_schema.sql), or link the Supabase CLI and run `supabase db push`.
3. In Authentication, disable public user sign-ups.
4. Enable TOTP MFA in the project’s Authentication settings, then create the one admin user manually with an email and password.
5. Set `ADMIN_EMAIL` to that exact email address.
6. Copy the project URL, publishable key, and secret key into the environment variables.

The admin is required to enrol a TOTP authenticator on first login. All application tables have RLS enabled and no browser-access policies; trusted mutations run only through the Next.js backend.

The migration seeds `armson-festival-2026`. To set the help-desk closing time, run:

```sql
update public.events
set helpdesk_close_time = time '22:00:00'
where slug = 'armson-festival-2026';
```

Until configured, the claim deadline defaults to 11:59:59 PM IST on the winner’s draw date.

## Turnstile setup

1. Create a Managed Turnstile widget.
2. Add the production hostname.
3. Set `NEXT_PUBLIC_TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY`.

Every submission is verified server-side. The app also uses a honeypot, minimum completion time, immutable submission key, unique database constraints, and a database-backed limit of 60 submissions per shared IP per minute.

## Resend setup

1. Add and verify a domain or sending subdomain in Resend.
2. Create a sending-only API key restricted to that domain.
3. Set `RESEND_API_KEY`, `WINNER_FROM_EMAIL`, and optionally `WINNER_REPLY_TO`.

Only winners receive email. Draws write a notification-outbox record before delivery is attempted. Failed messages can be retried from the dashboard or by the Vercel cron route.

## Vercel deployment

1. Import the repository into a Vercel Pro project.
2. Add all variables from [`.env.example`](.env.example) to the Production environment.
3. Generate a long random `CRON_SECRET`; Vercel uses it to authenticate `/api/cron/notifications`.
4. Add the final custom domain to the Turnstile widget.
5. Deploy, sign in at `/admin/login`, and complete TOTP enrolment.
6. Replace the placeholder branding through `public/assets` and update the public text before launch.

## Required pre-launch checks

- Add the organiser’s identity, contact information, final privacy retention period, and legally reviewed rules.
- Set each day’s operational help-desk closing time.
- Make a database export before the event and daily during the festival.
- Test one registration, one manual draw, winner email delivery, claim updates, CSV export, pause/resume, and permanent closure in a staging event.
- Do not test permanent closure on the production event; it is intentionally irreversible through the application.

## Quality checks

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

After starting the local Supabase stack, run `supabase test db` to execute the transactional draw-rule tests in `supabase/tests`.

The production build separately runs after the explicit strict type check because Next.js 16 under the workspace’s Node.js 24 runtime currently fails while parsing TypeScript’s otherwise valid `--showConfig` output.
