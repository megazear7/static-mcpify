import fs from 'fs/promises';
import path from 'path';
import chalk from 'chalk';
import { OutputConfigSchema, EntryConfigSchema } from '../../types/index.js';
import type { OutputConfig, EntryConfig } from '../../types/index.js';
import { getSourceAdapter } from '../sources/index.js';

export async function buildCommand(
  output: string,
  contentTypeFilter?: string[]
): Promise<void> {
  // 1. Read and validate output config
  const configPath = path.join(output, 'config.json');
  let rawConfig: string;
  try {
    rawConfig = await fs.readFile(configPath, 'utf-8');
  } catch {
    throw new Error(
      `Could not read ${configPath}.\n` +
        `Make sure you have run "smcp init --output ${output}" first.`
    );
  }

  const outputConfig: OutputConfig = OutputConfigSchema.parse(JSON.parse(rawConfig));

  if (!outputConfig.source) {
    throw new Error(
      'source is required to run the build.\n' +
        `Set "source" in ${configPath} to one of: "contentful"`
    );
  }

  // 2. Discover content type directories
  const entriesDir = path.join(output, 'content', 'entries');
  let contentTypeDirs: string[];
  try {
    const entries = await fs.readdir(entriesDir, { withFileTypes: true });
    contentTypeDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    throw new Error(
      `Could not read ${entriesDir}.\n` +
        `Make sure you have run "smcp init --output ${output}" first.`
    );
  }

  // Apply content-type filter if specified
  if (contentTypeFilter && contentTypeFilter.length > 0) {
    const unknown = contentTypeFilter.filter((ct) => !contentTypeDirs.includes(ct));
    if (unknown.length > 0) {
      throw new Error(
        `Unknown content type(s): ${unknown.join(', ')}.\n` +
          `Available: ${contentTypeDirs.join(', ')}`
      );
    }
    contentTypeDirs = contentTypeDirs.filter((ct) => contentTypeFilter.includes(ct));
  }

  if (contentTypeDirs.length === 0) {
    throw new Error('No content types found. Run "smcp init" first.');
  }

  // 3. Get source adapter
  const adapter = getSourceAdapter(outputConfig.source);

  // 4. Ensure assets directory exists
  const assetsDir = path.join(output, 'content', 'assets');
  await fs.mkdir(assetsDir, { recursive: true });

  // 5. Build each content type
  for (const ctId of contentTypeDirs) {
    const ctDir = path.join(entriesDir, ctId);
    const ctConfigPath = path.join(ctDir, 'config.json');

    let rawCtConfig: string;
    try {
      rawCtConfig = await fs.readFile(ctConfigPath, 'utf-8');
    } catch {
      throw new Error(
        `Could not read ${ctConfigPath}.\nMake sure the config exists for content type "${ctId}".`
      );
    }

    const entryConfig: EntryConfig = EntryConfigSchema.parse(JSON.parse(rawCtConfig));

    console.log(chalk.cyan(`Building content type: ${ctId}`));

    // Pull entries from source
    const entries = await adapter.fetchEntries(ctId);
    console.log(chalk.dim(`  Found ${entries.length} entries`));

    for (const entry of entries) {
      const entityDir = path.join(ctDir, entry.slug);
      const toolsDir = path.join(entityDir, 'tools');
      await fs.mkdir(toolsDir, { recursive: true });

      // Write data.json (all fields except rich text)
      await fs.writeFile(
        path.join(entityDir, 'data.json'),
        JSON.stringify(entry.data, null, 2) + '\n'
      );

      // Write tool markdown files
      for (const tool of entryConfig.tools) {
        const markdown = adapter.buildToolMarkdown(entry, tool.fields);
        await fs.writeFile(
          path.join(toolsDir, `${tool.name}.md`),
          markdown
        );
      }

      // Download referenced assets
      for (const asset of entry.referencedAssets) {
        const assetPath = path.join(assetsDir, asset.fileName);
        try {
          await fs.access(assetPath);
          // Skip if already downloaded
        } catch {
          await adapter.downloadAsset(asset.url, assetPath);
        }
      }

      console.log(chalk.dim(`  ✓ ${entry.title} → ${entry.slug}`));
    }
  }

  console.log(chalk.green('\n✅ Build complete!'));
}
