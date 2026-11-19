# 001_adversarial_contract.hurl
# Pruebas adversariales y de frontera según EDI 3 / OWASP LLM 2025

# 1. Health check estándar
GET http://localhost:4010/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"

# 2. Búsqueda con query válida
GET http://localhost:4010/api/v1/items/search?q=termo&limit=5
HTTP 200
[Asserts]
jsonpath "$.query" exists
jsonpath "$.results" isCollection
jsonpath "$.total" isInteger

# 3. Solicitud de URL de autenticación
GET http://localhost:4010/api/v1/auth/url
HTTP 200
[Asserts]
jsonpath "$.authUrl" startsWith "https://"
jsonpath "$.state" exists
