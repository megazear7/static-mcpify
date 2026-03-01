#!/usr/bin/env node

import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { buildCommand } from './commands/build.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('smcp')
  .description('static-mcpify – Build and serve static MCP servers from CMS content')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize an output folder with config files and content structure')
  .requiredOption('--output <path>', 'Output directory path')
  .action(async (opts) => {
    try {
      await initCommand(opts.output);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Init failed: ${message}\n`);
      process.exit(1);
    }
  });

program
  .command('build')
  .description('Pull content from the configured source and build local files')
  .requiredOption('--output <path>', 'Output directory path')
  .option('--content-type <types...>', 'Only build specific content types')
  .action(async (opts) => {
    try {
      await buildCommand(opts.output, opts.contentType);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n❌ Build failed: ${message}\n`);
      process.exit(1);
    }
  });

program.parse();
