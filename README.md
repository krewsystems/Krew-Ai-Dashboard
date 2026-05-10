# Krew Admin Dashboard

Internal cost & usage tracking tool for Krew founders.

## Setup

```bash
npm install --legacy-peer-deps
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

## Auth

Login with email + password via Supabase Auth. Only emails listed in `src/lib/allowedEmails.ts` can access the dashboard. Add both founder emails there.

## Stack

- Next.js 15 (App Router)
- Supabase JS client + Realtime
- Recharts
- Tailwind CSS v3
- TypeScript
