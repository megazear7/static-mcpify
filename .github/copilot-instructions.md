# static-mcpify — Copilot Instructions

## Project Overview

static-mcpify is a TypeScript project that:
1. Pulls content from CMS sources (currently Contentful) via the `smcp` CLI tool
2. Builds static files (Markdown, JSON) from the content
3. Serves those files as an MCP (Model Context Protocol) server

## Architecture

- `src/types/` — Zod schemas and TypeScript types shared across the codebase
- `src/cli/` — The `smcp` CLI tool with `init` and `build` commands
- `src/cli/sources/` — Source adapters (pluggable pattern). Add new sources here.
- `src/cli/sources/contentful/` — Contentful source adapter
- `src/server/` — MCP server that reads static content files and exposes tools
- `brand/` — Static HTML/CSS brand website
- `netlify/functions/` — Netlify serverless function handlers
- `examples/static/` — Pre-built static example content
- `examples/contentful/` — Contentful example (config only; content built at build time)
- `test/` — Sanity tests

## Conventions

- **TypeScript everywhere** — All source code is TypeScript with ES modules
- **Zod validation** — Use Zod schemas for all data validation, throw on parse errors
- **Descriptive errors** — All error messages should tell the user what went wrong and how to fix it
- **Source adapter pattern** — New content sources implement the `SourceAdapter` interface
- **Module resolution** — Use `.js` extensions in imports (NodeNext module resolution)
- **Static content structure** — Content follows the pattern: `content/entries/<type>/<slug>/data.json` and `content/entries/<type>/<slug>/tools/<tool>.md`

## Key Commands

- `npm start` — Run both MCP servers and brand website locally
- `npm run build` — TypeScript compile + build contentful example
- `npm test` — Sanity check all servers
- `npm run fix` — ESLint auto-fix
- `npm run lint` — ESLint check

## When Making Changes

1. Always validate with Zod schemas where data enters the system
2. Keep error messages descriptive and actionable
3. When adding a new source adapter, implement `SourceAdapter` from `src/cli/sources/adapter.ts`
4. MCP tools are auto-generated from the content folder structure — no manual tool registration needed
5. Run `npm run lint` and `npm run build:ts` before committing
