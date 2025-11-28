1，会话列表：
curl -X 'GET' \
  'http://192.168.0.103:10089/v2/chat/completions/?page=1&page_size=20' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4'
response 会话列表:
{
  "success": true,
  "message": "获取成功",
  "data": {
    "conversations": [
      {
        "conversation_id": "bzsz_1685367600_123456",
        "title": "你好，请介绍一下Python的特点",
        "model_name": "deepseek-r1:32b",
        "created_at": 1755680904,
        "updated_at": 1755680904
      },
      {
        "conversation_id": "bzsz_1755709464_941246",
        "title": "1755709465,今天是什么日子，简短回答我。",
        "model_name": "deepseek-r1",
        "created_at": 1755680873,
        "updated_at": 1755680873
      },
      {
        "conversation_id": "bzsz_1755709131_023901",
        "title": "1755709132,今天是什么日子，简短回答我。",
        "model_name": "deepseek-r1",
        "created_at": 1755680370,
        "updated_at": 1755680370
      }
    ],
    "total": 16,
    "page": 1,
    "page_size": 20,
    "user_identifier": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258"
  }
}

2，会话详情:
curl --location '192.168.0.103:10089/v2/chat/completions?page=1&page_size=20&conversation_id=bzsz_1755934145_569460' \
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

response：
{
    "success": true,
    "message": "获取成功",
    "data": {
        "conversation_id": "bzsz_1761326404_156930",
        "messages": [
            {
                "id": "314c9ab6-8901-42b6-abbe-fe45effe3103",
                "role": "user",
                "content": "hello",
                "created_at": 1761297611,
                "user_name": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258",
                "tool_calls": null
            },
            {
                "id": "314c9ab6-8901-42b6-abbe-fe45effe3103",
                "role": "assistant",
                "content": "Hello! 👋 How can I assist you today? Feel free to ask anything—I'm here to help!",
                "created_at": 1761297611,
                "user_name": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258",
                "tool_calls": null
            }
        ],
        "total": 2,
        "page": 1,
        "page_size": 20
    }
}