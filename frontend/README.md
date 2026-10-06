# Siyad Yusuf · portfolio frontend

Vite + React + TypeScript + Tailwind v4 + React Router. Dark, single-column, grid-lined layout.

## Run

```bash
npm install
npm run dev          # http://localhost:5173 (mock API by default)
npm run build        # type-check + production build
```

- `VITE_USE_MOCKS` (default `true`): in-browser mock API with clearly labeled **sample** data
  (posts, GitHub repos/activity/contributions). Mock admin password: `letmein`.
  Preview GitHub empty states in mock mode with `/?mockGithub=empty` or `/?mockGithub=null`.
- `VITE_USE_MOCKS=false`: calls the real backend at `/api`, proxied by Vite to
  `API_PROXY_TARGET` (default `http://localhost:3001`, e.g. `npm run dev:mock` in `../portfolio-backend`, password `dev`).

## Routes

- `/` Intro, About, Stack, Education, Recognition, Projects (YPINR virus animation), GitHub, Blog, Contact
- `/blog` paginated list, `/blog/:slug` rendered markdown (dates in the viewer's local time)
- `/admin` password login + markdown editor (live preview, publish date/time sent as ISO UTC, draft/published, optional slug)

All personal facts live in `src/data/resume.ts` and come from `public/Siyad_Yusuf_Resume.pdf` only.

## Scripts

- `node scripts/shoot.mjs [full top ypinr skills github empty blog post admin mobile video og]` screenshots into `screenshots/`
- `node scripts/smoke.mjs` functional checks (reduced motion, IntersectionObserver, pagination, contact 429, admin flow against the live backend)
