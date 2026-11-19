import 'dotenv/config';
import { buildApp } from './app.js';
import { MeliClient } from './meli/client.js';
import { MeliAuth } from './meli/auth.js';

async function main() {
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  const host = process.env.HOST || '0.0.0.0';

  const clientId = process.env.MELI_CLIENT_ID || '';
  const clientSecret = process.env.MELI_CLIENT_SECRET || '';
  const redirectUri = process.env.MELI_REDIRECT_URI || `http://localhost:${port}/api/v1/auth/callback`;

  let auth: MeliAuth | undefined;
  if (clientId && clientSecret) {
    auth = new MeliAuth({ clientId, clientSecret, redirectUri });
  }

  const client = new MeliClient({ auth });
  const app = buildApp({ client, auth });

  try {
    await app.listen({ port, host });
    console.log(`meli-agent-service HTTP listening on http://${host}:${port}`);
  } catch (err) {
    console.error('Error starting HTTP server:', err);
    process.exit(1);
  }
}

main();
