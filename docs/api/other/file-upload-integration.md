# 文件上传功能集成说明

## 概述

本文档说明了如何在 PDF 智能体中集成统一的文件上传服务。

## 架构说明

### 1. 文件上传服务 (FileUploadService)

位置：`src/services/FileUploadService.js`

**主要功能**：
- ✅ 三步上传流程（创建URL → 上传文件 → 确认完成）
- ✅ SHA-256 哈希秒传功能
- ✅ 支持多种文件类型（image, document, video, audio, archive）
- ✅ 文件大小限制：100MB
- ✅ 上传链接有效期：30分钟
- ✅ 进度回调支持
- ✅ 批量上传支持

**接口路径**：
- 创建上传URL: `POST /api/common/upload/create` (代理到 `/v2/common/upload/create`)
- 上传文件: `POST /api/common/upload/{upload_id}`
- 确认上传: `POST /api/common/upload/complete`

### 2. AgentDetail 上下文传递

位置：`src/views/agents/AgentDetail.js`

在 `executeAgentUI()` 方法中，会创建 `FileUploadService` 实例并通过 context 传递给智能体：

```javascript
const fileUploadService = new FileUploadService({
  agentId: agentData.id,
  agentData: agentData,
  notificationCenter: window.notificationCenter,
  statusBarManager: agentStatusBarManager,
  app: window.app,
  eventBus: this.eventBus
});

const context = {
  container: container,
  agentData: agentData,
  config: uiBundle.config,
  services: {
    statusBarManager: agentStatusBarManager,
    app: window.app,
    fileUpload: fileUploadService  // ✅ 文件上传服务
  },
  utils: {
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
      // 一站式选择并上传
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
};
```

### 3. PDF 智能体集成

位置：`standalone/pdf_tools/api/pdf-api.js`

**更新说明**：

#### 原方法（已废弃）：
```javascript
async uploadFileForOCR(file, fileName, apiBaseUrl) {
  // 占位实现
  return {
    success: false,
    fileUrl: '',
    message: 'OCR 上传接口等待后端实现'
  };
}
```

#### 新方法（已实现）：
```javascript
async uploadFileForOCR(file, fileName) {
  try {
    // 1. 检查文件上传服务是否可用
    if (!this.context || !this.context.services || !this.context.services.fileUpload) {
      throw new Error('文件上传服务不可用');
    }

    const fileUploadService = this.context.services.fileUpload;

    // 2. 转换 Blob 为 File（如果需要）
    let fileToUpload = file;
    if (file instanceof Blob && !(file instanceof File)) {
      fileToUpload = new File([file], fileName, {
        type: file.type || 'application/pdf'
      });
    }

    // 3. 调用统一的文件上传服务
    const result = await fileUploadService.upload(fileToUpload, {
      fileType: 'document',  // OCR 文档类型
      description: `OCR识别文件: ${fileName}`,
      enableHash: true  // 启用秒传
    });

    // 4. 返回结果
    if (result.success) {
      return {
        success: true,
        fileUrl: result.url || result.filePath,
        fileId: result.fileId,
        message: result.instant ? '秒传成功' : '上传成功'
      };
    } else {
      throw new Error('上传失败');
    }

  } catch (error) {
    console.error('❌ 文件上传失败:', error);
    return {
      success: false,
      fileUrl: '',
      message: error.message || '上传失败'
    };
  }
}
```

## 使用示例

### 在 PDF 智能体中使用

```javascript
// 在 bundle.js 或其他智能体代码中
async function uploadPDFForOCR(pdfFile) {
  try {
    // 调用 PDFApi 的上传方法
    const result = await PDFApi.uploadFileForOCR(pdfFile, pdfFile.name);

    if (result.success) {
      console.log('✅ 上传成功:', result.fileUrl);
      console.log('文件ID:', result.fileId);

      if (result.message === '秒传成功') {
        console.log('⚡ 使用了秒传功能');
      }

      // 继续进行 OCR 识别
      // ...
    } else {
      console.error('❌ 上传失败:', result.message);
    }
  } catch (error) {
    console.error('❌ 上传异常:', error);
  }
}
```

### 直接使用 context.utils 快捷方法

