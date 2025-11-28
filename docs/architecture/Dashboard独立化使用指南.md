# Dashboard 独立化使用指南

## 📋 文档信息

- **版本**: v1.0
- **创建日期**: 2025-11-04
- **适用对象**: 前端开发者、系统集成工程师
- **前置阅读**: [Dashboard独立化架构设计.md](./Dashboard独立化架构设计.md)

---

## 🎯 快速开始

### 文件结构

```
standalone/
├── dashboard-standalone.html          # 独立的 Dashboard 页面
└── adapters/
    ├── electron-adapter.js            # Electron 环境适配器
    └── web-adapter.js                 # Web 环境适配器
```

---

## 📦 在 Electron 中使用

### 方式一：在现有页面中嵌入（推荐）

**步骤 1：在路由配置中添加**

```javascript
// src/services/RouterService.js 或相应的路由文件

import { Dashboard } from '../standalone/dashboard-standalone.html';

router.addRoute('/dashboard-standalone', async (container) => {
  // 加载独立 HTML
  const iframe = document.createElement('iframe');
  iframe.src = './standalone/dashboard-standalone.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  container.appendChild(iframe);

  // 等待 iframe 加载完成后注入 adapter
  iframe.onload = () => {
    // 加载 adapter 脚本
    const adapterScript = iframe.contentDocument.createElement('script');
    adapterScript.src = './adapters/electron-adapter.js';
    iframe.contentDocument.head.appendChild(adapterScript);

    // 初始化 Dashboard
    adapterScript.onload = () => {
      const adapter = new iframe.contentWindow.ElectronAdapter();
      iframe.contentWindow.initDashboard(adapter, {
        theme: window.app.getService('settings').get('theme')
      });
    };
  };
});
```

**步骤 2：导航到页面**

```javascript
window.app.getService('router').navigate('/dashboard-standalone');
```

### 方式二：使用 webview 标签

如果你的 Electron 应用使用 webview：

```html
<!-- 在你的 HTML 中 -->
<webview
  id="dashboard-webview"
  src="./standalone/dashboard-standalone.html"
  preload="./standalone/adapters/electron-preload.js">
</webview>
```

```javascript
// electron-preload.js
const { ipcRenderer } = require('electron');

// 注入 ElectronAdapter
window.ElectronAdapter = class ElectronAdapter {
  async fetchDashboardData() {
    return await ipcRenderer.invoke('dashboard:fetch-data');
  }

  navigateToNews() {
    ipcRenderer.send('navigate', '/news');
  }

  navigateToChat() {
    ipcRenderer.send('navigate', '/chat');
  }

  sendAIInterpret(message, options) {
    ipcRenderer.send('ai-interpret', { message, options });
  }
};

// 主进程需要处理这些 IPC 消息
// main.js
ipcMain.handle('dashboard:fetch-data', async () => {
  // 返回数据
});

ipcMain.on('navigate', (event, path) => {
  // 处理导航
});

ipcMain.on('ai-interpret', (event, data) => {
  // 处理 AI 解读
});
```

### 方式三：直接在主窗口使用

```javascript
// 在应用启动时或某个组件中
import './standalone/adapters/electron-adapter.js';

const container = document.getElementById('main-content');

// 加载 HTML 内容
fetch('./standalone/dashboard-standalone.html')
  .then(res => res.text())
  .then(html => {
    // 提取 body 内容
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    container.innerHTML = doc.body.innerHTML;

    // 执行脚本
    const scripts = doc.querySelectorAll('script');
    scripts.forEach(script => {
      const newScript = document.createElement('script');
      newScript.textContent = script.textContent;
      container.appendChild(newScript);
    });

    // 初始化
    const adapter = new ElectronAdapter();
    window.initDashboard(adapter);
  });
```

---

## 🌐 在 Web 环境中使用

### 方式一：直接访问 HTML 文件

**步骤 1：配置服务器**

确保你的 Web 服务器正确配置了静态文件服务：

```nginx
# nginx 配置示例
location /dashboard {
    alias /path/to/standalone/dashboard-standalone.html;
}

location /api/dashboard {
    proxy_pass http://backend:8080/api/dashboard;
}
```

