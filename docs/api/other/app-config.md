curl --location '192.168.0.103:10089/v2/config/sidebar/' \
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
    "message": "获取侧边栏配置成功",
    "data": {
        "version": "1.0.12",
        "last_updated": "2025-01-06T10:00:00Z",
        "categories": [
            {
                "id": "dashboard",
                "name": "小纸条",
                "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-rss-icon lucide-rss\"><path d=\"M4 11a9 9 0 0 1 9 9\"/><path d=\"M4 4a16 16 0 0 1 16 16\"/><circle cx=\"5\" cy=\"19\" r=\"1\"/></svg>",
                "route": "/dashboard",
                "url": "",
                "type": "page",
                "order": 1
            },
            {
                "id": "chat",
                "name": "聊天",
                "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-message-circle-icon lucide-message-circle\"><path d=\"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719\"/></svg>",
                "route": "/chat",
                "url": null,
                "type": "page",
                "order": 2
            },
            {
                "id": "power_agent",
                "name": "智能体",
                "icon": "<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" class=\"lucide lucide-bot-icon lucide-bot\"><path d=\"M12 8V4H8\"/><rect width=\"16\" height=\"12\" x=\"4\" y=\"8\" rx=\"2\"/><path d=\"M2 14h2\"/><path d=\"M20 14h2\"/><path d=\"M15 13v2\"/><path d=\"M9 13v2\"/></svg>",
                "route": "/agents",
                "url": null,
                "type": "group",
                "order": 3
            }
        ]
    }
}