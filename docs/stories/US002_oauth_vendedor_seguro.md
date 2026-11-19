# US002: Autenticación OAuth 2.0 y Gestión Segura de Credenciales de Vendedor

## 1. Descripción
**Como** administrador o vendedor de Mercado Libre,  
**quiero** autorizar la aplicación mediante el flujo estándar OAuth 2.0 con protección anti-CSRF,  
**para** habilitar al servicio a realizar operaciones autorizadas en mi cuenta sin exponer `CLIENT_SECRET` ni filtrar tokens de acceso.

---

## 2. Criterios de Aceptación (Gherkin)

```gherkin
Escenario: Generación de URL de login OAuth
  Dado que el cliente invoca el endpoint GET /api/v1/auth/url
  Cuando el servidor cuenta con MELI_CLIENT_ID y MELI_CLIENT_SECRET configurados
  Entonces devuelve HTTP 200 con un campo "authUrl" oficial de Mercado Libre
  Y un token aleatorio criptográfico "state" para validar contra ataques CSRF.

Escenario: Intercambio exitoso de authorization code por tokens
  Dado que Mercado Libre redirige con un código "TG-123456" y "state" válido
  Cuando se envía POST /api/v1/auth/callback con dicho código
  Entonces el servicio intercambia el código por access_token y refresh_token
  Y guarda el token en memoria segura con margen de renovación previa a su expiración
  Y responde HTTP 200 con status "authenticated" y el userId del vendedor.
```

---

## 3. Consideraciones de Seguridad Defensiva (OWASP LLM 2025)
* **LLM02 (Divulgación de Información Sensible):** Ni el `access_token`, ni el `refresh_token`, ni el `CLIENT_SECRET` se transmiten jamás en las respuestas MCP ni en las trazas enviadas al modelo de lenguaje.
* **Verificación de Estado MCP:** La herramienta `meli_auth_status` solo expone si el servidor está autenticado (`true`/`false`) y el ID numérico del usuario, jamás el token en plano.
