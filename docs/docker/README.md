# Docker UI

This folder documents the Docker-only container inspection feature for PocketDev mobile.

## Files

- `server-setup.md` — how to enable Docker access on the agent host
- `mobile-container-ui.md` — what the mobile container workspace supports in v1

## Scope

Version one is intentionally narrow:

- Docker only
- container listing from `docker ps -a`
- snapshot logs from the beginning or end
- live log follow
- errors-only filtering based on stderr and common error patterns

Version one does not include:

- Kubernetes, Terraform, or Compose orchestration
- start/stop/restart lifecycle controls
- AI-assisted `docker inspect` analysis

When AI inspect is added later, it should run through the existing task system with Docker context included in the prompt.