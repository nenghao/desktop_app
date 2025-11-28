postman request '192.168.0.103:10089/agent/ai_translator' \
  --header 'Accept: */*' \
  --header 'Accept-Language: zh-CN,zh;q=0.9' \
  --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MiwidXNlcm5hbWUiOiIxNTAxMjM0NTY3OCIsImV4cCI6MTc0Njc5ODI0OX0.hYh_pdfUX2jVhG9p3b_N6jubP6rcjC0-oOtEa6a8ldI' \
  --header 'Cache-Control: no-cache' \
  --header 'Connection: keep-alive' \
  --header 'Content-Type: application/json' \
  --header 'DNT: 1' \
  --header 'Origin: http://192.168.0.103:3000' \
  --header 'Pragma: no-cache' \
  --header 'Referer: http://192.168.0.103:3000/' \
  --header 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0' \
  --body ''

response：
{
    "success": true,
    "message": "获取成功",
    "data": {
        "id": "ai_translator",
        "name": "AI翻译器",
        "version": "1.0.21",
        "description": "AI翻译器，关键单词提取，详情解释，场景翻译",
        "type": "web",
        "icon": "<svg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round' class='lucide lucide-languages-icon lucide-languages'><path d='m5 8 6 6'/><path d='m4 14 6-6 2-3'/><path d='M2 5h12'/><path d='M7 2h1'/><path d='m22 22-5-10-5 10'/><path d='M14 18h6'/></svg>",
        "category": [
            "数学"
        ],
        "tags": [
            "AI",
            "翻译"
        ],
        "status": "available",
        "size": "15KB",
        "rating": 5.0,
        "has_ui": true,
        "force_update": true,
        "downloads": 2000,
        "recommended": true,
        "detail": {
            "main_file": "",
            "requirements_file": "",
            "features": [
                "AI翻译",
                "单词解释",
                "例句展示",
                "文档翻译",
                "关键词提取"
            ],
            "examples": [
                "Hello World",
                "Artificial Intelligence"
            ],
            "dependencies": null,
            "executables": {},
            "librarys": {},
            "ui_config": {
                "bundle_url": "http://0.0.0.0:10089/agent_store/published/ai_translator/ui/bundle.js",
                "css_url": "http://0.0.0.0:10089/agent_store/published/ai_translator/ui/bundle.css"
            }
        }
    }
}