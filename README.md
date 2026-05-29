# enso × Notion · Blog Agent

Prototype of an enso-style blog content agent built for Notion's voice. React + Vite + a Vercel serverless function that proxies the Anthropic API.

## Run locally

```bash
npm install
cp .env.example .env       # then paste your ANTHROPIC_API_KEY
npx vercel dev             # runs Vite + /api/generate together
```

Open http://localhost:3000.

> `npm run dev` alone runs only Vite — the `/api/generate` route won't exist. Use `vercel dev`.

## Deploy to Vercel

```bash
npm i -g vercel
vercel                     # link / create project
vercel env add ANTHROPIC_API_KEY
vercel --prod              # ship
```

You get a live `*.vercel.app` URL.

## Structure

```
api/generate.ts   Vercel serverless fn — system prompt + Anthropic call lives here
src/App.tsx       UI, POSTs { topic, type } to /api/generate
```

The brand-voice system prompt is server-side so it isn't exposed in the bundle.

## GitHub Pages note

GH Pages is static-only — no serverless. If you must host there, either:
- proxy through a Cloudflare Worker holding the key, or
- add a client-side API-key field (acceptable for a personal demo, not for sharing).

Vercel's the clean path.

## Model

`claude-sonnet-4-6`. Swap in `api/generate.ts`.
