# 前端 Apple 登录集成指南

## 概述

本文档说明如何在前端（Web）集成 Apple Sign In，并对接后端 API。

---

## 第一步：准备工作

### 1.1 获取配置信息

从后端团队或配置文档中获取：

- **Service ID**: `com.questech.signin.web`（示例，实际以你的为准）
- **后端 API 地址**: `https://api.baizesz.com`
- **前端回调地址**: `https://baizesz.com/auth/apple/callback`

### 1.2 域名验证文件

确保以下文件已部署到你的 Web 服务器：

```
https://baizesz.com/.well-known/apple-developer-domain-association.txt
```

---

## 第二步：引入 Apple JS SDK

### 2.1 在 HTML 中引入 SDK

在 `<head>` 标签中添加：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>登录</title>

    <!-- Apple Sign In 配置 -->
    <meta name="appleid-signin-client-id" content="com.questech.signin.web">
    <meta name="appleid-signin-scope" content="name email">
    <meta name="appleid-signin-redirect-uri" content="https://baizesz.com/auth/apple/callback">
    <meta name="appleid-signin-state" content="random_state_string">
    <meta name="appleid-signin-use-popup" content="false">

    <!-- Apple JS SDK -->
    <script type="text/javascript" src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>
</head>
<body>
    <!-- 页面内容 -->
</body>
</html>
```

**配置说明**：
- `appleid-signin-client-id`: 你的 Service ID
- `appleid-signin-scope`: 请求的权限（姓名、邮箱）
- `appleid-signin-redirect-uri`: 回调地址（必须与 Apple Developer 配置一致）
- `appleid-signin-state`: 防 CSRF 的随机字符串
- `appleid-signin-use-popup`: `false` 使用页面跳转，`true` 使用弹窗

---

## 第三步：添加登录按钮

### 3.1 使用 Apple 官方按钮样式

```html
<div
    id="appleid-signin"
    data-color="black"
    data-border="true"
    data-type="sign in"
    data-border-radius="15"
    data-width="280"
    data-height="40">
</div>
```

**样式选项**：
- `data-color`: `black` | `white`
- `data-border`: `true` | `false`
- `data-type`: `sign in` | `sign up` | `continue`
- `data-border-radius`: 圆角半径（0-50）
- `data-width`: 按钮宽度（px）
- `data-height`: 按钮高度（30-64）

### 3.2 自定义按钮（可选）

```html
<button id="custom-apple-signin" class="apple-signin-button">
    <img src="/apple-logo.svg" alt="Apple">
    使用 Apple 账号登录
</button>
```

```javascript
document.getElementById('custom-apple-signin').addEventListener('click', () => {
    window.AppleID.auth.signIn();
});
```

---

## 第四步：处理登录响应

### 4.1 在登录页面监听事件

```html
<script>
// 监听登录成功事件
document.addEventListener('AppleIDSignInOnSuccess', async (event) => {
    console.log('Apple 登录成功', event.detail);

    const { authorization, user } = event.detail;

    try {
        // 调用后端 API
        const response = await fetch('https://api.baizesz.com/user/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 2,                               // Apple 登录类型
                id_token: authorization.id_token,      // Apple 返回的 ID Token
                platform: 'web',                       // 平台标识
                email: user?.email,                    // 用户邮箱（首次授权时有）
                full_name: user ? `${user.name.firstName} ${user.name.lastName}` : null,
                version: '1.0.0'                       // 应用版本
            })
        });

        const data = await response.json();

        if (data.success) {
            // 保存登录凭证
            localStorage.setItem('access_token', data.data.access_token);
            localStorage.setItem('refresh_token', data.data.refresh_token);
            localStorage.setItem('user_identifier', data.data.user_identifier);

            // 跳转到主页
            window.location.href = '/dashboard';
        } else {
            // 显示错误信息
            alert('登录失败：' + data.message);
        }
    } catch (error) {
        console.error('登录请求失败', error);
        alert('网络错误，请稍后重试');
    }
});

// 监听登录失败事件
document.addEventListener('AppleIDSignInOnFailure', (event) => {
    console.error('Apple 登录失败', event.detail.error);
    alert('Apple 登录失败：' + event.detail.error);
});
</script>
```

### 4.2 在回调页面处理（/auth/apple/callback）

创建回调页面 `auth/apple/callback.html`：

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>正在登录...</title>
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }
        .loading {
            text-align: center;
        }
        .spinner {
            border: 4px solid #f3f3f3;
            border-top: 4px solid #000;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 20px;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="loading">
        <div class="spinner"></div>
        <p>正在登录，请稍候...</p>
    </div>

    <script>
    // Apple 会自动触发 AppleIDSignInOnSuccess 事件
    // 这个页面只需要显示加载状态

    // 如果 3 秒后还没有跳转，显示错误
    setTimeout(() => {
        alert('登录超时，请重试');
        window.location.href = '/login';
    }, 3000);
    </script>
</body>
</html>
```

