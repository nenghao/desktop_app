# 文件上传功能实现文档

> 本文档记录了文件上传功能的实现细节和架构设计

**实现日期**: 2025-10-20  
**版本**: 1.0.0

---

## 概述

为智能体系统添加了统一的文件上传功能，允许智能体通过上下文（context）访问文件上传API。

### 核心特性

- ✅ 单文件上传
- ✅ 多文件批量上传
- ✅ 文件选择对话框
- ✅ 上传进度回调
- ✅ 文件类型和大小验证
- ✅ 上传历史记录
- ✅ 取消上传功能
- ✅ 错误处理和通知
- ✅ 元数据支持

---

## 架构设计

### 设计原则

遵循现有的上下文传递模式：
- **主工程负责**：提供服务能力（FileUploadService）
- **智能体负责**：使用服务（传递文件和配置参数）
- **职责分离**：环境配置在外部，业务参数在内部

### 文件结构

```
src/
├── services/
│   └── FileUploadService.js          # 文件上传服务（新增）
└── views/
    └── agents/
        └── AgentDetail.js             # 智能体详情页（修改）

docs/
└── dev/
    ├── FILE_UPLOAD_API.md             # API使用文档（新增）
    ├── FILE_UPLOAD_IMPLEMENTATION.md  # 实现文档（本文件）
    └── examples/
        └── file-upload-agent-example.js  # 示例代码（新增）
```

---

## 实现细节

### 1. FileUploadService.js

**位置**: `src/services/FileUploadService.js`

**职责**:
- 提供文件选择、上传、验证等核心功能
- 管理上传状态和历史记录
- 处理进度回调和错误通知

**核心方法**:

```javascript
class FileUploadService {
  constructor(options)              // 初始化服务
  selectFiles(options)              // 选择文件
  upload(file, options)             // 上传单个文件
  uploadMultiple(files, options)    // 批量上传
  cancelUpload(uploadId)            // 取消上传
  getActiveUploads()                // 获取活动上传
  getUploadHistory()                // 获取历史记录
  destroy()                         // 清理服务
}
```

**初始化参数**:
```javascript
{
  agentId: string,              // 智能体ID
  agentData: object,            // 智能体数据
  notificationCenter: object,  // 通知管理器
  statusBarManager: object,     // 状态栏管理器
  app: object,                  // 全局app实例
  eventBus: object              // 事件总线
}
```

---

### 2. AgentDetail.js 修改

**位置**: `src/views/agents/AgentDetail.js`

**修改内容**:

#### 2.1 导入 FileUploadService

```javascript
import { FileUploadService } from '../../services/FileUploadService.js';
```

#### 2.2 在 executeAgentUI 方法中创建服务实例

```javascript
async executeAgentUI(container, uiBundle, agentData) {
  // 创建文件上传服务实例
  const fileUploadService = new FileUploadService({
    agentId: agentData.id,
    agentData: agentData,
    notificationCenter: window.notificationCenter,
    statusBarManager: agentStatusBarManager,
    app: window.app,
    eventBus: this.eventBus
  });
  
  // ... 其他代码
}
```

#### 2.3 将服务添加到 context.services

```javascript
const context = {
  container: container,
  agentData: agentData,
  config: uiBundle.config,
  
  services: {
    statusBarManager: agentStatusBarManager,
    pythonEnvironment: window.app?.getService('pythonEnvironment'),
    dependencyManager: window.app?.getService('dependencyManager'),
    app: window.app,
    fileUpload: fileUploadService  // ← 新增
  },
  
  utils: {
    // ... 现有工具函数
  }
};
```

#### 2.4 在 context.utils 中添加快捷方法

