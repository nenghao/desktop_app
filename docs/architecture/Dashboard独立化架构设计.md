# Dashboard 独立化架构设计文档

## 📋 文档信息

- **版本**: v1.0
- **创建日期**: 2025-11-04
- **作者**: System Architecture Team
- **状态**: ✅ 设计完成，待实施

---

## 🎯 背景与目标

### 问题背景

当前 `Dashboard.js` 是一个紧密耦合于 Electron 应用架构的组件，存在以下问题：

1. **强依赖应用框架**：依赖 `window.app.getService()` 获取路由、事件总线等服务
2. **无法独立部署**：无法在纯 Web 环境中单独使用
3. **代码重复风险**：如果要做 Web 版本，需要重写 Dashboard 逻辑
4. **测试困难**：无法脱离完整的 Electron 环境进行单元测试

### 设计目标

将 Dashboard 改造为**独立的 HTML 文件**，实现：

✅ **环境无关**：同一份代码可在 Electron webview 和纯 Web 环境中运行
✅ **依赖注入**：通过 Adapter 模式注入环境相关的实现
✅ **易于维护**：单一代码源，避免重复维护
✅ **灵活部署**：可独立部署为静态页面，也可嵌入 Electron
✅ **可测试性**：可通过 Mock Adapter 进行独立测试

---

## 🏗️ 架构设计

### 总体架构

```
┌─────────────────────────────────────────────────────────┐
│           dashboard-standalone.html                      │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Dashboard Class (UI Logic)                │  │
│  │  - render()                                       │  │
│  │  - loadDashboardData()                            │  │
│  │  - onAIInterpret()                                │  │
│  │  - generateNewsList()                             │  │
│  └─────────────────┬─────────────────────────────────┘  │
│                    │ 调用                                │
│                    ↓                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Adapter Interface (抽象接口)              │  │
│  │  + fetchDashboardData(): Promise                  │  │
│  │  + navigateToNews(): void                         │  │
│  │  + navigateToChat(): void                         │  │
│  │  + sendAIInterpret(message, options): void        │  │
│  └───────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                             ↑
                             │ 注入实现
                    ┌────────┴────────┐
                    │                 │
        ┌───────────▼──────┐  ┌──────▼────────────┐
        │ ElectronAdapter  │  │   WebAdapter      │
        ├──────────────────┤  ├───────────────────┤
        │ 使用 window.app  │  │ 使用 fetch        │
        │ eventBus.emit()  │  │ sessionStorage    │
        │ router.navigate()│  │ location.href     │
        └──────────────────┘  └───────────────────┘
```

### 核心设计原则

1. **依赖倒置原则（DIP）**：Dashboard 依赖抽象的 Adapter 接口，不依赖具体实现
2. **单一职责原则（SRP）**：Dashboard 只负责 UI 渲染，环境相关逻辑由 Adapter 处理
3. **开闭原则（OCP）**：对扩展开放（可添加新的 Adapter），对修改关闭（Dashboard 核心代码不变）

---

## 📝 Adapter 接口定义

### 接口规范

```typescript
interface IDashboardAdapter {
  /**
   * 获取 Dashboard 数据
   * @returns Promise<DashboardData>
   */
  fetchDashboardData(): Promise<{
    data: {
      todayNews: { items: Array<NewsItem> };
      aiDailyReport: { items: Array<ReportItem> };
      aiNews: { items: Array<NewsItem> };
    }
  }>;

  /**
   * 导航到新闻页面
   */
  navigateToNews(): void;

  /**
   * 导航到聊天页面
   */
  navigateToChat(): void;

  /**
   * 发送 AI 解读请求
   * @param message - 要解读的消息内容
   * @param options - 解读配置选项
   */
  sendAIInterpret(message: string, options: {
    model: string;
    networkMode: boolean;
    thinking: boolean;
    reasoning: boolean;
    prompt: string;
  }): void;
}
```

### 数据结构

