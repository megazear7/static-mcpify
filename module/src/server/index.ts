import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import fs from 'fs';
import path from 'path';
import { DEFAULT_TOOL_BASENAME, EntryConfigSchema } from '../types/index.js';
import type { EntryConfig } from '../types/index.js';

interface ContentTypeInfo {
  name: string;
  config: EntryConfig;
  entries: string[];
}

function toToolIdentifierSegment(value: string): string {
  return value.replace(/-/g, '_');
}

function getToolFilename(name: string, format: EntryConfig['format']): string {
  return `${name}.${format === 'json' ? 'json' : 'md'}`;
}

function buildStructuredOutputSchema(fieldNames: string[]): z.ZodObject<Record<string, z.ZodString>> {
  const shape = Object.fromEntries(fieldNames.map((fieldName) => [fieldName, z.string()]));
  return z.object(shape);
}

const listToolOutputSchema = z.object({
  titles: z.array(z.string()),
});

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

  // Scan assets — only .json files, strip extension for tool display
  let assets: string[] = [];
  if (fs.existsSync(assetsDir)) {
    assets = fs.readdirSync(assetsDir, { withFileTypes: true })
      .filter((f) => f.isFile() && f.name.endsWith('.json'))
      .map((f) => f.name.replace(/\.json$/, ''));
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
  server.registerTool(
    'list_assets',
    {
      description: 'List all available assets. Optionally filter by name substring.',
      inputSchema: {
        filter: z.string().optional().describe('Optional substring to filter asset names'),
      },
      outputSchema: listToolOutputSchema,
    },
    async ({ filter }) => {
      let results = assets;
      if (filter) {
        const lowerFilter = filter.toLowerCase();
        results = assets.filter((a) => a.toLowerCase().includes(lowerFilter));
      }
      return {
        content: [],
        structuredContent: {
          titles: results,
        },
      };
    }
  );

  // ============================================
  // get_asset tool
  // ============================================
  server.tool(
    'get_asset',
    'Get details about a specific asset by name.',
    {
      name: z.string().describe('The asset name (e.g., "test-image")'),
    },
    async ({ name }) => {
      const assetsDir = path.join(contentDir, 'assets');
      const assetPath = path.join(assetsDir, `${name}.json`);

      if (!fs.existsSync(assetPath)) {
        return {
          content: [{ type: 'text' as const, text: `Asset "${name}" not found.` }],
          isError: true,
        };
      }

      const raw = fs.readFileSync(assetPath, 'utf-8');
      const assetJson = JSON.parse(raw);
      const baseUrl = process.env.BASE_URL || '';
      const enriched = { ...assetJson, url: `${baseUrl}/${assetJson.file}` };

      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify(enriched, null, 2),
          },
        ],
      };
    }
  );

  // ============================================
  // Per-content-type tools
  // ============================================
  for (const ct of contentTypes) {
    const contentTypeToolName = toToolIdentifierSegment(ct.name);

    // list_<content-type>
    server.registerTool(
      `list_${contentTypeToolName}`,
      {
        description: ct.config.listTool?.description ??
          `List all ${ct.name} entries. Optionally filter by title substring.`,
        inputSchema: {
          filter: z.string().optional().describe('Optional substring to filter entry titles'),
        },
        outputSchema: listToolOutputSchema,
      },
      async ({ filter }) => {
        let results = ct.entries;
        if (filter) {
          const lowerFilter = filter.toLowerCase();
          results = ct.entries.filter((e) => e.toLowerCase().includes(lowerFilter));
        }
        return {
          content: [],
          structuredContent: {
            titles: results,
          },
        };
      }
    );

    if (ct.config.includeMetadataTool) {
      server.tool(
        `get_${contentTypeToolName}_metadata`,
        `Get the metadata for a specific ${ct.name} entry by title.`,
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
    }

    if (ct.config.defaultTool) {
      if (ct.config.format === 'json') {
        server.registerTool(
          `get_${contentTypeToolName}`,
          {
            description: ct.config.defaultTool.description ??
              `Get the default content for a specific ${ct.name} entry.`,
            inputSchema: {
              title: z.string().describe('The entry title (slug format, e.g., "bob-smith")'),
            },
            outputSchema: buildStructuredOutputSchema(ct.config.defaultTool.fields),
          },
          async ({ title }) => {
            const jsonPath = path.join(
              contentDir,
              'entries',
              ct.name,
              title,
              'tools',
              getToolFilename(DEFAULT_TOOL_BASENAME, ct.config.format)
            );

            if (!fs.existsSync(jsonPath)) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Default tool not found for entry "${title}" in ${ct.name}.`,
                  },
                ],
                isError: true,
              };
            }

            return {
              content: [],
              structuredContent: JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>,
            };
          }
        );
      } else {
        server.tool(
          `get_${contentTypeToolName}`,
          ct.config.defaultTool.description ??
            `Get the default content for a specific ${ct.name} entry.`,
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
              getToolFilename(DEFAULT_TOOL_BASENAME, ct.config.format)
            );

            if (!fs.existsSync(mdPath)) {
              return {
                content: [
                  {
                    type: 'text' as const,
                    text: `Default tool not found for entry "${title}" in ${ct.name}.`,
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

    // get_<content-type>_<tool-name> for each tool
    for (const tool of ct.config.tools) {
      const namedToolName = toToolIdentifierSegment(tool.name);

      if (ct.config.format === 'json') {
        server.registerTool(
          `get_${contentTypeToolName}_${namedToolName}`,
          {
            description: tool.description ?? `Get the ${tool.name} for a specific ${ct.name} entry.`,
            inputSchema: {
              title: z.string().describe('The entry title (slug format, e.g., "bob-smith")'),
            },
            outputSchema: buildStructuredOutputSchema(tool.fields),
          },
          async ({ title }) => {
            const jsonPath = path.join(
              contentDir,
              'entries',
              ct.name,
              title,
              'tools',
              getToolFilename(tool.name, ct.config.format)
            );

            if (!fs.existsSync(jsonPath)) {
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

            return {
              content: [],
              structuredContent: JSON.parse(fs.readFileSync(jsonPath, 'utf-8')) as Record<string, unknown>,
            };
          }
        );
      } else {
        server.tool(
          `get_${contentTypeToolName}_${namedToolName}`,
          tool.description ?? `Get the ${tool.name} for a specific ${ct.name} entry.`,
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
              getToolFilename(tool.name, ct.config.format)
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
  }

  return server;
}
