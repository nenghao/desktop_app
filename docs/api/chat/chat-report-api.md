curl --location '192.168.0.103:10089/v2/chat/report/' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkZW50aWZpZXIiOiIwMDA2MDAuNjM5ODYzNWEzODhhMmVhNmU4MWRkYmY3ZjJkZWYxYzAuMDI1OCIsImV4cCI6MTc1Nzg4ODU1NiwiaWF0IjoxNzU3ODg0OTU2LCJpc3MiOiJmYXN0YXBpLWNoYXQtc2VydmljZSIsInR5cGUiOiJhY2Nlc3MifQ.EYjH7QIz_bQvL9eQVwSPzlS02Q2_EdlbZBKagD6Gou4' \
--data '{
  "conversation_id": "bzsz_1756733525_978531",
  "reason": "没有理解问题",
  "comment": "模型没有正确理解我的问题"
}'

response1：
{
    "success": true,
    "message": "感谢您的反馈，我们会努力改进！",
    "data": null
}
response2：
{
    "success": false,
    "message": "参数错误",
    "data": null
}