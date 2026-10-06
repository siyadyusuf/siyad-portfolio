# Portfolio backend

Express 5 + TypeScript + PostgreSQL API for Siyad Yusuf's portfolio site.

## Endpoints
- `GET /api/posts?page&limit` and `GET /api/posts/:slug`: public, published posts whose `publishedAt` has passed
- `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`: single admin password, httpOnly JWT cookie (7 days)
- `GET|POST /api/admin/posts`, `GET|PUT|DELETE /api/admin/posts/:id`: auth required
- `POST /api/contact`: emails via Resend, honeypot `website` field, 5/hour/IP
- `GET /api/github`: repos and recent public activity, cached 1 hour
- Errors are always `{ error: { code, message } }`

## Run
1. `cp .env.example .env` and fill it in (`npm run hash-password -- 'pw'` for the admin hash)
2. `npm install && npm run dev` (creates the table on start)
3. `npm test` runs the API tests against an in-memory Postgres

## Deploy (Vercel + Neon, free tiers)
- Database: create a free Neon Postgres project and put its connection string in `DATABASE_URL`.
- API: set the Vercel Root Directory to `backend` and leave the Framework Preset on Express (`vercel.json` sets `"framework": "express"`). That preset loads `src/app.ts` because the file imports `express`. The file default-exports the Express app, which is the function/server the Node runtime requires. The first request opens the pool and runs `migrate()` once per cold start, then serves the real routes, including `GET /api/health` → `{ ok: true }`. `schema.sql` is included with `src/app.ts`. `api/index.ts` re-exports the same app. Set the env vars from `.env.example`. `typescript` and the other packages `tsc --noEmit` needs are dependencies, so a production install can still build. Do not set `compilerOptions.types` to `["node"]`: the Express builder typechecks with TypeScript 7 through a temporary config that extends this one, and that explicit entry is resolved from the temp directory (`TS2688`) even when `@types/node` is installed. Node globals are still picked up from `node_modules/@types`. The table is created automatically on first request.
- Set `NODE_ENV=production` so the login cookie is `Secure`.
