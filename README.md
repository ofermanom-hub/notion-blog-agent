# enso × Notion · Blog Agent

Prototype of an enso-style blog content agent built for Notion's voice. React + Vite + a Vercel serverless function that proxies the Anthropic API.

## Features

- **Four formats:** headlines, topic ideas, post intro, and a full draft with SEO (meta description + suggested internal links).
- **Review loop:** every output is inline-editable. Regenerate a single headline, regenerate a whole draft, copy, and approve/reject each piece — because approval, not generation, is the real bottleneck.
- **Brand switcher:** swap voice + theme between Notion / Patagonia / Duolingo. Proves the multi-tenant model — same app, different brand config.
- **Brand grounding (RAG-lite):** each brand carries curated style exemplars injected into the system prompt to anchor cadence and themes. Stands in for a real retrieval step (see below).

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
api/brands.ts     Per-brand voice + grounding exemplars + system-prompt builder (server)
api/generate.ts   Vercel serverless fn — Anthropic call, types, single-item regen
src/brands.ts     Per-brand theme (colors, fonts, mark) — client
src/types.ts      Shared response shapes
src/App.tsx       UI: brand switcher, composer, review loop, POSTs { topic, type, brand } to /api/generate
```

The brand-voice system prompt + grounding live server-side so they aren't exposed in the bundle — the same pattern a real multi-tenant enso deployment needs, where each customer's voice config is sensitive.

## Brand grounding → real RAG

`api/brands.ts` ships a small static corpus of style exemplars per brand, injected into the system prompt. In production this would be a retrieval step: embed the brand's actual blog, store vectors, and pull the passages closest to the topic at request time. The prompt contract stays the same — only the source of the exemplars changes.

## GitHub Pages note

GH Pages is static-only — no serverless. If you must host there, either:
- proxy through a Cloudflare Worker holding the key, or
- add a client-side API-key field (acceptable for a personal demo, not for sharing).

Vercel's the clean path.

## Model

`claude-sonnet-4-6`. Swap in `api/generate.ts`.
