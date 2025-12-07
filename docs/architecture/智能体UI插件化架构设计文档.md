# QuestechApp 智能体UI插件化架构设计文档

## 📋 文档信息

- **版本**: v1.0
- **创建日期**: 2025-10-17
- **作者**: QuestechApp Team
- **状态**: 已实施

---

## 🎯 架构概述

QuestechApp 采用**插件化架构**实现智能体UI的动态加载和渲染。该架构通过**依赖注入**和**约定式接口**实现了宿主应用与智能体UI的完全解耦，支持智能体UI的独立开发、部署和热更新。

### 核心设计理念

1. **完全解耦**: 宿主应用与智能体UI相互独立，互不依赖
2. **依赖注入**: 通过 Context 对象传递所有依赖和服务
3. **约定优于配置**: 统一的 `init(context)` 入口函数
4. **动态加载**: 运行时从远程服务器加载 JS/CSS 资源
5. **版本隔离**: 每个智能体独立的代码和样式，互不干扰

---

## 🏗️ 架构组成

### 1. 三层架构
#### 大纲
```
AgentDetail.js (宿主)
    ↓ 动态加载
bundle.js (插件)
    ↓ 通过 context 通信
宿主提供的服务和工具
```
关键点：
AgentDetail.js 是容器/宿主，只负责提供一个空的 \<div class="agent-main-content">
bundle.js 是插件，完全独立开发，不依赖宿主的任何代码
两者通过 context 对象 进行通信

#### 具体层结构

```
┌─────────────────────────────────────────────────────────┐
│                    宿主应用层                             │
│  (AgentDetail.js - 容器管理、生命周期控制)                  │
└─────────────────────────────────────────────────────────┘
                          ↓ Context 注入
┌─────────────────────────────────────────────────────────┐
│                    加载器层                               │
│  (AgentUILoader.js - 资源下载、缓存管理、版本控制)           │
└─────────────────────────────────────────────────────────┘
                          ↓ 动态加载
┌─────────────────────────────────────────────────────────┐
│                    插件层                                │
│  (bundle.js + style.css - 智能体UI实现)                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 核心组件详解

### 1. 宿主应用层 (AgentDetail.js)

**职责:**
- 提供 DOM 容器 (`<div class="agent-main-content">`)
- 管理智能体生命周期 (初始化、渲染、销毁)
- 创建并注入 Context 对象
- 提供全局服务和工具函数

**关键方法:**

```javascript
class AgentDetail {
  // 加载并渲染智能体UI
  async loadAndRenderAgentUI(agent, container) {
    // 1. 检查 UI 配置
    const uiConfig = agent.detail?.ui_config;
    
    // 2. 使用 AgentUILoader 加载资源
    const uiBundle = await uiLoader.loadAgentUI(agent.id, uiConfig);
    
    // 3. 注入 CSS
    this.injectAgentCSS(agent.id, uiBundle.cssCode);
    
    // 4. 执行 JS 并传入 Context
    await this.executeAgentUI(container, uiBundle, agent);
  }
  
  // 执行智能体UI代码
  async executeAgentUI(container, uiBundle, agentData) {
    // 创建 Context 对象
    const context = {
      container,
      agentData,
      config: uiBundle.config,
      services: { statusBarManager, pythonEnvironment, app, ... },
      utils: { showNotification, executeAgent, ... }
    };
    
    // 执行 bundle.js (IIFE 格式)
    const initFunction = new Function(`
      'use strict';
      return ${uiBundle.bundleCode}
    `);
    
    const init = initFunction();
    await init(context); // 调用插件的初始化函数
  }
  
  // 注入智能体CSS
  injectAgentCSS(agentId, cssCode) {
    const styleId = `agent-ui-style-${agentId}`;
    let styleElement = document.getElementById(styleId);
    
    if (styleElement) {
      styleElement.textContent = cssCode;
    } else {
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = cssCode;
      document.head.appendChild(styleElement);
    }
  }
}
```

---

### 2. 加载器层 (AgentUILoader.js)

**职责:**
- 从远程服务器下载 JS/CSS 资源
- 使用 IndexedDB 缓存资源
- 基于版本号的缓存策略
- 支持开发模式（禁用缓存）

**缓存策略:**

```javascript
class AgentUILoader {
  async loadAgentUI(agentId, uiConfig, options = {}) {
    // 1. 初始化 IndexedDB
    await this.initDB();
    
    // 2. 检查是否禁用缓存 (开发模式)
    if (options.disableCache) {
      return await this.downloadUIBundle(uiConfig, true);
    }
    
    // 3. 检查缓存
    const cachedUI = await this.getCachedUI(agentId);
    
    // 4. 版本比对
    if (cachedUI && cachedUI.version === uiConfig.version) {
      console.log('✅ 使用缓存');
      return cachedUI;
    }
    
    // 5. 版本不一致，重新下载
    console.log('🔄 版本变化，重新下载');
    const uiBundle = await this.downloadUIBundle(uiConfig, true);
    
    // 6. 保存到缓存
    await this.saveUIToCache(agentId, uiConfig.version, uiBundle);
    
    return uiBundle;
  }
  
