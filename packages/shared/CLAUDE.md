# @pocketdev/shared

Cross-platform shared code consumed by agent, mobile, web, and console. Defines the wire protocol, theme tokens, validation schemas, and crypto utilities.

## Exports

Import via package subpath exports:

```ts
import { lightTheme, darkTheme, palette, spacing, borderRadius, typographyScale } from '@pocketdev/shared/theme'
import { taskSchema, messageTypeEnum } from '@pocketdev/shared/schema'
import type { WsMessage, CommandType, EventType, Task, Device } from '@pocketdev/shared/types'
import { generateKeypair, sign, verify } from '@pocketdev/shared/crypto'
```

## Directory Structure

```
src/
├── theme/          # Design tokens
│   ├── palette.ts      Color scales (primary, accent, neutral, semantic, bauhaus)
���   ├── semantic.ts     lightTheme / darkTheme token maps
│   └── spacing.ts      Spacing scale, border radius, typography scale, font family tokens
├── schema/         # Zod validation
│   ├── enums.ts        taskStatusEnum, changeTypeEnum, devicePlatformEnum, agentTypeEnum
│   └── tables.ts       TABLE_NAMES constants
├── types/          # Wire protocol + models
│   ├─�� messages.ts     WsMessage envelope, CommandType, EventType
│   ├── models.ts       Device, Task, FileChange, InstallRecord
│   ├── capabilities.ts Provider capability types
│   ├── docker.ts       Container types
│   ├── files.ts        File node, search result types
│   ├── git.ts          Git change, commit, branch types
│   ├── plan.ts         Plan entry, step, question types
│   ├── projects.ts     Project summary types
│   ├── server-actions.ts Server metric, port, network types
│   └── setup.ts        ToolCheck, PrerequisitesReport types
└── crypto/         # Ed25519 operations
    └── ed25519.ts      generateKeypair, sign, verify via @noble/ed25519
```

## Wire Protocol
<!-- Deep dive: docs/protocol/wire-types.md -->

All WebSocket messages use a single envelope:

```ts
interface WsMessage<T = unknown> {
  type: CommandType | EventType
  id: string
  payload: T
  timestamp: number
}
```

**Commands** (mobile → server): `task.start`, `task.kill`, `task.input`, `task.list`, `container.logs.follow`, `container.logs.stop`, `files.approve`, `files.reject`, `terminal.input`, `terminal.resize`, `setup.check_prerequisites`, `plan.answer`, `plan.message`, `plan.accept`, `plan.deny`, `ping`

**Events** (server → mobile): `task.output`, `task.status_changed`, `task.completed`, `container.logs.chunk`, `container.logs.stopped`, `files.changed`, `device.connected`, `device.disconnected`, `terminal.output`, `terminal.exited`, `setup.prerequisites_result`, `plan.proposed`, `plan.agent_message`, `plan.step_updated`, `plan.resolved`, `pong`

## Conventions

- Zod schemas use **snake_case** field names matching DB columns
- Theme tokens consumed by Tailwind (web/console) and StyleSheet.create (mobile)
- Types define the wire protocol — changes here affect agent + mobile + console
- Crypto uses pure JS @noble/ed25519 (no native deps) — works identically in Bun and React Native
- Adding a new entity: schema in `schema/`, types in `types/`, Drizzle table in `packages/db` or `apps/agent/src/db/schema/`
