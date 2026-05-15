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
        listTool: {
          description: 'List all available people.',
        },
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
  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'person', 'bob-smith', 'tools'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'person', 'bob-smith', 'data.json'),
    JSON.stringify({ title: 'Bob Smith' }, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'person', 'bob-smith', 'tools', '_default.md'),
    '# Bob Smith\n\n## biography\n\nA hero.\n'
  );
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'person', 'bob-smith', 'tools', 'skills.md'),
    '# Bob Smith\n\n## skills\n\n- tracking\n'
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
  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'place', 'work-site', 'tools'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'place', 'work-site', 'data.json'),
    JSON.stringify({ title: 'Work Site' }, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'place', 'work-site', 'tools', 'description.md'),
    '# Work Site\n\n## description\n\nDusty.\n'
  );

  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'agent-skill'), { recursive: true });
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'agent-skill', 'config.json'),
    JSON.stringify(
      {
        contentType: 'agent-skill',
        format: 'json',
        defaultTool: {
          fields: ['content'],
        },
        tools: [
          {
            name: 'full-text',
            fields: ['content'],
          },
        ],
      },
      null,
      2
    ) + '\n'
  );
  await fs.mkdir(path.join(tempDir, 'content', 'entries', 'agent-skill', 'tracker', 'tools'), {
    recursive: true,
  });
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'agent-skill', 'tracker', 'data.json'),
    JSON.stringify({ title: 'Tracker' }, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'agent-skill', 'tracker', 'tools', '_default.json'),
    JSON.stringify({ content: 'Track footprints through hostile terrain.' }, null, 2) + '\n'
  );
  await fs.writeFile(
    path.join(tempDir, 'content', 'entries', 'agent-skill', 'tracker', 'tools', 'full-text.json'),
    JSON.stringify({ content: 'Track footprints through hostile terrain.' }, null, 2) + '\n'
  );

  const server = createMcpServer(path.join(tempDir, 'content'));
  const toolNames = Object.keys(server['_registeredTools']);
  const listPersonTool = server['_registeredTools']['list_person'];
  const listAssetsTool = server['_registeredTools']['list_assets'];
  const defaultAgentSkillTool = server['_registeredTools']['get_agent_skill'];
  const namedAgentSkillTool = server['_registeredTools']['get_agent_skill_full_text'];

  assert.ok(toolNames.includes('list_person'));
  assert.equal(listPersonTool.description, 'List all available people.');
  assert.ok(listPersonTool.outputSchema);
  assert.ok(toolNames.includes('get_person'));
  assert.ok(toolNames.includes('get_person_metadata'));
  assert.ok(toolNames.includes('get_person_skills'));

  assert.ok(toolNames.includes('list_place'));
  assert.ok(!toolNames.includes('get_place'));
  assert.ok(!toolNames.includes('get_place_metadata'));
  assert.ok(toolNames.includes('get_place_description'));

  assert.ok(toolNames.includes('list_agent_skill'));
  assert.ok(toolNames.includes('get_agent_skill'));
  assert.ok(toolNames.includes('get_agent_skill_full_text'));
  assert.ok(!toolNames.includes('list_agent-skill'));
  assert.ok(!toolNames.includes('get_agent-skill'));
  assert.ok(!toolNames.includes('get_agent-skill_full-text'));
  assert.ok(defaultAgentSkillTool.outputSchema);
  assert.ok(namedAgentSkillTool.outputSchema);
  assert.equal(defaultAgentSkillTool.outputSchema.safeParse({ content: 'ok' }).success, true);
  assert.equal(defaultAgentSkillTool.outputSchema.safeParse({ content: 123 }).success, false);
  assert.equal(namedAgentSkillTool.outputSchema.safeParse({ content: 'ok' }).success, true);
  assert.equal(namedAgentSkillTool.outputSchema.safeParse({ content: 123 }).success, false);

  const listPersonResult = await listPersonTool.handler({ filter: undefined }, {} as never);
  const listAssetsResult = await listAssetsTool.handler({ filter: undefined }, {} as never);

  const defaultAgentSkillResult = await defaultAgentSkillTool.handler({ title: 'tracker' }, {} as never);
  const namedAgentSkillResult = await namedAgentSkillTool.handler({ title: 'tracker' }, {} as never);

  assert.deepEqual(listPersonResult.structuredContent, {
    titles: ['bob-smith'],
  });
  assert.deepEqual(listAssetsResult.structuredContent, {
    titles: [],
  });
  assert.deepEqual(defaultAgentSkillResult.structuredContent, {
    content: 'Track footprints through hostile terrain.',
  });
  assert.deepEqual(namedAgentSkillResult.structuredContent, {
    content: 'Track footprints through hostile terrain.',
  });

  console.log('Tool config registration test passed');
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});