  // 下载资源
  async downloadUIBundle(uiConfig, bustCache = false) {
    const { bundle_url, css_url } = uiConfig;
    
    // 并行下载
    const [bundleCode, cssCode] = await Promise.all([
      this.fetchText(bundle_url, bustCache),
      this.fetchText(css_url, bustCache)
    ]);
    
    return { bundleCode, cssCode, config: {} };
  }
}
```

**IndexedDB 结构:**

```javascript
{
  dbName: 'AgentUICache',
  storeName: 'ui_bundles',
  keyPath: 'agentId',
  indexes: ['version', 'cachedAt'],
  
  // 缓存数据结构
  cacheData: {
    agentId: string,
    version: string,
    bundleCode: string,
    cssCode: string,
    config: object,
    cachedAt: timestamp
  }
}
```

---

### 3. 插件层 (bundle.js)

**职责:**
- 实现智能体UI逻辑
- 渲染界面到容器
- 处理用户交互
- 调用后端服务(如果有)

**标准格式:**

```javascript
(function() {
  'use strict';
  
  // ============================================
  // 1. 导出的初始化函数 (必须)
  // ============================================
  function init(context) {
    const { container, agentData, config, services, utils } = context;
    
    console.log('🚀 初始化智能体UI:', agentData.name);
    
    // 创建智能体实例
    const agent = new MyAgent(context);
    agent.render();
  }
  
  // ============================================
  // 2. 智能体类定义
  // ============================================
  class MyAgent {
    constructor(context) {
      // 保存 Context 引用
      this.context = context;
      this.container = context.container;
      this.agentData = context.agentData;
      this.config = context.config;
      this.services = context.services;
      this.utils = context.utils;
      
      // 智能体自己的状态
      this.state = {};
    }
    
    async render() {
      // 渲染 HTML
      this.renderHTML();
      
      // 绑定事件
      this.initializeEventListeners();
      
      // 更新状态栏
      this.utils.updateAgentStatus(this.agentData.name, 'ready', '就绪');
    }
    
    renderHTML() {
      this.container.innerHTML = `
        <div class="my-agent-workspace">
          <!-- 智能体UI -->
        </div>
      `;
    }
    
    initializeEventListeners() {
      // 绑定事件监听器
    }
    
    async handleAction() {
      try {
        // 调用后端方法
        const result = await this.utils.executeAgent('methodName', [arg1, arg2]);
        
        // 处理结果
        this.displayResult(result);
      } catch (error) {
        this.utils.showError('操作失败: ' + error.message);
      }
    }
  }
  
  // ============================================
  // 3. 返回 init 函数 (必须)
  // ============================================
  return init;
})();
```

---

## Context 对象规范

Context 是宿主与插件之间的**唯一通信接口**，包含以下内容：

### 完整结构

```typescript
// AgentDetail.js 创建 context
const context = {
  // 1. DOM容器
  container: HTMLElement,           // 插件的渲染容器
  
  // 2. 智能体数据
  agentData: {
    id, name, description, version, ...
  },
  
  // 3. UI配置
  config: {},                       // 从 bundle.json 加载的配置
  
  // 4. 服务引用
  services: {
    statusBarManager,               // 状态栏管理器
    pythonEnvironment,              // Python环境
    dependencyManager,              // 依赖管理器
    app                             // 全局App实例
  },
  
  // 5. 工具函数
  utils: {
    // 通知
    showNotification(msg, type),
    showError(msg),
    showSuccess(msg),
    showWarning(msg),
    showInfo(msg),
    
    // 状态栏
    updateStatus(status, message),
    updateAgentStatus(agentName, status, message),
    
    // 依赖安装器
    showDependencyInstaller(),
    hideDependencyInstaller(),
    
    // 执行智能体方法 (核心!)
    executeAgent(method, args)      // 调用后端Python方法
  }
};
```

---

## 🔄 完整执行流程

```
用户访问智能体详情页
    ↓
1. AgentDetail.render()
    ↓
2. 从 URL 提取智能体 ID
    ↓
3. agentDataService.getAgentById(id, forceApi=true)
    ↓ 获取完整数据 (包含 ui_config)
4. AgentDetail.renderAgentDetail()
    ↓
5. AgentDetail.loadAndRenderAgentUI()
    ↓
6. 检查 ui_config 是否存在
    ↓ 存在
7. AgentUILoader.loadAgentUI(agentId, uiConfig)
    ↓
8. 检查 IndexedDB 缓存
    ↓
9. 版本比对
    ├─ 版本一致 → 使用缓存
    └─ 版本不一致 → 下载新资源
    ↓
10. 并行下载 bundle.js 和 style.css
    ↓
11. 保存到 IndexedDB 缓存
    ↓