```typescript
interface NewsItem {
  id: string | number;
  title: string;
  [key: string]: any;
}

interface ReportItem {
  id: string | number;
  title: string;
  [key: string]: any;
}
```

---

## 🔧 实现方案

### 1. Dashboard Class 改造

**原有代码**：
```javascript
async loadDashboardData() {
  const commonApiService = getCommonApiService();
  const response = await commonApiService.getDashboardData();
  // ...
}

onAIInterpret(itemId) {
  const router = window.app.getService('router');
  const eventBus = window.app.getService('eventBus');
  router.navigate('/chat');
  eventBus.emit('chat:send-message', {...});
}
```

**改造后**：
```javascript
constructor(adapter) {
  if (!adapter || typeof adapter !== 'object') {
    throw new Error('Dashboard requires an adapter object');
  }
  this.adapter = adapter;
  // 验证必需方法
  this._validateAdapter();
}

async loadDashboardData() {
  const response = await this.adapter.fetchDashboardData();
  // ...
}

onAIInterpret(itemId) {
  const newsTitle = this.getNewsTitle(itemId);
  const message = `请解读以下新闻：${newsTitle}`;

  this.adapter.sendAIInterpret(message, {
    model: 'deepseek-r1',
    networkMode: false,
    thinking: true,
    reasoning: true,
    prompt: "news_reader"
  });
}
```

### 2. Electron Adapter 实现

```javascript
class ElectronAdapter {
  async fetchDashboardData() {
    const commonApiService = window.app.getService('api').commonApiService;
    return await commonApiService.getDashboardData();
  }

  navigateToNews() {
    window.app.getService('router').navigate('/news');
  }

  navigateToChat() {
    window.app.getService('router').navigate('/chat');
  }

  sendAIInterpret(message, options) {
    const router = window.app.getService('router');
    const eventBus = window.app.getService('eventBus');

    // 切换到聊天页面
    this.navigateToChat();

    // 延迟发送消息，确保聊天界面已初始化
    setTimeout(() => {
      eventBus.emit('chat:send-message', { message, options });
    }, 500);
  }
}
```

### 3. Web Adapter 实现

```javascript
class WebAdapter {
  constructor(config = {}) {
    this.apiBase = config.apiBase || '/api';
  }

  async fetchDashboardData() {
    const response = await fetch(`${this.apiBase}/dashboard`);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return await response.json();
  }

  navigateToNews() {
    window.location.href = '/news.html';
  }

  navigateToChat() {
    window.location.href = '/chat.html';
  }

  sendAIInterpret(message, options) {
    // 通过 sessionStorage 传递数据到聊天页面
    sessionStorage.setItem('pendingMessage', JSON.stringify({
      message,
      options,
      timestamp: Date.now()
    }));

    this.navigateToChat();
  }
}
```

---

## 📦 文件结构

```
web/
├── standalone/                          # 独立HTML文件目录
│   ├── dashboard-standalone.html        # Dashboard独立页面
│   ├── adapters/
│   │   ├── electron-adapter.js          # Electron适配器
│   │   └── web-adapter.js               # Web适配器
│   └── styles/
│       └── dashboard-standalone.css     # 独立样式文件（可选）
├── src/
│   └── views/
│       └── Dashboard.js                 # 原有Dashboard（保持不变）
└── docs/
    └── architecture/
        ├── Dashboard独立化架构设计.md   # 本文档
        └── Dashboard独立化使用指南.md   # 使用说明
```

---

## 🚀 使用方式

### Electron 环境

**方式一：在主窗口中使用**

```javascript
// main.js 或路由配置
import { ElectronAdapter } from './standalone/adapters/electron-adapter.js';

// 注册路由
router.addRoute('/dashboard-standalone', async (container) => {
  // 加载独立HTML
  const iframe = document.createElement('iframe');
  iframe.src = './standalone/dashboard-standalone.html';
  iframe.style.width = '100%';
  iframe.style.height = '100%';
  iframe.style.border = 'none';

  container.appendChild(iframe);

  // 等待iframe加载完成后注入adapter
  iframe.onload = () => {
    iframe.contentWindow.initDashboard(new ElectronAdapter());
  };
});
```

