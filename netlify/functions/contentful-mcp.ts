import type { Context } from '@netlify/functions';
import { handleMcpRequest } from 'static-mcpify/web-handler';
import path from 'path';

const contentDir = path.join(process.cwd(), 'examples/contentful/content');

export default async (req: Request, _context: Context): Promise<Response> => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', server: 'contentful-mcp' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return handleMcpRequest(contentDir, req);
};

export const config = {
  path: '/example/contentful/mcp',
  includedFiles: ['../../examples/contentful/content/**'],
};
