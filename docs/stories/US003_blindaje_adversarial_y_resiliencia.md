# US003: Blindaje Adversarial, Resiliencia y Control de Consumo (LLM10 / Denial of Wallet)

## 1. Descripción
**Como** arquitecto de sistemas y docente evaluador de EDI 3,  
**quiero** que el servicio implemente defensas deterministas contra ataques adversariales y saturación de API,  
**para** garantizar alta disponibilidad, fallbacks controlados y prevenir costos desmedidos o degradación de servicio.

---

## 2. Criterios de Aceptación (Gherkin)

```gherkin
Escenario: Ataque por inyección de prompt o caracteres especiales en búsqueda
  Dado que un usuario envía una consulta con inyecciones de prompt o caracteres maliciosos
  Cuando se procesa la búsqueda
  Entonces el esquema Zod rechaza queries vacías o que superen los 100 caracteres con HTTP 400
  Y ante caracteres especiales, el cliente utiliza codificación URL segura evitando quiebre del parseador.

Escenario: Resiliencia ante error 429 (Rate Limit) o 500 del upstream Mercado Libre
  Dado que la API de Mercado Libre responde con código 429 Too Many Requests
  Cuando el cliente HTTP de Meli detecta la respuesta
  Entonces reintenta hasta 3 veces aplicando backoff exponencial con Jitter
  Y no satura la conexión del proveedor.

Escenario: Prevención de DoS local por abuso de peticiones
  Dado que un cliente realiza más de 100 peticiones en menos de un minuto a la API Fastify
  Cuando se supera el umbral
  Entonces el servicio responde inmediatamente con HTTP 429 Too Many Requests.
```

---

## 3. Consideraciones de Seguridad Defensiva (OWASP LLM 2025)
* **LLM10 (Consumo sin Límites):** Limitación de tasa local vía `@fastify/rate-limit`, parámetros `limit` estrictamente acotados (máximo 50 productos por consulta) y timeouts duros de 15 segundos para evitar cuelgues de workers.
