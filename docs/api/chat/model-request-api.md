curl -X 'GET' \
  'http://192.168.0.103:10089/v2/chat/models/' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4'
响应：
{
  "success": true,
  "message": "获取成功",
  "data": {
    "models": [
      {
        "identify": "deepseek-r1",
        "title": "DeepSeek-R1",
        "description": "全能处理，深度思考",
        "context": 64,
        "max_output": 8,
        "object": "model"
      },
      {
        "identify": "deepseek-r1-small",
        "title": "DeepSeek-7B",
        "description": "轻量级深度思考模型",
        "context": 32,
        "max_output": 4,
        "object": "model"
      },
      {
        "identify": "huihui_ai/deepseek-r1-abliterated:32b",
        "title": "无界模型",
        "description": "无边界模型",
        "context": 64,
        "max_output": 8,
        "object": "model"
      },
      {
        "identify": "glm-flash",
        "title": "GLM-Flash",
        "description": "高效、极速响应",
        "context": 128,
        "max_output": 4,
        "object": "model"
      },
      {
        "identify": "glm-plus",
        "title": "GLM-Plus",
        "description": "思考、推理混合模型",
        "context": 128,
        "max_output": 4,
        "object": "model"
      },
      {
        "identify": "glm-z1",
        "title": "GLM-Z1",
        "description": "深度思考，推理模型",
        "context": 32,
        "max_output": 30,
        "object": "model"
      }
    ],
    "recommended": {
      "identify": "glm-plus",
      "title": "GLM-Plus",
      "description": "思考、推理混合模型",
      "context": 128,
      "max_output": 4,
      "object": "model"
    }
  }
}