**步骤 2：初始化脚本**

在 `dashboard-standalone.html` 的 `<head>` 中添加初始化脚本：

```html
<script src="./adapters/web-adapter.js"></script>
<script>
  // 页面加载完成后自动初始化
  window.addEventListener('DOMContentLoaded', () => {
    const adapter = new WebAdapter({
      apiBase: 'https://api.example.com',  // 你的 API 地址
      newsPageUrl: '/news.html',
      chatPageUrl: '/chat.html',
      onError: (error) => {
        console.error('Dashboard Error:', error);
        // 可以显示错误提示
        alert('加载失败，请刷新页面重试');
      }
    });

    // 初始化 Dashboard
    window.initDashboard(adapter, {
      theme: 'light'  // 或 'dark'
    });
  });
</script>
```

### 方式二：作为 SPA 的一部分

如果你有一个单页应用（如 React、Vue），可以将 Dashboard 作为一个页面嵌入：

**React 示例**

```jsx
// DashboardPage.jsx
import React, { useEffect, useRef } from 'react';

function DashboardPage() {
  const containerRef = useRef(null);

  useEffect(() => {
    // 加载 Dashboard HTML
    fetch('/standalone/dashboard-standalone.html')
      .then(res => res.text())
      .then(html => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');

        // 提取 body 内容
        containerRef.current.innerHTML = doc.body.innerHTML;

        // 执行脚本
        const scripts = doc.querySelectorAll('script');
        scripts.forEach(script => {
          const newScript = document.createElement('script');
          newScript.textContent = script.textContent;
          containerRef.current.appendChild(newScript);
        });

        // 加载 adapter
        const adapterScript = document.createElement('script');
        adapterScript.src = '/standalone/adapters/web-adapter.js';
        adapterScript.onload = () => {
          const adapter = new window.WebAdapter({
            apiBase: process.env.REACT_APP_API_BASE,
            newsPageUrl: '/news',
            chatPageUrl: '/chat'
          });

          window.initDashboard(adapter, {
            theme: localStorage.getItem('theme') || 'light'
          });
        };
        document.head.appendChild(adapterScript);
      });

    return () => {
      // 清理
      if (window.dashboardInstance) {
        window.dashboardInstance.unmount();
      }
    };
  }, []);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }}></div>;
}

export default DashboardPage;
```

**Vue 示例**

```vue
<!-- DashboardPage.vue -->
<template>
  <div ref="container" class="dashboard-container"></div>
</template>

<script>
export default {
  name: 'DashboardPage',

  mounted() {
    this.loadDashboard();
  },

  beforeUnmount() {
    if (window.dashboardInstance) {
      window.dashboardInstance.unmount();
    }
  },

  methods: {
    async loadDashboard() {
      // 加载 Dashboard HTML
      const html = await fetch('/standalone/dashboard-standalone.html').then(r => r.text());
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // 提取内容
      this.$refs.container.innerHTML = doc.body.innerHTML;

      // 执行脚本
      const scripts = doc.querySelectorAll('script');
      scripts.forEach(script => {
        const newScript = document.createElement('script');
        newScript.textContent = script.textContent;
        this.$refs.container.appendChild(newScript);
      });

      // 加载 adapter
      await this.loadScript('/standalone/adapters/web-adapter.js');

      // 初始化
      const adapter = new window.WebAdapter({
        apiBase: process.env.VUE_APP_API_BASE,
        newsPageUrl: '/news',
        chatPageUrl: '/chat'
      });

      window.initDashboard(adapter, {
        theme: this.$store.state.theme
      });
    },

    loadScript(src) {
      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }
  }
}
</script>

<style scoped>
.dashboard-container {
  width: 100%;
  height: 100%;
}
</style>
```

---

## 🔧 自定义 Adapter

如果你需要在其他环境（如小程序、React Native）中使用，可以实现自定义 Adapter：

