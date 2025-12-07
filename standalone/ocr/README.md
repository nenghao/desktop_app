# OCR Agent 模块文档

## 📋 项目概述

OCR Agent 是一个独立的智能体模块，专门用于PDF和图片的OCR文字识别功能。它从 PDF Tools 中抽离出来，采用共享代码库架构，保持代码复用的同时实现功能独立。

## 📁 项目结构

```
standalone/
├── shared/                        # 共享代码库
│   ├── utils/
│   │   ├── helpers.js             # 公共工具函数
│   │   └── imageConverter.js      # 图片转换工具
│   ├── ui/
│   │   ├── file-list.js           # 文件列表组件
│   │   ├── preview.js             # 预览组件
│   │   └── history.js             # 历史记录组件
│   └── api/
│       └── base-api.js            # 基础 API 调用封装
│
└── ocr_agent/                     # OCR 独立模块
    ├── bundle.js                  # 打包文件（自动生成）
    ├── bundle.css                 # 样式文件
    ├── index.js                   # 入口文件（开发模式）
    ├── build-ocr-bundle.js        # 构建脚本
    ├── README.md                  # 本文档
    ├── core/
    │   └── OCRAgent.js            # OCR 核心类
    ├── ui/
    │   └── ocr-panels.js          # OCR 面板
    └── api/
        └── ocr-api.js             # OCR API 调用
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
直接编辑 `standalone/ocr_agent/` 或 `standalone/shared/` 下的任何文件：

```bash
# 修改OCR特有代码
code standalone/ocr_agent/core/OCRAgent.js

# 修改共享组件（会影响所有模块）
code standalone/shared/ui/file-list.js
```

### 2. 本地测试（开发模式）
在 `localhost` 环境下：
1. 修改源文件
2. 刷新浏览器
3. 查看控制台日志确认模块加载

### 3. 构建生产版本
修改完成后，运行构建脚本：

```bash
# 在 ocr_agent 目录运行
cd standalone/ocr_agent
node build-ocr-bundle.js
```

输出：
```
🔨 开始构建 OCR Agent...
📦 正在合并模块...
  ✓ shared/utils/helpers.js
  ✓ shared/utils/imageConverter.js
  ✓ shared/ui/file-list.js
  ✓ shared/ui/preview.js
  ✓ shared/ui/history.js
  ✓ shared/api/base-api.js
  ✓ ocr_agent/api/ocr-api.js
  ✓ ocr_agent/ui/ocr-panels.js
  ✓ ocr_agent/core/OCRAgent.js
