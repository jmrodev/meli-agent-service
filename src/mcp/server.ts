import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MeliClient } from '../meli/client.js';
import { MeliAuth } from '../meli/auth.js';

export function createMeliMcpServer(client: MeliClient, auth?: MeliAuth) {
  const server = new Server(
    {
      name: 'mercadolibre-mcp',
      version: '1.0.0'
    },
    {
      capabilities: {
        tools: {}
      }
    }
  );

  // Lista de herramientas seguras disponibles
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'meli_search_items',
          description: 'Busca productos en Mercado Libre (requiere autenticación activa del vendedor o token de app para el endpoint de búsqueda).',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Término de búsqueda del producto (ej: "termo lumilagro")'
              },
              limit: {
                type: 'number',
                description: 'Cantidad máxima de resultados (1 a 50). Por defecto 10.',
                default: 10
              },
              siteId: {
                type: 'string',
                description: 'Código de país de Mercado Libre (ej: "MLA" para Argentina, "MLM" para México). Por defecto MLA.',
                default: 'MLA'
              }
            },
            required: ['query']
          }
        },
        {
          name: 'meli_get_item',
          description: 'Obtiene la información técnica detallada de una publicación por su ID (ej: "MLA12345678").',
          inputSchema: {
            type: 'object',
            properties: {
              itemId: {
                type: 'string',
                description: 'Identificador único del producto en Mercado Libre (ej: "MLA1412345678")'
              }
            },
            required: ['itemId']
          }
        },
        {
          name: 'meli_auth_status',
          description: 'Verifica si el servidor MCP cuenta con un access_token activo y válido para operar con la cuenta de Mercado Libre.',
          inputSchema: {
            type: 'object',
            properties: {}
          }
        }
      ]
    };
  });

  // Ejecución de herramientas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      if (name === 'meli_auth_status') {
        const token = auth ? await auth.getValidAccessToken() : null;
        const userId = auth?.getUserId();
        return {
          content: [
            {
              type: 'text',
              text: `<auth_status authenticated="${Boolean(token)}" user_id="${userId || 'none'}" />`
            }
          ]
        };
      }

      if (name === 'meli_search_items') {
        const schema = z.object({
          query: z.string().min(1).max(100),
          limit: z.number().min(1).max(50).optional().default(10),
          siteId: z.string().optional().default('MLA')
        });

        const parsed = schema.parse(args);
        const searchRes = await client.searchItems(parsed.query, parsed.limit, parsed.siteId);

        // Formato seguro con tags XML delimitadores (OWASP LLM 2025 / EDI 3)
        const itemsXml = searchRes.results
          .map(
            (it) => `  <item id="${it.id}">
    <title>${it.title}</title>
    <price currency="${it.currency_id}">${it.price}</price>
    <condition>${it.condition || 'not_specified'}</condition>
    <link>${it.permalink}</link>
  </item>`
          )
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `<mercadolibre_search query="${parsed.query}" total="${searchRes.paging.total}">\n${itemsXml}\n</mercadolibre_search>`
            }
          ]
        };
      }

      if (name === 'meli_get_item') {
        const schema = z.object({
          itemId: z.string().min(3).max(30)
        });

        const parsed = schema.parse(args);
        const item = await client.getItem(parsed.itemId);

        return {
          content: [
            {
              type: 'text',
              text: `<mercadolibre_item id="${item.id}" site="${item.site_id}">
  <title>${item.title}</title>
  <price currency="${item.currency_id}">${item.price}</price>
  <status>${item.status}</status>
  <condition>${item.condition}</condition>
  <available_quantity>${item.available_quantity ?? 'N/A'}</available_quantity>
  <warranty>${item.warranty ?? 'Sin garantía especificada'}</warranty>
  <link>${item.permalink}</link>
</mercadolibre_item>`
            }
          ]
        };
      }

      throw new Error(`Herramienta desconocida: ${name}`);
    } catch (err: any) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `<error tool="${name}">${err.message}</error>`
          }
        ]
      };
    }
  });

  return server;
}

export async function startMcpStdio() {
  const clientId = process.env.MELI_CLIENT_ID || '';
  const clientSecret = process.env.MELI_CLIENT_SECRET || '';
  const redirectUri = process.env.MELI_REDIRECT_URI || 'http://localhost:3000/api/v1/auth/callback';

  let auth: MeliAuth | undefined;
  if (clientId && clientSecret) {
    auth = new MeliAuth({ clientId, clientSecret, redirectUri });
  }

  const client = new MeliClient({ auth });
  const server = createMeliMcpServer(client, auth);
  const transport = new StdioServerTransport();

  await server.connect(transport);
  console.error('Mercado Libre MCP Server running on stdio');
}