```javascript
class CustomAdapter {
  /**
   * 必需方法 1: 获取数据
   */
  async fetchDashboardData() {
    // 实现你的数据获取逻辑
    const response = await yourApiClient.get('/dashboard');
    return response;
  }

  /**
   * 必需方法 2: 导航到新闻页面
   */
  navigateToNews() {
    // 实现你的导航逻辑
    yourRouter.push('/news');
  }

  /**
   * 必需方法 3: 导航到聊天页面
   */
  navigateToChat() {
    // 实现你的导航逻辑
    yourRouter.push('/chat');
  }

  /**
   * 必需方法 4: 发送 AI 解读
   */
  sendAIInterpret(message, options) {
    // 实现你的 AI 解读逻辑
    yourEventBus.emit('ai:interpret', { message, options });
  }
}

// 使用
const adapter = new CustomAdapter();
window.initDashboard(adapter);
```

---

## 🎨 主题配置

### 动态切换主题

```javascript
// 获取当前主题
const currentTheme = adapter.getCurrentTheme();

// 切换主题
function toggleTheme() {
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  document.body.className = `theme-${newTheme}`;

  // 如果使用 WebAdapter，可以保存主题
  if (adapter.setTheme) {
    adapter.setTheme(newTheme);
  }
}

// 监听系统主题变化
const unsubscribe = adapter.onThemeChange((theme) => {
  document.body.className = `theme-${theme}`;
});

// 取消监听
unsubscribe();
```

### 自定义主题颜色

修改 `dashboard-standalone.html` 中的 CSS 变量：

```css
:root {
  /* 修改主色调 */
  --color-primary: #your-color;
  --color-primary-hover: #your-hover-color;

  /* 修改背景色 */
  --color-background: #your-background;
  --color-surface: #your-surface;
}
```

---

## 📡 API 数据格式

Dashboard 期望的数据格式：

```typescript
interface DashboardResponse {
  data: {
    todayNews: {
      items: Array<{
        id: string | number;
        title: string;
        // 其他字段...
      }>;
    };
    aiDailyReport: {
      items: Array<{
        id: string | number;
        title: string;
        // 其他字段...
      }>;
    };
    aiNews: {
      items: Array<{
        id: string | number;
        title: string;
        // 其他字段...
      }>;
    };
  };
}
```

**示例 API 响应**

```json
{
  "data": {
    "todayNews": {
      "items": [
        {
          "id": "1",
          "title": "今日要闻标题 1"
        },
        {
          "id": "2",
          "title": "今日要闻标题 2"
        }
      ]
    },
    "aiDailyReport": {
      "items": [
        {
          "id": "10",
          "title": "AI 日报标题 1"
        }
      ]
    },
    "aiNews": {
      "items": [
        {
          "id": "20",
          "title": "AI 资讯标题 1"
        }
      ]
    }
  }
}
```

---

## 🔍 调试与测试

### 使用 Mock Adapter 进行测试

```javascript
class MockAdapter {
  async fetchDashboardData() {
    // 返回模拟数据
    return {
      data: {
        todayNews: {
          items: [
            { id: 1, title: '测试新闻 1' },
            { id: 2, title: '测试新闻 2' },
            { id: 3, title: '测试新闻 3' }
          ]
        },
        aiDailyReport: {
          items: [
            { id: 10, title: 'AI 日报测试 1' },
            { id: 11, title: 'AI 日报测试 2' }
          ]
        },
        aiNews: {
          items: [
            { id: 20, title: 'AI 资讯测试 1' }
          ]
        }
      }
    };
  }

  navigateToNews() {
    console.log('[Mock] 导航到新闻页面');
  }

  navigateToChat() {
    console.log('[Mock] 导航到聊天页面');
  }

  sendAIInterpret(message, options) {
    console.log('[Mock] AI 解读:', message, options);
  }
}

// 使用 Mock Adapter
const mockAdapter = new MockAdapter();
window.initDashboard(mockAdapter);
```

### 启用调试日志

在浏览器控制台中：

```javascript
// 查看 Dashboard 实例
console.log(window.dashboardInstance);

// 查看当前数据
console.log(window.dashboardInstance.dashboardData);

// 手动刷新数据
window.dashboardInstance.refreshDashboard();

// 测试 AI 解读
window.dashboardInstance.onAIInterpret('1');
```

---

## ⚠️ 常见问题

### Q1: 页面显示"未初始化"

**原因**: Adapter 未正确注入

