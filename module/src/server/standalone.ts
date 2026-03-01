import express from 'express';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { createMcpServer } from './index.js';
import path from 'path';

const args = process.argv.slice(2);
const contentDir = args[0] || 'examples/static/content';
const port = parseInt(args[1] || '3100', 10);

// Resolve contentDir relative to cwd
const resolvedContentDir = path.resolve(process.cwd(), contentDir);

const app = express();
app.use(express.json());

app.all('/mcp', async (req, res) => {
  const server = createMcpServer(resolvedContentDir);

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });

  res.on('close', () => {
    transport.close().catch(() => {});
    server.close().catch(() => {});
  });

  await server.connect(transport);

  await transport.handleRequest(req, res, req.body);
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', contentDir: resolvedContentDir });
});

app.listen(port, () => {
  console.log(`🚀 MCP server running at http://localhost:${port}/mcp`);
  console.log(`   Content dir: ${resolvedContentDir}`);
  console.log(`   Health: http://localhost:${port}/health`);
});
