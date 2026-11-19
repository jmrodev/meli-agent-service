#!/usr/bin/env node
import 'dotenv/config';
import { startMcpStdio } from './mcp/index.js';

startMcpStdio().catch((err) => {
  console.error('Fatal error in MCP Server:', err);
  process.exit(1);
});