**解决方案**:
```javascript
// 确保在页面加载后立即初始化
window.addEventListener('DOMContentLoaded', () => {
  const adapter = new YourAdapter();
  window.initDashboard(adapter);
});
```

### Q2: API 请求失败（CORS 错误）

**原因**: 跨域请求被阻止

**解决方案**:
1. **服务端配置 CORS**:
   ```javascript
   // Express.js 示例
   app.use(cors({
     origin: 'https://your-frontend-domain.com',
     credentials: true
   }));
   ```

2. **或使用代理**:
   ```nginx
   # nginx 配置
   location /api {
       proxy_pass http://backend:8080;
       proxy_set_header Host $host;
   }
   ```

### Q3: AI 解读功能不工作

**原因**: 聊天页面未正确接收消息

**解决方案（Web 环境）**:

在聊天页面的初始化代码中：

```javascript
// chat.html
window.addEventListener('DOMContentLoaded', () => {
  // 检查是否有待处理的消息
  const pendingMessage = WebAdapter.getPendingMessage();

  if (pendingMessage) {
    // 等待聊天组件初始化
    window.addEventListener('chat:ready', () => {
      sendMessage(pendingMessage.message, pendingMessage.options);
    }, { once: true });
  }
});
```

### Q4: iframe 中样式不生效

**原因**: CSS 作用域问题

**解决方案**:
- 使用 `<iframe>` 时，Dashboard 的样式是隔离的，不会受外部影响
- 如果需要外部样式影响 Dashboard，在 Dashboard HTML 中添加对应的样式

### Q5: 数据加载后页面空白

**原因**: 数据格式不匹配

**解决方案**:

检查 API 返回的数据格式是否正确：

```javascript
// 在 adapter 中添加数据验证
async fetchDashboardData() {
  const response = await fetch(...);
  const data = await response.json();

  // 验证数据格式
  if (!data.data || !data.data.todayNews) {
    console.error('数据格式错误:', data);
    throw new Error('Invalid data format');
  }

  return data;
}
```

---

## 🚀 性能优化建议

### 1. 懒加载 Dashboard

```javascript
// 仅在需要时加载 Dashboard
async function loadDashboard() {
  const [html, adapterModule] = await Promise.all([
    fetch('/standalone/dashboard-standalone.html').then(r => r.text()),
    import('/standalone/adapters/web-adapter.js')
  ]);

  // 渲染和初始化...
}
```

### 2. 数据缓存

```javascript
class CachedWebAdapter extends WebAdapter {
  constructor(config) {
    super(config);
    this.cache = null;
    this.cacheTime = null;
    this.cacheDuration = 5 * 60 * 1000; // 5 分钟
  }

  async fetchDashboardData() {
    const now = Date.now();

    // 如果缓存有效，直接返回
    if (this.cache && (now - this.cacheTime) < this.cacheDuration) {
      console.log('使用缓存数据');
      return this.cache;
    }

    // 否则重新获取
    const data = await super.fetchDashboardData();
    this.cache = data;
    this.cacheTime = now;

    return data;
  }
}
```

### 3. 预加载

```html
<!-- 在主页面中预加载 Dashboard 资源 -->
<link rel="prefetch" href="/standalone/dashboard-standalone.html">
<link rel="prefetch" href="/standalone/adapters/web-adapter.js">
```

---

## 📚 相关资源

- [Dashboard独立化架构设计.md](./Dashboard独立化架构设计.md) - 架构设计文档
- [智能体UI插件化架构设计文档.md](./智能体UI插件化架构设计文档.md) - 插件化架构参考
- [MDN Web Docs - iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe)
- [MDN Web Docs - sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage)

---

## 📝 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2025-11-04 | 初始版本 | System Architecture Team |

---

## 💡 最佳实践

1. **始终验证数据格式**: 在 Adapter 中验证 API 返回的数据
2. **错误处理**: 为所有 Adapter 方法添加 try-catch
3. **日志记录**: 添加详细的日志帮助调试
4. **主题跟随**: 让 Dashboard 主题跟随应用主题
5. **优雅降级**: 当某些功能不可用时，提供降级方案

---

**文档状态**: ✅ 完成
