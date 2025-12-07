# Web 浏览器支持文档

## 概述
本项目现在支持在 Web 浏览器中运行，使用**方案B - 完整适配**实现。

## 修改内容

### 1. 平台检测工具 ✅
**文件:** `src/utils/platform-detector.js`

提供统一的平台检测API：
- `isElectron()` - 检测是否在 Electron 环境
- `isWeb()` - 检测是否在 Web 环境
- `isDev()` - 检测是否开发环境
- `safeElectronCall()` - 安全调用 Electron API
- `onlyInElectron()` / `onlyInWeb()` - 条件执行

### 2. 路径服务适配 ✅
**文件:** `src/services/PathService.js`

- ✅ 集成 `platform-detector`
- ✅ Web 环境使用虚拟路径配置
- ✅ Electron 环境使用真实文件系统路径
- ✅ 新增 `isAvailable()` 和 `getEnvironment()` 方法

### 3. 标题栏组件适配 ✅
**文件:** `src/components/layout/TitleBar.js`

- ✅ Web 环境完全隐藏自定义标题栏
- ✅ 所有窗口控制按钮仅在 Electron 环境生效
- ✅ 菜单功能仅在 Electron Windows 平台显示

### 4. 主题管理服务适配 ✅
**文件:** `src/services/theme-manager.js`

- ✅ 集成 `platform-detector`
- ✅ `updateTitleBarOverlay()` 方法在 Web 环境跳过
- ✅ 主题切换功能在两个环境都正常工作

### 5. Electron 适配器增强 ✅
**文件:** `src/utils/electron-adapter.js`

- ✅ 集成 `platform-detector` 统一检测逻辑
- ✅ 新增 `isWebApp()` 方法
- ✅ 平台信息自动适配

### 6. Agent 平台适配器 ✅
**文件:** `src/services/agent/AgentPlatformAdapter.js`

新增专门的 Agent 平台适配器，提供：
- 本地 Agent 功能可用性检查
- 文件读写操作适配
- 下载安装功能适配
- Web 环境优雅降级

### 7. 服务初始化优化 ✅
**文件:** `src/services/index.js`

- ✅ 改进环境检测逻辑
- ✅ Apple 登录服务支持 Web 环境

## 运行方式

### Web 浏览器模式
```bash
# 开发模式
npm run dev

# 访问
http://localhost:5173
```

### Electron 桌面模式
```bash
# 开发模式
npm run electron:dev

# 或使用自动启动脚本
npm start
```

### 生产构建
```bash
# Web 版本
npm run build
npm run preview

# Electron 版本
npm run electron:dist
```

## 功能对比

| 功能 | Web 浏览器 | Electron |
|------|-----------|----------|
| 核心 UI | ✅ | ✅ |
| 主题切换 | ✅ | ✅ |
| 用户认证 | ✅ | ✅ |
| 在线 Agent | ✅ | ✅ |
| 本地 Agent | ❌ | ✅ |
| 自定义标题栏 | ❌ | ✅ (Windows) |
| 窗口控制 | ❌ | ✅ |
| 本地文件访问 | ❌ | ✅ |
| Agent 下载安装 | ❌ | ✅ |

## 技术细节

### 环境检测优先级
1. 检查 `window.electronAPI` (通过 preload 注入)
2. 检查 `process.versions.electron`
3. 检查 `navigator.userAgent`

### 本地 Agent 逻辑
- **保留但不删除**: 本地 Agent 加载逻辑完整保留
- **Web 环境跳过**: 自动检测环境，Web 下不启用本地功能
- **未来兼容**: 为将来可能的本地 Agent 支持预留

### CSS 兼容性
所有 CSS 样式已兼容 Web 环境，无需修改。

## 测试清单

- [ ] Web 浏览器启动测试
- [ ] 主题切换测试 (浅色/深色/自动)
- [ ] 用户登录/登出测试
- [ ] 在线 Agent 浏览测试
- [ ] 路由导航测试
- [ ] 响应式布局测试
- [ ] Electron 模式回归测试

## 常见问题

### Q: Web 版本能使用本地 Agent 吗？
A: 不能。浏览器安全限制不允许直接访问文件系统。本地 Agent 仅在 Electron 版本可用。

### Q: 如何判断当前运行环境？
A: 使用 `platform-detector.js` 提供的 API：
```javascript
import { isElectron, isWeb } from '@/utils/platform-detector.js';

if (isElectron()) {
  // Electron 专属代码
}

if (isWeb()) {
  // Web 专属代码
}
```

### Q: 控制台有 Electron API 警告怎么办？
A: 这是正常的。已有的代码会自动检测环境并优雅降级，警告不影响功能。

### Q: 能部署到静态托管吗？
A: 可以！执行 `npm run build` 后，将 `dist` 目录部署到任何静态托管服务（Vercel、Netlify、GitHub Pages 等）。

## 未来改进

- [ ] Service Worker 支持离线使用
- [ ] PWA 支持（可安装的 Web 应用）
- [ ] Web 版本的轻量级 Agent 运行时
- [ ] IndexedDB 存储优化
- [ ] WebAssembly Agent 支持

## 维护指南

### 添加新功能时的注意事项
1. 使用 `platform-detector.js` 检测环境
2. Electron 特性使用 `safeElectronCall()` 包装
3. 为 Web 环境提供替代方案或优雅降级
4. 更新本文档的功能对比表

### 调试技巧
```javascript
// 打印平台信息
import { getPlatformInfo } from '@/utils/platform-detector.js';
console.log('Platform:', getPlatformInfo());

// 条件日志
import { onlyInElectron, onlyInWeb } from '@/utils/platform-detector.js';
onlyInElectron(() => console.log('Electron only'));
onlyInWeb(() => console.log('Web only'));
```

## 贡献者
- 实施方案: 方案B - 完整适配
- 修改时间: 2025-11-21
- 状态: ✅ 已完成

## 相关文档
- [Vite 配置](./vite.config.js)
- [Electron 主进程](./electron/main.js)
- [平台检测工具](./src/utils/platform-detector.js)
- [Standalone 模块](./standalone/README.md)
