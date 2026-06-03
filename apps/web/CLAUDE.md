# PocketDev Web

Landing page and marketing site at pocketdev.run. Hosts the agent install script and tracks installations.

## Tech Stack

- TanStack Start + Vite
- Tailwind CSS + shadcn/ui
- Server-side rendering

## Commands

```bash
pnpm dev:web   # Dev server (port 3000)
```

## Routes

| Route | File | Purpose |
|---|---|---|
| `/` | `routes/index.tsx` | Landing page (scroll-animated hero, how it works, repo history, trident diagram, docs callout) |

## Components

```
src/components/
├── landing/           Landing page shared components
│   ├── Features.tsx       Feature highlight cards
│   ├── InstallCommand.tsx curl install command display
│   └── Footer.tsx         Site footer
├── architecture/      Architecture page sections + animations (shared by both pages)
│   ├── sections/          HowPocketDevWorks, TechStack, SecurityModel, etc.
│   ├── animations/        PocketHeroSvg, ArchitectureHeroAnimation, hero-sequence
│   └── shared/            Theme tokens, brand assets
└── ui/                shadcn components (accordion, badge, button, card)
```

## Server

- `server.ts` — Install script hosting endpoint, install tracking API
- Uses `@pocketdev/db` for install analytics (Postgres)

## Deployment

Docker via Coolify on Linux server.
