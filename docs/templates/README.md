# README Template

## Unified Structure

```markdown
# <Service Name>

<One-line description>

## Prerequisites

- Node.js 22+
- pnpm 10+

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VAR_NAME` | What it does | `value` |

> **⚠️ Important:** Build-time variables (`VITE_*`) are baked into the static bundle at build time. To change them, modify `.env.local` before building, or pass `--build-arg` during `docker build`.

## Deployment

### Option 1: Docker (Recommended)

Build image (must run from monorepo root):

```bash
docker build -f <path>/Dockerfile -t <tag> .
```

Run container:

```bash
docker run -d \
    --name <name> \
    -p <host>:<container> \
    <tag>
```

Or use Docker Compose (one command for all services):

```bash
cd docker && docker compose up --build
```

### Option 2: Local

```bash
# Install dependencies (from monorepo root)
pnpm install

# Build workspace dependencies and the service
pnpm --filter @ecoctrl/<dep> build
pnpm --filter @ecoctrl/<service> build

# Start
pnpm --filter @ecoctrl/<service> start
```

## Development

```bash
# Start dev server with hot reload
pnpm --filter @ecoctrl/<service> dev
```

## Common Commands

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start dev server (hot reload) |
| `pnpm build` | Production build |
| `pnpm preview` | Preview production build |
| `pnpm start` | Build and serve (production) |
| `pnpm check` | Type check + lint |
```
