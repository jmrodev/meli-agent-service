GET http://localhost:4010/health
HTTP 200
[Asserts]
jsonpath "$.status" == "ok"
