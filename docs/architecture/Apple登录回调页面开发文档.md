# Apple 登录回调页面开发文档

## 概述

实现一个统一的 Apple 登录回调页面 `https://baizesz.com/auth/apple/callback`，支持 Electron 桌面应用和 Web 浏览器两种使用场景。

## 技术方案

### 1. 整体流程

#### 场景 1：Electron 应用
```
用户操作 → Electron 打开系统浏览器
         → Apple 登录页面
         → Apple 回调到 https://baizesz.com/auth/apple/callback?source=electron
         → 回调页面解析数据
         → 通过自定义协议唤起 Electron (questech://auth/apple?code=xxx&state=xxx)
         → Electron 接收数据
         → Electron 调用后端 API
         → 完成登录
```

#### 场景 2：Web 浏览器
```
用户操作 → Web 页面发起 Apple 登录
         → Apple 登录页面
         → Apple 回调到 https://baizesz.com/auth/apple/callback
         → 回调页面解析数据
         → 直接调用后端 API
         → 完成登录
         → 跳转到应用首页
```

### 2. 环境检测策略

#### 检测方法（优先级从高到低）
1. **URL 参数检测**
   - `?source=electron` - 明确标识来自 Electron
   - `?source=web` - 明确标识来自 Web

2. **sessionStorage 检测**
   - 登录发起前设置 `apple_login_source`
   - 回调后读取并清除

3. **User-Agent 检测**
   - 检测是否包含自定义 Electron UA 标识

### 3. 回调页面接收的数据

Apple 登录成功后会返回：
- `code` - 授权码
- `state` - 防 CSRF 攻击的状态码
- `id_token` - JWT 格式的 ID token（可选）
- `user` - 用户信息（仅首次授权时返回，JSON 格式）

### 4. Electron 自定义协议设计

#### 协议格式
```
questech://auth/apple?code={code}&state={state}&id_token={id_token}&user={encoded_user_json}
```

#### 参数说明
- `code` - Apple 返回的授权码
- `state` - 状态码，用于验证
- `id_token` - ID token（如果有）
- `user` - URL 编码后的用户信息 JSON

### 5. 后端 API 接口

#### Endpoint
```
POST /api/auth/apple/login
```

#### 请求参数
```json
{
  "code": "string",           // Apple 授权码
  "id_token": "string",       // ID token（可选）
  "user": {                   // 用户信息（首次登录时必填）
    "email": "string",
    "name": {
      "firstName": "string",
      "lastName": "string"
    }
  },
  "platform": "electron" | "web"  // 平台标识
}
```

#### 响应
```json
{
  "success": true,
  "data": {
    "token": "string",        // JWT token
    "user": {
      "id": "string",
      "email": "string",
      "name": "string",
      "avatar": "string"
    }
  }
}
```

### 6. 前端实现要点

#### 回调页面（callback.html）功能
1. 解析 URL 参数获取 Apple 返回的数据
2. 检测来源（Electron 或 Web）
3. 根据来源执行不同逻辑：
   - **Electron**: 构造自定义协议 URL 并跳转
   - **Web**: 调用后端 API 完成登录
4. 显示友好的加载状态和错误提示
5. 处理边界情况（参数缺失、API 失败等）

#### 页面 UI 设计
- 简洁的加载动画
- Apple 品牌风格
- 错误提示（清晰的错误信息和重试按钮）
- 自动跳转倒计时

### 7. Electron 端实现要点

#### 自定义协议注册
```javascript
// Windows
app.setAsDefaultProtocolClient('questech')

// macOS 在 Info.plist 中配置
// Linux 在 .desktop 文件中配置
```

#### 协议处理
```javascript
// Windows & Linux
app.on('second-instance', (event, commandLine) => {
  // 解析 commandLine 中的 questech:// URL
})

// macOS
app.on('open-url', (event, url) => {
  // 解析 url
})
```

#### 数据处理流程
1. 监听协议唤起事件
2. 解析 URL 参数
3. 提取 code、state、id_token、user
4. 调用后端 API `/api/auth/apple/login`
5. 保存返回的 token
6. 更新应用登录状态

### 8. 安全考虑

1. **State 参数验证**
   - 发起登录时生成随机 state
   - 回调时验证 state 是否匹配

2. **HTTPS 强制**
   - 回调 URL 必须使用 HTTPS

3. **Token 传输**
   - 通过自定义协议传输时，考虑敏感数据加密
   - 或使用临时 token 方案（后端生成临时 token，Electron 用临时 token 换取真实 token）

4. **URL 长度限制**
   - 自定义协议 URL 可能有长度限制
   - 考虑使用临时存储或分段传输

### 9. 错误处理

#### 回调页面可能的错误
- `error=user_cancelled_authorize` - 用户取消授权
- 参数缺失或格式错误
- 后端 API 调用失败
- 网络错误

#### Electron 端可能的错误
- 自定义协议未注册
- 应用未启动时无法唤起
- 参数解析失败
- 后端 API 调用失败

### 10. 开发步骤

#### Phase 1: 回调页面开发
1. 创建 `/auth/apple/callback` 路由和页面
2. 实现环境检测逻辑
3. 实现 Electron 场景的协议唤起
4. 实现 Web 场景的 API 调用
5. 实现 UI 和错误处理

