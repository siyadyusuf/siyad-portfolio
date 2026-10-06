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

Do not commit secrets. On Vercel set `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`, and a read-only `GITHUB_TOKEN`. Nothing goes live without the owner's OK.

## License

Personal project.