---

## 第五步：后端 API 对接

### 5.1 登录 API

**请求**：

```
POST https://api.baizesz.com/user/
Content-Type: application/json
```

**请求 Body**：

```json
{
  "type": 2,
  "id_token": "eyJraWQiOiJXNldjT0tC...",
  "platform": "web",
  "email": "user@example.com",
  "full_name": "John Doe",
  "version": "1.0.0"
}
```

**字段说明**：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | int | ✅ | 登录类型，固定为 `2`（Apple 登录） |
| `id_token` | string | ✅ | Apple 返回的 ID Token |
| `platform` | string | 推荐 | 平台标识：`web` |
| `email` | string | 可选 | 用户邮箱（首次登录时 Apple 会返回） |
| `full_name` | string | 可选 | 用户姓名（首次登录时 Apple 会返回） |
| `version` | string | 可选 | 应用版本 |

**响应**（成功）：

```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "id": 123,
    "username": "John Doe",
    "email": "user@privaterelay.appleid.com",
    "user_identifier": "001600.abc123def456...",
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 3600,
    "credits": 20.0,
    "avatar": "bi bi-emoji-wink"
  }
}
```

**响应**（失败）：

```json
{
  "success": false,
  "message": "Apple 登录验证失败: ID Token 已过期",
  "data": null
}
```

### 5.2 使用 Access Token

后续 API 请求需要携带 Access Token：

```javascript
const response = await fetch('https://api.baizesz.com/api/xxx', {
    method: 'GET',
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
        'Content-Type': 'application/json'
    }
});
```

### 5.3 刷新 Token

Access Token 过期后（1小时），使用 Refresh Token 刷新：

```javascript
const response = await fetch('https://api.baizesz.com/user/refresh/token/', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        refresh_token: localStorage.getItem('refresh_token')
    })
});

const data = await response.json();
if (data.success) {
    localStorage.setItem('access_token', data.data.access_token);
    localStorage.setItem('refresh_token', data.data.refresh_token);
}
```

---

## 第六步：React 示例

### 6.1 安装依赖

不需要额外依赖，直接使用 Apple JS SDK。

### 6.2 创建 AppleSignIn 组件

```jsx
import { useEffect } from 'react';

function AppleSignIn() {
    useEffect(() => {
        // 加载 Apple JS SDK
        const script = document.createElement('script');
        script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
        script.async = true;
        script.onload = () => {
            window.AppleID.auth.init({
                clientId: 'com.questech.signin.web',
                scope: 'name email',
                redirectURI: 'https://baizesz.com/auth/apple/callback',
                state: generateRandomState(),
                usePopup: false,
            });
        };
        document.body.appendChild(script);

        // 监听登录事件
        const handleSuccess = async (event) => {
            const { authorization, user } = event.detail;
            await handleAppleLogin(authorization, user);
        };

        const handleFailure = (event) => {
            console.error('Apple 登录失败', event.detail.error);
        };

        document.addEventListener('AppleIDSignInOnSuccess', handleSuccess);
        document.addEventListener('AppleIDSignInOnFailure', handleFailure);

        return () => {
            document.removeEventListener('AppleIDSignInOnSuccess', handleSuccess);
            document.removeEventListener('AppleIDSignInOnFailure', handleFailure);
            if (script.parentNode) {
                document.body.removeChild(script);
            }
        };
    }, []);

    const handleAppleLogin = async (authorization, user) => {
        try {
            const response = await fetch('https://api.baizesz.com/user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 2,
                    id_token: authorization.id_token,
                    platform: 'web',
                    email: user?.email,
                    full_name: user ? `${user.name.firstName} ${user.name.lastName}` : null,
                    version: '1.0.0'
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('access_token', data.data.access_token);
                localStorage.setItem('refresh_token', data.data.refresh_token);
                window.location.href = '/dashboard';
            } else {
                alert('登录失败：' + data.message);
            }
        } catch (error) {
            console.error('登录请求失败', error);
            alert('网络错误，请稍后重试');
        }
    };

    const generateRandomState = () => {
        return Math.random().toString(36).substring(2, 15);
    };

    return (
        <div
            id="appleid-signin"
            data-color="black"
            data-border="true"
            data-type="sign in"
        />
    );
}

export default AppleSignIn;
```

