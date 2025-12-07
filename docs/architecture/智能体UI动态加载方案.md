# 智能体UI动态加载方案

> 本文档记录智能体详情界面从硬编码改为动态加载的完整方案

**创建日期**: 2025-10-14  
**版本**: 1.0.0  
**状态**: 实施中

---

## 📋 需求分析

### 当前问题

1. **智能体详情界面代码硬编码在本地**
   - 每个智能体（如 `math_calculator`, `pdf_tools`）的UI代码都写在 `AgentDetail.js` 中
   - 无法动态更新智能体UI
   - 每个智能体都需要单独开发和部署

2. **维护成本高**
   - 修改智能体UI需要重新打包整个应用
   - 无法独立更新单个智能体
   - 版本管理困难

### 目标方案

1. **动态加载智能体UI代码**
   - 从服务器加载 `bundle.js` 和 `bundle.css`
   - 支持配置文件 `config.json`
   - 本地缓存UI代码，提升加载速度

2. **版本管理**
   - 支持版本检测（通过 `ui_config.version`）
   - 自动更新UI代码
   - 缓存策略优化

3. **DependencyInstaller 优化**
   - 保持与 `agent-main-content` 同级
   - 默认隐藏，需要时覆盖显示
   - 不影响智能体UI的正常渲染

---

## 🎯 方案架构

### 页面结构

```
智能体详情页面
├── agent-content-container (容器)
│   ├── agent-error-display (错误提示，默认隐藏)
│   ├── dependency-installer-overlay (依赖安装器，默认隐藏，需要时覆盖显示)
│   └── agent-main-content (智能体UI载体)
│       └── [动态加载的智能体UI代码]
```

### 数据流

```
1. 获取智能体详情（包含 ui_config）
   ↓
2. 检查本地缓存
   ↓
3. 对比版本号
   ├─ 版本一致 → 使用缓存
   └─ 版本不一致 → 下载新版本
       ↓
       4. 下载 bundle.js, bundle.css, config.json
       ↓
       5. 保存到 IndexedDB
       ↓
       6. 注入并执行
```

---

## 🔧 核心组件

### 1. AgentUILoader 服务

**文件**: `src/services/agent/AgentUILoader.js`

#### 功能职责

1. **下载UI资源**
   - 从 `ui_config.bundle_url` 下载 JS 文件
   - 从 `ui_config.css_url` 下载 CSS 文件
   - 从 `ui_config.config_url` 下载配置文件

2. **本地缓存管理**
   - 使用 IndexedDB 存储 UI 代码
   - 缓存结构：
     ```javascript
     {
       agentId: 'math_calculator',
       version: '1.0.0',
       bundleCode: '...',  // JS代码
       cssCode: '...',     // CSS代码
       config: {...},      // 配置对象
       cachedAt: timestamp
     }
     ```

3. **版本检测与更新**
   - 对比本地缓存版本与 API 返回的 `ui_config.version`
   - 版本不一致时重新下载
   - 版本一致时使用缓存

4. **代码注入与执行**
   - 动态创建 `<style>` 标签注入 CSS
   - 使用 `new Function()` 执行 JS 代码
   - 提供沙箱环境，传入必要的上下文

#### 主要方法

```javascript
class AgentUILoader {
  // 加载智能体UI（带缓存和版本检测）
  async loadAgentUI(agentId, uiConfig)
  
  // 下载UI资源
  async downloadUIBundle(uiConfig)
  
  // 获取缓存的UI
  async getCachedUI(agentId)
  
  // 保存UI到缓存
  async saveUIToCache(agentId, version, uiBundle)
  
  // 检查版本是否一致
  async checkVersion(agentId, version)
  
  // 清除缓存
  async clearCache(agentId)
  
  // 预加载UI（后台静默下载）
  async preloadAgentUI(agentId)
}
```

---

### 2. AgentDetail.js 修改

#### 2.1 移除硬编码的智能体启动逻辑

