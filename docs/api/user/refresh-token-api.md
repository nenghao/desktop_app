curl --location '192.168.0.103:10089/v2/user/refresh/token/' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJh......' \
--data '{
        "refresh_token": "eyJh......",
}'

response:
{
    "success": true,
    "message": "Token刷新成功",
    "data": {
        "access_token": "eyJh......",
        "refresh_token": "eyJh......",
        "token_type": "bearer",
        "expires_in": 3600
    }
}