#### Phase 2: Electron 集成
1. 注册自定义协议 `questech://`
2. 实现协议监听和解析
3. 调用后端登录 API
4. 更新应用状态
5. 测试完整流程

#### Phase 3: 后端 API 开发
1. 实现 `/api/auth/apple/login` 接口
2. 验证 Apple 授权码
3. 创建或更新用户
4. 生成 JWT token
5. 返回用户信息

#### Phase 4: 测试
1. Electron 场景端到端测试
2. Web 场景端到端测试
3. 错误场景测试
4. 跨平台测试（Windows/macOS/Linux）

### 11. 配置项

#### Apple Developer 配置
- **Return URLs**: 添加 `https://baizesz.com/auth/apple/callback`
- **Client ID**: 应用的 Bundle ID 或 Service ID

#### 环境变量
```env
# Apple OAuth 配置
APPLE_CLIENT_ID=com.questech.app
APPLE_TEAM_ID=XXXXXXXXX
APPLE_KEY_ID=XXXXXXXXX
APPLE_PRIVATE_KEY_PATH=/path/to/key.p8

# 回调地址
APPLE_REDIRECT_URI=https://baizesz.com/auth/apple/callback

# Electron 自定义协议
ELECTRON_PROTOCOL=questech
```

## 技术栈

### 回调页面
- 纯 HTML/CSS/JavaScript（无框架依赖，快速加载）

### Electron 端
- Electron API
- Node.js
- 自定义协议 `questech://`

### 前端服务
- `AppleAuthService.js` - 处理 Electron 场景的协议回调
- `LoginModal.js` - 登录模态框，支持 Apple 登录按钮
- `UserApiService.js` - 提供 `loginWithApple` 和 `loginWithAppleCode` 方法

### 后端
- 现有后端框架
- Apple Sign In 验证库

## 文件结构

```
web/
├── public/
│   └── auth/
│       └── apple/
│           └── callback.html               # ✅ 回调页面（已实现）
├── src/
│   ├── components/
│   │   └── auth/
│   │       └── LoginModal.js               # ✅ 登录模态框（已更新）
│   └── services/
│       ├── api/
│       │   └── UserApiService.js           # ✅ API 服务（已更新）
│       ├── auth/
│       │   └── AppleAuthService.js         # ✅ Apple 登录服务（新增）
│       └── index.js                        # ✅ 服务初始化（已更新）
└── docs/
    └── architecture/
        └── Apple登录回调页面开发文档.md  # ✅ 本文档

electron/
├── main.js                                 # ✅ 主进程（已更新，包含协议处理）
└── preload.js                              # ✅ 预加载脚本（已更新）

backend/
└── api/
    └── user/
        └── login.py                        # ⚠️ 需要后端支持 Apple 登录
```

## 实现状态

### ✅ 已完成

1. **回调页面** (`public/auth/apple/callback.html`)
   - 自动检测来源（Electron 或 Web）
   - Electron 场景：通过 `questech://` 协议唤起应用
   - Web 场景：直接调用后端 API
   - 友好的 UI 和错误处理

2. **Electron 主进程** (`electron/main.js`)
   - 注册自定义协议 `questech://`
   - 处理 Windows/Linux 的 `second-instance` 事件
   - 处理 macOS 的 `open-url` 事件
   - 解析协议 URL 并发送到渲染进程

3. **Electron 预加载脚本** (`electron/preload.js`)
   - 暴露 `onAppleAuthCallback` 方法监听回调
   - 暴露 `removeAppleAuthCallback` 方法移除监听
   - 暴露 `openExternal` 方法打开系统浏览器

4. **前端服务层**
   - `AppleAuthService.js`: 监听协议回调，调用 API，更新用户状态
   - `UserApiService.js`: 提供 `loginWithAppleCode` 方法处理 Electron 场景
   - `services/index.js`: 自动初始化 Apple 登录服务

5. **登录模态框** (`LoginModal.js`)
   - 区分 Electron 和 Web 环境
   - Electron: 打开系统浏览器访问 Apple 登录
   - Web: 使用 Apple SDK 弹窗登录
   - 添加来源标识（sessionStorage 和 URL 参数）

### ⚠️ 待完成

1. **后端 API**
   - 需要支持 `type=2` 的 Apple 登录
   - 接收 `code` 或 `id_token` 参数
   - 验证 Apple token
   - 创建或更新用户
   - 返回 access_token 和 refresh_token

2. **Apple Developer 配置**
   - 在 Apple Developer Portal 添加回调地址：`https://baizesz.com/auth/apple/callback`
   - 配置 Service ID 或 Bundle ID
   - 上传私钥文件

3. **测试**
   - Electron 完整流程测试
   - Web 完整流程测试
   - 错误场景测试
   - 跨平台测试（Windows/macOS/Linux）

## 参考资料

- [Apple Sign In 官方文档](https://developer.apple.com/documentation/sign_in_with_apple)
- [Electron 自定义协议](https://www.electronjs.org/docs/latest/api/protocol)
- [OAuth 2.0 授权码流程](https://oauth.net/2/grant-types/authorization-code/)
