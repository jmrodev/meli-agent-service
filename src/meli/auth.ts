import { MeliTokenResponseSchema, type MeliTokenResponse } from './schemas.js';

export interface MeliAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  authBaseUrl?: string;
  apiBaseUrl?: string;
}

export class MeliAuth {
  private config: MeliAuthConfig;
  private tokenData: MeliTokenResponse | null = null;
  private tokenExpiresAt: number = 0;

  constructor(config: MeliAuthConfig) {
    this.config = {
      authBaseUrl: 'https://auth.mercadolibre.com.ar',
      apiBaseUrl: 'https://api.mercadolibre.com',
      ...config
    };
  }

  /**
   * Genera la URL para redirigir al vendedor en el flujo OAuth.
   */
  getAuthorizationUrl(state: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state
    });
    return `${this.config.authBaseUrl}/authorization?${params.toString()}`;
  }

  /**
   * Intercambia el authorization code por access_token y refresh_token.
   */
  async exchangeCodeForToken(code: string): Promise<MeliTokenResponse> {
    const url = `${this.config.apiBaseUrl}/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      code,
      redirect_uri: this.config.redirectUri
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error en token exchange Meli (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const token = MeliTokenResponseSchema.parse(json);
    this.setToken(token);
    return token;
  }

  /**
   * Refresca el access_token usando el refresh_token existente.
   */
  async refreshToken(currentRefreshToken?: string): Promise<MeliTokenResponse> {
    const refreshTokenToUse = currentRefreshToken || this.tokenData?.refresh_token;
    if (!refreshTokenToUse) {
      throw new Error('No refresh token disponible para renovar credenciales.');
    }

    const url = `${this.config.apiBaseUrl}/oauth/token`;
    const body = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      refresh_token: refreshTokenToUse
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString()
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error refrescando token Meli (${res.status}): ${errText}`);
    }

    const json = await res.json();
    const token = MeliTokenResponseSchema.parse(json);
    this.setToken(token);
    return token;
  }

  setToken(token: MeliTokenResponse) {
    this.tokenData = token;
    // Expira en (expires_in - 60s margen de gracia)
    this.tokenExpiresAt = Date.now() + (token.expires_in - 60) * 1000;
  }

  async getValidAccessToken(): Promise<string | null> {
    if (!this.tokenData) return null;
    if (Date.now() >= this.tokenExpiresAt) {
      const refreshed = await this.refreshToken();
      return refreshed.access_token;
    }
    return this.tokenData.access_token;
  }

  getUserId(): string | null {
    return this.tokenData ? String(this.tokenData.user_id) : null;
  }
}
