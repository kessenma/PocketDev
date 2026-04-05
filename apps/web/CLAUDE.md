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
| `/` | `routes/index.tsx` | Landing page |
| `/architecture` | `routes/architecture.tsx` | Architecture overview |

## Components

```
src/components/
├── landing/           Landing page sections
│   ├── Hero.tsx           Main hero with animated graphic
│   ├── Features.tsx       Feature highlights
│   ├── HowItWorks.tsx     Step-by-step flow
│   ├── InstallCommand.tsx curl install command display
│   ├── Architecture.tsx   System diagram
│   ├── Footer.tsx         Site footer
│   └── hero-graphic/      Animated hero illustration components
├── architecture/      Architecture page sections
│   ├── SystemOverview, TechStack, SecurityModel, WireProtocol, AgentEndpoints
│   └── arch-graphic/  Architecture diagram components
└── ui/                shadcn components (badge, button, card)
```

## Server

- `server.ts` — Install script hosting endpoint, install tracking API
- Uses `@pocketdev/db` for install analytics (Postgres)

## Deployment

Docker via Coolify on Linux server.
