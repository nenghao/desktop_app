curl --location --request PATCH '192.168.0.103:10089/v2/chat/completions?conversation_id=bzsz_1755967812_321715&title=hhahahahahahahah' \
--header 'Accept: */*' \
--header 'Accept-Language: zh-CN,zh;q=0.9' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4' \
--header 'Cache-Control: no-cache' \
--header 'Connection: keep-alive' \
--header 'Content-Type: application/json' \
--header 'DNT: 1' \
--header 'Origin: http://192.168.0.103:3000' \
--header 'Pragma: no-cache' \
--header 'Referer: http://192.168.0.103:3000/' \
--header 'User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36 Edg/136.0.0.0' \
--data ''

response:
{
    "success": true,
    "message": "修改成功",
    // "message": "会话不存在或更新失败",
    "data": null
}