import { servePraetorMcp } from './server.js';
import { createWebApp } from './webApp.js';

const isStdioMode =
  process.argv.includes('--stdio') ||
  process.env.STDIO === 'true' ||
  (!process.env.PORT && !process.env.HTTP && !process.env.LISTEN_HTTP);

if (isStdioMode) {
  servePraetorMcp();
  console.error('PRAETOR-MCP server running on stdio');
} else {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '0.0.0.0';
  const app = createWebApp();

  app.listen(port, host, () => {
    console.log(`PRAETOR-MCP Web Dashboard & REST Server listening on http://${host}:${port}`);
  });
}
