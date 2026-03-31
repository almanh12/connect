# Security notes (production)

## Environment variables

| Variable | Purpose |
|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | Public Supabase project URL (safe in client bundle). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public anon key (RLS-enforced; safe in client). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-only.** Full DB access; never prefix with `NEXT_PUBLIC_` or import in client bundles. |
| `ANTHROPIC_API_KEY` | **Server-only.** Used only in API routes / server actions. |
| `UPSTASH_REDIS_REST_URL` | **Server-only (middleware).** Rate limiting; optional — falls back to in-memory limits per instance. |
| `UPSTASH_REDIS_REST_TOKEN` | **Server-only.** Pair with Upstash URL. |

## Rate limiting

All `/api/*` routes are protected in `src/middleware.ts` with IP-based limits (and per-user limits when a session exists). Configure Upstash Redis in production so limits are shared across instances. Responses use HTTP `429` with `Retry-After` and a JSON body `{ error, code: "RATE_LIMITED" }`.

Some routes also apply domain-specific limits (e.g. chat) via `src/lib/rate-limit.ts`.

## API input validation

Request bodies for JSON endpoints are validated with Zod (`src/lib/security/schemas.ts`, `parseJsonBody`). Reject unexpected fields with `.strict()` where used.

## Supabase Row Level Security (RLS)

Tables in `supabase/migrations` with explicit `ENABLE ROW LEVEL SECURITY` include:

- `profiles` — users read/update own row; additional policies for officers/chapters.
- `practice_sessions` — own rows; policies for insert/update/delete.
- `notifications` — own rows; **note:** `INSERT` policy allows any authenticated user to insert (`WITH CHECK (auth.uid() IS NOT NULL)`) — verify `user_id` is always set server-side or tighten policy to `user_id = auth.uid()`.
- `chat_messages`, `conversations` — own rows.
- `competition_registrations` — chapter-scoped policies.
- `strategies` — chapter officer policies.
- `attendance` — chapter-scoped.
- `api_usage` — own rows.

**Verify in your DB**

- `events`, `chapters`, `announcements`, `engagement_points`, `manual_points`, `ai_strategies` (if present) may be created outside this repo’s migrations or only in `supabase/apply-pending-migrations.sql`. Run `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';` and confirm each table has RLS enabled and policies match your threat model.

## Auth

- JWTs are validated server-side via `@supabase/ssr` (`createServerClient` + `getUser()`).
- Middleware refreshes sessions and redirects unauthenticated users away from protected pages; `/api/*` returns JSON errors instead of redirects.

## OWASP-oriented practices in this repo

- **A01 Broken access control:** RLS + route-level authorization checks; admin client only on server.
- **A03 Injection:** Parameterized Supabase queries; Zod validation on inputs.
- **A05 Security misconfiguration:** Secrets in env only; no service role in client.
- **A07 Identification and auth failures:** Session refresh in middleware; protected routes.
- **A10 SSRF:** AI calls only to configured providers from server routes.

Re-audit after schema or policy changes.
