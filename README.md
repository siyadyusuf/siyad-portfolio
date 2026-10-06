# Siyad Yusuf — Portfolio

Personal portfolio site for [Siyad Yusuf](https://www.linkedin.com/in/siyad-yusuf-08b446263/), a GMU Computer Science student (B.S. expected May 2027).

Dark, single-column layout with About, tech stack, education, recognition, projects (including a virus-style animation for [YPINR](https://yourprinceisnotreal.net/)), live GitHub activity, a phone-style blog with a password-protected editor, and a contact form.

## Stack

| Layer | Tech |
| --- | --- |
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Node.js, Express, TypeScript, PostgreSQL |
| Hosting (planned) | Vercel (site + API), Neon (Postgres), Resend (contact email) |

## Layout

```
frontend/   Vite React app
backend/    Express API
```

## Local development

**Backend**

```bash
cd backend
cp .env.example .env
npm install
npm run dev:mock   # http://localhost:3001  (admin password: dev)
```

**Frontend**

```bash
cd frontend
cp .env.example .env   # set VITE_USE_MOCKS=false to use the real API
npm install
npm run dev            # http://localhost:5173
```

## Deploy notes

Two Vercel projects. Do not commit secrets. Nothing goes live without the owner's OK.

**Frontend** (`https://siyad-portfolio-2tfg.vercel.app`): Root Directory `frontend`, Framework Preset Vite. `frontend/vercel.json` rewrites client routes (`/blog`, `/blog/:slug`, `/admin`, …) to `index.html`, and proxies `/api/*` to the API host. Set `VITE_USE_MOCKS=false`. Leave `VITE_API_BASE` unset so the app calls same-origin `/api`. See `frontend/README.md`.

**API**: Root Directory `backend`, Framework Preset Express. Set `DATABASE_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, and a read-only `GITHUB_TOKEN`. Set `NODE_ENV=production` so the login cookie is `Secure`. `CORS_ORIGIN` is only needed if the browser calls the API host directly.

## License

Personal project.
