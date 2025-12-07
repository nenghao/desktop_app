curl --location '192.168.0.103:10089/agent?platform=win&arch=amd64' \
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
--data ''

response：
{
    "success": true,
    "message": "获取成功",
    "data": {
        "version": "1.0.5",
        "last_updated": "2025-01-06T10:00:00Z",
        "agents_hash": "a64653962ef1",
        "items": [
            {
                "id": "math_calculator",
                "name": "数学计算器",
                "description": "支持基础运算、高级函数、微积分、统计学、线性代数和概率分布的数学计算器",
                "icon": "🧮",
                "version": "3.0.2",
                "type": "python",
                "status": "available",
                "size": "15KB",
                "tags": [
                    "数学",
                    "计算器",
                    "科学计算",
                    "统计",
                ],
                "rating": 4.8,
                "downloads": 1250,
                "has_ui": false,
                "force_update": true
            },
            {
                "id": "pdf_tools",
                "name": "PDF 工具集",
                "description": "包含PDF合并、创建和OCR文字识别功能的工具集",
                "icon": "📝",
                "version": "1.0.1",
                "type": "executable",
                "status": "available",
                "size": "55.6MB",
                "tags": [
                    "PDF",
                    "办公"
                ],
                "rating": 4.6,
                "downloads": 980,
                "has_ui": false,
                "force_update": true
            }
        ]
    }
}