```javascript
utils: {
  // ... 现有工具函数
  
  // 文件上传快捷方法
  selectFiles: async (options = {}) => {
    return await fileUploadService.selectFiles(options);
  },
  
  uploadFile: async (file, options = {}) => {
    return await fileUploadService.upload(file, options);
  },
  
  uploadMultipleFiles: async (files, options = {}) => {
    return await fileUploadService.uploadMultiple(files, options);
  },
  
  selectAndUploadFile: async (options = {}) => {
    const files = await fileUploadService.selectFiles({
      multiple: options.multiple || false,
      accept: options.accept
    });
    
    if (files.length === 0) return null;
    
    if (files.length === 1) {
      return await fileUploadService.upload(files[0], options);
    } else {
      return await fileUploadService.uploadMultiple(files, options);
    }
  }
}
```

---

## 使用方式

### 智能体中的使用

智能体可以通过两种方式使用文件上传功能：

#### 方式一：使用快捷方法（推荐）

```javascript
async function init(context) {
  const { utils } = context;
  
  // 选择并上传文件
  const result = await utils.selectAndUploadFile({
    accept: '.pdf',
    maxSize: 10 * 1024 * 1024,
    onProgress: (percent) => {
      console.log(`上传进度: ${percent}%`);
    }
  });
  
  if (result) {
    console.log('上传成功:', result.url);
  }
}
```

#### 方式二：使用完整服务

```javascript
async function init(context) {
  const { services } = context;
  const fileUpload = services.fileUpload;
  
  // 选择文件
  const files = await fileUpload.selectFiles({
    multiple: false,
    accept: '.pdf'
  });
  
  if (files.length > 0) {
    // 上传文件
    const result = await fileUpload.upload(files[0], {
      maxSize: 10 * 1024 * 1024,
      onProgress: (percent) => {
        console.log(`上传进度: ${percent}%`);
      }
    });
    
    console.log('上传成功:', result);
  }
}
```

---

## 数据流

```
┌─────────────────────────────────────────────────────────────┐
│                        AgentDetail.js                        │
│                                                              │
│  1. 创建 FileUploadService 实例                              │
│     - 传入 agentId, agentData                                │
│     - 传入 notificationCenter, statusBarManager             │
│                                                              │
│  2. 将服务添加到 context                                      │
│     - context.services.fileUpload                            │
│     - context.utils.uploadFile (快捷方法)                     │
│                                                              │
│  3. 调用 init(context) 传给智能体                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    智能体 bundle.js                          │
│                                                              │
│  1. 接收 context 参数                                         │
│                                                              │
│  2. 用户触发上传操作                                          │
│     - 点击按钮                                                │
│     - 拖拽文件                                                │
│                                                              │
│  3. 调用上传API                                               │
│     - utils.selectAndUploadFile(options)                     │
│     - 传递文件参数和配置                                       │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                   FileUploadService.js                       │
│                                                              │
│  1. 验证文件（大小、类型）                                     │
│                                                              │
│  2. 创建 FormData                                             │
│     - 添加文件                                                │
│     - 添加 agentId, uploadId                                 │
│     - 添加 metadata                                          │
│                                                              │
│  3. 发送 HTTP POST 请求                                       │
│     - 监听上传进度                                            │
│     - 调用 onProgress 回调                                    │
│     - 更新状态栏                                              │
│                                                              │
│  4. 处理响应                                                  │
│     - 成功：返回结果，显示通知                                 │
│     - 失败：抛出错误，显示错误通知                             │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                        后端 API                              │
│                                                              │
│  POST /api/upload                                            │
│                                                              │
│  接收参数:                                                    │
│  - file: 文件对象                                             │
│  - agentId: 智能体ID                                          │
│  - uploadId: 上传ID                                           │
│  - metadata: JSON字符串                                       │
│                                                              │
│  返回:                                                        │
│  {                                                           │
│    success: true,                                            │
│    fileId: "file_123",                                       │
│    url: "https://...",                                       │
│    fileName: "document.pdf",                                 │
│    fileSize: 1024000                                         │
│  }                                                           │
└─────────────────────────────────────────────────────────────┘
```

---

## 配置选项

### 上传选项

