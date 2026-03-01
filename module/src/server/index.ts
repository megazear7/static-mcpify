import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { EntryConfigSchema } from '../types/index.js';
import type { EntryConfig } from '../types/index.js';

interface ContentTypeInfo {
  name: string;
  config: EntryConfig;
  entries: string[];
}

/**
 * Scans a content directory and returns the content structure.
 */
function scanContentDir(contentDir: string): {
  contentTypes: ContentTypeInfo[];
  assets: string[];
} {
  const entriesDir = path.join(contentDir, 'entries');
  const assetsDir = path.join(contentDir, 'assets');

  // Scan content types
  const contentTypes: ContentTypeInfo[] = [];

  if (fs.existsSync(entriesDir)) {
    const ctDirs = fs.readdirSync(entriesDir, { withFileTypes: true })
      .filter((d) => d.isDirectory());

    for (const ctDir of ctDirs) {
      const ctPath = path.join(entriesDir, ctDir.name);
      const configPath = path.join(ctPath, 'config.json');

      if (!fs.existsSync(configPath)) continue;

      const rawConfig = fs.readFileSync(configPath, 'utf-8');
      const config = EntryConfigSchema.parse(JSON.parse(rawConfig));

      const entries = fs.readdirSync(ctPath, { withFileTypes: true })
        .filter((d) => d.isDirectory())
        .map((d) => d.name);

      contentTypes.push({
        name: ctDir.name,
        config,
        entries,
      });
    }
  }

  // Scan assets
  let assets: string[] = [];
  if (fs.existsSync(assetsDir)) {
    assets = fs.readdirSync(assetsDir, { withFileTypes: true })
      .filter((f) => f.isFile())
      .map((f) => f.name);
  }

  return { contentTypes, assets };
}

/**
 * Creates an MCP server that exposes tools based on static content files.
 */
export function createMcpServer(contentDir: string): McpServer {
  const { contentTypes, assets } = scanContentDir(contentDir);

  const server = new McpServer({
    name: 'static-mcpify',
    version: '1.0.0',
  });

  // ============================================
  // list_assets tool
  // ============================================
  server.tool(
    'list_assets',
    'List all available assets. Optionally filter by filename substring.',
    {
      filter: z.string().optional().describe('Optional substring to filter asset filenames'),
    },
    async ({ filter }) => {
      let results = assets;
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        results = assets.filter((a) => a.toLowerCase().includes(lowerFilter));
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: results.length > 0
              ? results.join('\n')
              : 'No assets found matching the filter.',
          },
        ],
      };
    }
  );

  // ============================================
  // get_asset tool
  // ============================================
  server.tool(
    'get_asset',
    'Get details about a specific asset by filename.',
    {
      fileName: z.string().describe('The asset filename'),
    },
    async ({ fileName }) => {
      const assetsDir = path.join(contentDir, 'assets');
      const assetPath = path.join(assetsDir, fileName);

      if (!fs.existsSync(assetPath)) {
        return {
          content: [{ type: 'text' as const, text: `Asset "${fileName}" not found.` }],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: 'text' as const,
            text: `Asset: ${fileName}\nPath: ${assetPath}`,
          },
        ],
      };
    }
  );

  // ============================================
  // Per-content-type tools
  // ============================================
  for (const ct of contentTypes) {
    // list_<content-type>
    server.tool(
      `list_${ct.name}`,
      `List all ${ct.name} entries. Optionally filter by title substring.`,
      {
        filter: z.string().optional().describe('Optional substring to filter entry titles'),
      },
      async ({ filter }) => {
        let results = ct.entries;
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          results = ct.entries.filter((e) => e.toLowerCase().includes(lowerFilter));
        }
        return {
          content: [
            {
              type: 'text' as const,
              text: results.length > 0
                ? results.join('\n')
                : `No ${ct.name} entries found matching the filter.`,
            },
          ],
        };
      }
    );

    // get_<content-type>
    server.tool(
      `get_${ct.name}`,
      `Get the data for a specific ${ct.name} entry by title.`,
      {
        title: z.string().describe('The entry title (slug format, e.g., "bob-smith")'),
      },
      async ({ title }) => {
        const dataPath = path.join(contentDir, 'entries', ct.name, title, 'data.json');

        if (!fs.existsSync(dataPath)) {
          return {
            content: [
              { type: 'text' as const, text: `Entry "${title}" not found in ${ct.name}.` },
            ],
            isError: true,
          };
        }

        const data = fs.readFileSync(dataPath, 'utf-8');
        return {
          content: [{ type: 'text' as const, text: data }],
        };
      }
    );

    // get_<content-type>_<tool-name> for each tool
    for (const tool of ct.config.tools) {
      server.tool(
        `get_${ct.name}_${tool.name}`,
        `Get the ${tool.name} for a specific ${ct.name} entry.`,
        {
          title: z.string().describe('The entry title (slug format, e.g., "bob-smith")'),
        },
        async ({ title }) => {
          const mdPath = path.join(
            contentDir,
            'entries',
            ct.name,
            title,
            'tools',
            `${tool.name}.md`
          );

          if (!fs.existsSync(mdPath)) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Tool "${tool.name}" not found for entry "${title}" in ${ct.name}.`,
                },
              ],
              isError: true,
            };
          }

          const content = fs.readFileSync(mdPath, 'utf-8');
          return {
            content: [{ type: 'text' as const, text: content }],
          };
        }
      );
    }
  }

  return server;
}
