# AgentSnow

A terminal-based AI coding agent that helps you plan, build, and debug projects directly from the command line.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   CLI (TUI) │────▶│  Server API  │────▶│  AI Models  │
│ OpenTUI+React│    │    Hono      │     │  Claude/GPT │
└─────────────┘     └──────┬───────┘     │  Gemini     │
                           │              └─────────────┘
                           ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    │  (Prisma)    │
                    └──────────────┘
```

## Projects

| Path | Description |
|------|-------------|
| `apps/cli` | Terminal UI client (OpenTUI + React) |
| `apps/server` | API server (Hono) |
| `packages/db` | Prisma schema + database client |
| `packages/shared` | Shared types, tool schemas, model definitions |

## Quick Start

```bash
# Prerequisites: Bun ≥ 1.3, PostgreSQL

git clone <repo-url>
cd agent-snow
bun install

cp .env.example .env
# Edit .env with your DATABASE_URL, API keys, etc.

cd packages/db
bun run generate
bun run migrate
cd ../..

# Start the server
bun --filter server dev

# In another terminal, start the CLI
bun --filter cli dev
```

## Commands

| Command | Description |
|---------|-------------|
| `/agents` | Toggle BUILD / PLAN mode |
| `/models` | Select an AI model |
| `/sessions` | Browse past sessions |
| `/theme` | Change color theme |
| `/login` | Sign in with GitHub |
| `/upgrade` | Purchase credits |
