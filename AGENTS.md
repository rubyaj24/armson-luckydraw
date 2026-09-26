# Lucky Draw Application — Agent Instructions

## Project purpose

Build a mobile-first lucky-draw application for an Indian festival. The application is primarily used to collect participant data through a QR-linked registration form and to conduct auditable lucky draws.

The festival runs on October 3 and 4, 2026. Use `Asia/Kolkata` for all event dates, draw timestamps, and claim deadlines.

## Technical direction

- Use one Next.js application for the public site, server-side backend, and admin dashboard.
- Use the Next.js App Router and TypeScript.
- Deploy the application to Vercel.
- Use Supabase Postgres for persistent data and Supabase Auth for the single administrator.
- Perform application mutations through server-side Next.js code. Do not expose the Supabase service-role key or privileged database operations to the browser.
- Send winner notifications from the Next.js backend through Resend. Do not use Supabase Edge Functions for email.
- Use Cloudflare Turnstile in Managed mode and verify every token on the server.
- Branding files will be supplied later under `public/assets`. Keep branding replaceable and avoid embedding brand artwork directly in components.

## Participant registration

The public form collects:

- Full name
- Age in completed years
- City
- Email address
- Indian mobile number
- Required consent to the lucky-draw rules and privacy notice

Rules:

- Participants must be at least 18 years old.
- Both email and phone number must be independently unique within the event.
- Normalize emails by trimming and lowercasing them. Do not apply provider-specific transformations such as removing Gmail dots or `+` aliases.
- Normalize Indian phone numbers to `+91XXXXXXXXXX` before checking or storing them.
- Do not use email verification, email OTP, or SMS OTP.
- A successfully submitted form becomes eligible immediately.
- Display a non-sequential, human-readable lucky-draw ID immediately after registration and prompt the participant to save or screenshot it.
- Do not send routine registration or confirmation emails. Email is reserved for winner notification.
- Reject repeated submissions safely and return a useful duplicate message without exposing another participant's personal data.
- Add Turnstile, a honeypot, sensible rate limiting, minimum-completion-time checks, and double-submit protection. Never enforce one registration per IP because many visitors may share festival Wi-Fi.

## Draw rules

- Select exactly one winner per draw.
- Never implement this feature by editing, inflating, or decrementing the real registration count. The cumulative valid-registration sequence is immutable.
- Run exactly two draws: one at the end of October 3 and one at the end of October 4.
- Draws are administrator-initiated from the protected audience stage; registrations never trigger a draw automatically.
- Give each event day a unique database constraint so a completed daily draw cannot be repeated.
- Each draw includes every participant who is eligible when that daily draw starts.
- Every non-winning eligible participant from the entire event remains eligible in subsequent draws.
- A selected winner is permanently excluded from all future draws, even if the prize is later unclaimed or rejected.
- Do not conduct replacement or redraw selections for rejected, absent, or unclaimed winners.
- Allow the administrator to close the lucky draw permanently. Closing must atomically stop new registrations and disable both daily draws.
- Closing the lucky draw must not cancel or rewrite completed draws, pending winner notifications, or existing claim records. The administrator must still be able to retry winner email, process claims, view history, and export data after closure.
- Treat closure as a destructive finalization action: show the current registration count and unresolved winners, require an explicit typed confirmation and reason, and write it to the audit trail. Do not provide an ordinary dashboard action to reopen a closed draw.
- Serialize draw closure with registration and draw transactions. If a transaction commits before closure, its registration/draw remains valid; after closure commits, subsequent registrations and draws must fail cleanly.
- Use cryptographically secure randomness. Never use `Math.random()` or an unaudited client-side selection.
- Draws must be atomic, idempotent, and safe under concurrent registrations and repeated requests.
- Serialize draw execution so concurrent requests cannot select two winners for one day.

Registration insertion and permanent sequence assignment must occur in one database transaction. Daily winner selection must run through a narrowly scoped Postgres function/RPC and never rely on the client-side animation for randomness.

## Winner notification and claiming

