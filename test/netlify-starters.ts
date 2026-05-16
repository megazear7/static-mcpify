import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { createMcpServer } from '../module/src/server/index.ts';

const repoRoot = process.cwd();
const staticStarterDir = path.join(repoRoot, 'starters', 'netlify-static-starter');
const contentfulStarterDir = path.join(repoRoot, 'starters', 'netlify-contentful-starter');

function read(relativePath: string): string {
  return fs.readFileSync(path.join(repoRoot, relativePath), 'utf-8');
}

function assertExists(relativePath: string): void {
  assert.equal(fs.existsSync(path.join(repoRoot, relativePath)), true, `${relativePath} should exist`);
}

function main(): void {
  assertExists('starters/netlify-static-starter/package.json');
  assertExists('starters/netlify-static-starter/netlify.toml');
  assertExists('starters/netlify-static-starter/netlify/functions/mcp.js');
  assertExists('starters/netlify-contentful-starter/package.json');
  assertExists('starters/netlify-contentful-starter/netlify.toml');
  assertExists('starters/netlify-contentful-starter/netlify/functions/mcp.js');
  assertExists('starters/netlify-contentful-starter/.env.example');

  const staticStarterServer = createMcpServer(path.join(staticStarterDir, 'content'));
  const contentfulStarterServer = createMcpServer(path.join(contentfulStarterDir, 'content'));

  const staticToolNames = Object.keys(staticStarterServer['_registeredTools']);
  const contentfulToolNames = Object.keys(contentfulStarterServer['_registeredTools']);

  assert.ok(staticToolNames.includes('list_person'));
  assert.ok(staticToolNames.includes('get_person_biography'));
  assert.ok(contentfulToolNames.includes('list_adventure'));
  assert.ok(contentfulToolNames.includes('get_adventure_metadata'));
  assert.ok(contentfulToolNames.includes('get_campaign'));
  assert.equal(staticStarterServer.server['_instructions'], 'Use list_* tools before get_* tools when you need to discover available titles.');
  assert.equal(contentfulStarterServer.server['_instructions'], 'Use list_* tools before get_* tools when you need to discover available titles.');

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

main();
