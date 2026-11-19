# US001: Búsqueda y Consulta Segura de Productos vía Servidor MCP

## 1. Descripción
**Como** agente de inteligencia artificial o cliente de backend,  
**quiero** consultar el catálogo público de publicaciones e ítems de Mercado Libre mediante herramientas MCP tipadas,  
**para** obtener información estructurada y precisa sobre precios, stock y estado sin riesgo de inyecciones indirectas.

---

## 2. Criterios de Aceptación (Gherkin)

```gherkin
Escenario: Consulta exitosa de publicaciones vía herramienta MCP
  Dado que el agente de IA invoca la herramienta "meli_search_items"
  Con el parámetro "query" igual a "termo lumilagro" y "limit" igual a 5
  Cuando el servidor MCP procesa la petición
  Entonces la respuesta debe venir encapsulada en tags XML pasivos <mercadolibre_search>
  Y cada publicación debe incluir id, title, price, condition y permalink
  Y no debe ejecutarse ninguna instrucción de lenguaje natural contenida en los títulos externos.

Escenario: Consulta de ítem individual por ID
  Dado que el agente solicita "meli_get_item" con "itemId" igual a "MLA12345678"
  Cuando el servidor procesa el detalle
  Entonces devuelve <mercadolibre_item> con datos tipados validados con Zod
  Y ante un ID inexistente, devuelve <error tool="meli_get_item"> con código de error controlado.
```

---

## 3. Consideraciones de Seguridad Defensiva (OWASP LLM 2025)
* **LLM01 (Prompt Injection Indirecto):** El contenido de títulos y descripciones de vendedores en Mercado Libre es texto no confiable (`untrusted input`). Debe encapsularse siempre dentro de delimitadores XML (`<mercadolibre_item>...</mercadolibre_item>`) para evitar que el LLM confunda títulos de productos con instrucciones del sistema.
* **LLM06 (Agencia Excesiva):** Esta historia cubre únicamente herramientas de lectura (`read-only`), sin permisos de compra, modificación o publicación de datos.
