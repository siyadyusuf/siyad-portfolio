# Siyad Yusuf · portfolio frontend

Vite + React + TypeScript + Tailwind v4 + React Router. Dark, single-column, grid-lined layout.

## Run

```bash
npm install
npm run dev          # http://localhost:5173 (mock API by default)
npm run build        # type-check + production build
```

- `VITE_USE_MOCKS` (default `true` for `npm run dev`): in-browser mock API with clearly labeled **sample** data
  (posts, GitHub repos/activity/contributions). Mock admin password: `letmein`.
  Preview GitHub empty states in mock mode with `/?mockGithub=empty` or `/?mockGithub=null`.
- `VITE_USE_MOCKS=false`: calls the real backend at `/api`, proxied by Vite to
  `API_PROXY_TARGET` (default `http://localhost:3001`, e.g. `npm run dev:mock` in `../backend`, password `dev`).

## Production (Vercel)

This app is its own Vercel project. `vercel.json` does two things:

- Proxies `/api/:path*` to `https://siyad-portfolio-seven.vercel.app/api/:path*` so the browser stays on this origin (session cookie and CORS stay first-party). The `/api` prefix is kept because the Express app mounts its routes there. This rule is first.
- Serves the SPA for every other path (`/blog`, `/blog/:slug`, `/admin`, …) by rewriting it to `/index.html`. Built files such as `/assets/*` are still served directly. Without the fallback, a hard navigation is a platform 404.

Project settings:

| Setting | Value |
| --- | --- |
| Root Directory | `frontend` |
| Framework Preset | Vite (`vercel.json` sets `"framework": "vite"`) |
| Build Command | `npm run build` |
| Output Directory | `dist` |

Build-time environment variables (change them in the Vercel project, then redeploy):

| Variable | Production value |
| --- | --- |
| `VITE_USE_MOCKS` | `false`. Required. The client compiles mocks in unless this is exactly `false`. `.env.production` sets it for `vite build`; a dashboard value overrides that file. |
| `VITE_API_BASE` | Leave unset (the client uses `/api`). Do not set the API host here. An absolute URL skips the rewrite, so the session cookie is cross-site on `vercel.app`. |

The API project is separate: Root Directory `backend`, Framework Preset Express. Do not add frontend rewrites there. `CORS_ORIGIN` on the API is only needed when the browser calls that host directly.

## Routes

- `/` Intro, About, Stack, Education, Recognition, Projects (YPINR virus animation), GitHub, Blog, Contact
- `/blog` paginated list, `/blog/:slug` rendered markdown (dates in the viewer's local time)
- `/admin` password login + markdown editor (live preview, publish date/time sent as ISO UTC, draft/published, optional slug)

All personal facts live in `src/data/resume.ts` and come from `public/Siyad_Yusuf_Resume.pdf` only.

## Scripts

- `node scripts/shoot.mjs [full top ypinr skills github empty blog post admin mobile video og]` screenshots into `screenshots/`
- `node scripts/smoke.mjs` functional checks (reduced motion, IntersectionObserver, pagination, contact 429, admin flow against the live backend)
