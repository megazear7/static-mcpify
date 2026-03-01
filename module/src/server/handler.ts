import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './index.js';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Handle an incoming HTTP request for the MCP server.
 * This function can be used by any HTTP server framework.
 */
export async function handleMcpRequest(
  contentDir: string,
  req: {
    method: string;
    url?: string;
    headers: Record<string, string | string[] | undefined>;
    body: unknown;
  },
  res: {
    writeHead: (status: number, headers?: Record<string, string>) => void;
    end: (body?: string) => void;
    write: (chunk: string) => void;
    on: (event: string, cb: () => void) => void;
  }
): Promise<void> {
  const server = createMcpServer(contentDir);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  await server.connect(transport);

  try {
    await transport.handleRequest(
      req as unknown as IncomingMessage,
      res as unknown as ServerResponse,
      req.body
    );
  } finally {
    await server.close();
  }
}

export { createMcpServer };
