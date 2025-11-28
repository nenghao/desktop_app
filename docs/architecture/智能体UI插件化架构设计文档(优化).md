# QuestechApp 智能体UI插件化架构设计文档

## 🔐 安全性考虑

### 当前实现

- 使用 `new Function()` 执行插件代码
- 插件只能访问 Context 提供的 API
- 没有直接访问全局对象的权限

### 潜在风险

1. **代码注入**: `new Function()` 可以执行任意 JavaScript 代码
2. **原型链污染**: 插件可能修改 Object.prototype
3. **资源泄漏**: 插件可能创建未清理的定时器、事件监听器

### 改进建议

1. **使用 Web Workers**: 在独立线程中执行插件代码
2. **使用 iframe 沙箱**: 通过 `<iframe sandbox>` 隔离插件
3. **代码签名**: 验证插件代码的完整性和来源
4. **权限控制**: 实现细粒度的 API 权限控制

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

## ⚡ 性能优化

### 1. 并行加载

```javascript
// 同时下载 JS 和 CSS
const [bundleCode, cssCode] = await Promise.all([
  this.fetchText(bundle_url),
  this.fetchText(css_url)
]);
```

### 2. IndexedDB 缓存

- 首次加载后缓存到本地
- 基于版本号的智能缓存策略
- 减少网络请求

### 3. 预加载

```javascript
// 后台预加载智能体 UI
await uiLoader.preloadAgentUI(agentId, uiConfig);
```

### 4. 清理过期缓存

```javascript
// 清理超过 30 天的缓存
await uiLoader.cleanExpiredCache();
```

---

## 🔮 未来改进方向

### 1. TypeScript 支持

提供 Context 类型定义文件：

```typescript
// types/agent-context.d.ts
export interface AgentContext {
  container: HTMLElement;
  agentData: AgentData;
  services: Services;
  utils: Utils;
}
```

### 2. 热模块替换 (HMR)

支持开发时的热更新，无需刷新页面。

### 3. Shadow DOM 隔离

使用 Shadow DOM 实现真正的样式隔离：

```javascript
const shadowRoot = container.attachShadow({ mode: 'open' });
shadowRoot.innerHTML = `<style>${cssCode}</style>${htmlCode}`;
```

### 4. 插件市场

- 插件版本管理
- 插件评分和评论
- 插件依赖管理

### 5. 更严格的沙箱

- 使用 Web Workers 执行插件代码
- 实现细粒度的权限控制
- 代码签名和验证

---

## 📚 参考资料

- [Semantic Versioning](https://semver.org/)
- [IndexedDB API](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API)
- [Shadow DOM](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_shadow_DOM)
- [Web Workers](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API)

---

## 👥 贡献者

- QuestechApp Team



