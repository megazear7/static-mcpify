# static-mcpify — Copilot Instructions

## Project Overview

static-mcpify is a TypeScript project that:
1. Pulls content from CMS sources (currently Contentful) via the `smcp` CLI tool
2. Builds static files (Markdown, JSON) from the content
3. Serves those files as an MCP (Model Context Protocol) server

The repo is structured as an npm workspace with two packages:
- `module/` — The publishable `static-mcpify` npm package (CLI + MCP server)
- `netlify/` — Brand website and Netlify serverless functions for hosted examples

## Architecture

- `module/src/types/` — Zod schemas and TypeScript types shared across the codebase
- `module/src/cli/` — The `smcp` CLI tool with `init` and `build` commands
- `module/src/cli/sources/` — Source adapters (pluggable pattern). Add new sources here.
- `module/src/cli/sources/contentful/` — Contentful source adapter
- `module/src/server/` — MCP server that reads static content files and exposes tools
- `netlify/brand/` — Static HTML/CSS brand website
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
- **npm workspaces** — Root package.json uses workspaces for `module/` and `netlify/`

## Key Commands

- `npm start` — Run both MCP servers and brand website locally
- `npm run build` — TypeScript compile + build contentful example
- `npm test` — Sanity check all servers
- `npm run fix` — ESLint auto-fix
- `npm run lint` — ESLint check

## When Making Changes

1. Always validate with Zod schemas where data enters the system
2. Keep error messages descriptive and actionable
3. When adding a new source adapter, implement `SourceAdapter` from `module/src/cli/sources/adapter.ts`
4. MCP tools are auto-generated from the content folder structure — no manual tool registration needed
5. Run `npm run lint` and `npm run build:ts` before committing

## Netlify Deployment

The project deploys to **https://static-mcpify.alexlockhart.me/** via Netlify (site ID: `39af3d21-e3e2-414d-b2c6-5484b833b27b`).

### Live MCP Endpoints

- **Static example:** `https://static-mcpify.alexlockhart.me/example/static/mcp`
- **Contentful example:** `https://static-mcpify.alexlockhart.me/example/contentful/mcp`

Both endpoints accept:
- `GET` — Health check (returns `{"status":"ok"}`)
- `POST` — MCP JSON-RPC requests (returns `application/json`)

### Testing MCP Endpoints

Test with curl:
```bash
# Health check
curl https://static-mcpify.alexlockhart.me/example/static/mcp

# MCP initialize
curl -X POST https://static-mcpify.alexlockhart.me/example/static/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-03-26","capabilities":{},"clientInfo":{"name":"test","version":"0.1.0"}}}'

# List tools
curl -X POST https://static-mcpify.alexlockhart.me/example/static/mcp \
  -H 'Content-Type: application/json' \
  -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}'
```

### VS Code MCP Integration

The workspace `.vscode/mcp.json` configures `static-example` and `contentful-example` servers pointing to the live URLs. These appear in VS Code's MCP panel and can be used by Copilot.

### Debugging Deploys

- Pushes to `main` trigger automatic deploys
- Use the Netlify MCP server (configured in `.vscode/mcp.json`) to check deploy status, logs, and environment variables
- Netlify auth token is at `~/Library/Preferences/netlify/config.json` — export as `$NETLIFY_TOKEN` for API calls
- Build config is in `netlify.toml` — uses `node_bundler = "nft"` (Node File Tracing) for workspace package resolution
- Environment variables `CONTENTFUL_API_TOKEN` and `SPACE_ID` are set as secrets on Netlify (required for contentful example build)

### Serverless Transport Notes

The Netlify functions use `static-mcpify/web-handler` which wraps the MCP SDK's `WebStandardStreamableHTTPServerTransport` with `enableJsonResponse: true`. This returns a JSON response instead of SSE streaming, which is required for stateless serverless environments where the function invocation ends before clients finish reading a stream.
