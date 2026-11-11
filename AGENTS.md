<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project rules

- **Specs:** `docs/` (PRD, System Design, Database Design, API Design, design system) are the source of truth. Log anything they don't cover, or that differs from them, in `docs/decisions.md`. Never edit or reformat `docs/*v1.md`.
- **Project status:** `docs/project-status.md` tracks every big feature. Starting, finishing or merging one means updating its row in the summary table and its log entry (newest first), plus the "Up next" list, in the same commit.
- **Structure:** route handlers stay thin (parse, authorize, call a service); business logic lives in `src/modules/<name>/service.ts`. Import another module only via `@/modules/<name>` (ESLint enforces it).
- **Data:** every query filters by `ctx.weddingId`; money is integer paise; dates use Asia/Kolkata.
- **API:** responses use the `{ data }` / `{ data, page }` / `{ error }` envelope from `src/platform/http.ts`; throw `AppError` with codes from API Design.
- **Naming:** React components in PascalCase, all other files kebab-case.
- **UI:** only the tokens in `docs/design-system.md`; mobile first from 360 px.
- **Before committing:** `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm test:e2e`.
