# 智能体UI动态加载使用指南

> 本文档说明如何使用智能体UI动态加载系统

**创建日期**: 2025-10-14  
**版本**: 1.0.0

---

## 📋 概述

智能体UI动态加载系统允许从服务器动态加载智能体的UI代码（JavaScript + CSS），无需重新打包应用即可更新智能体界面。

---

## 🎯 工作流程

### 1. API返回智能体详情

智能体详情接口 `GET /v2/agent/{agent_id}` 应该返回以下格式：

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": "math_calculator",
    "name": "数学计算器",
    "description": "强大的数学计算工具",
    "version": "1.0.0",
    "has_ui": true,
    "ui_config": {
      "bundle_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/bundle.js",
      "css_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/bundle.css",
      "config_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/config.json",
      "version": "1.0.0"
    }
  }
}
```

### 2. 客户端加载流程

```
1. 用户打开智能体详情页
   ↓
2. AgentDetail.js 获取智能体数据
   ↓
3. 检查 has_ui 和 ui_config
   ↓
4. AgentUILoader 检查本地缓存
   ├─ 缓存存在且版本一致 → 使用缓存
   └─ 缓存不存在或版本不一致 → 下载新版本
       ↓
       5. 下载 bundle.js, bundle.css, config.json
       ↓
       6. 保存到 IndexedDB
       ↓
7. 注入 CSS 到 <head>
   ↓
8. 执行 bundle.js 代码
   ↓
9. 渲染智能体UI
```

---

## 📦 智能体UI代码规范

### bundle.js 结构

智能体的 `bundle.js` 文件应该遵循以下规范：

```javascript
// bundle.js
(function() {
  'use strict';
  
  /**
   * 智能体UI初始化函数
   * @param {Object} context - 上下文对象
   * @param {HTMLElement} context.container - UI容器元素
   * @param {Object} context.agentData - 智能体数据
   * @param {Object} context.config - 配置对象（来自config.json）
   * @param {Object} context.utils - 工具函数集合
   */
  function init(context) {
    const { container, agentData, config, utils } = context;
    
    console.log('🚀 初始化智能体UI:', agentData.name);
    
    // 1. 渲染UI结构
    renderUI(container, agentData, config);
    
    // 2. 绑定事件
    bindEvents(container, utils);
    
    // 3. 初始化状态
    initializeState(config);
  }
  
  /**
   * 渲染UI结构
   */
  function renderUI(container, agentData, config) {
    container.innerHTML = `
      <div class="math-calculator">
        <div class="calculator-display">
          <input type="text" id="calc-input" placeholder="输入表达式..." />
          <div id="calc-result" class="result"></div>
        </div>
        <div class="calculator-buttons">
          <button class="calc-btn" data-value="7">7</button>
          <button class="calc-btn" data-value="8">8</button>
          <button class="calc-btn" data-value="9">9</button>
          <button class="calc-btn operator" data-value="+">+</button>
          <!-- 更多按钮 -->
        </div>
        <div class="calculator-history" id="calc-history">
          <h4>历史记录</h4>
          <ul id="history-list"></ul>
        </div>
      </div>
    `;
  }
  
  /**
   * 绑定事件
   */
  function bindEvents(container, utils) {
    const input = container.querySelector('#calc-input');
    const buttons = container.querySelectorAll('.calc-btn');
    
    // 按钮点击事件
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        input.value += value;
      });
    });
    
    // 回车计算
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        calculate(container, utils);
      }
    });
  }
  
  /**
   * 计算表达式
   */
  function calculate(container, utils) {
    const input = container.querySelector('#calc-input');
    const result = container.querySelector('#calc-result');
    
    try {
      const expression = input.value;
      // 这里应该调用后端API进行计算，而不是使用eval
      const answer = eval(expression); // 仅作示例，实际应使用安全的计算方法
      
      result.textContent = `= ${answer}`;
      addToHistory(container, expression, answer);
      
      utils.notificationCenter.success('计算成功');
    } catch (error) {
      result.textContent = '错误';
      utils.notificationCenter.error('计算失败: ' + error.message);
    }
  }
  
  /**
   * 添加到历史记录
   */
  function addToHistory(container, expression, result) {
    const historyList = container.querySelector('#history-list');
    const item = document.createElement('li');
    item.textContent = `${expression} = ${result}`;
    historyList.insertBefore(item, historyList.firstChild);
  }
  
  /**
   * 初始化状态
   */
  function initializeState(config) {
    console.log('📋 配置:', config);
    // 根据配置初始化状态
  }
  
  // 导出初始化函数
  return init;
})();
```

### bundle.css 结构

```css
/* bundle.css */

/* 计算器容器 */
.math-calculator {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 20px;
  background: var(--color-surface);
}

/* 显示区域 */
.calculator-display {
  margin-bottom: 20px;
}

.calculator-display input {
  width: 100%;
  padding: 15px;
  font-size: 24px;
  border: 2px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
}

.calculator-display .result {
  margin-top: 10px;
  font-size: 32px;
  font-weight: bold;
  color: var(--color-primary);
  text-align: right;
}

/* 按钮区域 */
.calculator-buttons {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}

.calc-btn {
  padding: 20px;
  font-size: 20px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-surface);
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.2s;
}

.calc-btn:hover {
  background: var(--color-primary);
  color: white;
  transform: translateY(-2px);
}

.calc-btn.operator {
  background: var(--color-primary);
  color: white;
}

/* 历史记录 */
.calculator-history {
  flex: 1;
  overflow: auto;
  padding: 15px;
  background: var(--color-background);
  border-radius: 8px;
}

