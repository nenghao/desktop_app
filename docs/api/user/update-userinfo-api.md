curl --location --request PATCH '192.168.0.103:10089/v2/user/?user_identifier=000600.6398635a388a2ea6e81ddbf7f2def1c0.0258' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJ1c2VybmFtZSI6IjE1MDEyMzQ1Njc4IiwidXNlcl9pZGVudGlmaWVyIjoiMDAwNjAwLjYzOTg2MzVhMzg4YTJlYTZlODFkZGJmN2YyZGVmMWMwLjAyNTgifQ.qc_tJ1HC3NMZbq77ORjwEt2fJqLK9WLW7zik0wTi5k4' \
--data '{
  "username": "新用户名",
  "avatar": "bi-person-circle"
}'
response:
{
    "success": true,
    "message": "更新成功",
    "data": {
        "id": 1,
        "username": "新用户名",
        "email": "",
        "phone": "15012345678",
        "user_identifier": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258",
        "credits": 20.0,
        "credits_expiration_date": "2025-10-03T18:54:39",
        "avatar": "bi bi-person-circle",
        "create_time": "2025-09-03T10:54:39",
        "last_login": "2025-10-23T17:37:50",
        "disabled": false,
        "disabled_reason": null,
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkZW50aWZpZXIiOiIwMDA2MDAuNjM5ODYzNWEzODhhMmVhNmU4MWRkYmY3ZjJkZWYxYzAuMDI1OCIsImV4cCI6MTc2MTIxNjIyNiwiaWF0IjoxNzYxMjEyNjI2LCJpc3MiOiJmYXN0YXBpLWNoYXQtc2VydmljZSIsInR5cGUiOiJhY2Nlc3MifQ.1tCwoOQW4rSFDSEV2hbE06MAqagtbDfNScEP6IzLqEY",
        "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkZW50aWZpZXIiOiIwMDA2MDAuNjM5ODYzNWEzODhhMmVhNmU4MWRkYmY3ZjJkZWYxYzAuMDI1OCIsImV4cCI6MTc2MzgwNDYyNiwiaWF0IjoxNzYxMjEyNjI2LCJpc3MiOiJmYXN0YXBpLWNoYXQtc2VydmljZSIsInR5cGUiOiJyZWZyZXNoIiwianRpIjoic0hvaEx2cVN1X1BhbWNWOGQ2SUhnTTRJaTBENnZPaWYycmdwckNHaXdoTSJ9.wHt5SN44ju8a-ZLm2J3iZa_VbVS8VpCAj9owWPXv33M",
        "token_type": "bearer",
        "expires_in": 3600
    }
}