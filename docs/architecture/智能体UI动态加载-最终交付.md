# 智能体UI动态加载 - 最终交付文档

> 智能体UI动态加载功能已完成开发，本文档说明交付内容和使用方法

**交付日期**: 2025-10-14  
**版本**: 1.0.0  
**状态**: ✅ 已完成，可以测试

---

## 📦 交付内容

### 1. 核心代码文件

#### ✅ 新建文件

| 文件路径 | 说明 | 行数 |
|---------|------|------|
| `src/services/agent/AgentUILoader.js` | UI加载服务 | 300+ |

#### ✅ 修改文件

| 文件路径 | 修改内容 | 新增行数 |
|---------|---------|---------|
| `src/views/agents/AgentDetail.js` | 添加动态加载功能 | 200+ |
| `src/styles/views/agent-detail.css` | 添加UI加载样式 | 80+ |

### 2. 文档文件

| 文件路径 | 说明 |
|---------|------|
| `docs/dev/智能体UI动态加载方案.md` | 完整技术方案 |
| `docs/dev/智能体UI动态加载使用指南.md` | 开发者使用指南 |
| `docs/dev/智能体UI动态加载实施总结.md` | 实施情况总结 |
| `docs/dev/智能体UI动态加载快速测试.md` | 快速测试指南 |
| `docs/dev/智能体详情接口优化方案.md` | 详情接口优化（之前完成） |

---

## 🎯 功能说明

### 核心功能

1. **动态加载智能体UI**
   - 从服务器加载 bundle.js（JavaScript代码）
   - 从服务器加载 bundle.css（样式代码）
   - 从服务器加载 config.json（配置文件）

2. **本地缓存**
   - 使用 IndexedDB 存储UI代码
   - 缓存有效期：30天
   - 支持手动清除缓存

3. **版本管理**
   - 自动检测版本变化（通过 `ui_config.version`）
   - 版本不一致时自动下载新版本
   - 版本一致时使用缓存

4. **降级方案**
   - UI加载失败时使用硬编码UI（向后兼容）
   - 网络异常时使用旧缓存
   - 显示友好的错误提示和重试按钮

5. **依赖安装器覆盖层**
   - 与智能体UI同级
   - 默认隐藏，需要时覆盖显示
   - 不影响智能体UI的正常渲染

---

## 🔧 API要求

### 智能体详情接口

服务端需要在智能体详情接口中返回以下字段：

```json
{
  "success": true,
  "message": "获取成功",
  "data": {
    "id": "math_calculator",
    "name": "数学计算器",
    "description": "强大的数学计算工具",
    "version": "1.0.0",
    
    // 新增字段
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

### 字段说明

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `has_ui` | boolean | 是 | 是否有UI配置 |
| `ui_config` | object | 否 | UI配置对象（has_ui为true时必填） |
| `ui_config.bundle_url` | string | 是 | JavaScript文件URL |
| `ui_config.css_url` | string | 是 | CSS文件URL |
| `ui_config.config_url` | string | 是 | 配置文件URL |
| `ui_config.version` | string | 是 | UI版本号 |

---

## 🚀 使用方法

### 客户端使用

**无需任何额外配置！**

系统会自动：
1. 检测 `has_ui` 和 `ui_config`
2. 下载或使用缓存的UI代码
3. 注入CSS和执行JavaScript
4. 渲染智能体UI

### 服务端准备

服务端需要：

1. **准备UI文件**
   - `bundle.js` - 智能体UI的JavaScript代码
   - `bundle.css` - 智能体UI的CSS样式
   - `config.json` - 智能体UI的配置文件

2. **配置静态文件服务**
   - 确保文件可以通过HTTP访问
   - 配置正确的CORS头（如果需要）

3. **修改API返回**
   - 在智能体详情接口中添加 `has_ui` 和 `ui_config` 字段

---

## 📊 工作流程

```
用户打开智能体详情页
  ↓
AgentDetail 调用 API 获取智能体数据
  ↓
检查 has_ui 和 ui_config
  ├─ has_ui = false → 使用降级方案（硬编码UI或占位内容）
  └─ has_ui = true → 继续
      ↓
      AgentUILoader.loadAgentUI(agentId, uiConfig)
      ↓
      检查 IndexedDB 缓存
      ├─ 缓存存在 && 版本一致 → 使用缓存 ⚡
      └─ 缓存不存在 || 版本不一致
          ↓
          并行下载 bundle.js, bundle.css, config.json
          ↓
          保存到 IndexedDB
      ↓
      注入 CSS 到 <head>
      ↓
      执行 bundle.js 代码
      ↓
      调用 init(context) 函数
      ↓
      渲染智能体UI ✅