.calculator-history h4 {
  margin: 0 0 10px 0;
  color: var(--color-text);
}

#history-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

#history-list li {
  padding: 8px;
  margin-bottom: 5px;
  background: var(--color-surface);
  border-radius: 4px;
  color: var(--color-text-secondary);
}
```

### config.json 结构

```json
{
  "name": "数学计算器",
  "version": "1.0.0",
  "settings": {
    "precision": 10,
    "angleUnit": "degree",
    "historyLimit": 50
  },
  "features": {
    "history": true,
    "scientific": true,
    "graphing": false
  },
  "theme": {
    "primaryColor": "#3b82f6",
    "accentColor": "#10b981"
  }
}
```

---

## 🔧 Context API

智能体UI代码可以通过 `context` 对象访问以下功能：

### context.container

UI容器元素，智能体应该将UI渲染到这个容器中。

```javascript
context.container.innerHTML = `<div>...</div>`;
```

### context.agentData

智能体的完整数据对象，包含：

```javascript
{
  id: 'math_calculator',
  name: '数学计算器',
  description: '...',
  version: '1.0.0',
  // ... 其他字段
}
```

### context.config

从 `config.json` 加载的配置对象。

```javascript
const precision = context.config.settings.precision;
```

### context.utils

工具函数集合：

显示通知消息。


参数：
- `message` (string): 消息内容
- `type` (string): 消息类型，可选值：'info', 'success', 'warning', 'error'

#### utils.showError(message)

显示错误消息。

```javascript
context.utils.notificationCenter.error('计算失败');
```

#### utils.notificationCenter.success(message)

显示成功消息。

```javascript
context.utils.notificationCenter.success('保存成功');
```

---

## 🎨 样式规范

### 使用CSS变量

智能体UI应该使用应用的CSS变量，以支持主题切换：

```css
/* 推荐 */
.my-element {
  background: var(--color-surface);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

/* 不推荐 */
.my-element {
  background: #ffffff;
  color: #333333;
  border: 1px solid #cccccc;
}
```

### 常用CSS变量

```css
/* 颜色 */
--color-primary
--color-secondary
--color-success
--color-warning
--color-error
--color-background
--color-surface
--color-text
--color-text-secondary
--color-border

/* 间距 */
--spacing-1  /* 4px */
--spacing-2  /* 8px */
--spacing-3  /* 12px */
--spacing-4  /* 16px */
--spacing-6  /* 24px */

/* 字体大小 */
--font-size-sm
--font-size-base
--font-size-lg
--font-size-xl
```

---

## 🧪 测试

### 本地测试

1. **准备测试文件**

在服务器上创建以下文件：
```
/static/agent_store/math_calculator/ui/
├── bundle.js
├── bundle.css
└── config.json
```

2. **修改API返回**

确保智能体详情接口返回正确的 `ui_config`：

```json
{
  "has_ui": true,
  "ui_config": {
    "bundle_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/bundle.js",
    "css_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/bundle.css",
    "config_url": "http://192.168.0.103:10089/static/agent_store/math_calculator/ui/config.json",
    "version": "1.0.0"
  }
}
```

3. **打开智能体详情页**

访问智能体详情页，观察控制台日志：

```
🔄 [AgentUILoader] 开始加载智能体UI: math_calculator
🌐 [AgentUILoader] 下载新版本UI: math_calculator version: 1.0.0
📥 [AgentUILoader] 下载UI资源: {...}
✅ [AgentUILoader] UI资源下载成功
✅ [AgentUILoader] UI缓存保存成功: math_calculator
✅ UI Bundle 加载成功: math_calculator
✅ 注入智能体CSS: math_calculator
🔧 执行智能体UI代码...
🚀 初始化智能体UI: 数学计算器
✅ 智能体UI初始化完成
✅ 智能体UI渲染完成: math_calculator
```

### 清除缓存测试

在浏览器控制台执行：

```javascript
const loader = new AgentUILoader();
await loader.clearCache('math_calculator'); // 清除指定智能体
await loader.clearCache(); // 清除所有缓存
```

### 版本更新测试

1. 修改服务器上的 `bundle.js` 文件
2. 修改 API 返回的 `ui_config.version` 为新版本号
3. 刷新详情页，应该自动下载新版本

---

## 🔒 安全注意事项

1. **代码来源验证**
   - 只允许从可信的服务器加载UI代码
   - 当前限制：`http://192.168.0.103:10089/`

2. **沙箱隔离**
   - UI代码在受限的上下文中执行
   - 不直接暴露 `window` 或 `document` 对象

3. **避免使用 eval**
   - 在 bundle.js 中避免使用 `eval()` 或 `Function()` 执行用户输入

4. **XSS防护**
   - 对用户输入进行转义
   - 使用 `textContent` 而不是 `innerHTML` 处理用户数据

---

## 📝 常见问题

### Q: 如何调试智能体UI代码？

A: 在 bundle.js 中使用 `console.log()` 输出调试信息，或者在浏览器开发者工具中设置断点。

### Q: 缓存多久会过期？

A: 当前设置为30天自动清理，也可以手动清除缓存。

### Q: 如何强制刷新UI？

A: 清除缓存后刷新页面，或者修改 `ui_config.version` 版本号。

### Q: 如果UI加载失败会怎样？

A: 系统会自动降级到硬编码的UI（如果存在），或显示占位内容。

---

## 🚀 下一步

1. 将现有的数学计算器UI迁移到服务器
2. 将PDF转换器UI迁移到服务器
3. 开发新的智能体UI
4. 完善错误处理和日志记录

