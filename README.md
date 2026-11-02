# Make My Marriage · KaLi's era

A private web app where a couple and their families plan one Indian wedding together: events, tasks, expenses, vendors, guests, invitations and RSVPs, photos and the livestream. Guests need no account; each household gets its own link.

This repository is currently the **foundation scaffold**: tooling, structure, design tokens and a health endpoint. Product features are built on top of it in the order set out in [System Design](docs/System%20Design%20v1.md#build-order-and-items-to-verify).

## Prerequisites

- **Node.js 24.22.1** (see `.nvmrc`). With nvm: `nvm use`.
- **pnpm 12.16.1**, through Corepack, which ships with Node: `corepack enable`. The `packageManager` field in `package.json` selects the version.
- **Optional:** a MongoDB Atlas cluster, or a local MongoDB running as a replica set. Without one, the app runs and reports the database as `not_configured`.

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill in only what you need
pnpm dev
```

Then open:

- <http://localhost:3000>: landing page
- <http://localhost:3000/dashboard>: app shell
- <http://localhost:3000/api/health>: `{ "data": { "status": "ok", "version": "0.1.0", "db": "not_configured" } }`

Every variable is explained in [`.env.example`](.env.example). Never commit `.env.local` or any real secret.

## Scripts

| Script              | What it does                                         |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev`          | Start the development server                         |
| `pnpm build`        | Production build                                     |
| `pnpm start`        | Serve the production build                           |
| `pnpm typecheck`    | Generate Next.js types, then run `tsc --noEmit`      |
| `pnpm lint`         | ESLint, including the module import rule             |
| `pnpm format`       | Format all files with Prettier                       |
| `pnpm format:check` | Check formatting without writing                     |
| `pnpm test`         | Unit tests (Vitest)                                  |
| `pnpm test:e2e`     | End-to-end tests (Playwright); starts the app itself |

CI (`.github/workflows/ci.yml`) runs install, typecheck, lint, format check, unit tests, build and e2e on every pull request and every push to `main`.

## Folder overview

```
src/
  app/                  Routes (Next.js App Router)
    (public)/           Landing page at /
    (auth)/             Log in, sign up
    (app)/              Organiser app shell and dashboard
    w/[slug]/           Public wedding website
    i/[token]/          Personal invitation page for a guest household
    u/[eventToken]/     Upload-only page opened from an event QR code
    photographer/       Photographer upload area
    api/health/         Health check
    api/jobs/run/       Job runner endpoint (placeholder, returns 404)
    api/v1/             REST API, one folder per module
  modules/<module>/     Business logic, one folder per module:
    model.ts            Mongoose schemas (private to the module)
    service.ts          Business logic
    schemas.ts          Zod request and response schemas
    policy.ts           Role permissions
    index.ts            The only file other code may import
  platform/             Shared infrastructure: env, errors, HTTP helpers, request ids, database
  components/           Shared UI: brand/, layout/, ui/
  lib/                  Shared helpers (dates, INR formatting)
tests/
  unit/                 Vitest
  e2e/                  Playwright
docs/                   Product and technical documents
```

**Module rule:** code outside a module imports it only through its `index.ts` (`@/modules/tasks`), never a file inside it (`@/modules/tasks/model`). ESLint enforces this.

## Documentation

- [PRD](docs/PRD_v1.md): features, roles, scope
- [System Design](docs/System%20Design%20v1.md): architecture, modules, folder layout
- [Database Design](docs/Database%20Design%20v1.md): collections, indexes, conventions
- [API Design](docs/API%20Design%20v1.md): response envelope, errors, endpoints
- [Design system](docs/design-system.md): colours, fonts, components
- [Decisions](docs/decisions.md): every decision not covered by the docs above
