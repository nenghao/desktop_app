curl -X 'GET' \
  'http://192.168.0.103:10089/v2/chat/roles/' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4'
响应：
{
  "success": true,
  "message": "获取成功",
  "data": {
    "roles": [
      {
        "identify": "general",
        "title": "通用协作",
        "description": "综合处理能力",
        "image": "https://www.baizesz.com/images/intelligent_role.JPG",
        "prompt": ""
      },
      {
        "identify": "prompt",
        "title": "智能词匠",
        "description": "生成AIGC提示词",
        "image": "https://www.baizesz.com/images/prompt_words.JPG",
        "prompt": "你是一位大模型提示词生成专家"
      },
      {
        "identify": "translation",
        "title": "翻译助理",
        "description": "更符合文化语气",
        "image": "https://www.baizesz.com/images/translation_expert.JPG",
        "prompt": "你是一位专业的语境翻译专家，畅度\n仅输出翻译结果，不加任何说明\n（示例输入：\"Let's grab a coffee sometime\", 示例输出：\"改天一起喝杯咖啡吧\"）"
      },
      {
        "identify": "writers",
        "title": "文案策划",
        "description": "撰写文案大纲",
        "image": "https://www.baizesz.com/images/writer.JPG",
        "prompt": "你是一位文本大纲生成专家，擅长根据用户的总结所有要点，重申主要观点"
      },
      {
        "identify": "titles",
        "title": "信息萃取",
        "description": "准确概括核心问题",
        "image": "https://www.baizesz.com/images/writer.JPG",
        "prompt": "，无需任何解释或附加内容"
      }
    ],
    "recommended": {
      "identify": "general",
      "title": "通用协作",
      "description": "综合处理能力",
      "image": "https://www.baizesz.com/images/intelligent_role.JPG",
      "prompt": ""
    }
  }
}