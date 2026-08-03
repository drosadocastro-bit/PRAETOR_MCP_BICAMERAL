# PRAETOR-MCP Workspace Instructions

Follow the project-local addendum in [praetor-mcp.instructions.md](instructions/praetor-mcp.instructions.md).

For the MCP server implementation, use the TypeScript SDK patterns documented by the official SDK:

- `@modelcontextprotocol/server`
- `@modelcontextprotocol/server/stdio`
- `serveStdio(() => buildServer())` for stdio entrypoints

Keep all data synthetic, local, review-only, and deterministic.
