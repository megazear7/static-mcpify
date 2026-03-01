import fs from 'fs/promises';
import path from 'path';
import inquirer from 'inquirer';
import { createClient } from 'contentful';
import chalk from 'chalk';
import { OutputConfigSchema, EntryConfigSchema } from '../../types/index.js';
import type { ToolConfig } from '../../types/index.js';

export async function initCommand(output: string): Promise<void> {
  const token = process.env.CONTENTFUL_API_TOKEN;
  const spaceId = process.env.SPACE_ID;

  if (!token) {
    throw new Error(
      'CONTENTFUL_API_TOKEN environment variable is not set.\n' +
        'Set it in your .env file or export it:\n' +
        '  export CONTENTFUL_API_TOKEN=your_token_here'
    );
  }

  if (!spaceId) {
    throw new Error(
      'SPACE_ID environment variable is not set.\n' +
        'Set it in your .env file or export it:\n' +
        '  export SPACE_ID=your_space_id_here'
    );
  }

  // Create output directories
  const entriesDir = path.join(output, 'content', 'entries');
  const assetsDir = path.join(output, 'content', 'assets');
  await fs.mkdir(entriesDir, { recursive: true });
  await fs.mkdir(assetsDir, { recursive: true });

  // Create output config
  const outputConfig = OutputConfigSchema.parse({ source: 'contentful' });
  await fs.writeFile(
    path.join(output, 'config.json'),
    JSON.stringify(outputConfig, null, 2) + '\n'
  );
  console.log(chalk.green('✓ Created config.json'));

  // Fetch content types from Contentful
  const client = createClient({ space: spaceId, accessToken: token });
  const contentTypesResponse = await client.getContentTypes();
  const contentTypes = contentTypesResponse.items;

  if (contentTypes.length === 0) {
    throw new Error('No content types found in this Contentful space.');
  }

  // Ask user which content types they want
  const { selectedContentTypes } = await inquirer.prompt<{ selectedContentTypes: string[] }>([
    {
      type: 'checkbox',
      name: 'selectedContentTypes',
      message: 'Which content types do you want to include?',
      choices: contentTypes.map((ct) => ({
        name: `${ct.name} (${ct.sys.id})`,
        value: ct.sys.id,
      })),
      validate: (answer: string[]) =>
        answer.length > 0 ? true : 'Please select at least one content type.',
    },
  ]);

  // For each selected content type, ask about tools and fields
  for (const ctId of selectedContentTypes) {
    const ct = contentTypes.find((c) => c.sys.id === ctId)!;
    const fields = ct.fields.map((f) => f.id);

    console.log(chalk.cyan(`\nConfiguring content type: ${ct.name} (${ctId})`));

    const tools: ToolConfig[] = [];
    let addMore = true;

    while (addMore) {
      const { toolName } = await inquirer.prompt<{ toolName: string }>([
        {
          type: 'input',
          name: 'toolName',
          message: `Enter a tool name for "${ct.name}" (e.g., description, biography):`,
          validate: (v: string) => (v.trim().length > 0 ? true : 'Tool name is required'),
        },
      ]);

      const { selectedFields } = await inquirer.prompt<{ selectedFields: string[] }>([
        {
          type: 'checkbox',
          name: 'selectedFields',
          message: `Select fields for the "${toolName}" tool:`,
          choices: fields.map((f) => ({ name: f, value: f })),
          validate: (answer: string[]) =>
            answer.length > 0 ? true : 'Select at least one field.',
        },
      ]);

      tools.push({ name: toolName.trim(), fields: selectedFields });

      const { more } = await inquirer.prompt<{ more: boolean }>([
        {
          type: 'confirm',
          name: 'more',
          message: `Add another tool for "${ct.name}"?`,
          default: false,
        },
      ]);
      addMore = more;
    }

    // Create content-type directory and config
    const ctDir = path.join(entriesDir, ctId);
    await fs.mkdir(ctDir, { recursive: true });

    const entryConfig = EntryConfigSchema.parse({ contentType: ctId, tools });
    await fs.writeFile(
      path.join(ctDir, 'config.json'),
      JSON.stringify(entryConfig, null, 2) + '\n'
    );
    console.log(chalk.green(`✓ Created ${ctId}/config.json`));
  }

  console.log(chalk.green('\n✅ Initialization complete!'));
  console.log(
    chalk.dim(`Run ${chalk.bold(`smcp build --output ${output}`)} to pull content.`)
  );
}