```javascript
{
  // 文件验证
  maxSize: number,           // 最大文件大小（字节），默认 100MB
  allowedTypes: string[],    // 允许的MIME类型数组
  
  // 进度回调
  onProgress: function,      // (percent) => {} 或 (totalPercent, currentIndex, totalCount) => {}
  
  // 元数据
  metadata: object,          // 额外的元数据，会以JSON格式发送到后端
  
  // 自定义URL
  uploadUrl: string,         // 自定义上传URL，默认 '/api/upload'
  
  // 请求头
  headers: object            // 自定义HTTP请求头
}
```

### 文件选择选项

```javascript
{
  multiple: boolean,         // 是否允许多选，默认 false
  accept: string             // 接受的文件类型，如 '.pdf' 或 'image/*'
}
```

---

## 事件系统

FileUploadService 会发布以下事件（如果提供了 eventBus）：

### file-upload-success

上传成功时触发

```javascript
{
  agentId: string,
  uploadId: string,
  fileName: string,
  result: object
}
```

### file-upload-error

上传失败时触发

```javascript
{
  agentId: string,
  fileName: string,
  error: string
}
```

---

## 后端接口要求

### 请求

**URL**: `POST /api/upload`

**Content-Type**: `multipart/form-data`

**参数**:
- `file`: 文件对象（必需）
- `agentId`: 智能体ID（必需）
- `uploadId`: 上传ID（必需）
- `metadata`: JSON字符串（可选）

### 响应

**成功响应** (HTTP 200):
```json
{
  "success": true,
  "fileId": "file_123456",
  "url": "https://example.com/files/file_123456.pdf",
  "fileName": "document.pdf",
  "fileSize": 1024000,
  "mimeType": "application/pdf"
}
```

**错误响应** (HTTP 4xx/5xx):
```json
{
  "success": false,
  "error": "文件大小超过限制"
}
```

---

## 测试建议

### 单元测试

1. **文件验证测试**
   - 测试文件大小限制
   - 测试文件类型限制
   - 测试空文件处理

2. **上传功能测试**
   - 测试单文件上传
   - 测试多文件上传
   - 测试上传取消
   - 测试进度回调

3. **错误处理测试**
   - 测试网络错误
   - 测试服务器错误
   - 测试超时处理

### 集成测试

1. **智能体集成测试**
   - 测试上下文传递
   - 测试快捷方法调用
   - 测试完整服务调用

2. **UI交互测试**
   - 测试文件选择对话框
   - 测试进度显示
   - 测试结果展示

---

## 扩展建议

### 未来可能的增强功能

1. **拖拽上传**
   - 支持拖拽文件到指定区域上传

2. **断点续传**
   - 支持大文件断点续传
   - 网络中断后自动恢复

3. **压缩上传**
   - 图片自动压缩
   - 文件分片上传

4. **预览功能**
   - 上传前预览图片
   - 上传后预览文档

5. **云存储集成**
   - 支持上传到OSS、S3等云存储
   - 支持CDN加速

---

## 注意事项

1. **安全性**
   - 后端必须验证文件类型和大小
   - 防止恶意文件上传
   - 文件名需要过滤特殊字符

2. **性能**
   - 大文件上传建议使用分片上传
   - 考虑并发上传数量限制
   - 合理设置超时时间

3. **用户体验**
   - 提供清晰的进度提示
   - 支持取消上传操作
   - 错误信息要友好明确

4. **兼容性**
   - 确保在不同浏览器中正常工作
   - 考虑移动端适配

---

## 相关文档

- [文件上传 API 使用文档](./FILE_UPLOAD_API.md)
- [智能体开发文档](./智能体对接文档.md)
- [示例代码](./examples/file-upload-agent-example.js)

---

## 更新日志

- **v1.0.0** (2025-10-20)
  - 初始实现
  - 支持单文件和多文件上传
  - 支持进度回调和错误处理
  - 提供快捷方法和完整服务两种使用方式