**当前代码** (第 206-227 行):
```javascript
if (agent.id === 'pdf_tools') {
  await this.startPDFConverterAgent();
} else if (agent.id === 'math_calculator') {
  await this.startMathCalculatorAgent();
} else {
  // 占位内容
}
```

**修改为**:
```javascript
// 统一使用动态加载
await this.loadAndRenderAgentUI(agent);
```

#### 2.2 新增动态加载方法

```javascript
async loadAndRenderAgentUI(agent) {
  const mainContentContainer = this.container.querySelector('#agent-main-content');
  
  // 1. 检查是否有 UI 配置
  if (!agent.has_ui || !agent.ui_config) {
    this.renderPlaceholder(mainContentContainer, agent);
    return;
  }
  
  // 2. 显示加载状态
  this.showLoadingState(mainContentContainer);
  
  try {
    // 3. 使用 AgentUILoader 加载 UI 代码
    const uiLoader = new AgentUILoader();
    const uiBundle = await uiLoader.loadAgentUI(agent.id, agent.ui_config);
    
    // 4. 注入 CSS
    this.injectCSS(agent.id, uiBundle.cssCode);
    
    // 5. 执行 JS 代码，渲染 UI
    this.executeAgentUI(mainContentContainer, uiBundle, agent);
    
  } catch (error) {
    console.error('❌ 加载智能体UI失败:', error);
    this.showAgentError({
      title: 'UI加载失败',
      message: error.message,
      show: true
    });
  }
}
```

#### 2.3 UI代码执行方法

```javascript
executeAgentUI(container, uiBundle, agentData) {
  // 创建沙箱上下文
  const context = {
    container: container,
    agentData: agentData,
    config: uiBundle.config,
    utils: {
      showNotification: (msg) => window.notificationCenter?.info(msg),
      showError: (msg) => window.notificationCenter?.error(msg),
    }
  };
  
  // 执行 bundle.js 代码
  const initFunction = new Function('context', uiBundle.bundleCode + '\nreturn init;');
  const init = initFunction(context);
  
  // 调用初始化函数
  if (typeof init === 'function') {
    init(context);
  } else {
    throw new Error('智能体UI代码格式错误：未找到 init 函数');
  }
}
```

---

### 3. DependencyInstaller 覆盖层设计

#### 3.1 HTML结构调整

**修改 `initializeBaseStructure()` 方法**:

```javascript
initializeBaseStructure() {
  this.container.innerHTML = `
    <div class="agent-detail">
      <div class="agent-content-container" id="agent-content-container">
        <!-- 错误显示组件 -->
        <div class="agent-error-display" id="agent-error-display" style="display: none;">
          ...
        </div>
        
        <!-- 依赖安装器覆盖层（默认隐藏） -->
        <div class="dependency-installer-overlay" id="dependency-installer-overlay" style="display: none;">
          <!-- DependencyInstaller 将渲染到这里 -->
        </div>
        
        <!-- 智能体主内容 -->
        <div class="agent-main-content" id="agent-main-content">
          <!-- 动态加载的智能体UI -->
        </div>
      </div>
    </div>
  `;
}
```

#### 3.2 CSS样式设计

```css
.agent-content-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.agent-main-content {
  width: 100%;
  height: 100%;
  overflow: auto;
}

.dependency-installer-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.98);
  z-index: 100;
  overflow: auto;
  display: none;
}

.dependency-installer-overlay.show {
  display: block;
}

.dark-mode .dependency-installer-overlay {
  background: rgba(30, 30, 30, 0.98);
}
```

#### 3.3 显示/隐藏依赖安装器

```javascript
// 显示依赖安装器
showDependencyInstaller() {
  const overlay = this.container.querySelector('#dependency-installer-overlay');
  if (overlay) {
    overlay.classList.add('show');
    const installer = new DependencyInstaller(this.agentData, overlay);
    installer.render();
  }
}

// 隐藏依赖安装器
hideDependencyInstaller() {
  const overlay = this.container.querySelector('#dependency-installer-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    overlay.innerHTML = '';
  }
}
```

---

## 📦 智能体UI代码规范

### bundle.js 代码结构

