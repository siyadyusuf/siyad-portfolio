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
- API: `src/vercel.ts` is the serverless entry. In the combined repo, re-export it from `api/[...path].ts` and set the env vars from `.env.example` in the Vercel project. The table is created automatically on first request.
- Set `NODE_ENV=production` so the login cookie is `Secure`.
