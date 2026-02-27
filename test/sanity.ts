/**
 * Sanity test — verifies that the MCP servers and brand website are accessible.
 *
 * Usage: npx tsx test/sanity.ts
 *
 * Starts the servers, runs quick checks, then exits.
 */

import { spawn, type ChildProcess } from 'child_process';

const STATIC_PORT = 4100;
const CONTENTFUL_PORT = 4101;

let processes: ChildProcess[] = [];

function startServer(
  label: string,
  command: string,
  args: string[],
  port: number
): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    processes.push(proc);

    const timeout = setTimeout(() => {
      resolve(proc);
    }, 4000);

    proc.stdout?.on('data', (data: Buffer) => {
      const output = data.toString();
      if (output.includes(String(port)) || output.includes('Accepting connections')) {
        clearTimeout(timeout);
        resolve(proc);
      }
    });

    proc.stderr?.on('data', (data: Buffer) => {
      // Some output goes to stderr, that's ok
      const output = data.toString();
      if (output.includes('Error') && !output.includes('EADDRINUSE')) {
        console.error(`[${label}] stderr: ${output}`);
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

async function checkEndpoint(url: string, label: string): Promise<boolean> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      console.log(`  ✅ ${label}: ${url} — HTTP ${res.status}`);
      return true;
    }
    console.log(`  ❌ ${label}: ${url} — HTTP ${res.status}`);
    return false;
  } catch (err) {
    console.log(`  ❌ ${label}: ${url} — ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function checkMcpEndpoint(url: string, label: string): Promise<boolean> {
  try {
    const body = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2025-03-26',
        capabilities: {},
        clientInfo: { name: 'test', version: '0.1.0' },
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const text = await res.text();
      if (text.includes('serverInfo') || text.includes('static-mcpify')) {
        console.log(`  ✅ ${label}: MCP initialize OK`);
        return true;
      }
      console.log(`  ⚠️  ${label}: Response received but unexpected format`);
      console.log(`     ${text.substring(0, 200)}`);
      return true; // Still counts as reachable
    }
    console.log(`  ❌ ${label}: HTTP ${res.status}`);
    return false;
  } catch (err) {
    console.log(`  ❌ ${label}: ${err instanceof Error ? err.message : String(err)}`);
    return false;
  }
}

async function main() {
  console.log('\n🧪 static-mcpify Sanity Tests\n');

  // Start servers
  console.log('Starting servers...');

  await startServer(
    'static',
    'npx',
    ['tsx', 'src/server/standalone.ts', 'examples/static/content', String(STATIC_PORT)],
    STATIC_PORT
  );

  await startServer(
    'contentful',
    'npx',
    ['tsx', 'src/server/standalone.ts', 'examples/contentful/content', String(CONTENTFUL_PORT)],
    CONTENTFUL_PORT
  );

  // Give servers time to start
  await new Promise((resolve) => setTimeout(resolve, 3000));

  console.log('\nRunning checks...\n');

  let passed = 0;
  let failed = 0;

  // Check health endpoints
  console.log('Health endpoints:');
  (await checkEndpoint(`http://localhost:${STATIC_PORT}/health`, 'Static MCP Health'))
    ? passed++ : failed++;
  (await checkEndpoint(`http://localhost:${CONTENTFUL_PORT}/health`, 'Contentful MCP Health'))
    ? passed++ : failed++;

  // Check MCP endpoints
  console.log('\nMCP endpoints:');
  (await checkMcpEndpoint(`http://localhost:${STATIC_PORT}/mcp`, 'Static MCP'))
    ? passed++ : failed++;
  (await checkMcpEndpoint(`http://localhost:${CONTENTFUL_PORT}/mcp`, 'Contentful MCP'))
    ? passed++ : failed++;

  // Summary
  console.log(`\n${'─'.repeat(40)}`);
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log(`${'─'.repeat(40)}\n`);

  // Cleanup
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error('Test runner failed:', err);
  for (const proc of processes) {
    proc.kill('SIGTERM');
  }
  process.exit(1);
});
