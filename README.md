# UNIVZERO  ·  Start today. Become more tomorrow.

Free, mobile-first accountability app. Next.js + TypeScript + Tailwind + Supabase (Auth, Postgres, Storage).

## 1. Supabase (browser only)
1. supabase.com -> New project (free plan).
2. SQL Editor -> paste all of `supabase/migrations/001_schema.sql` -> Run.
3. Authentication -> URL Configuration -> Site URL = your Vercel URL (add it later), and add `https://YOUR-SITE/auth/callback` to Redirect URLs.
4. Project Settings -> API: copy Project URL, `anon` key, `service_role` key.

## 2. Run / deploy without a computer
- GitHub Codespaces (github.com -> your repo -> Code -> Codespaces) gives you VS Code + terminal in the browser.
- Upload this project, then in the terminal: `cp .env.example .env.local` (fill it), `npm install`, `npm run dev`.
- Deploy: vercel.com -> Add New Project -> import the repo -> add the same env vars -> Deploy.

## Environment variables
See `.env.example`. `SUPABASE_SERVICE_ROLE_KEY` and `ANTHROPIC_API_KEY` are server-only. Never prefix them with NEXT_PUBLIC_.

## Tests
`npm test` runs the streak / what-if / scheduling / reminder logic tests.

## Known limits
- Reminders fire while the app is open or installed and alive. True background push needs a push server (not included).
- Free Supabase storage is 1 GB total; uploads are capped per file (photos 5 MB, promises 10 MB, future-self video 50 MB).
- The project was written without network access, so it has not been compiled or run against a live Supabase yet. Expect a few small fixes on first build.
