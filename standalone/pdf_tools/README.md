# PDF 工具集开发文档

## 📁 项目结构

```
standalone/
├── bundle.js                    # 生产环境打包文件（自动生成）
├── bundle.css                   # 样式文件（包含预览样式）
└── pdf-tools/                   # 开发源码目录
    ├── index.js                 # 入口文件（混合模式）
    ├── core/
    │   └── PDFToolsAgent.js     # 核心代理类
    ├── ui/
    │   ├── panels.js            # 面板HTML生成
    │   ├── file-list.js         # 文件列表组件
    │   ├── preview.js           # PDF预览组件（新功能）
    │   └── history.js           # 历史记录组件
    ├── api/
    │   └── pdf-api.js           # Python API调用封装
    └── utils/
        └── helpers.js           # 工具函数
```

## 🚀 开发模式 vs 生产模式

### 开发模式（localhost）
- **自动检测**：当 `hostname` 为 `localhost` 或 `127.0.0.1` 时自动启用
- **动态加载**：每个模块文件独立加载，便于调试
- **热更新**：修改任何源文件后刷新浏览器即可看到效果
- **控制台日志**：显示详细的模块加载信息

### 生产模式（其他环境）
- **单文件**：所有代码打包在 `bundle.js` 中
- **性能优化**：只需一次HTTP请求
- **稳定可靠**：无网络依赖，不会出现模块加载失败

## 🛠️ 开发工作流

### 1. 修改源代码
直接编辑 `standalone/pdf-tools/` 下的任何文件：

```bash
# 例如修改预览组件
code standalone/pdf-tools/ui/preview.js

# 例如修改核心逻辑
code standalone/pdf-tools/core/PDFToolsAgent.js
```

### 2. 本地测试（开发模式）
在 `localhost` 环境下：
1. 修改源文件
2. 刷新浏览器
3. 查看控制台日志确认模块加载

### 3. 构建生产版本
修改完成后，运行构建脚本：

```bash
# 在项目根目录运行
node build-pdf-bundle.js
```

输出：
```
🔨 开始构建 PDF 工具集...
📦 正在合并模块...
  ✓ utils/helpers.js
  ✓ api/pdf-api.js
  ✓ ui/panels.js
  ✓ ui/file-list.js
  ✓ ui/preview.js
  ✓ ui/history.js
  ✓ core/PDFToolsAgent.js
✅ 构建完成！
📄 输出文件: standalone\bundle.js
📊 文件大小: 51.69 KB
```

### 4. 测试生产版本
在非 localhost 环境测试打包后的 `bundle.js`

## 📦 模块说明

### utils/helpers.js
通用工具函数：
- `formatFileSize()` - 格式化文件大小
- `escapeHtml()` - HTML转义
- `generateOutputFileName()` - 生成输出文件名
- `formatDateTime()` - 格式化日期时间
- `loadScript()` - 动态加载脚本
- `getTempDir()` - 获取临时目录

### api/pdf-api.js
API调用封装：
- `executeOperation()` - 执行PDF操作
- `buildMergeArgs()` - 构建合并参数
- `buildSplitArgs()` - 构建拆分参数
- `buildCreateArgs()` - 构建创建参数
- `buildOCRArgs()` - 构建OCR参数

### ui/panels.js
面板HTML生成：
- `getMergePanelHTML()` - 合并PDF面板
- `getSplitPanelHTML()` - 拆分PDF面板
- `getCreatePanelHTML()` - 创建PDF面板
- `getOCRPanelHTML()` - OCR识别面板
- 公共组件方法

### ui/file-list.js
文件列表管理：
- `handleFileSelection()` - 处理文件选择
- `renderFileList()` - 渲染文件列表
- `removeFile()` - 删除单个文件
- `clearFileList()` - 清空文件列表

