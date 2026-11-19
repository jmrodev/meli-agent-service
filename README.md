# 🛍️ Mercado Libre Agent Service & MCP Bridge

Servicio backend y servidor MCP (**Model Context Protocol**) de alto rendimiento para interactuar con la **API de Mercado Libre**. Construido bajo los lineamientos académicos de **EDI 3 (TECDA 3º año)**, la metodología **Spec-First** de **Chelo-Harness** y las directivas de seguridad **OWASP Top 10 for LLM Applications 2025**.

---

## 🎯 Objetivo del Proyecto

Permitir que agentes de Inteligencia Artificial (Antigravity, Claude Code, OpenCode o microservicios autónomos) consulten e interactúen con la plataforma de Mercado Libre de forma:
1. **Tipada y determinista:** Validaciones estrictas con esquemas **Zod**.
2. **Defensiva contra Prompt Injections:** Encapsulamiento de respuestas externas no confiables en tags XML pasivos (`<mercadolibre_item>`).
3. **Resiliente y controlada:** Timeouts defensivos (15s), reintentos automáticos con backoff exponencial y jitter ante errores `429` (Rate Limit) o `5xx`.
4. **Desacoplada:** Opera como microservicio HTTP independiente (Fastify) y como servidor MCP sobre `stdio`.

---

## 🏛️ Arquitectura de Referencia (5 Capas EDI 3 / OWASP LLM)

```
        ┌────────────────────────────────────────────────────────┐
        │       Agente IA / Usuario / Microservicio              │
        │           (Antigravity, Claude, WhatsApp)              │
        └───────────────────────────┬────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        meli-agent-service                              │
│                                                                        │
│   [Capa 1: Entrada]  Sanitización de queries y límites con Zod         │
│   [Capa 2: Control]  Fastify Rate Limit (100 req/min) + CORS           │
│   [Capa 3: Auth]     OAuth 2.0 (Token exchange, refresh automático)    │
│   [Capa 4: Resiliencia] Timeouts duros (15s) + Backoff exponencial    │
│   [Capa 5: Salida]   Aislamiento en XML pasivo para evitar inyecciones │
└──────────────┬──────────────────────────────────────────┬──────────────┘
               │                                          │
               ▼                                          ▼
┌──────────────────────────────┐          ┌──────────────────────────────┐
│     Servidor MCP (stdio)     │          │    API de Mercado Libre      │
│  - meli_search_items         │          │  (https://api.mercadolibre)  │
│  - meli_get_item             │          │  - MLA (Argentina)           │
│  - meli_auth_status          │          │  - Scopes: read / offline    │
└──────────────────────────────┘          └──────────────────────────────┘
```

---

## 🛠️ Herramientas MCP Disponibles

| Herramienta | Parámetros | Modo | Descripción |
| :--- | :--- | :---: | :--- |
| **`meli_search_items`** | `query` (str, req), `limit` (int, 1-50), `siteId` (str, default MLA) | Lectura | Busca publicaciones en Mercado Libre y devuelve lista estructurada en XML. |
| **`meli_get_item`** | `itemId` (str, ej: `MLA1412345678`) | Lectura | Consulta especificaciones, precio, stock, condición y garantía de un ítem. |
| **`meli_auth_status`** | Ninguno | Diagnóstico | Informa si el servicio posee un `access_token` activo y el `user_id` vinculado. |

---

## 🚀 Inicio Rápido

### 1. Requisitos
- Node.js >= 20
- pnpm >= 10

### 2. Instalación y Build
```bash
git clone https://github.com/jmrodev/meli-agent-service.git
cd meli-agent-service
pnpm install
pnpm build
```

### 3. Configuración de Entorno (`.env`)
Crea un archivo `.env` en la raíz (opcional para modo búsqueda básica, requerido para operaciones con cuenta):
```env
PORT=3000
HOST=0.0.0.0
MELI_CLIENT_ID="tu_app_id"
MELI_CLIENT_SECRET="tu_client_secret"
MELI_REDIRECT_URI="http://localhost:3000/api/v1/auth/callback"
```

### 4. Ejecución del Servidor HTTP
```bash
pnpm start
# o en desarrollo:
pnpm dev
```
Verifica la disponibilidad:
```bash
curl http://localhost:3000/health
# {"status":"ok","uptime":1.23}
```

---

## 🤖 Conexión con Asistentes de IA (MCP)

Agrega el servidor en el archivo de configuración MCP (`mcp_config.json` de Antigravity / Claude Desktop / OpenCode):

```json
{
  "mcpServers": {
    "mercadolibre": {
      "command": "node",
      "args": [
        "/home/jmro/Documents/Development/meli-agent-service/dist/cli.js"
      ],
      "env": {
        "MELI_CLIENT_ID": "tu_client_id",
        "MELI_CLIENT_SECRET": "tu_client_secret"
      }
    }
  }
}
```

---

## 🧪 Pruebas y Gobernanza (Chelo-Harness & Breaker)

Este repositorio aplica la metodología **Spec-First** donde [`openapi.yaml`](./openapi.yaml) es el contrato único de verdad.

### Pruebas de Contrato (Hurl)
```bash
# Validar contratos de API con Hurl
hurl --test tests/000_health.hurl tests/001_adversarial_contract.hurl
```

### Suite Adversarial (Breaker)
```bash
# Ejecutar suite de testing adversarial (EDI 3)
pnpm test
```
Verifica las siguientes invariantes críticas:
- Rechazo determinista con Zod ante tokens falsificados o malformados.
- Delimitación XML pasiva ante inyecciones de prompt o scripts en títulos externos.
- Cero divulgación de secretos criptográficos en las herramientas MCP.

---

## 📚 Historias de Usuario

La documentación formal de requisitos y criterios de aceptación Gherkin se encuentra en:
- [`docs/stories/US001_consulta_productos_mcp.md`](./docs/stories/US001_consulta_productos_mcp.md)
- [`docs/stories/US002_oauth_vendedor_seguro.md`](./docs/stories/US002_oauth_vendedor_seguro.md)
- [`docs/stories/US003_blindaje_adversarial_y_resiliencia.md`](./docs/stories/US003_blindaje_adversarial_y_resiliencia.md)
