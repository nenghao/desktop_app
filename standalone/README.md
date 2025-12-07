# Dashboard 独立化模块

这是 Dashboard 的独立版本，可以在 Electron 和纯 Web 环境中使用。

## 📁 文件结构

```
standalone/
├── README.md                          # 本文件
├── dashboard-standalone.html          # 独立的 Dashboard 页面
├── example-web.html                   # Web 使用示例（带 Mock 数据）
└── adapters/
    ├── electron-adapter.js            # Electron 环境适配器
    └── web-adapter.js                 # Web 环境适配器
```

## 🚀 快速开始

### 查看示例

1. **启动本地服务器**（需要 HTTP 服务器，不能直接用 `file://` 协议）

   使用 Python:
   ```bash
   cd standalone
   python -m http.server 8080
   ```

   或使用 Node.js (http-server):
   ```bash
   npx http-server standalone -p 8080
   ```

2. **访问示例页面**

   打开浏览器访问：`http://localhost:8080/example-web.html`

### 在项目中使用

#### Electron 环境

```javascript
// 加载 adapter
import './standalone/adapters/electron-adapter.js';

// 创建 adapter 实例
const adapter = new ElectronAdapter();

// 初始化 Dashboard
window.initDashboard(adapter, {
  theme: 'light' // 或 'dark'
});
```

#### Web 环境

```html
<!DOCTYPE html>
<html>
<head>
  <title>Dashboard</title>
</head>
<body>
  <div id="dashboard-root"></div>

  <!-- 加载 adapter -->
  <script src="./adapters/web-adapter.js"></script>

  <!-- 初始化 -->
  <script>
    const adapter = new WebAdapter({
      apiBase: 'https://api.example.com',
      newsPageUrl: '/news.html',
      chatPageUrl: '/chat.html'
    });

    window.addEventListener('DOMContentLoaded', () => {
      window.initDashboard(adapter, { theme: 'light' });
    });
  </script>
</body>
</html>
```

## 📚 文档

详细的使用指南和架构设计文档请参阅：

- **[Dashboard独立化架构设计.md](../docs/architecture/Dashboard独立化架构设计.md)** - 架构设计与实现原理
- **[Dashboard独立化使用指南.md](../docs/architecture/Dashboard独立化使用指南.md)** - 详细的使用指南和最佳实践

## 🔧 Adapter 接口

所有 Adapter 必须实现以下接口：

```typescript
interface IDashboardAdapter {
  // 获取 Dashboard 数据
  fetchDashboardData(): Promise<DashboardData>;

  // 导航到新闻页面
  navigateToNews(): void;

  // 导航到聊天页面
  navigateToChat(): void;

  // 发送 AI 解读请求
  sendAIInterpret(message: string, options: object): void;
}
```

## 📡 数据格式

API 应返回以下格式的数据：

```json
{
  "data": {
    "todayNews": {
      "items": [
        { "id": "1", "title": "新闻标题" }
      ]
    },
    "aiDailyReport": {
      "items": [
        { "id": "10", "title": "日报标题" }
      ]
    },
    "aiNews": {
      "items": [
        { "id": "20", "title": "资讯标题" }
      ]
    }
  }
}
```

## 🎨 主题支持

内置两套主题：

- **Light Theme** (默认)
- **Dark Theme**

通过以下方式切换：

```javascript
// 初始化时指定
window.initDashboard(adapter, { theme: 'dark' });

// 或动态切换
document.body.className = 'theme-dark';
```

## 🐛 调试

在浏览器控制台中：

```javascript
// 查看 Dashboard 实例
console.log(window.dashboardInstance);

// 查看当前数据
console.log(window.dashboardInstance.dashboardData);

// 手动刷新
window.dashboardInstance.refreshDashboard();

// 测试 AI 解读
window.dashboardInstance.onAIInterpret('1');
```

## ❓ 常见问题

### 页面显示"未初始化"

请确保：
1. 正确加载了 Adapter 脚本
2. 调用了 `window.initDashboard(adapter)`
3. Adapter 实现了所有必需的方法

### API 请求失败 (CORS)

请在服务端配置 CORS 头，或使用代理服务器。

### 数据加载后页面空白

检查 API 返回的数据格式是否符合要求。

## 📝 更新日志

- **v1.0** (2025-11-04) - 初始版本

## 📄 许可证

[项目许可证信息]
