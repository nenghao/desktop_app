消息反馈接口文档
接口信息
请求方式: POST
接口路径: /v2/chat/feedback/
请求参数
{
    "conversation_id": "bzsz_1756733525_978531",
    "message_id": "a32c7ef4-3b00-403d-bdc0-fddd5b2326e9",
    "feedback_type": "GOOD",
    "feedback_desc": "回答很准确",
    "feedback_tag": "other"
}
参数说明
参数名	类型	必填	说明
conversation_id	string	是	会话ID
message_id	string	是	消息ID（通常是assistant消息）
feedback_type	string	否	反馈类型：GOOD 或 BAD，不传表示取消反馈
feedback_desc	string	否	反馈描述
feedback_tag	string	否	反馈标签：harmful/nonsense/fake/other
响应格式
成功响应
{
    "success": true,
    "message": "反馈提交成功",
    "data": null
}
失败响应
{
    "success": false,
    "message": "消息不存在",
    "data": null
}
注意事项
feedback_type 为空或不传时，会清空该消息的所有反馈信息
通常对 assistant 角色的消息进行反馈