12. 返回 { bundleCode, cssCode }
    ↓
13. AgentDetail.injectAgentCSS()
    ↓ 创建 <style id="agent-ui-style-{agentId}">
14. AgentDetail.executeAgentUI()
    ↓
15. 创建 Context 对象
    ↓
16. new Function() 执行 bundleCode
    ↓
17. 调用 init(context)
    ↓
18. MyAgent.constructor(context)
    ↓ 保存 Context 引用
19. MyAgent.render()
    ↓
20. 渲染 HTML 到 container
    ↓
21. 绑定事件监听器
    ↓
22. 用户交互
    ↓
23. MyAgent.handleAction()
    ↓
24. utils.executeAgent(method, args)
    ↓
25. AgentManager.executeAgent()
    ↓
26. 调用后端 Python 方法
    ↓
27. 返回结果
    ↓
28. 更新 UI 显示
```

---

## 🎨 CSS 注入机制

### 注入方式

每个智能体的 CSS 通过独立的 `<style>` 标签注入到 `<head>` 中：

```html
<head>
  <!-- 其他样式 -->
  <style id="agent-ui-style-math_calculator">
    /* 数学计算器的样式 */
  </style>
  <style id="agent-ui-style-pdf_tools">
    /* PDF工具的样式 */
  </style>
</head>
```

### CSS 命名规范

为避免样式冲突，使用**前缀命名**：

```css
/* ✅ 使用智能体特定前缀 */
.calc-math-calc-workspace { }
.calc-function-selector { }
.calc-category-btn { }

/* ❌ 不推荐：通用类名容易冲突 */
.workspace { }
.selector { }
.btn { }
```

---

## 📊 版本管理策略

### 版本号规范

遵循 **语义化版本** (Semantic Versioning):

### 缓存策略

```javascript
// 完全依赖版本号
if (cachedUI.version === uiConfig.version) {
  // 使用缓存
} else {
  // 重新下载
}
```

### 强制刷新

```javascript
// 方式1: URL 参数 (开发模式)
#/agent/math_calculator?dev=true

// 方式2: URL 参数 (强制刷新)
#/agent/math_calculator?force_refresh=true

// 方式3: 手动清除缓存
await uiLoader.clearCache('math_calculator');
```

---

## 🛠️ 开发指南

### 创建新智能体 UI

#### 1. 目录结构

```
src/plugins/my_agent/
├── bundle.js       # 智能体逻辑
├── style.css       # 智能体样式
└── README.md       # 说明文档
```

#### 2. bundle.js 模板

```javascript
(function() {
  'use strict';
  
  function init(context) {
    const agent = new MyAgent(context);
    agent.render();
  }
  
  class MyAgent {
    constructor(context) {
      this.context = context;
      this.container = context.container;
      this.agentData = context.agentData;
      this.utils = context.utils;
    }
    
    async render() {
      this.renderHTML();
      this.initializeEventListeners();
    }
    
    renderHTML() {
      this.container.innerHTML = `
        <div class="my-agent-workspace">
          <h2>${this.agentData.name}</h2>
          <!-- 你的 UI -->
        </div>
      `;
    }
    
    initializeEventListeners() {
      // 绑定事件
    }
  }
  
  return init;
})();
```

#### 3. style.css 模板

```css
/* 使用前缀避免冲突 */
.my-agent-workspace {
  padding: 20px;
}

.my-agent-button {
  background: var(--color-primary);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
}
```

#### 4. 配置智能体

在后端 API 中配置 `config`:

```json
{
  "id": "math_calculator",
  "name": "数学计算器",
  "version": "1.0.1",
  "description": "支持基础运算、高级函数、微积分和概率分布的数学计算器",
  "type": "python",
  "icon": "🧮",
  "category": ["数学"],
  "tags": ["数学", "计算器", "科学计算", "统计", "微积分"],
  "status": "available",
  "size": "15KB",
  "rating": 4.8,
  "has_ui": true,
  "force_update": true,
  "downloads": 1250,
  "detail": {
    "main_file": "math_calculator.py",
    "requirements_file": "requirements.txt",
    "features": [
      "基础数学运算（加减乘除、幂运算）",
      "三角函数和反三角函数",
    ],
    "examples": [
      "50 + 30",
      "sqrt(16)"
    ],
    "dependencies": ["numpy>=1.21.0", "scipy>=1.7.0"],
    "executables": {},
    "librarys": {
      "3abe2accc703": "http://xxxx/agent_store/math_calculator/release/win/amd64/math_calculator.pyd"
    },
    "ui_config": {
      "bundle_url": "http://xxxx/agent_store/math_calculator/ui/bundle.js",
      "css_url": "http://xxxx/agent_store/math_calculator/ui/bundle.css"
    }
  }
}

```

---

## 📚 参考资料

- [Semantic Versioning](https://semver.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

---

## 👥 贡献者

- QuestechApp Team

