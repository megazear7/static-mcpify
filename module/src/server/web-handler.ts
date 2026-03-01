import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { createMcpServer } from './index.js';

/**
 * Handle an incoming web standard Request for the MCP server.
 * Returns a web standard Response.
 *
 * Designed for serverless and edge environments:
 * Netlify Functions, Cloudflare Workers, Deno, Bun, etc.
 *
 * @example
 * ```typescript
 * import { handleMcpRequest } from 'static-mcpify/web-handler';
 *
 * export default async (req: Request) => {
 *   return handleMcpRequest('./my-mcp/content', req);
 * };
 * ```
 */
export async function handleMcpRequest(
  contentDir: string,
  req: Request,
): Promise<Response> {
  const server = createMcpServer(contentDir);

  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    return await transport.handleRequest(req);
  } finally {
    await server.close();
  }
}

export { createMcpServer };