### ui/preview.js （新增）
PDF预览功能：
- `showPreview()` - 显示PDF预览
- `loadPDFPreview()` - 加载PDF预览
- `renderWithPDFJS()` - 使用PDF.js渲染
- `renderWithIframe()` - 使用iframe渲染
- `showResult()` - 显示操作结果
- `showError()` - 显示错误信息
- `downloadFile()` - 下载文件
- `openFile()` - 打开文件

### ui/history.js
历史记录管理：
- `renderHistory()` - 渲染历史记录
- `addToHistory()` - 添加历史记录（自动保存到缓存）
- `clearHistory()` - 清空历史记录（同时清除缓存）
- `exportHistory()` - 导出历史记录
- `loadFromStorage()` - 从 LocalStorage 加载历史记录
- `saveToStorage()` - 保存历史记录到 LocalStorage

#### 历史记录缓存机制
- **存储方式**：LocalStorage
- **存储键名**：`pdf_tools_history`
- **最大缓存数量**：10条（配额满时自动降级到5条）
- **数据格式**：JSON（仅保存必要字段）
- **自动保存**：每次添加历史记录时自动保存
- **自动加载**：应用启动时自动从缓存加载
- **存储优化**：
  - 只保存必要字段：operation, result.{message, output, outputPath}, timestamp, tempFilePath
  - 自动过滤大对象（如 pdfBytes, preview 等）
  - 降级策略：10条 → 5条 → 清空
  - 实时显示存储大小

### core/PDFToolsAgent.js
核心代理类：
- 整合所有模块
- 协调业务流程
- 处理用户操作
- 管理状态和数据

## ✨ 新功能：PDF预览

### 功能特点
1. **实时预览**：操作完成后自动在结果区域显示PDF预览
2. **多种渲染**：支持 PDF.js 和 iframe 两种渲染方式
3. **快捷操作**：提供"保存文件"和"打开文件"按钮
4. **美观设计**：与整体UI风格一致的预览界面

### 使用方式
预览功能已集成在 `pdf-result` 区域，操作完成后自动显示：

```javascript
// 在核心类中调用
if (result.outputPath) {
  PDFPreview.showPreview(result.outputPath, this.container, result);
} else {
  PDFPreview.showResult(result, this.container);
}
```

## 🎨 样式文件

所有样式集中在 `standalone/bundle.css`：
- 基础组件样式
- 文件列表样式
- **PDF预览容器样式**（新增）
- 历史记录样式
- 响应式设计

## 🐛 调试技巧

### 查看加载模式
打开浏览器控制台，查看：
```
PDF工具集加载模式: 🔧 开发模式
```
或
```
PDF工具集加载模式: 🚀 生产模式
```

### 开发模式调试
1. 打开控制台查看模块加载日志
2. 每个模块加载成功会显示 `✓ 已加载: ./pdf-tools/xxx.js`
3. 可以在源文件中直接添加 `console.log` 调试

### 生产模式调试
1. 确保已运行构建脚本
2. 检查 `bundle.js` 是否包含所有代码
3. 查看控制台是否有 `PDFToolsAgent未定义` 错误

## 📝 开发注意事项

1. **模块独立性**：每个模块应该是独立的，通过 window 对象导出
2. **依赖顺序**：构建脚本按固定顺序打包，注意模块依赖关系
3. **CSS统一**：所有样式使用 `pdf-` 前缀，避免冲突
4. **变量使用**：使用主工程的CSS变量（如 `--color-primary`）

## 🔄 持续开发

### 添加新功能
1. 在对应目录创建新文件
2. 在 `build-pdf-bundle.js` 的 `sourceFiles` 数组中添加
3. 在 `index.js` 的开发模式中添加加载逻辑
4. 运行构建脚本生成新的 bundle.js

### 修改现有功能
1. 直接修改源文件
2. 本地测试（开发模式）
3. 运行构建脚本
4. 测试生产版本

## 📄 相关文档

- [PDF 模块开发文档](../../docs/architecture/PDF%20模块开发文档.md)
- [构建脚本](../../build-pdf-bundle.js)

---

**开发完成时间**：2025-01-13
**最后构建**：51.69 KB
**模块数量**：7 个
