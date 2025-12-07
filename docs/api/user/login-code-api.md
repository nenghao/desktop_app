code:
curl -X 'GET' \
  'http://192.168.0.103:10089/v2/user/code/?phone=15012345678&template=login' \
  -H 'accept: application/json'
response:
{
  "success": true,
  "message": "验证码发送成功 (调试模式: 216136)",
  "data": null
}


login:
curl --location '192.168.0.103:10089/v2/user/' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4' \
--data '{
    "phone": "15012345678",
    "password": "487127",
    "type": 1,
    
        "template": "login"
}
response:
{
    "success": true,
    "message": "刷新成功",
    "data": {
        "id": 2,
        "username": "150****5678",
        "email": "",
        "phone": "15012345678",
        "user_identifier": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258",
        "login_type": "1",
        "is_active": true,
        "is_deleted": false,
        "credits": 20.0,
        "credits_expiration_date": "2025-09-18T17:18:21",
        "avatar": "bi bi-emoji-wink",
        "create_time": "2025-08-19T09:18:21",
        "last_login": "2025-08-21T16:11:20",
        "disabled": false,
        "disabled_reason": null,
        "private_version": "1.0.0",
        "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkZW50aWZpZXIiOiIwMDA2MDAuNjM5ODYzNWEzODhhMmVhNmU4MWRkYmY3ZjJkZWYxYzAuMDI1OCIsImV4cCI6MTc4NzI5OTg3OSwiaWF0IjoxNzU1NzYzODc5LCJpc3MiOiJmYXN0YXBpLWNoYXQtc2VydmljZSJ9.az7J4ttJQEbkCsb0F-4V7qEQxZFD3Mlymh-3S8Om_IA"
    }
}

login-get:
curl -X 'GET' \
  'http://192.168.0.103:10089/v2/user/?user_identifier=000600.6398635a388a2ea6e81ddbf7f2def1c0.0258' \
  -H 'accept: application/json' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4'