服务器端的 `bundle.js` 应该遵循以下规范：

```javascript
// bundle.js 示例（数学计算器）
(function() {
  'use strict';
  
  // 智能体UI初始化函数
  function init(context) {
    const { container, agentData, config, utils } = context;
    
    // 1. 渲染UI
    container.innerHTML = `
      <div class="math-calculator">
        <div class="calculator-display">
          <input type="text" id="calc-input" placeholder="输入表达式...">
        </div>
        <div class="calculator-buttons">
          <!-- 按钮 -->
        </div>
      </div>
    `;
    
    // 2. 绑定事件
    setupEventListeners(container, utils);
    
    // 3. 初始化状态
    initializeState(config);
  }
  
  function setupEventListeners(container, utils) {
    // 事件绑定逻辑
  }
  
  function initializeState(config) {
    // 状态初始化逻辑
  }
  
  // 导出初始化函数
  return init;
})();
```

### bundle.css 代码结构

```css
/* bundle.css 示例（数学计算器） */
.math-calculator {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
}

.calculator-display input {
  width: 100%;
  padding: 15px;
  font-size: 24px;
}
```

### config.json 配置文件

```json
{
  "name": "数学计算器",
  "version": "1.0.0",
  "settings": {
    "precision": 10,
    "angleUnit": "degree"
  }
}
```

---

## 💾 缓存策略

### IndexedDB 数据库设计

```javascript
// 数据库名称: AgentUICache
// 对象存储: ui_bundles

{
  keyPath: 'agentId',
  indexes: [
    { name: 'version', keyPath: 'version' },
    { name: 'cachedAt', keyPath: 'cachedAt' }
  ]
}
```

### 缓存清理策略

1. **手动清理**: 提供"清除缓存"按钮
2. **自动清理**: 缓存超过30天自动清除
3. **版本更新**: 检测到新版本时自动替换旧缓存

---

## 🔒 安全性考虑

### 代码沙箱

```javascript
const safeContext = {
  container: container,
  agentData: agentData,
  config: config,
  utils: {
    showNotification: (...args) => window.notificationCenter?.info(...args),
    showError: (...args) => window.notificationCenter?.error(...args),
  }
};
```

### 内容安全策略

```javascript
// 验证下载的代码来源
if (!agent.ui_config.bundle_url.startsWith('http://192.168.0.103:10089/')) {
  throw new Error('不受信任的UI代码来源');
}
```

---

## 🚀 实施步骤

### 阶段1: 基础架构
1. ✅ 创建 `AgentUILoader.js` 服务
2. ✅ 实现 IndexedDB 缓存管理
3. ✅ 修改 `AgentDetail.js` 结构

### 阶段2: 核心功能
4. ✅ 实现UI代码下载和注入
5. ✅ 实现版本检测和更新
6. ✅ 调整 DependencyInstaller 为覆盖层

### 阶段3: 优化和测试
7. ✅ 添加错误处理和降级方案
8. ✅ 实现预加载和性能优化
9. ✅ 安全性验证和测试

---

## 📊 方案对比

| 特性 | 当前方案（硬编码） | 新方案（动态加载） |
|------|-------------------|-------------------|
| **灵活性** | ❌ 需要重新部署应用 | ✅ 服务器端更新即可 |
| **版本管理** | ❌ 无版本控制 | ✅ 自动检测和更新 |
| **加载速度** | ✅ 本地代码，快速 | ⚠️ 首次加载较慢，后续使用缓存 |
| **开发效率** | ❌ 每个智能体需单独开发 | ✅ 统一框架，快速开发 |
| **维护成本** | ❌ 高（需要重新打包） | ✅ 低（服务器端更新） |

---

## 📝 相关文件

- `src/services/agent/AgentUILoader.js` - UI加载服务（新建）
- `src/views/agents/AgentDetail.js` - 智能体详情页面（修改）
- `src/views/agents/DependencyInstaller.js` - 依赖安装器（样式调整）
- `src/styles/agent-detail.css` - 样式文件（新增覆盖层样式）