### 6.3 使用组件

```jsx
import AppleSignIn from './components/AppleSignIn';

function LoginPage() {
    return (
        <div className="login-page">
            <h1>登录</h1>
            <AppleSignIn />
        </div>
    );
}
```

---

## 第七步：Vue 示例

### 7.1 创建 AppleSignIn 组件

```vue
<template>
  <div
    id="appleid-signin"
    data-color="black"
    data-border="true"
    data-type="sign in"
  />
</template>

<script>
export default {
  name: 'AppleSignIn',
  mounted() {
    this.loadAppleSDK();
  },
  beforeUnmount() {
    document.removeEventListener('AppleIDSignInOnSuccess', this.handleSuccess);
    document.removeEventListener('AppleIDSignInOnFailure', this.handleFailure);
  },
  methods: {
    loadAppleSDK() {
      const script = document.createElement('script');
      script.src = 'https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js';
      script.async = true;
      script.onload = () => {
        window.AppleID.auth.init({
          clientId: 'com.questech.signin.web',
          scope: 'name email',
          redirectURI: 'https://baizesz.com/auth/apple/callback',
          state: this.generateRandomState(),
          usePopup: false,
        });
      };
      document.body.appendChild(script);

      document.addEventListener('AppleIDSignInOnSuccess', this.handleSuccess);
      document.addEventListener('AppleIDSignInOnFailure', this.handleFailure);
    },
    async handleSuccess(event) {
      const { authorization, user } = event.detail;

      try {
        const response = await fetch('https://api.baizesz.com/user/', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: 2,
            id_token: authorization.id_token,
            platform: 'web',
            email: user?.email,
            full_name: user ? `${user.name.firstName} ${user.name.lastName}` : null,
            version: '1.0.0'
          })
        });

        const data = await response.json();

        if (data.success) {
          localStorage.setItem('access_token', data.data.access_token);
          localStorage.setItem('refresh_token', data.data.refresh_token);
          this.$router.push('/dashboard');
        } else {
          alert('登录失败：' + data.message);
        }
      } catch (error) {
        console.error('登录请求失败', error);
        alert('网络错误，请稍后重试');
      }
    },
    handleFailure(event) {
      console.error('Apple 登录失败', event.detail.error);
      alert('Apple 登录失败：' + event.detail.error);
    },
    generateRandomState() {
      return Math.random().toString(36).substring(2, 15);
    }
  }
}
</script>
```

---

## 第八步：常见问题

### 8.1 首次登录和后续登录的区别

**首次登录**：
- Apple 返回 `user` 对象，包含 `name` 和 `email`
- 需要将这些信息传给后端

**后续登录**：
- Apple 不再返回 `user` 对象
- 只需要传 `id_token`

**处理方式**：
```javascript
const requestBody = {
    type: 2,
    id_token: authorization.id_token,
    platform: 'web',
    version: '1.0.0'
};

// 仅首次登录时添加用户信息
if (user) {
    requestBody.email = user.email;
    requestBody.full_name = `${user.name.firstName} ${user.name.lastName}`;
}
```

### 8.2 用户取消登录

当用户点击取消时，会触发 `AppleIDSignInOnFailure` 事件：

```javascript
document.addEventListener('AppleIDSignInOnFailure', (event) => {
    if (event.detail.error === 'popup_closed_by_user') {
        console.log('用户取消了登录');
        // 不需要显示错误提示
    } else {
        console.error('登录失败', event.detail.error);
        alert('登录失败，请重试');
    }
});
```

### 8.3 处理隐藏邮箱

Apple 提供 "Hide My Email" 功能，用户可能使用隐藏邮箱：

```
user@privaterelay.appleid.com
```

这是正常的，后端会正确处理。前端无需特殊处理。

### 8.4 CORS 问题

如果遇到跨域问题，确保：

1. 后端已配置 CORS（已配置）
2. 请求使用正确的域名：`https://api.baizesz.com`
3. 不要使用 `http://` 或 `localhost`

### 8.5 回调页面 404

确保 `/auth/apple/callback` 路由已配置：

**单页应用（SPA）**：
```javascript
// React Router
<Route path="/auth/apple/callback" component={AppleCallbackPage} />

// Vue Router
{
  path: '/auth/apple/callback',
  component: AppleCallbackPage
}
```

**传统多页应用**：
确保服务器上存在 `auth/apple/callback.html` 文件。

---

## 第九步：测试

### 9.1 开发环境测试

1. 确保使用 HTTPS（Apple 要求）
2. 可以使用 ngrok 等工具映射本地服务

