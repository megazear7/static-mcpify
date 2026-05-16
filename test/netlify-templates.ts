import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';

import { createMcpServer } from '../module/src/server/index.ts';
import { handleMcpRequest } from '../module/src/server/web-handler.ts';

const root = path.resolve(process.cwd());

const templates = [
  {
    name: 'static starter',
    dir: path.join(root, 'templates', 'netlify-static-starter'),
    expectedTools: ['list_assets', 'get_asset', 'list_guide', 'get_guide', 'get_guide_metadata', 'get_guide_checklist'],
    expectedHealthServer: 'static-mcp-starter',
  },
  {
    name: 'Contentful starter',
    dir: path.join(root, 'templates', 'netlify-contentful-starter'),
    expectedTools: ['list_assets', 'get_asset', 'list_campaign', 'get_campaign', 'get_campaign_metadata', 'get_campaign_briefing', 'list_adventure', 'get_adventure', 'get_adventure_metadata', 'get_adventure_rewards'],
    expectedHealthServer: 'contentful-mcp-starter',
  },
];

async function main(): Promise<void> {
  for (const template of templates) {
    const packageJson = JSON.parse(await fs.readFile(path.join(template.dir, 'package.json'), 'utf8'));
    const netlifyToml = await fs.readFile(path.join(template.dir, 'netlify.toml'), 'utf8');
    const healthModule = await import(path.join(template.dir, 'netlify', 'functions', 'mcp.mjs'));

    assert.equal(packageJson.dependencies['static-mcpify'], '^1.1.4');
    assert.match(netlifyToml, /from = "\/mcp"/);
    assert.match(netlifyToml, /directory = "netlify\/functions"/);

    const healthResponse = await healthModule.default(new Request('https://example.com/mcp', {
      method: 'GET',
    }));
    const healthBody = await healthResponse.json();
    assert.equal(healthBody.server, template.expectedHealthServer);

    const contentDir = path.join(template.dir, 'content');
    const server = createMcpServer(contentDir);
    const registeredTools = Object.keys(server['_registeredTools']);
    for (const tool of template.expectedTools) {
      assert.ok(registeredTools.includes(tool), `${template.name} should register ${tool}`);
    }
    await server.close();

    const initializeResponse = await handleMcpRequest(
      contentDir,
      new Request('https://example.com/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'template-test', version: '0.1.0' },
          },
        }),
      })
    );

    assert.equal(initializeResponse.status, 200);
    const initializeText = await initializeResponse.text();
    assert.match(initializeText, /static-mcpify|serverInfo/);
  }

  console.log('Netlify starter template test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
