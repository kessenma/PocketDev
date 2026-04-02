# Docker Server Setup

Use this checklist when you want the PocketDev agent to expose Docker container inspection to the mobile app.

## Requirements

- Docker CLI installed on the server
- Docker daemon running
- the PocketDev agent process user can access Docker

## Install and verify Docker

On Ubuntu or Debian:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Start Docker and verify it:

```bash
sudo systemctl enable --now docker
docker info
docker ps -a
```

## Give the agent access to Docker

The simplest path is to run the PocketDev agent as a user in the `docker` group.

```bash
sudo usermod -aG docker "$USER"
newgrp docker
docker info
```

If the agent runs under a dedicated service account, add that account to the `docker` group instead.

## Security notes

- Anyone who can use Docker on the host can inspect containers and often escalate to full host access.
- Do not expose the Docker socket directly over the network.
- Keep PocketDev device pairing enabled and authenticated in production.

## What PocketDev uses

The current implementation reads Docker state with:

- `docker ps -a`
- `docker logs`

PocketDev does not modify containers in this feature. It only reads state and log output.

## Expected failure modes

If Docker is unavailable, the mobile screen will fail with one of these messages:

- Docker is not available on this server.
- Docker is installed but this server user cannot access it.
- Container not found.

Those failures usually mean one of these:

- Docker is not installed
- Docker daemon is stopped
- the agent user is not in the `docker` group
- the selected container no longer exists