```javascript
// 方式1: 选择并上传单个文件
const result = await context.utils.selectAndUploadFile({
  accept: 'application/pdf',
  fileType: 'document',
  description: 'OCR识别文件'
});

// 方式2: 分步操作
const files = await context.utils.selectFiles({
  accept: 'application/pdf',
  multiple: false
});

if (files.length > 0) {
  const result = await context.utils.uploadFile(files[0], {
    fileType: 'document',
    description: 'OCR识别文件'
  });
}

// 方式3: 批量上传
const files = await context.utils.selectFiles({
  accept: 'image/*',
  multiple: true
});

if (files.length > 0) {
  const results = await context.utils.uploadMultipleFiles(files, {
    fileType: 'image',
    onProgress: (percent, current, total) => {
      console.log(`上传进度: ${percent}% (${current}/${total})`);
    }
  });

  console.log('成功:', results.success.length);
  console.log('失败:', results.errors.length);
}
```

## 上传流程详解

### 1. 普通上传流程

```
用户选择文件
    ↓
计算 SHA-256 哈希
    ↓
调用 /create 接口（携带哈希）
    ↓
[检查秒传]
    ↓
No → 获取上传URL
    ↓
上传文件到预签名URL
    ↓
调用 /complete 接口
    ↓
返回文件URL
```

### 2. 秒传流程

```
用户选择文件
    ↓
计算 SHA-256 哈希
    ↓
调用 /create 接口（携带哈希）
    ↓
[检查秒传]
    ↓
Yes → 直接返回已存在文件的URL
    ↓
完成（无需实际上传）
```

## 返回数据格式

### 成功响应（普通上传）

```javascript
{
  success: true,
  instant: false,  // 标记为正常上传
  fileId: 123,
  fileName: "example.pdf",
  savedFileName: "20250114_abc123.pdf",
  fileSize: 1024000,
  fileType: "document",
  url: "http://example.com/uploads/20250114_abc123.pdf",
  filePath: "/uploads/20250114_abc123.pdf",
  uploadTime: "2025-01-14T10:00:00Z",
  confirmedTime: "2025-01-14T10:00:05Z",
  sha256Hash: "a1b2c3..."
}
```

### 成功响应（秒传）

```javascript
{
  success: true,
  instant: true,  // 标记为秒传
  fileId: 123,
  fileName: "example.pdf",
  savedFileName: "20250114_abc123.pdf",
  fileSize: 1024000,
  fileType: "document",
  url: "http://example.com/uploads/20250114_abc123.pdf",
  filePath: "http://example.com/uploads/20250114_abc123.pdf",
  uploadTime: "2025-01-14T10:00:00Z",
  confirmedTime: "2025-01-14T10:00:00Z"
}
```

## 注意事项

1. **Context 依赖**：`PDFApi.uploadFileForOCR()` 依赖 `this.context`，需要在 `executeOperation()` 时保存 context 引用

2. **文件类型**：
   - `image`: .jpg, .jpeg, .png, .gif, .bmp, .webp
   - `document`: .pdf, .doc, .docx, .txt, .md, .xlsx, .xls, .ppt, .pptx
   - `video`: .mp4, .avi, .mov, .wmv, .flv, .mkv
   - `audio`: .mp3, .wav, .flac, .aac, .ogg
   - `archive`: .zip, .rar, .7z, .tar, .gz

3. **文件大小限制**：最大 100MB

4. **秒传优化**：
   - 自动计算 SHA-256 哈希
   - 相同文件无需重复上传
   - 可通过 `enableHash: false` 禁用

5. **进度监控**：
   ```javascript
   await fileUploadService.upload(file, {
     onProgress: (percent) => {
       console.log(`上传进度: ${percent}%`);
       // 更新 UI 进度条
     }
   });
   ```

6. **错误处理**：
   ```javascript
   try {
     const result = await PDFApi.uploadFileForOCR(file, fileName);
     if (!result.success) {
       // 处理上传失败
       console.error(result.message);
     }
   } catch (error) {
     // 处理异常
     console.error(error);
   }
   ```

## 构建说明

PDF 智能体源文件会通过 `build-pdf-bundle.js` 打包：

```bash
node standalone/pdf_tools/build-pdf-bundle.js
```

打包后生成：
- `bundle.js` - 包含所有逻辑（包括更新后的 pdf-api.js）
- `bundle.css` - 样式文件

这两个文件会上传到服务器，前端 App 通过 `AgentUILoader` 动态加载。

## 测试建议

1. **单元测试**：测试 `uploadFileForOCR()` 方法
2. **集成测试**：在 PDF 智能体中实际上传文件
3. **秒传测试**：上传相同文件，验证秒传功能
4. **错误测试**：测试网络错误、文件过大等场景
5. **进度测试**：验证上传进度回调

## 更新日志

- **2025-01-14**: 初始版本，集成统一文件上传服务到 PDF 智能体
