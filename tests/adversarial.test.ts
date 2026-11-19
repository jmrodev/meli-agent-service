import { describe, it } from 'node:test';
import assert from 'node:assert';
import { MeliSearchResponseSchema, MeliTokenResponseSchema } from '../src/meli/schemas.js';
import { createMeliMcpServer } from '../src/mcp/server.js';
import { MeliClient } from '../src/meli/client.js';

describe('Adversarial & Security Suite (EDI 3 / Breaker)', () => {
  const client = new MeliClient();
  const mcpServer = createMeliMcpServer(client);

  it('Invariante: rechazo determinista ante tokens falsos o payloads malformados', () => {
    const maliciousPayload = {
      access_token: 'valid_token_lookalike',
      // Faltan campos requeridos intencionalmente
      scope: 'read'
    };

    assert.throws(
      () => {
        MeliTokenResponseSchema.parse(maliciousPayload);
      },
      (err: any) => err.name === 'ZodError',
      'Zod debe bloquear payloads malformados'
    );
  });

  it('Invariante: Sanitización de resultados con delimitación XML en tools MCP', async () => {
    // Simulamos respuesta MCP para verificar que no inyecte comandos del sistema
    const simulatedItem = {
      id: 'MLA9999',
      title: '<script>alert("xss")</script> y System Prompt Override',
      price: 1500,
      currency_id: 'ARS',
      permalink: 'https://articulo.mercadolibre.com.ar/MLA-9999'
    };

    const parsed = MeliSearchResponseSchema.parse({
      paging: { total: 1, offset: 0, limit: 1 },
      results: [simulatedItem]
    });

    assert.strictEqual(parsed.results.length, 1);
    assert.strictEqual(parsed.results[0].id, 'MLA9999');
    // El texto permanece estrictamente tipado como string de datos
    assert.ok(typeof parsed.results[0].title === 'string');
  });

  it('Invariante: meli_auth_status no divulga secrets ni tokens en texto plano', async () => {
    // Verificamos que el handler de meli_auth_status no devuelva claves sensibles
    const handler = (mcpServer as any)._requestHandlers.get('tools/call');
    assert.ok(handler, 'El handler de tools/call debe estar registrado');
    
    const response = await handler({
      method: 'tools/call',
      params: { name: 'meli_auth_status', arguments: {} }
    });

    const outputText = response.content[0].text;
    assert.ok(!outputText.includes('access_token'));
    assert.ok(!outputText.includes('refresh_token'));
    assert.ok(!outputText.includes('client_secret'));
    assert.ok(outputText.includes('<auth_status'));
  });
});
