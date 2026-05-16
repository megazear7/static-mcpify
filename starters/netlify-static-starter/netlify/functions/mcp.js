import path from 'node:path';

import { handleMcpRequest } from 'static-mcpify/web-handler';

const contentDir = path.join(process.cwd(), 'content');

export default async (req) => {
  if (req.method === 'GET') {
    return new Response(JSON.stringify({
      status: 'ok',
      mode: 'static',
      endpoint: '/mcp',
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  process.env.BASE_URL ??= new URL(req.url).origin;
  return handleMcpRequest(contentDir, req);
};

export const config = {
  path: '/mcp',
  includedFiles: ['../../content/**', '../../config.json'],
};
