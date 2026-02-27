import type { Context } from '@netlify/functions';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from '../../src/server/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const contentDir = path.resolve(__dirname, '../../examples/static/content');

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', server: 'static-mcp' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const server = createMcpServer(contentDir);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    await server.connect(transport);

    // Create a passthrough to capture the response
    const body = await req.json();
    const responseChunks: string[] = [];

    const mockRes = {
      writeHead: (_status: number, _headers?: Record<string, string>) => {},
      end: (chunk?: string) => {
        if (chunk) responseChunks.push(chunk);
      },
      write: (chunk: string) => {
        responseChunks.push(chunk);
        return true;
      },
      on: (_event: string, _cb: () => void) => {},
    };

    const mockReq = {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body,
    };

    await transport.handleRequest(mockReq as unknown as Parameters<typeof transport.handleRequest>[0], mockRes as unknown as Parameters<typeof transport.handleRequest>[1], body);
    await server.close();

    const responseBody = responseChunks.join('');

    return new Response(responseBody, {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const config = {
  path: '/example/static/mcp',
};
