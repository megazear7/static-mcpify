# static-mcpify

[![npm version](https://badge.fury.io/js/static-mcpify.svg)](https://www.npmjs.com/package/static-mcpify)

Turn any structured content into a static **MCP (Model Context Protocol)** server.

`static-mcpify` pulls content from your CMS (currently Contentful), builds it into static Markdown and JSON files, then serves those files as a fully-featured MCP server. Your AI agents get instant access to your content — no database, no runtime dependencies.

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

Create a simple server to host your MCP endpoint:

```javascript
import { handleMcpRequest } from 'static-mcpify/handler';
import express from 'express';

const app = express();
app.use(express.json());

app.all('/mcp', async (req, res) => {
  await handleMcpRequest('./my-mcp/content', req, res);
});

app.listen(3000, () => {
  console.log('MCP server running at http://localhost:3000/mcp');
});
```

Your MCP server is running at `http://localhost:3000/mcp`.

### Serverless / Edge Deployment

For serverless environments (Netlify Functions, Cloudflare Workers, Deno, Bun) use the web standard handler:

```javascript
import { handleMcpRequest } from 'static-mcpify/web-handler';

export default async (req) => {
  return handleMcpRequest('./my-mcp/content', req);
};
```

This takes a web standard `Request` and returns a `Response` — no mocking or bridging needed.

## How It Works

### Content Structure

After building, your output directory looks like:

```
my-mcp/
├── config.json
└── content/
    ├── assets/
    │   └── photo.png
    └── entries/
        ├── person/
        │   ├── config.json           # Tools: biography, skills
        │   ├── bob-smith/
        │   │   ├── data.json         # All non-rich-text fields
        │   │   └── tools/
        │   │       ├── biography.md  # Rich text → Markdown
        │   │       └── skills.md
        │   └── steve-baker/
        │       ├── data.json
        │       └── tools/
        │           ├── biography.md
        │           └── skills.md
        └── place/
            ├── config.json
            └── work-site/
                ├── data.json
                └── tools/
                    └── description.md
```

### Auto-Generated Tools

The MCP server dynamically creates tools based on the content structure:

| Tool | Description |
|------|-------------|
| `list_assets` | List assets, with optional filter |
| `get_asset` | Get asset details by filename |
| `list_<type>` | List entries of a content type, with optional filter |
| `get_<type>` | Get entry data.json by title slug |
| `get_<type>_<tool>` | Get a tool's markdown by title slug |

For example, with content types `person` (tools: biography, skills) and `place` (tools: description):

- `list_person` / `get_person` / `get_person_biography` / `get_person_skills`
- `list_place` / `get_place` / `get_place_description`
- `list_assets` / `get_asset`

## Configuration

### Output Config (`config.json`)

```json
{
  "source": "contentful"
}
```

The `source` field determines which adapter is used during `smcp build`. Current options: `"contentful"`.

### Entry Config (`content/entries/<type>/config.json`)

```json
{
  "contentType": "person",
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

Each tool defines a name and which Contentful fields to include. Rich text fields are automatically converted to Markdown.

## Development

### Prerequisites

- Node.js 20+
- npm

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

### Examples

The project includes two example setups:

- **`examples/static/`** — Pre-built static content (person, place) for development and testing
- **`examples/contentful/`** — Contentful-backed example (requires `.env` with credentials)

## Deployment

### Netlify

The project includes first-class Netlify support:

1. Functions in `netlify/functions/` handle MCP requests
2. The `netlify.toml` configures routing:
   - `/example/static/mcp` → Static example MCP server
   - `/example/contentful/mcp` → Contentful example MCP server
3. The brand website is served from `netlify/brand/`

Just connect your repo to Netlify and deploy.

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

## Architecture

```
module/                # Publishable npm package (static-mcpify)
├── src/
│   ├── types/         # Zod schemas and TypeScript types
│   ├── cli/           # smcp CLI tool
│   │   ├── commands/  # init and build commands
│   │   └── sources/   # Source adapters (pluggable)
│   │       └── contentful/
│   └── server/        # MCP server
├── package.json
└── tsconfig.json
netlify/               # Brand website and hosted examples
├── brand/             # Static brand website
├── functions/         # Netlify serverless handlers
└── package.json
examples/              # Example content and configs
test/                  # Sanity tests
```

## License

ISC

---

Made by [Alex Lockhart](https://www.alexlockhart.me/)
