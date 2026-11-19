import { MeliClient } from './meli/client.js';

export interface MeliToolDefinition {
  name: string;
  description: string;
  params: string[];
}

/**
 * Esquema de herramientas seguras de Mercado Libre compatibles con edi3-ai-production
 */
export const meliAITools: MeliToolDefinition[] = [
  {
    name: 'meli_get_user_profile',
    description: 'Obtiene los datos del perfil y estado de cuenta del usuario en Mercado Libre (nickname, país, email, estado).',
    params: []
  },
  {
    name: 'meli_get_payment_methods',
    description: 'Consulta los medios de pago y tarjetas habilitadas en Argentina (Visa, Master, Débito, Pago Fácil).',
    params: []
  },
  {
    name: 'meli_get_category_attributes',
    description: 'Consulta las especificaciones y atributos obligatorios de una categoría de Mercado Libre (ej: celulares MLA1055).',
    params: ['categoryId']
  }
];

/**
 * Despachador de herramientas para el bucle de Function Calling del motor de IA
 */
export async function executeMeliToolCall(client: MeliClient, toolName: string, params: Record<string, any> = {}) {
  switch (toolName) {
    case 'meli_get_user_profile': {
      const user = await client.getUserProfile();
      return {
        id: user.id,
        nickname: user.nickname,
        country: user.country_id,
        status: user.site_status,
        email: user.email
      };
    }
    case 'meli_get_payment_methods': {
      const methods = await client.getPaymentMethods();
      return {
        total: methods.length,
        methods: methods.map((m: any) => ({ id: m.id, name: m.name, type: m.payment_type_id }))
      };
    }
    case 'meli_get_category_attributes': {
      const attrs = await client.getCategoryAttributes(params.categoryId || 'MLA1055');
      return {
        category: params.categoryId || 'MLA1055',
        attributes: attrs.map((a: any) => ({ id: a.id, name: a.name, required: Boolean(a.tags?.required) }))
      };
    }
    default:
      throw new Error(`Herramienta no soportada: ${toolName}`);
  }
}