- Queue or record the winner notification as part of the draw result, then send it from trusted Next.js server code using Resend.
- Email failure must not roll back a valid registration or draw.
- Store notification status and allow the administrator to retry failed winner emails.
- Do not schedule automatic notification retries. Failed winner emails are retried explicitly by the administrator from the dashboard.
- The winner may claim the prize at the festival help desk until the configured help-desk closing time on the same calendar day as the draw.
- Help-desk closing times are configuration values and will be supplied later.
- Staff verify the lucky-draw ID, submitted phone number, age, and government-issued identity document in person.
- Do not store copies of government identity documents or their identification numbers.
- Use clear claim statuses such as `pending`, `claimed`, `unclaimed`, and `rejected`.

## Administrator

There is one administrator account. Protect all admin pages and server operations with Supabase Auth and authorization checks. Enable MFA for the account.

The dashboard should provide:

- Total valid registrations
- Current eligible-participant count
- Status of the October 3 and October 4 draw slots
- Registration search and filtering
- Draw and winner history
- A protected full-screen audience stage with an odometer/lottery animation and explicit confirmation
- Winner-notification delivery status and retry
- Claim-status management
- Registration pause/resume and event closure controls
- A clearly separated permanent `Close Lucky Draw` action with typed confirmation
- CSV export
- An immutable application audit trail for sensitive actions

Do not confuse the application's draw/action audit trail with Supabase platform audit-log features.

## Data and audit requirements

- Keep events, participants, draws, winners/claims, notification attempts, and application audit records as separate concepts.
- Scope daily-draw uniqueness constraints to an event so future festivals can be operated independently.
- Store timestamps in UTC and display them in `Asia/Kolkata`.
- A draw record must include its event, festival date, eligible snapshot/count, selected participant, secure random-selection evidence, creation time, and initiating actor.
- Never silently delete or rewrite completed draw records.
- Use database constraints in addition to application validation for age eligibility, unique normalized email/phone, winner exclusion, and daily-draw uniqueness where practical.
- Use Row Level Security. Public clients must not be able to list participant data, invoke draws, view winners' personal information, or write directly to protected tables.
- Collect only the agreed fields, display a plain-language privacy notice, and keep marketing consent separate if marketing collection is added later.

## Reliability and UX

- Design for at least 2,000 registrations and burst traffic near each day’s draw.
- The registration experience must be mobile-first and usable on weak festival connectivity.
- Disable submit controls while a request is in progress, but also enforce server-side idempotency because client controls are insufficient.
- Return the registration result before attempting non-critical email work.
- Make event state and opening hours server-controlled; do not rely on the participant's device clock.
- Provide clear states for duplicate data, underage users, closed registration, failed Turnstile validation, temporary server failure, and successful registration.
- Do not use a Vercel cron job for daily draws. The administrator starts each finale from the protected stage.

## Hosting and service expectations

- This is a client-facing commercial application. Use Vercel Pro rather than Hobby unless the owner explicitly changes the hosting decision.
- Supabase Free is acceptable for the expected scale, but it has no automatic downloadable backups and can pause after inactivity. Keep the project active before the festival and provide an explicit export/backup procedure.
- Resend Free is sufficient when only winners receive email, but the sender must use an appropriately verified domain.
- Cloudflare Turnstile Free is sufficient for the expected traffic.

## Environment variables and secrets

Expected environment variables include:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `NEXT_PUBLIC_TURNSTILE_SITE_KEY`
- `TURNSTILE_SECRET_KEY`
- `RESEND_API_KEY`
- `WINNER_FROM_EMAIL`

Names may be adjusted to match the implementation, but public and server-only values must remain clearly separated. Never commit real credentials, service-role keys, or local environment files.

## Verification expectations

Add automated tests for the business-critical behavior, especially:

- Email and phone normalization and uniqueness
- Under-18 rejection
- Idempotent registration submission
- Exactly one draw for each festival date under concurrent requests
- Registrations never triggering a draw
- Prevention and auditing of attempts to alter the real registration count or rerun a completed day
- Previous-winner exclusion
- No replacement draw for unclaimed or rejected prizes
- Permanent draw closure blocking registrations and all new draws without blocking claim processing or notification retries
- Winner email failure not undoing a draw
- Unauthorized access to admin operations and participant data
- Correct `Asia/Kolkata` claim-day boundaries

Before considering a change complete, run the repository's configured lint, type-check, and test commands. Preserve unrelated user changes and document any unverified behavior or missing external configuration.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
