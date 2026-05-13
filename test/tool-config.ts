import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { createMcpServer } from '../module/src/server/index.ts';

async function main(): Promise<void> {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'static-mcpify-tool-config-'));

  try {
  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'person'), { recursive: true });
  await fs.mkdir(path.join(tempDir, 'content', 'assets'), { recursive: true });

  await fs.writeFile(
    path.join(tempDir, 'config.json'),
    JSON.stringify({ source: null }, null, 2) + '\n'
  );

  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'person', 'config.json'),
    JSON.stringify(
      {
        contentType: 'person',
        includeMetadataTool: true,
        defaultTool: {
          fields: ['biography'],
        },
        tools: [
          {
            name: 'skills',
            fields: ['skills'],
          },
        ],
      },
      null,
      2
    ) + '\n'
  );

  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'place'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'place', 'config.json'),
    JSON.stringify(
      {
        contentType: 'place',
        tools: [
          {
            name: 'description',
            fields: ['description'],
          },
        ],
      },
      null,
      2
    ) + '\n'
  );

  const server = createMcpServer(path.join(tempDir, 'content'));
  const toolNames = Object.keys(server['_registeredTools']);

  assert.ok(toolNames.includes('list_person'));
  assert.ok(toolNames.includes('get_person'));
  assert.ok(toolNames.includes('get_person_metadata'));
  assert.ok(toolNames.includes('get_person_skills'));

  assert.ok(toolNames.includes('list_place'));
  assert.ok(!toolNames.includes('get_place'));
  assert.ok(!toolNames.includes('get_place_metadata'));
  assert.ok(toolNames.includes('get_place_description'));

  console.log('Tool config registration test passed');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});