# 文件上传接口对接文档

## 概述

本文档描述文件上传相关的API接口，采用**预签名URL模式**，支持本地存储和云存储两种方式。

**上传流程：**
1. 调用 `/upload/create` 获取上传URL（需要token验证）
2. 使用返回的URL上传文件到 `/upload/{upload_id}`
3. 调用 `/upload/complete` 确认上传完成

**特性：**
- 需要身份验证（Bearer Token）
- 支持SHA-256秒传功能
- 支持多种文件类型（图片、文档、视频、音频、压缩包）
- 文件大小限制：100MB
- 上传链接有效期：30分钟

---

## 1. 创建上传URL

**接口地址：** `POST /v2/common/upload/create`

**鉴权方式：** Bearer Token（必须在请求头携带）

**请求头：**
```
Authorization: Bearer <your_token>
Content-Type: application/json
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| filename | string | 是 | 原始文件名（如：example.jpg） |
| file_size | integer | 是 | 文件大小（字节） |
| file_type | string | 否 | 文件类型限制：`image`、`document`、`video`、`audio`、`archive` |
| content_type | string | 否 | 文件MIME类型（如：image/jpeg） |
| description | string | 否 | 文件描述 |
| sha256_hash | string | 否 | 文件SHA-256哈希值（用于秒传，小写） |

**支持的文件类型和扩展名：**
- `image`: .jpg, .jpeg, .png, .gif, .bmp, .webp
- `document`: .pdf, .doc, .docx, .txt, .md, .xlsx, .xls, .ppt, .pptx
- `video`: .mp4, .avi, .mov, .wmv, .flv, .mkv
- `audio`: .mp3, .wav, .flac, .aac, .ogg
- `archive`: .zip, .rar, .7z, .tar, .gz

### 返回参数（秒传场景）

当 `sha256_hash` 匹配到已存在文件时：

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功（true） |
| message | string | "文件已存在，秒传成功" |
| data.is_duplicate | boolean | 是否为重复文件（true） |
| data.file_id | integer | 已存在文件的ID |
| data.file_url | string | 文件访问URL |
| data.file_info.original_filename | string | 原始文件名 |
| data.file_info.file_size | integer | 文件大小 |
| data.file_info.file_type | string | 文件类型 |

### 返回参数（正常上传场景）

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功（true） |
| message | string | "上传URL创建成功" |
| data.upload_id | string | 上传ID（用于后续步骤） |
| data.upload_url | string | 上传URL地址 |
| data.upload_method | string | 上传HTTP方法（POST/PUT） |
| data.expires_at | string | 链接过期时间（ISO 8601格式） |
| data.headers | object | 上传时需要的请求头 |
| data.headers.X-Upload-Token | string | 上传令牌（本地存储时） |
| data.fields | object | 上传时需要的表单字段 |
| data.file_info.original_filename | string | 原始文件名 |
| data.file_info.unique_filename | string | 唯一文件名（服务器生成） |
| data.file_info.file_type | string | 检测到的文件类型 |

### 错误返回

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | false |
| message | string | 错误信息 |
| data | null | null |

**常见错误信息：**
- "文件名不能为空"
- "不支持的文件类型，允许的类型: [...]"
- "文件大小超过限制（最大 100MB）"

---

## 2. 执行文件上传

**接口地址：** `POST /v2/common/upload/{upload_id}`

**鉴权方式：** 无需Bearer Token

**请求方式：** `multipart/form-data`

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| upload_id | string | 是 | 从步骤1获取的upload_id |

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| file | file | 是 | 文件数据（二进制） |
| upload_token | string | 是 | 从步骤1获取的 `headers.X-Upload-Token` |

### 返回参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功（true） |
| message | string | "文件上传成功，请调用确认接口完成上传" |
| data.upload_id | string | 上传ID |
| data.file_size | integer | 实际文件大小 |
| data.sha256_hash | string | SHA-256哈希值（如有） |
| data.status | string | "uploaded" |

### 错误返回

**常见错误信息：**
- "无效的上传ID或上传链接已过期"
- "上传链接已过期"
- "无效的上传令牌"
- "文件大小超过限制（最大 100MB）"

---

## 3. 完成文件上传

**接口地址：** `POST /v2/common/upload/complete`

**鉴权方式：** 无需Bearer Token

**请求头：**
```
Content-Type: application/json
```

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| upload_id | string | 是 | 从步骤1获取的upload_id |
| checksum | string | 否 | 文件SHA-256校验和（小写） |

### 返回参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功（true） |
| message | string | "文件上传确认成功" |
| data.upload_id | string | 上传ID |
| data.original_filename | string | 原始文件名 |
| data.file_type | string | 文件类型 |
| data.file_size | integer | 文件大小 |
| data.file_url | string | **文件访问URL（最终结果）** |
| data.sha256_hash | string | 文件SHA-256哈希值 |
| data.description | string | 文件描述（如有） |
| data.upload_time | string | 上传时间（ISO 8601） |
| data.confirmed_time | string | 确认时间（ISO 8601） |

### 错误返回

**常见错误信息：**
- "无效的上传ID"
- "文件尚未上传，当前状态: pending"
- "文件不存在"
- "文件校验和不匹配: 预期 xxx, 实际 yyy"

---

## 4. 查询上传状态

**接口地址：** `GET /v2/common/upload/{upload_id}`

**鉴权方式：** 无需Bearer Token

### 路径参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| upload_id | string | 是 | 上传ID |

### 返回参数

| 参数名 | 类型 | 说明 |
|--------|------|------|
| success | boolean | 是否成功 |
| message | string | "查询成功" |
| data.upload_id | string | 上传ID |
| data.status | string | 上传状态：`pending`、`uploaded`、`confirmed` |
| data.original_filename | string | 原始文件名 |
| data.file_type | string | 文件类型 |
| data.sha256_hash | string | SHA-256哈希值（如有） |
| data.created_at | string | 创建时间（ISO 8601） |
| data.expires_at | string | 过期时间（ISO 8601） |

### 错误返回

**常见错误信息：**
- "上传ID不存在"

---

## 完整上传流程示例

### 流程1：普通上传

1. **创建上传URL** → 获取 `upload_id`、`upload_url`、`upload_token`
2. **执行文件上传** → 使用 `upload_id` 和 `upload_token` 上传文件
3. **完成上传确认** → 使用 `upload_id` 确认，获取最终 `file_url`

### 流程2：秒传（文件已存在）

1. **创建上传URL**（携带 `sha256_hash`） → 直接返回 `file_url`，流程结束

---

## 注意事项

1. **身份验证**：只有步骤1需要Bearer Token，步骤2和3不需要
2. **有效期**：上传链接30分钟内有效
3. **文件大小**：最大100MB
4. **文件命名**：服务器会自动处理重名文件（添加时间戳）
5. **秒传优化**：建议在客户端计算SHA-256并传入，避免重复上传
6. **SHA-256格式**：必须使用小写十六进制字符串