**方式二：使用 webview 标签**

```html
<webview id="dashboard-webview" src="./standalone/dashboard-standalone.html"></webview>

<script>
const webview = document.getElementById('dashboard-webview');

webview.addEventListener('dom-ready', () => {
  // 注入 Electron Adapter
  webview.executeJavaScript(`
    window.initDashboard(new ElectronAdapter());
  `);
});
</script>
```

### Web 环境

**直接访问**

```html
<!-- 访问 https://example.com/dashboard-standalone.html -->
<!-- HTML文件内部会自动使用 WebAdapter -->
```

**嵌入到现有页面**

```html
<div id="dashboard-container"></div>

<script src="./standalone/adapters/web-adapter.js"></script>
<script>
  fetch('./standalone/dashboard-standalone.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('dashboard-container').innerHTML = html;

      // 初始化 Dashboard
      const adapter = new WebAdapter({ apiBase: 'https://api.example.com' });
      window.initDashboard(adapter);
    });
</script>
```

---

## 🔄 迁移路径

### 阶段一：创建独立版本（不影响现有系统）

1. ✅ 创建 `dashboard-standalone.html`
2. ✅ 实现 Adapter 接口和两套实现
3. ✅ 独立测试新版本

### 阶段二：并行运行（灰度验证）

1. 在 Electron 中同时保留旧版和新版路由
2. 通过配置切换使用哪个版本
3. 收集用户反馈

### 阶段三：完全切换（可选）

1. 将 Electron 路由指向独立版本
2. 移除旧的 `Dashboard.js`（如果不再需要）

**注意**：由于采用了依赖注入设计，新旧版本可以**永久共存**，不一定要废弃旧版本。

---

## ⚠️ 注意事项与最佳实践

### 1. 跨域问题（Web 环境）

**问题**：独立 HTML 通过 `fetch` 请求 API 时可能遇到 CORS 限制

**解决方案**：
- 服务端配置 CORS 头：`Access-Control-Allow-Origin`
- 或使用同域部署（HTML 和 API 同源）

### 2. AI 解读的时序问题

**问题**：跳转到聊天页面后，聊天组件可能还未初始化完成

**解决方案**：

**Electron**：
```javascript
// 使用事件监听确保初始化完成
eventBus.once('chat:ready', () => {
  eventBus.emit('chat:send-message', {...});
});
```

**Web**：
```javascript
// chat.html 中
window.addEventListener('DOMContentLoaded', () => {
  const pending = sessionStorage.getItem('pendingMessage');
  if (pending) {
    const { message, options } = JSON.parse(pending);
    sessionStorage.removeItem('pendingMessage');

    // 等待组件初始化
    if (window.chatReady) {
      sendMessage(message, options);
    } else {
      window.addEventListener('chat:ready', () => {
        sendMessage(message, options);
      }, { once: true });
    }
  }
});
```

### 3. 样式隔离

**问题**：独立 HTML 的样式可能与父页面冲突

**解决方案**：
- 使用 `<iframe>` 或 `<webview>` 天然隔离
- 或在 HTML 内使用 Shadow DOM
- CSS 使用唯一的命名空间前缀

### 4. 错误处理

**必须处理的场景**：
- ✅ Adapter 未正确注入
- ✅ API 请求失败
- ✅ 导航失败（Web 环境下）
- ✅ 数据格式不匹配

**示例**：
```javascript
class Dashboard {
  _validateAdapter() {
    const required = ['fetchDashboardData', 'navigateToNews', 'navigateToChat', 'sendAIInterpret'];
    for (const method of required) {
      if (typeof this.adapter[method] !== 'function') {
        throw new Error(`Adapter missing required method: ${method}`);
      }
    }
  }

  async loadDashboardData() {
    try {
      const response = await this.adapter.fetchDashboardData();
      this.dashboardData = response.data || {};
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      this.dashboardData = { todayNews: [], aiDailyReport: [], aiNews: [] };
      // 显示错误UI
      this.notificationCenter.error('数据加载失败，请稍后重试');
    }
  }
}
```

