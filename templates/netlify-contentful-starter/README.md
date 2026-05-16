# static-mcpify Netlify Contentful starter

This starter deploys immediately using the checked-in sample content, then rebuilds from your own Contentful space as soon as you add credentials.

## What you get

- A Netlify Function at `/mcp`
- Checked-in sample Contentful-style output in `content/`
- A build script that runs `smcp build --output .` when both `CONTENTFUL_API_TOKEN` and `SPACE_ID` are present
- A lightweight landing page in `public/`

## Connect your own space

1. Add `CONTENTFUL_API_TOKEN` and `SPACE_ID` in Netlify environment variables.
2. Trigger a new deploy.
3. The build script will replace the sample content with freshly pulled entries.