```bash
ngrok http 3000
# 获得：https://xxx.ngrok.io
```

然后在 Apple Developer 配置中添加这个域名。

### 9.2 测试清单

- [ ] Apple 登录按钮显示正常
- [ ] 点击按钮可以跳转到 Apple 登录页面
- [ ] 登录成功后返回回调页面
- [ ] 前端成功接收 `id_token`
- [ ] 调用后端 API 成功
- [ ] 保存 token 到 localStorage
- [ ] 跳转到主页成功
- [ ] 使用 token 调用其他 API 成功

### 9.3 调试工具

**查看 Apple 返回的数据**：

```javascript
document.addEventListener('AppleIDSignInOnSuccess', (event) => {
    console.log('Authorization:', event.detail.authorization);
    console.log('User:', event.detail.user);
});
```

**查看后端响应**：

```javascript
const data = await response.json();
console.log('Backend response:', data);
```

---

## 第十步：生产环境部署

### 10.1 配置检查

- [ ] Service ID 已创建
- [ ] 域名验证文件已部署
- [ ] Return URL 配置正确
- [ ] 前端代码中的 `clientId`、`redirectURI` 正确
- [ ] 后端 API 地址正确
- [ ] 使用 HTTPS

### 10.2 安全建议

1. **使用 HTTPS**：
   - Apple 要求所有回调地址必须是 HTTPS

2. **验证 State**：
   - 生成随机 state 防止 CSRF 攻击
   ```javascript
   const state = Math.random().toString(36).substring(2, 15);
   sessionStorage.setItem('apple_signin_state', state);
   ```

3. **Token 安全**：
   - Access Token 存储在 localStorage
   - 不要在 URL 中传递 token
   - 定期刷新 token

4. **错误处理**：
   - 友好的错误提示
   - 记录错误日志
   - 提供重试机制

---

## 附录：完整示例

### 纯 HTML + JavaScript 完整示例

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Apple 登录示例</title>

    <!-- Apple Sign In 配置 -->
    <meta name="appleid-signin-client-id" content="com.questech.signin.web">
    <meta name="appleid-signin-scope" content="name email">
    <meta name="appleid-signin-redirect-uri" content="https://baizesz.com/auth/apple/callback">
    <meta name="appleid-signin-state" content="random_state_string">

    <!-- Apple JS SDK -->
    <script type="text/javascript" src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"></script>

    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 400px;
            margin: 100px auto;
            padding: 20px;
        }
        h1 {
            text-align: center;
        }
        #appleid-signin {
            margin: 20px auto;
        }
    </style>
</head>
<body>
    <h1>登录</h1>

    <div
        id="appleid-signin"
        data-color="black"
        data-border="true"
        data-type="sign in"
        data-border-radius="15"
        data-width="280"
        data-height="40">
    </div>

    <script>
    // 监听登录成功
    document.addEventListener('AppleIDSignInOnSuccess', async (event) => {
        console.log('Apple 登录成功', event.detail);

        const { authorization, user } = event.detail;

        // 显示加载状态
        document.body.innerHTML = '<div style="text-align: center;">正在登录...</div>';

        try {
            const response = await fetch('https://api.baizesz.com/user/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: 2,
                    id_token: authorization.id_token,
                    platform: 'web',
                    email: user?.email,
                    full_name: user ? `${user.name.firstName} ${user.name.lastName}` : null,
                    version: '1.0.0'
                })
            });

            const data = await response.json();

            if (data.success) {
                localStorage.setItem('access_token', data.data.access_token);
                localStorage.setItem('refresh_token', data.data.refresh_token);
                localStorage.setItem('user_identifier', data.data.user_identifier);

                alert('登录成功！');
                window.location.href = '/dashboard.html';
            } else {
                alert('登录失败：' + data.message);
                window.location.reload();
            }
        } catch (error) {
            console.error('登录请求失败', error);
            alert('网络错误，请稍后重试');
            window.location.reload();
        }
    });

    // 监听登录失败
    document.addEventListener('AppleIDSignInOnFailure', (event) => {
        console.error('Apple 登录失败', event.detail.error);

        if (event.detail.error === 'popup_closed_by_user') {
            console.log('用户取消了登录');
        } else {
            alert('登录失败：' + event.detail.error);
        }
    });
    </script>
</body>
</html>
```

---

## 技术支持

如遇问题，请联系后端团队或查看后端文档：
- [你需要手动完成的操作.md](你需要手动完成的操作.md)
- [APPLE_SIGNIN_SETUP.md](APPLE_SIGNIN_SETUP.md)