### 5. 性能优化

- ✅ Adapter 方法避免重复创建大对象
- ✅ 使用事件委托而非为每个元素绑定事件
- ✅ API 数据使用缓存机制（可选）

---

## 🧪 测试策略

### 单元测试

使用 Mock Adapter 进行测试：

```javascript
class MockAdapter {
  async fetchDashboardData() {
    return {
      data: {
        todayNews: { items: [{ id: 1, title: 'Test News' }] },
        aiDailyReport: { items: [] },
        aiNews: { items: [] }
      }
    };
  }

  navigateToNews() {
    this.lastNavigation = 'news';
  }

  sendAIInterpret(message, options) {
    this.lastAIRequest = { message, options };
  }
}

// 测试
const adapter = new MockAdapter();
const dashboard = new Dashboard(adapter);
await dashboard.loadDashboardData();
assert(dashboard.dashboardData.todayNews.length === 1);
```

### 集成测试

- ✅ Electron 环境：测试与 eventBus、router 的集成
- ✅ Web 环境：测试 sessionStorage 数据传递
- ✅ 端到端测试：模拟完整的用户流程（查看新闻 → AI 解读 → 跳转聊天）

---

## 📊 兼容性矩阵

| 环境 | 支持情况 | Adapter | 备注 |
|------|---------|---------|------|
| Electron (iframe) | ✅ 完全支持 | ElectronAdapter | 推荐方式 |
| Electron (webview) | ✅ 完全支持 | ElectronAdapter | 需要 preload 脚本 |
| Chrome/Edge | ✅ 完全支持 | WebAdapter | 需要服务器支持 |
| Firefox | ✅ 完全支持 | WebAdapter | 需要服务器支持 |
| Safari | ✅ 完全支持 | WebAdapter | 注意 sessionStorage 隐私模式限制 |
| 移动浏览器 | ⚠️ 需测试 | WebAdapter | 响应式设计需优化 |

---

## 🔮 未来扩展

### 可扩展点

1. **新增 Adapter**：例如支持小程序环境、React Native 等
2. **插件机制**：允许注入自定义的卡片渲染器
3. **主题系统**：通过 Adapter 注入主题配置
4. **国际化**：通过 Adapter 提供多语言文本

### 示例：小程序 Adapter

```javascript
class MiniProgramAdapter {
  async fetchDashboardData() {
    return new Promise((resolve, reject) => {
      wx.request({
        url: 'https://api.example.com/dashboard',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  }

  navigateToNews() {
    wx.navigateTo({ url: '/pages/news/news' });
  }

  sendAIInterpret(message, options) {
    wx.navigateTo({
      url: `/pages/chat/chat?message=${encodeURIComponent(message)}`
    });
  }
}
```

---

## ✅ 验收标准

实施完成后需满足以下条件：

- [ ] `dashboard-standalone.html` 可在浏览器中直接打开（传入 WebAdapter）
- [ ] 在 Electron 中通过 iframe/webview 加载正常工作
- [ ] AI 解读功能在两个环境中都能正确跳转和传递消息
- [ ] 无任何硬编码的环境依赖（如 `window.app`）
- [ ] 通过单元测试和集成测试
- [ ] 文档齐全（架构文档 + 使用指南）

---

## 📚 相关文档

- [Dashboard独立化使用指南.md](./Dashboard独立化使用指南.md)（待创建）
- [智能体UI插件化架构设计文档.md](./智能体UI插件化架构设计文档.md)
- [智能体UI动态加载方案.md](./智能体UI动态加载方案.md)

---

## 📝 变更日志

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0 | 2025-11-04 | 初始版本 | System Architecture Team |

---

**文档状态**: ✅ 设计完成，准备开始实施
