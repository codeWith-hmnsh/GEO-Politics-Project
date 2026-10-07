# GeoPolitics

One living 3D globe that explains what is happening in the world today: wars, alliances, money and power.

- Plan and design: [`docs/`](docs/README.md) (start with the PRD)
- Approved design prototype: [`all_refrence-ui/prototype-v3/`](all_refrence-ui/prototype-v3/) (run `npx serve all_refrence-ui/prototype-v3`)

## Stack

Next.js 16 (App Router, Turbopack) · TypeScript · Tailwind CSS v4 · shadcn/ui (Radix) · React Bits · Motion · React Three Fiber + three.js · TanStack Query · Zustand · Zod · Supabase · Vitest · Playwright

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in keys when needed (docs/DATA-SOURCES.md §7)
npm run dev                  # http://localhost:3000
```

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, no emit |
| `npm test` | Unit tests (Vitest) |
| `npm run test:e2e` | Browser tests (Playwright; run `npx playwright install chromium` once) |

## Layout

```
app/               Next.js routes, layout, providers
components/ui/     shadcn/ui components (restyled to our tokens)
components/bits/   React Bits effects (SplitText, BlurText, CountUp, AnimatedList, ShinyText)
lib/geo, lib/camera  Sphere and camera maths shared by the globe
config/flags.ts    Feature flags per milestone
supabase/migrations  Database schema
public/textures/   Earth, relief, water, night-lights and cloud textures
e2e/               Playwright tests
docs/              Product, design, data, architecture, content and build plan
```
