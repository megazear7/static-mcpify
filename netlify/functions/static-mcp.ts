import type { Context } from '@netlify/functions';
import { handleMcpRequest } from '../../src/server/handler.js';
import path from 'path';

const contentDir = path.join(process.cwd(), 'examples/static/content');

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
    const body = await req.json();
    let statusCode = 200;
    let responseHeaders: Record<string, string> = {};
    const chunks: string[] = [];

    const mockReq = {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      body,
    };

    const mockRes = {
      writeHead: (status: number, headers?: Record<string, string>) => {
        statusCode = status;
        if (headers) responseHeaders = { ...responseHeaders, ...headers };
      },
      end: (chunk?: string) => {
        if (chunk) chunks.push(chunk);
      },
      write: (chunk: string) => {
        chunks.push(chunk);
        return true;
      },
      on: (_event: string, _cb: () => void) => {},
    };

    await handleMcpRequest(contentDir, mockReq, mockRes);

    return new Response(chunks.join(''), {
      status: statusCode,
      headers: responseHeaders,
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
  includedFiles: ['examples/static/content/**'],
};
