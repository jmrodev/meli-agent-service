import fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import crypto from 'node:crypto';
import { MeliClient } from './meli/client.js';
import { MeliAuth } from './meli/auth.js';

export interface AppOptions {
  client: MeliClient;
  auth?: MeliAuth;
}

export function buildApp(options: AppOptions): FastifyInstance {
  const app = fastify({
    logger: false
  });

  const startTime = Date.now();

  // CORS y Rate Limiting defensivo (EDI 3 / OWASP LLM)
  app.register(cors, { origin: true });
  app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute'
  });

  // GET /health
  app.get('/health', async () => {
    return {
      status: 'ok',
      uptime: Number(((Date.now() - startTime) / 1000).toFixed(2))
    };
  });

  // GET /api/v1/auth/url
  app.get('/api/v1/auth/url', async (req, reply) => {
    if (!options.auth) {
      return reply.status(500).send({
        error: 'CONFIG_ERROR',
        message: 'Credenciales de Mercado Libre (MELI_CLIENT_ID / SECRET) no configuradas en el servidor.'
      });
    }

    const state = crypto.randomBytes(16).toString('hex');
    const authUrl = options.auth.getAuthorizationUrl(state);
    return { authUrl, state };
  });

  // POST /api/v1/auth/callback
  app.post<{ Body: { code: string; state: string } }>(
    '/api/v1/auth/callback',
    async (req, reply) => {
      const { code } = req.body || {};
      if (!code) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'Falta el parámetro "code".'
        });
      }

      if (!options.auth) {
        return reply.status(500).send({
          error: 'CONFIG_ERROR',
          message: 'MeliAuth no inicializado.'
        });
      }

      try {
        const token = await options.auth.exchangeCodeForToken(code);
        return {
          status: 'authenticated',
          userId: String(token.user_id)
        };
      } catch (err: any) {
        return reply.status(500).send({
          error: 'AUTH_FAILED',
          message: err.message
        });
      }
    }
  );

  // GET /api/v1/items/search
  app.get<{ Querystring: { q?: string; limit?: string; siteId?: string } }>(
    '/api/v1/items/search',
    async (req, reply) => {
      const { q, limit, siteId } = req.query;
      if (!q || q.trim().length === 0) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'El parámetro "q" es obligatorio.'
        });
      }

      const limitNum = limit ? parseInt(limit, 10) : 10;

      try {
        const searchRes = await options.client.searchItems(q, limitNum, siteId);
        return {
          query: q,
          total: searchRes.paging.total,
          results: searchRes.results.map((r) => ({
            id: r.id,
            title: r.title,
            price: r.price,
            currency: r.currency_id,
            permalink: r.permalink,
            thumbnail: r.thumbnail
          }))
        };
      } catch (err: any) {
        return reply.status(502).send({
          error: 'UPSTREAM_ERROR',
          message: err.message
        });
      }
    }
  );

  return app;
}
