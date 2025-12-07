## 聊天API

### 聊天完成接口
该接口提供与OpenAI兼容的聊天完成功能，支持流式和非流式响应。

**HTTP方法**: POST  
**URL路径**: `/v2/chat/completions/`
**认证要求**: 需要身份验证  
**请求头**:  
- `Authorization`: Bearer <token> (必需)
- `X-Conversation-Id`: 会话ID，格式为 `bzsz_<timestamp>_<random>` (必需)

**请求体结构 (JSON Schema)**:
```json
{
  "model": "deepseek-r1",
  "messages": [
    {
      "role": "user",
      "content": "你好，请介绍一下Python的特点"
    }
  ],
  "temperature": 0.7,
  "max_tokens": 2048,
  "top_p": 1.0,
  "stream": true,
  "store": true
}
```

**详细的后台请求参数对象**:
```python
class ChatCompletionRequest(BaseModel):
    """聊天完成请求模型"""

    model: str = Field(
        default=..., description="使用的模型标识符", examples=["deepseek-r1"]
    )
    messages: List[ChatMessage] = Field(
        default=...,
        description="对话消息列表",
        examples=[{"role": "user", "content": "你好，请介绍一下Python的特点"}],
    )
    temperature: Optional[float] = Field(
        default=None, ge=0.0, le=2.0, description="温度参数，控制随机性", examples=[0.7]
    )
    max_tokens: Optional[int] = Field(
        default=None, gt=0, description="最大生成token数", examples=[2048]
    )
    top_p: Optional[float] = Field(
        default=None, ge=0.0, le=1.0, description="核采样参数", examples=[1.0]
    )
    response_format:Optional[Dict[str, Any]] = Field(
        default=None,
        description="指定模型必须输出的格式：text 或 json_object",
        examples=[{"type": "text"}],
    )
    stop: Optional[List[str]] = Field(
        default=None, description="停止序列", examples=[[]]
    )
    stream: Optional[bool] = Field(
        default=True, description="是否流式返回", examples=[True]
    )
    store: Optional[bool] = Field(
        default=True, description="是否存储会话", examples=[True]
    )
    user: Optional[str] = Field(
        default=None, description="用户标识符", examples=["user_name"]
    )
    tools: Optional[List[Tool]] = Field(
        default=None,
        max_length=128,
        description="工具定义列表，最多支持128个。模型可能会调用这些工具",
        examples=[
            [
                {
                    "type": "function",
                    "function": {
                        "name": "get_weather",
                        "description": "获取天气",
                        "parameters": {
                            "type": "object",
                            "properties": {
                                "location": {"type": "string", "description": "地点"}
                            },
                            "required": ["location"],
                        },
                    },
                }
            ]
        ],
    )
    web_search: Optional[WebSearchConfig] = Field(
        default=None,
        description="网络搜索配置。enable 是必需字段，用于控制是否启用网络搜索功能",
    )
    reasoning: Optional[bool] = Field(default=True, description="是否启用推理模式")
    conversation_id: str = Field(
        default=None, description="会话ID", examples=["session_id"]
    )
    user_identifier: str = Field(
        default=None, description="用户标识符", examples=["user_id"]
    )
    prompt: Optional[str] = Field(
        default=None,
        description="系统提示词",
        examples=["You are a helpful assistant."],
    )
```

**响应格式**:
- 流式响应: `text/event-stream` 媒体类型
- 非流式响应: JSON格式

**状态码**:
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `429`: 试用次数已用完
- `500`: 服务器内部错误

**流式响应处理机制**:
当请求参数`stream`为`true`时，服务器会以`text/event-stream`格式返回响应。客户端需要处理SSE (Server-Sent Events) 格式的数据流，每个事件包含部分响应内容，直到收到`[DONE]`标记表示响应结束。根据响应的实际类型，系统会动态设置返回头，流式响应直接设置headers，非流式响应则包装成JSONResponse后设置headers。

**curl示例**:

curl --location '192.168.0.103:10089/v2/chat/completions/' \
--header 'X-Conversation-Id: bzsz_1761645757_695937' \
--header 'Content-Type: application/json' \
--header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkZW50aWZpZXIiOiIwMDA2MDAuNjM5ODYzNWEzODhhMmVhNmU4MWRkYmY3ZjJkZWYxYzAuMDI1OCIsImV4cCI6MTc2MTY0OTEwOSwiaWF0IjoxNzYxNjQ1NTA5LCJpc3MiOiJmYXN0YXBpLWNoYXQtc2VydmljZSIsInR5cGUiOiJhY2Nlc3MifQ.cmlxfpmtNJwVb4qKg_aepyGbxK2Cxq37q5vGV_2oQbw' \
--data '{
    "model": "glm",
    "store": true, // 是否存储会话
    "stream": true, // 是否流式返回数据
    "messages": [
        {
            "content": "今天是什么日子，简短回答我。",
            "role": "user",
            "name": "string"
        }
    ],  
    "max_tokens": null,
    "response_format": "text",  // [text, json_object]
    "stop": null,
    "top_p": 1,
    "tools": null,
    "user": "000600.6398635a388a2ea6e81ddbf7f2def1c0.0258", // user_identifier
    "prompt": null, // 提示词，可以为空
    "reasoning": true, // 深度思考
    "web_search": { // 联网搜索
        "enable": true
    }
}'

## 典型成功响应样例:
### 流式响应数据样例
headers返回: x-conversation-id: bzsz_1761325336_049877 这个时会话id
特别说明：<think>...</think>包裹的部分，为深度思考的内容，</think>为正文内容，正文内容要以markdown格式来渲染。
流式数据请求/返回的数据格式如下，下面是3条流式数据，特殊字段说明："id"：消息id，content：回复的正文，reasoning_content：深度思考的内容
{
    "id": "8422e476-17ea-4c34-93e5-84b87dc252ae",
    "choices": [
        {
            "delta": {
                "role": "assistant",
                "content": null,
                "reasoning_content": "用户"
            },
            "index": 0
        }
    ],
    "created": 1761645756,
    "model": "glm-4.5-flash"
}
{
    "id": "8422e476-17ea-4c34-93e5-84b87dc252ae",
    "choices": [
        {
            "delta": {
                "role": "assistant",
                "content": null,
                "reasoning_content": "想要"
            },
            "index": 0
        }
    ],
    "created": 1761645756,
    "model": "glm-4.5-flash"
}
{
    "id": "8422e476-17ea-4c34-93e5-84b87dc252ae",
    "choices": [
        {
            "delta": {
                "role": "assistant"
                "content": "月",
                "reasoning_content": null
            },
            "index": 0
        }
    ],
    "created": 1761645756,
    "model": "glm-4.5-flash"
}
省略部分内容...
[DONE]

### 非流式数据的:
headers返回: x-conversation-id: bzsz_1761325336_049877 这个时会话id
{
    "success": true,
    "message": "操作成功",
    "data": {
        "model": "glm-z1-airx",
        "created": 1763916231,
        "choices": [
            {
                "index": 0,
                "finish_reason": "stop",
                "message": {
                    "content": "重阳节，又称“重九节”“登高节”，是中国传统节日之一，日期为农历九月初九。",
                    "role": "assistant",
                    "reasoning_content": "好的，用户提到了重阳节，我需要详细介绍一下这个节日。"
                }
            }
        ],
        "request_id": "ca650dc9-3456-4546-938a-6cc39780cf3d",
        "id": "ca650dc9-3456-4546-938a-6cc39780cf3d",
        "usage": {
            "prompt_tokens": 39,
            "completion_tokens": 1514,
            "total_tokens": 1553
        }
    }
}