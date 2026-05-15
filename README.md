# static-mcpify

[![npm version](https://badge.fury.io/js/static-mcpify.svg)](https://www.npmjs.com/package/static-mcpify)

Turn any structured content into a static **MCP (Model Context Protocol)** server.

`static-mcpify` pulls content from your CMS (currently Contentful), builds it into static Markdown and JSON files, then serves those files as a fully-featured MCP server. Your AI agents get instant access to your content — no database, no runtime dependencies.

**[Website](https://static-mcpify.alexlockhart.me/)** · **[npm](https://www.npmjs.com/package/static-mcpify)** · **[GitHub](https://github.com/megazear7/static-mcpify)**

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/megazear7/static-mcpify)

## Quick Start

### 1. Install

```bash
npm install static-mcpify
```

### 2. Initialize

Set your Contentful credentials in a `.env` file:

```env
CONTENTFUL_API_TOKEN=your_token_here
SPACE_ID=your_space_id_here
```

Run the init wizard to choose content types and configure tools:

```bash
npx smcp init --output my-mcp
```

### 3. Build

Pull content from Contentful and generate static files:

```bash
npx smcp build --output my-mcp
```

Build specific content types only:

```bash
npx smcp build --output my-mcp --content-type blog --content-type author
```

### 4. Serve

#### Serverless (Netlify Functions, Cloudflare Workers, Deno, Bun)

Use the web standard handler — it takes a `Request` and returns a `Response`:

```typescript
import { handleMcpRequest } from 'static-mcpify/web-handler';

export default async (req: Request) => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok' }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return handleMcpRequest('./my-mcp/content', req);
};
```

#### Express / Node.js HTTP

Use the Node.js handler for traditional server environments:

```typescript
import { handleMcpRequest } from 'static-mcpify/handler';
import express from 'express';

const app = express();
app.use(express.json());

app.all('/mcp', async (req, res) => {
  await handleMcpRequest('./my-mcp/content', req, res);
});

app.listen(3000);
```

## How It Works

### Content Structure

After building, your output directory looks like:

```
my-mcp/
├── config.json
└── content/
    ├── assets/
    │   └── photo.json
    └── entries/
        ├── person/
      │   ├── config.json           # defaultTool + tools: biography, skills
        │   ├── bob-smith/
        │   │   ├── data.json         # All non-rich-text fields
        │   │   └── tools/
      │   │       ├── _default.md   # Output for get_person
      │   │       ├── biography.md  # Output for get_person_biography
        │   │       └── skills.md
        │   └── steve-baker/
        │       ├── data.json
        │       └── tools/
      │           ├── _default.md
      │           ├── biography.md
        │           └── skills.md
        └── place/
            ├── config.json
            └── work-site/
                ├── data.json
                └── tools/
                    └── description.md
```

  `_default.md` is only generated when `defaultTool` is configured for that entry type. Named tool files like `biography.md` or `description.md` are only generated for entries listed in `tools`.

### Auto-Generated Tools

The MCP server dynamically creates tools based on the content structure:

| Tool | Description |
|------|-------------|
| `list_assets` | List assets, with optional filter |
| `get_asset` | Get asset details by name |
| `list_<type>` | List entries of a content type, with optional filter |
| `get_<type>` | Get the configured default tool content by title slug |
| `get_<type>_metadata` | Get entry metadata JSON by title slug when enabled |
| `get_<type>_<tool>` | Get a tool's markdown by title slug |

Tool names are MCP-safe identifiers, so dashes in content type IDs or tool names are normalized to underscores. For example, `agent-skill` becomes `get_agent_skill`.

All list tools return MCP `structuredContent` in the shape `{ "titles": ["...", "..."] }` and advertise an `outputSchema` for that response.

For example, with content types `person` (default tool enabled, tools: biography, skills) and `place` (tools: description):

- `list_person` / `get_person` / `get_person_metadata` / `get_person_biography` / `get_person_skills`
- `list_place` / `get_place` / `get_place_description`
- `list_assets` / `get_asset`

## Configuration

### Output Config (`config.json`)

```json
{
  "source": "contentful",
  "instructions": [
    "Use list_* tools before get_* tools when you need to discover available titles."
  ]
}
```

`instructions` is optional. When omitted, it defaults to `"Use list_* tools before get_* tools when you need to discover available titles."`.

These instructions are sent in the MCP `initialize` response as server-level guidance for clients.

### Entry Config (`content/entries/<type>/config.json`)

```json
{
  "contentType": "person",
  "format": "json",
  "listTool": {
    "description": "List all available people."
  },
  "includeMetadataTool": true,
  "defaultTool": {
    "description": "Get the primary biography for a specific person.",
    "fields": ["biography"]
  },
  "tools": [
    {
      "name": "biography",
      "fields": ["biography"]
    },
    {
      "name": "skills",
      "fields": ["skills", "certifications"]
    }
  ]
}
```

`format` is optional and defaults to `"string"`.

`listTool` is optional. When present, it lets you override the description shown for `list_<type>`.

`includeMetadataTool` is optional and defaults to `false`.

`defaultTool` is optional. When present, it controls the content returned by `get_<type>`. When omitted, `get_<type>` is not registered.

`tools` is optional. Each named tool defines a name and which Contentful fields to include.

When `format` is `"string"`, tool output is rendered as concatenated Markdown and returned in the MCP `content` field.

When `format` is `"json"`, each configured field is returned as a property on MCP `structuredContent`, and the generated tool definition includes an `outputSchema`.

List tools always use `structuredContent`, regardless of `format`.

## Live Examples

Try the hosted example MCP servers by adding these to your VS Code `mcp.json`:

**Static Content Example** (people and places):

```json
{
  "static-example": {
    "type": "http",
    "url": "https://static-mcpify.alexlockhart.me/example/static/mcp"
  }
}
```

**Contentful Example** (fantasy adventures and campaigns):

```json
{
  "contentful-example": {
    "type": "http",
    "url": "https://static-mcpify.alexlockhart.me/example/contentful/mcp"
  }
}
```

## Adding a New Source Adapter

To add support for a new CMS (e.g., Sanity, Strapi):

1. Create `module/src/cli/sources/<name>/index.ts`
2. Implement the `SourceAdapter` interface from `module/src/cli/sources/adapter.ts`
3. Register it in `module/src/cli/sources/index.ts`
4. Add the source name to the Zod enum in `module/src/types/config.ts`

## Development

### Prerequisites

- Node.js 22+
- npm

### Project Structure

```
module/                # Publishable npm package (static-mcpify)
├── src/
│   ├── types/         # Zod schemas and TypeScript types
│   ├── cli/           # smcp CLI tool (init + build commands)
│   │   └── sources/   # Source adapters (pluggable)
│   │       └── contentful/
│   └── server/        # MCP server + handlers
├── package.json
└── tsconfig.json
netlify/               # Brand website + hosted examples
├── brand/             # Static HTML/CSS brand website
├── functions/         # Netlify serverless function handlers
└── package.json
examples/              # Example content and configs
├── static/            # Pre-built static content (no CMS needed)
└── contentful/        # Contentful-backed content (built at deploy time)
test/                  # Sanity tests
```

This is an npm workspace with two packages:

- **`module/`** — The publishable `static-mcpify` npm package (CLI + MCP server)
- **`netlify/`** — Brand website and Netlify serverless functions for hosted examples

### Commands

| Command | Description |
|---------|-------------|
| `npm start` | Start both MCP servers (static + contentful) and brand website |
| `npm run build` | TypeScript compile + build contentful example |
| `npm run build:ts` | TypeScript compile only |
| `npm test` | Sanity check MCP server endpoints |
| `npm run lint` | Run ESLint |
| `npm run fix` | Run ESLint with auto-fix |

### Local Development

`npm start` runs three services concurrently:

- **Static MCP server** at `http://localhost:3100/mcp`
- **Contentful MCP server** at `http://localhost:3101/mcp`
- **Brand website** at `http://localhost:3102`

### Testing

Run the sanity tests, which spin up both MCP servers and verify health and MCP initialize responses:

```bash
npm test
```

Always run lint and TypeScript compilation before committing:

```bash
npm run lint
npm run build:ts
```

### Netlify Deployment

The project deploys to [static-mcpify.alexlockhart.me](https://static-mcpify.alexlockhart.me/) via Netlify.

- Pushes to `main` trigger automatic deploys
- Build command: `npm run build:ts && npm run build:contentful`
- `node_bundler = "nft"` (Node File Tracing) resolves workspace packages in functions
- Environment variables `CONTENTFUL_API_TOKEN` and `SPACE_ID` are set as secrets on Netlify

The Netlify functions use `static-mcpify/web-handler` which wraps the MCP SDK's `WebStandardStreamableHTTPServerTransport` with `enableJsonResponse: true`. This returns a JSON response instead of SSE streaming, which is required for stateless serverless environments.

## License

ISC

---

Made by [Alex Lockhart](https://www.alexlockhart.me/)
