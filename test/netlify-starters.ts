import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { handleMcpRequest } from '../module/src/server/web-handler.ts';

const repoRoot = process.cwd();
const staticStarterDir = path.join(repoRoot, 'starters', 'netlify-static-starter');
const contentfulStarterDir = path.join(repoRoot, 'starters', 'netlify-contentful-starter');

interface InitializeResponse {
  result: {
    instructions: string;
  };
}

interface ToolsListResponse {
  result: {
    tools: Array<{
      name: string;
    }>;
  };
}

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

function assertExists(relativePath: string): void {
  assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true, `${relativePath} should exist`);
}

async function requestMcp(
  contentDir: string,
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  const response = await handleMcpRequest(
    contentDir,
    new Request('http://localhost/mcp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method,
        params,
      }),
    })
  );

  return JSON.parse(await response.text()) as unknown;
}

async function main(): Promise<void> {
  assertExists('starters/netlify-static-starter/package.json');
  assertExists('starters/netlify-static-starter/README.md');
  assertExists('starters/netlify-static-starter/netlify.toml');
  assertExists('starters/netlify-static-starter/netlify/functions/mcp.js');
  assertExists('starters/netlify-contentful-starter/package.json');
  assertExists('starters/netlify-contentful-starter/README.md');
  assertExists('starters/netlify-contentful-starter/netlify.toml');
  assertExists('starters/netlify-contentful-starter/netlify/functions/mcp.js');
  assertExists('starters/netlify-contentful-starter/.env.example');

  const initializeParams = {
    protocolVersion: '2025-03-26',
    capabilities: {},
    clientInfo: { name: 'test', version: '0.1.0' },
  };
  const staticInitialize = await requestMcp(
    path.join(staticStarterDir, 'content'),
    'initialize',
    initializeParams
  ) as InitializeResponse;
  const contentfulInitialize = await requestMcp(
    path.join(contentfulStarterDir, 'content'),
    'initialize',
    initializeParams
  ) as InitializeResponse;
  const staticToolsList = await requestMcp(
    path.join(staticStarterDir, 'content'),
    'tools/list',
    {}
  ) as ToolsListResponse;
  const contentfulToolsList = await requestMcp(
    path.join(contentfulStarterDir, 'content'),
    'tools/list',
    {}
  ) as ToolsListResponse;

  const staticToolNames = staticToolsList.result.tools.map((tool) => tool.name);
  const contentfulToolNames = contentfulToolsList.result.tools.map((tool) => tool.name);

  assert.ok(staticToolNames.includes('list_person'));
  assert.ok(staticToolNames.includes('get_person_biography'));
  assert.ok(contentfulToolNames.includes('list_adventure'));
  assert.ok(contentfulToolNames.includes('get_adventure_metadata'));
  assert.ok(contentfulToolNames.includes('get_campaign'));
  assert.equal(
    staticInitialize.result.instructions,
    'Use list_* tools before get_* tools when you need to discover available titles.'
  );
  assert.equal(
    contentfulInitialize.result.instructions,
    'Use list_* tools before get_* tools when you need to discover available titles.'
  );

  const staticStarterFunction = read('starters/netlify-static-starter/netlify/functions/mcp.js');
  const contentfulStarterFunction = read('starters/netlify-contentful-starter/netlify/functions/mcp.js');
  const staticStarterToml = read('starters/netlify-static-starter/netlify.toml');
  const contentfulStarterToml = read('starters/netlify-contentful-starter/netlify.toml');
  const readme = read('README.md');
  const brandIndex = read('netlify/brand/index.html');
  const brandDeploy = read('netlify/brand/deploy.html');
  const brandDocs = read('netlify/brand/docs.html');
  const brandExamples = read('netlify/brand/examples.html');

  assert.match(staticStarterFunction, /path:\s*'\/mcp'/);
  assert.match(contentfulStarterFunction, /path:\s*'\/mcp'/);
  assert.match(staticStarterToml, /from = "\/mcp"/);
  assert.match(contentfulStarterToml, /from = "\/mcp"/);
  assert.match(staticStarterToml, /base = "\."/);
  assert.match(contentfulStarterToml, /base = "\."/);
  assert.match(contentfulStarterToml, /CONTENTFUL_API_TOKEN/);

  assert.match(readme, /base=starters\/netlify-static-starter/);
  assert.match(readme, /base=starters\/netlify-contentful-starter/);
  assert.match(brandIndex, /Deploy static starter/);
  assert.match(brandIndex, /Deploy Contentful starter/);
  assert.match(brandDeploy, /starters\/netlify-static-starter/);
  assert.match(brandDeploy, /starters\/netlify-contentful-starter/);
  assert.match(brandDocs, /Fastest Netlify path/);
  assert.match(brandExamples, /ready-to-deploy starter counterparts/);

  console.log('Netlify starter template test passed');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
