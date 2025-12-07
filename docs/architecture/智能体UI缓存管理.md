# 智能体UI缓存管理

> 如何清除和管理智能体UI的IndexedDB缓存

**创建日期**: 2025-10-14  
**状态**: ✅ 已完成

---

## 🔍 问题说明

### 为什么会有缓存问题？

智能体UI代码（bundle.js）会被缓存到浏览器的 IndexedDB 中，以提高加载速度。缓存策略如下：

```javascript
// 如果缓存存在且版本一致，使用缓存
if (cachedUI && cachedUI.version === uiConfig.version) {
  return cachedUI;  // ← 直接返回缓存
}
```

**问题**：如果服务器更新了 bundle.js，但 `version` 没有变化，前端会一直使用旧的缓存代码！

---

## 🛠️ 解决方案

### 方案1: 手动清除缓存（推荐用于测试）

打开测试页面：`test-clear-cache.html`

#### 选项1: 清除指定智能体缓存
1. 输入智能体ID（如 `math_calculator`）
2. 点击 **"清除指定缓存"**
3. 刷新智能体详情页

#### 选项2: 清除所有缓存
1. 点击 **"清除所有缓存"**
2. 刷新页面

---

### 方案2: 强制刷新（一次性）

使用 URL 参数 `?force_refresh=true`：

```
http://localhost:3000/#/agents/math_calculator?force_refresh=true
```

**效果**：
- 清除该智能体的缓存
- 重新下载最新代码
- 自动移除 URL 参数

**使用方法**：
1. 打开 `test-clear-cache.html`
2. 输入智能体ID
3. 点击 **"强制刷新并打开"**

---

### 方案3: 开发模式（推荐用于开发）⭐

使用 URL 参数 `?dev=true`：

```
http://localhost:3000/#/agents/math_calculator?dev=true
```

**效果**：
- 完全禁用缓存
- 每次刷新都下载最新代码
- 不保存到 IndexedDB

**使用方法**：
1. 打开 `test-clear-cache.html`
2. 输入智能体ID
3. 点击 **"开发模式打开"**

**控制台输出**：
```
🚫 [AgentUILoader] 开发模式：禁用缓存
🌐 [AgentUILoader] 强制下载最新UI: math_calculator
🔧 [开发模式] 已禁用缓存，每次都会下载最新代码
```

---

### 方案4: 修改服务器版本号（推荐用于生产）

每次修改 bundle.js 后，更新 API 返回的版本号：

```python
# 修改前
{
  "ui_config": {
    "version": "1.0.0"
  }
}

# 修改后
{
  "ui_config": {
    "version": "1.0.1"  # ← 版本号+1
  }
}
```

前端会自动检测版本变化并下载新代码。

---

## 📋 缓存逻辑说明

### 缓存检查流程

```javascript
async loadAgentUI(agentId, uiConfig, options = {}) {
  // 1. 检查是否开发模式
  const disableCache = options.disableCache || false;
  
  // 2. 获取缓存
  const cachedUI = await this.getCachedUI(agentId);
  
  // 3. 判断是否使用缓存
  if (!disableCache && cachedUI && cachedUI.version === uiConfig.version) {
    return cachedUI;  // 使用缓存
  }
  
  // 4. 下载新代码
  const uiBundle = await this.downloadUIBundle(uiConfig);
  
  // 5. 保存到缓存（开发模式除外）
  if (!disableCache) {
    await this.saveUIToCache(agentId, uiConfig.version, uiBundle);
  }
  
  return uiBundle;
}
```

### 缓存数据结构

```javascript
{
  agentId: 'math_calculator',
  version: '1.0.0',
  bundleCode: '(function() { ... })();',
  cssCode: '.math-calculator { ... }',
  config: { ... },
  cachedAt: 1697280000000
}
```

---

## 🔧 开发工作流

### 推荐的开发流程

1. **首次开发**：
   ```
   打开: /#/agents/math_calculator?dev=true
   ```

2. **修改服务器代码**：
   - 修改 bundle.js
   - 保存文件

3. **测试**：
   - 刷新浏览器（F5）
   - 自动下载最新代码
   - 无需清除缓存

4. **发布到生产**：
   - 移除 `?dev=true` 参数
   - 更新服务器版本号
   - 用户会自动获取新版本

---

## 🐛 常见问题

### Q1: 为什么 Postman 能获取新代码，浏览器还是旧的？

**A**: 浏览器使用了 IndexedDB 缓存，Postman 直接请求服务器。

**解决**：
- 使用开发模式：`?dev=true`
- 或清除缓存：`test-clear-cache.html`

---

### Q2: 如何确认是否使用了缓存？

**A**: 查看控制台日志：

```
✅ [AgentUILoader] 使用缓存的UI: math_calculator version: 1.0.0
```

如果看到这条日志，说明使用了缓存。

---

### Q3: 开发模式会影响性能吗？

**A**: 会。每次刷新都会下载代码，速度较慢。

**建议**：
- 开发时使用开发模式
- 测试时使用正常模式
- 生产环境不要使用开发模式

---

### Q4: 如何查看 IndexedDB 中的缓存？

**A**: 
1. 打开浏览器开发者工具（F12）
2. 切换到 **Application** 标签
3. 展开 **IndexedDB** → **AgentUICache** → **ui_bundles**
4. 查看缓存的智能体列表

---

## 📊 对比表

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **手动清除缓存** | 偶尔测试 | 简单直接 | 需要手动操作 |
| **强制刷新** | 一次性更新 | 自动清除 | 每次都要加参数 |
| **开发模式** | 频繁开发 | 自动更新 | 性能较慢 |
| **版本号管理** | 生产环境 | 自动化 | 需要维护版本号 |

---

## 🎯 最佳实践

### 开发阶段
```
使用开发模式: ?dev=true
每次刷新自动获取最新代码
```

### 测试阶段
```
移除 ?dev=true
使用正常缓存模式
测试缓存逻辑是否正常
```

### 生产环境
```
使用版本号管理
每次更新 bundle.js 时更新版本号
用户自动获取新版本
```

---

## 🔗 相关文件

- `src/services/agent/AgentUILoader.js` - UI加载器
- `src/views/agents/AgentDetail.js` - 智能体详情页
- `test-clear-cache.html` - 缓存管理工具
- `docs/dev/智能体UI动态加载方案.md` - 完整技术方案

---

## 📝 总结

缓存问题的根本原因是 **版本号没有变化**。解决方案：

1. **开发时**：使用 `?dev=true` 禁用缓存
2. **测试时**：使用 `test-clear-cache.html` 清除缓存
3. **生产时**：每次更新代码时更新版本号

这样就能确保始终使用最新的代码了！🎉