```

---

## 🧪 快速测试

### 1. 检查API返回

访问智能体详情页，打开开发者工具 → Network 标签，检查：

```
GET /api/agent/math_calculator?platform=win&arch=amd64
```

响应应该包含 `has_ui: true` 和 `ui_config` 对象。

### 2. 观察控制台日志

打开开发者工具 → Console 标签，应该看到：

```
🔄 [AgentUILoader] 开始加载智能体UI: math_calculator
🌐 [AgentUILoader] 下载新版本UI: math_calculator version: 1.0.0
📥 [AgentUILoader] 下载UI资源: {...}
✅ [AgentUILoader] UI资源下载成功
✅ [AgentUILoader] UI缓存保存成功: math_calculator
✅ UI Bundle 加载成功: math_calculator
✅ 注入智能体CSS: math_calculator
🔧 执行智能体UI代码...
✅ 智能体UI初始化完成
✅ 智能体UI渲染完成: math_calculator
```

### 3. 检查网络请求

Network 标签应该显示：

1. ✅ `GET /api/agent/math_calculator` - 200 OK
2. ✅ `GET /static/.../bundle.js` - 200 OK
3. ✅ `GET /static/.../bundle.css` - 200 OK
4. ✅ `GET /static/.../config.json` - 200 OK

### 4. 测试缓存

刷新页面（F5），Network 标签应该**只显示**：

1. ✅ `GET /api/agent/math_calculator` - 200 OK

**不应该有** bundle.js, bundle.css, config.json 的请求。

控制台应该显示：

```
✅ [AgentUILoader] 使用缓存的UI: math_calculator version: 1.0.0
```

---

## 🎨 智能体UI代码规范

### bundle.js 结构

```javascript
(function() {
  'use strict';
  
  function init(context) {
    const { container, agentData, config, utils } = context;
    
    // 1. 渲染UI
    container.innerHTML = `<div>...</div>`;
    
    // 2. 绑定事件
    // ...
    
    // 3. 初始化状态
    // ...
  }
  
  // 导出初始化函数
  return init;
})();
```

### Context API

智能体UI代码可以访问：

- `context.container` - UI容器元素
- `context.agentData` - 智能体数据
- `context.config` - 配置对象
- `context.utils.showError(msg)` - 显示错误
- `context.utils.notificationCenter.success(msg)` - 显示成功消息

详细规范请参考：`docs/dev/智能体UI动态加载使用指南.md`

---

## 🔒 安全性

1. **代码来源验证**
   - 当前限制只能从 `http://192.168.0.103:10089/` 加载
   - 可以根据需要修改白名单

2. **沙箱隔离**
   - UI代码在受限的上下文中执行
   - 不直接暴露 `window` 或 `document` 对象

3. **XSS防护**
   - 建议在 bundle.js 中对用户输入进行转义
   - 使用 `textContent` 而不是 `innerHTML` 处理用户数据

---

## 📈 性能指标

### 首次加载

- **网络请求**: 4个
- **预期时间**: < 2秒（取决于网络和文件大小）

### 缓存加载

- **网络请求**: 1个（仅详情接口）
- **预期时间**: < 100ms
- **缓存命中率目标**: > 90%

---

## 🐛 故障排查

### 问题：UI没有加载

**检查**:
1. API 是否返回 `has_ui: true`
2. `ui_config` 是否存在且完整
3. 网络请求是否成功（状态码 200）
4. 控制台是否有错误日志

### 问题：显示降级UI

**原因**:
- `has_ui` 为 `false`
- UI加载失败

**解决**:
- 检查API返回
- 检查文件路径是否正确
- 查看控制台错误日志

### 问题：缓存没有生效

**检查**:
1. IndexedDB 是否初始化成功
2. 版本号是否一致
3. 浏览器存储空间是否充足

**解决**:
- 手动清除缓存重试
- 检查浏览器是否支持 IndexedDB

---

## 📚 相关文档

| 文档 | 说明 |
|------|------|
| `智能体UI动态加载方案.md` | 完整技术方案 |
| `智能体UI动态加载使用指南.md` | 开发者使用指南 |
| `智能体UI动态加载实施总结.md` | 实施情况总结 |
| `智能体UI动态加载快速测试.md` | 快速测试指南 |

---

## ✅ 验收标准

- [x] 代码无语法错误
- [x] 功能完整实现
- [x] 文档完善
- [ ] 首次加载成功
- [ ] 缓存功能正常
- [ ] 版本更新正常
- [ ] 降级方案正常
- [ ] 性能符合预期

---

## 🎉 总结

智能体UI动态加载功能已经完成开发，现在可以：

1. ✅ **直接使用** - 无需额外配置
2. ✅ **自动缓存** - 提升加载速度
3. ✅ **版本管理** - 自动更新UI
4. ✅ **降级方案** - 保证可用性
5. ✅ **向后兼容** - 不影响现有功能

**下一步**：
1. 测试功能是否正常
2. 验证性能指标
3. 收集反馈并优化

---

**如有问题，请参考相关文档或查看控制台日志进行排查。**

