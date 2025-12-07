curl --location '192.168.0.103:10089/agent/versions' \
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
        "version": "1.0.0",
        "last_updated": "2025-01-06T10:00:00Z"
    }
}