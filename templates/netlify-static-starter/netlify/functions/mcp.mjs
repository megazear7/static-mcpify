import path from 'node:path';
import { handleMcpRequest } from 'static-mcpify/web-handler';

const contentDir = path.join(process.cwd(), 'content');

export default async (req) => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({ status: 'ok', server: 'static-mcp-starter' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return handleMcpRequest(contentDir, req);
};

export const config = {
  path: '/mcp',
  includedFiles: ['../../content/**'],
};
