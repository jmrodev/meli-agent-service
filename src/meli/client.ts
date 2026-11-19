import {
  MeliSearchResponseSchema,
  MeliItemDetailSchema,
  MeliUserProfileSchema,
  MeliCategoryAttributeSchema,
  MeliPaymentMethodSchema,
  type MeliSearchResponse,
  type MeliItemDetail,
  type MeliUserProfile,
  type MeliCategoryAttribute,
  type MeliPaymentMethod
} from './schemas.js';
import { MeliAuth } from './auth.js';

export interface MeliClientOptions {
  auth?: MeliAuth;
  apiBaseUrl?: string;
  defaultSiteId?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

export class MeliClient {
  private auth?: MeliAuth;
  private apiBaseUrl: string;
  private defaultSiteId: string;
  private timeoutMs: number;
  private maxRetries: number;

  constructor(options?: MeliClientOptions) {
    this.auth = options?.auth;
    this.apiBaseUrl = options?.apiBaseUrl || 'https://api.mercadolibre.com';
    this.defaultSiteId = options?.defaultSiteId || 'MLA'; // Por defecto Argentina
    this.timeoutMs = options?.timeoutMs || 15000; // 15s máximo según guía EDI 3
    this.maxRetries = options?.maxRetries || 3;
  }

  /**
   * Ejecuta peticiones fetch con Timeout y Backoff exponencial con Jitter ante 429/5xx (estándar EDI 3).
   */
  private async request(path: string, options: RequestInit = {}): Promise<Response> {
    const url = path.startsWith('http') ? path : `${this.apiBaseUrl}${path}`;
    let attempt = 0;

    while (attempt < this.maxRetries) {
      attempt++;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

      try {
        const headers = new Headers(options.headers || {});
        if (!headers.has('Accept')) {
          headers.set('Accept', 'application/json');
        }

        // Si tenemos auth y no viene Authorization explícito, lo inyectamos
        if (this.auth && !headers.has('Authorization')) {
          const token = await this.auth.getValidAccessToken();
          if (token) {
            headers.set('Authorization', `Bearer ${token}`);
          }
        }

        const res = await fetch(url, {
          ...options,
          headers,
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        // Si es 429 o 5xx, reintentar con backoff exponencial y jitter (EDI 3)
        if ((res.status === 429 || res.status >= 500) && attempt < this.maxRetries) {
          const jitter = Math.random() * 250;
          const delay = Math.pow(2, attempt) * 1000 + jitter;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }

        return res;
      } catch (err: any) {
        clearTimeout(timeoutId);
        if (attempt >= this.maxRetries) {
          throw new Error(`Fallo de conexión Meli tras ${this.maxRetries} intentos: ${err.message}`);
        }
        // Pequeño delay ante fallo de red transitorio
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
      }
    }

    throw new Error(`Máximo de reintentos alcanzado para URL: ${url}`);
  }

  /**
   * Búsqueda pública de productos en un sitio (MLA, MLM, etc.)
   */
  async searchItems(query: string, limit = 10, siteId?: string): Promise<MeliSearchResponse> {
    const site = siteId || this.defaultSiteId;
    const params = new URLSearchParams({
      q: query,
      limit: String(Math.min(limit, 50))
    });

    const res = await this.request(`/sites/${site}/search?${params.toString()}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error en búsqueda Meli (${res.status}): ${err}`);
    }

    const data = await res.json();
    return MeliSearchResponseSchema.parse(data);
  }

  /**
   * Obtiene el detalle de una publicación por ID.
   */
  async getItem(itemId: string): Promise<MeliItemDetail> {
    const res = await this.request(`/items/${itemId}`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error consultando item ${itemId} (${res.status}): ${err}`);
    }

    const data = await res.json();
    return MeliItemDetailSchema.parse(data);
  }

  /**
   * Obtiene el perfil del usuario autenticado.
   */
  async getUserProfile(): Promise<MeliUserProfile> {
    const res = await this.request('/users/me');
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error consultando usuario (/users/me) (${res.status}): ${err}`);
    }

    const data = await res.json();
    return MeliUserProfileSchema.parse({
      id: data.id,
      nickname: data.nickname,
      country_id: data.country_id,
      email: data.email,
      site_status: data.status?.site_status || 'unknown',
      permalink: data.permalink
    });
  }

  /**
   * Obtiene los atributos y especificaciones requeridas de una categoría.
   */
  async getCategoryAttributes(categoryId: string): Promise<MeliCategoryAttribute[]> {
    const res = await this.request(`/categories/${categoryId}/attributes`);
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error consultando atributos de categoría ${categoryId} (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data as any[]).slice(0, 15).map((a) => MeliCategoryAttributeSchema.parse({
      id: a.id,
      name: a.name,
      value_type: a.value_type,
      tags: a.tags,
      hint: a.hint
    }));
  }

  /**
   * Consulta los métodos de pago disponibles en Mercado Pago / Mercado Libre.
   */
  async getPaymentMethods(): Promise<MeliPaymentMethod[]> {
    const res = await this.request('https://api.mercadopago.com/v1/payment_methods');
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Error consultando medios de pago (${res.status}): ${err}`);
    }

    const data = await res.json();
    return (data as any[]).map((p) => MeliPaymentMethodSchema.parse({
      id: p.id,
      name: p.name,
      payment_type_id: p.payment_type_id,
      status: p.status
    }));
  }
}
