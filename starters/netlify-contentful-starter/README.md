# static-mcpify Netlify Contentful starter

Deploy a ready-to-use MCP server with bundled sample content and optional Contentful rebuilds.

## What you get

- Prebuilt sample content in `content/`
- Existing `config.json` and content-type configs ready for `smcp build --output .`
- A Netlify Function already wired to `/mcp`
- `netlify.toml` that rebuilds from Contentful when `CONTENTFUL_API_TOKEN` and `SPACE_ID` are set
- A tiny landing page in `public/`

## Configure Contentful

Set these environment variables in Netlify or locally before running `npm run build:contentful`:

```bash
CONTENTFUL_API_TOKEN=your_token
SPACE_ID=your_space
```
