# Constitución de Gobernanza Chelo-Harness (Spec-First) - meli-agent-service

Este repositorio implementa el servicio y Servidor MCP de Mercado Libre para agentes de IA bajo los estándares de **EDI 3**, **OWASP Top 10 for LLM Applications 2025** y **Linus Torvalds KISS / Good Taste**.

---

## 1. Principio Sagrado: Metodología Spec-First
- La **única fuente de verdad** del sistema es [`openapi.yaml`](./openapi.yaml).
- No se escribe código de endpoints ni herramientas sin antes tener definidos los contratos de entrada/salida y validaciones tipadas (Zod).
- Cada endpoint se valida mediante pruebas de contrato Hurl (`tests/*.hurl`) contra Prism Mock Server o el servidor activo.

---

## 2. Invariantes Críticas de Seguridad e IA (OWASP LLM 2025)
1. **Gobernanza de Tareas en GitHub (Issues & Milestones Obligatorios):**
   - No se escribe código sin Issue creado y asignado a su Milestone.
   - Todo commit debe referenciar el Issue que resuelve (ej: `feat(api): contrato openapi (resolves #1)`).
   - Al finalizar, el Issue se cierra formalmente.
2. **Defensa en Capas (Untrusted Inputs):**
   - Todo dato externo (búsquedas en Mercado Libre, respuestas de items, mensajes de compradores) se trata como no confiable.
   - Encapsular contenido externo en tags XML delimitadores (`<mercadolibre_item>...</mercadolibre_item>`) para evitar prompt injection indirecto hacia el LLM.
3. **Agencia Excesiva & Mínimo Privilegio (LLM06):**
   - Herramientas de solo lectura (buscar, consultar items, consultar envíos) son abiertas.
   - Herramientas con efectos colaterales (publicar, pausar, responder preguntas) deben validar parámetros estrictamente con Zod y requerir flag explícita de confirmación.
4. **Resiliencia & Rate Limiting (LLM10):**
   - Timeouts estrictos (máx 30s) en llamadas a la API de Mercado Libre.
   - Reintentos con backoff exponencial y jitter únicamente ante errores `429` y `5xx` (jamás ante `400`).
5. **KISS & Good Taste (Linus Torvalds):**
   - Soluciones directas, contratos limpios, sin sobreingeniería de micro-frameworks adicionales.

---

## 3. Matriz de Skills
- `chelo-harness`: Control de mocks, OpenAPI, tests Hurl y límite de 10 archivos modificados.
- `linus-torvalds`: Auditoría de código, KISS y estructuras de datos.
- `adversarial-testing`: Testing adversarial con inputs malformados e invariantes.
