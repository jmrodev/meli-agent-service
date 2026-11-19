#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Cargar .env desde el directorio raíz del proyecto meli-agent-service
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { startMcpStdio } from './mcp/index.js';

startMcpStdio().catch((err) => {
  console.error('Fatal error in MCP Server:', err);
  process.exit(1);
});
