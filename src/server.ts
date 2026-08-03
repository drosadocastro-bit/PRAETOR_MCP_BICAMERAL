import { McpServer } from '@modelcontextprotocol/server';
import { serveStdio } from '@modelcontextprotocol/server/stdio';

import { registerPraetorTools } from './tools.js';

export function buildPraetorServer(): McpServer {
  const server = new McpServer({
    name: 'praetor-mcp',
    version: '0.1.0'
  });

  registerPraetorTools(server);
  return server;
}

export function servePraetorMcp(): void {
  void serveStdio(buildPraetorServer);
}