✅ 构建完成！
📄 输出文件: bundle.js
📊 文件大小: 28.XX KB
```

### 4. 测试生产版本
在非 localhost 环境测试打包后的 `bundle.js`

## 📦 核心模块说明

### 1. OCR 特有模块

#### `core/OCRAgent.js`
OCR 核心类，负责：
- OCR 识别流程控制
- 文件类型检测（PDF/图片）
- 图片预处理（格式转换、压缩）
- OCR 语言列表加载
- 结果展示和历史记录管理

#### `ui/ocr-panels.js`
OCR 面板 HTML 生成：
- `getOCRPanelHTML()` - 生成 OCR 识别面板
- 包含文件选择、语言选择、页面范围、可搜索PDF选项

#### `api/ocr-api.js`
OCR API 调用封装：
- `executeOCR()` - 执行 OCR 识别
- `performOCR()` - 调用后端 OCR 接口
- `fetchOCRConfig()` - 获取语言列表（带10分钟缓存）
- `uploadFileForOCR()` - 文件上传（支持秒传）
- `getDefaultOCRLanguages()` - 默认语言列表（降级方案）

### 2. 共享模块（来自 `shared/`）

#### `utils/helpers.js`
通用工具函数：
- `formatFileSize()` - 格式化文件大小
- `escapeHtml()` - HTML转义
- `generateOutputFileName()` - 生成输出文件名
- `formatDateTime()` - 格式化日期时间

#### `utils/imageConverter.js`
图片格式转换工具：
- HEIC → JPEG/PNG 转换
- TIFF → JPEG/PNG 转换
- BMP → JPEG/PNG 转换
- 图片压缩（OCR专用）

#### `ui/file-list.js`
文件列表管理：
- `handleFileSelection()` - 处理文件选择
- `renderFileList()` - 渲染文件列表
- `removeFile()` - 删除单个文件
- `clearFileList()` - 清空文件列表

#### `ui/preview.js`
预览组件：
- `showPreview()` - 显示PDF预览
- `loadPDFPreview()` - 加载PDF预览
- `showResult()` - 显示操作结果
- `showError()` - 显示错误信息

#### `ui/history.js`
历史记录管理：
- `renderHistory()` - 渲染历史记录
- `addToHistory()` - 添加历史记录（自动保存）
- `clearHistory()` - 清空历史记录
- `loadFromStorage()` - 从 LocalStorage 加载
- **最大缓存**：10条记录

#### `api/base-api.js`
基础 API 调用：
- `parsePageRange()` - 解析页面范围
- `saveFile()` - 保存文件
- `getToken()` - 获取认证Token

## ✨ 功能特点

### 1. 智能文件处理
- **自动格式转换**：支持 HEIC、TIFF、BMP 等格式自动转为 JPEG/PNG
- **图片压缩**：OCR前自动压缩大图片，提高识别速度
- **PDF页面范围**：支持指定页面范围识别（如 "1-5,8,10-12"）

### 2. 多语言支持
- **动态加载**：从后端API获取语言列表（带10分钟缓存）
- **降级方案**：API失败时使用默认12种语言
- **自动检测**：支持语言自动检测

### 3. 识别模式
- **纯文本输出**：识别结果保存为 .txt 文件
- **可搜索PDF**：在原PDF上添加文字层，保持原有格式

### 4. 文件上传优化
- **秒传支持**：相同文件基于Hash秒传
- **断点续传**：大文件上传中断可恢复
- **进度显示**：实时显示上传进度

## 🎨 样式文件

所有样式集中在 `bundle.css`：
- 基础组件样式
- 文件列表样式
- PDF预览容器样式
- 历史记录样式
- 响应式设计

## 🐛 调试技巧

### 查看加载模式
打开浏览器控制台，查看：
```
📦 OCR Agent - 开发模式（index.js）
```
或
```
🚀 初始化OCR Agent: OCR识别
```

### 开发模式调试
1. 打开控制台查看模块加载日志
2. 每个模块加载成功会显示 `✓ 已加载: ./standalone/xxx.js`
3. 可以在源文件中直接添加 `console.log` 调试

### OCR配置缓存
查看缓存状态：
```javascript
// 在控制台执行
OCRApi.getOCRConfigCacheStatus()
// 输出: { hasCache: true, isValid: true, languageCount: 82, ... }

// 清除缓存
OCRApi.clearOCRConfigCache()
```

## 📝 开发注意事项

1. **模块独立性**：每个模块通过 `window` 对象导出（如 `window.OCRApi`）
2. **依赖顺序**：构建脚本按固定顺序打包，注意模块依赖关系
3. **CSS统一**：所有样式使用 `pdf-` 前缀，避免冲突
4. **变量使用**：使用主工程的CSS变量（如 `--color-primary`）
5. **共享代码修改**：修改 `shared/` 下的代码会影响所有模块（PDF Tools, OCR Agent等）

## 🔄 持续开发

### 添加新功能
1. 在 `ocr_agent/` 目录创建新文件
2. 在 `build-ocr-bundle.js` 的 `sourceFiles` 数组中添加
3. 运行构建脚本生成新的 bundle.js
4. 测试开发模式和生产模式

### 修改现有功能
1. 直接修改源文件
2. 本地测试（开发模式）
3. 运行构建脚本
4. 测试生产版本

## 📊 性能指标

### 文件大小
- **bundle.js**: ~28KB（打包后）
- **bundle.css**: ~5KB
- **总计**: ~33KB

### 加载时间
- **开发模式**: 9个模块文件独立加载（~200ms）
- **生产模式**: 1个bundle文件加载（~50ms）

### 缓存策略
- **OCR配置**: 10分钟本地缓存
- **历史记录**: 永久存储（最多10条）

## 🆚 与 PDF Tools 的关系

| 特性 | OCR Agent | PDF Tools |
|------|-----------|-----------|
| 功能 | 仅OCR识别 | 合并、拆分、创建、OCR |
| 代码量 | ~28KB | ~50KB |
| 共享代码 | 使用 shared/ | 使用 shared/ |
| 独立性 | 完全独立 | 包含所有PDF功能 |
| 维护成本 | 低（只维护OCR逻辑） | 中（维护多个功能） |

## 📄 相关文档

- [OCR Agent 开发文档](../OCR_AGENT_DOCUMENTATION.md)
- [PDF Tools 开发文档](../pdf_tools/README.md)
- [构建脚本](build-ocr-bundle.js)

---

**开发完成时间**：2025-01-14
**当前版本**：v1.0.0
**文件大小**：~28KB
