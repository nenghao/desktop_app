// PDF工具 - API调用模块
// 在前端直接使用 pdfkit, pdf-lib, pdf.js 处理PDF

const PDFApi = {
  // OCR 配置缓存
  _ocrConfigCache: {
    data: null,
    timestamp: null,
    cacheDuration: 10 * 60 * 1000  // 10 分钟（毫秒）
  },

  /**
   * 调用PDF工具
   * @param {string} operation - 操作类型 (merge, split, create, ocr)
   * @param {object} params - 操作参数
   * @param {object} context - 上下文对象
   * @returns {Promise<object>} API响应
   */
  async executeOperation(operation, params, context) {
    try {
      // 保存context引用，供saveFile使用
      this.context = context;

      // 根据操作类型调用对应的方法
      let result;
      switch (operation) {
        case 'merge':
          result = await this.executeMerge(params);
          break;
        case 'split':
          result = await this.executeSplit(params);
          break;
        case 'create':
          result = await this.executeCreate(params);
          break;
        case 'ocr':
          result = await this.executeOCR(params);
          break;
        default:
          throw new Error(`未知的操作类型: ${operation}`);
      }

      return result;
    } catch (error) {
      console.error('API调用失败:', error);
      throw error;
    }
  },

  /**
   * 执行合并PDF（使用 pdf-lib）
   */
  async executeMerge(params) {
    const { files, pages, addBookmark, output, outputDir } = params;

    // 检查 pdf-lib 是否加载
    if (typeof PDFLib === 'undefined') {
      throw new Error('pdf-lib 库未加载，请确保已引入 pdf-lib');
    }

    try {
      // 创建新的PDF文档
      const mergedPdf = await PDFLib.PDFDocument.create();

      // 读取并合并每个PDF文件
      for (const file of files) {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);

        // 根据页面范围复制页面
        const pageIndices = this.parsePageRange(pages, pdf.getPageCount());
        const copiedPages = await mergedPdf.copyPages(pdf, pageIndices);

        copiedPages.forEach(page => {
          mergedPdf.addPage(page);
        });
      }

      // 生成PDF字节
      const pdfBytes = await mergedPdf.save();

      // 保存文件
      const outputPath = await this.saveFile(pdfBytes, output, outputDir);

      return {
        success: true,
        outputPath: outputPath,
        message: '合并成功',
        pdfBytes: pdfBytes  // 返回字节数组用于预览
      };
    } catch (error) {
      throw new Error('合并失败: ' + error.message);
    }
  },

  /**
   * 执行拆分PDF（使用 pdf-lib）
   */
  async executeSplit(params) {
    const { file, mode, pages, every, outputDir } = params;

    if (typeof PDFLib === 'undefined') {
      throw new Error('pdf-lib 库未加载');
    }

    try {
      const arrayBuffer = await file.arrayBuffer();
      const sourcePdf = await PDFLib.PDFDocument.load(arrayBuffer);
      const totalPages = sourcePdf.getPageCount();

      let outputPaths = [];

      if (mode === 'pages') {
        // 按页面范围拆分
        const ranges = pages.split(',').map(r => r.trim());

        for (let i = 0; i < ranges.length; i++) {
          const range = ranges[i];
          const pageIndices = this.parsePageRange(range, totalPages);

          const newPdf = await PDFLib.PDFDocument.create();
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
          copiedPages.forEach(page => newPdf.addPage(page));

          const pdfBytes = await newPdf.save();
          const outputName = `${file.name.replace('.pdf', '')}_part${i + 1}.pdf`;
          const outputPath = await this.saveFile(pdfBytes, outputName, outputDir);
          outputPaths.push(outputPath);
        }
      } else if (mode === 'every') {
        // 每N页拆分
        const pagesPer = parseInt(every);
        const numParts = Math.ceil(totalPages / pagesPer);

        for (let i = 0; i < numParts; i++) {
          const start = i * pagesPer;
          const end = Math.min(start + pagesPer, totalPages);
          const pageIndices = Array.from({ length: end - start }, (_, k) => start + k);

          const newPdf = await PDFLib.PDFDocument.create();
          const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
          copiedPages.forEach(page => newPdf.addPage(page));

          const pdfBytes = await newPdf.save();
          const outputName = `${file.name.replace('.pdf', '')}_part${i + 1}.pdf`;
          const outputPath = await this.saveFile(pdfBytes, outputName, outputDir);
          outputPaths.push(outputPath);
        }
      } else if (mode === 'single') {
        // 每页单独拆分
        for (let i = 0; i < totalPages; i++) {
          const newPdf = await PDFLib.PDFDocument.create();
          const [copiedPage] = await newPdf.copyPages(sourcePdf, [i]);
          newPdf.addPage(copiedPage);

          const pdfBytes = await newPdf.save();
          const outputName = `${file.name.replace('.pdf', '')}_page${i + 1}.pdf`;
          const outputPath = await this.saveFile(pdfBytes, outputName, outputDir);
          outputPaths.push(outputPath);
        }
      }

      return {
        success: true,
        outputPath: outputPaths[0],
        outputPaths: outputPaths,
        message: '拆分成功',
        pdfBytes: await this.readFirstFile(outputPaths[0])  // 返回第一个文件的字节用于预览
      };
    } catch (error) {
      throw new Error('拆分失败: ' + error.message);
    }
  },

  /**
   * 执行创建PDF（使用 pdfkit-browserify）
   */
  async executeCreate(params) {
    const { mode, images, text, pages, output, outputDir } = params;

    // 这里需要使用 pdfkit 的浏览器版本或者 pdf-lib
    // 暂时使用 pdf-lib 实现基础功能
    if (typeof PDFLib === 'undefined') {
      throw new Error('pdf-lib 库未加载');
    }

    try {
      const pdfDoc = await PDFLib.PDFDocument.create();

      if (mode === 'images') {
        // 从图片创建PDF - 支持自动转换 HEIC、TIFF、BMP 等格式
        for (const imageFile of images) {
          let processedBlob = imageFile;
          let imageFormat = 'unknown';

          // 检查是否需要转换图片格式
          if (typeof ImageConverter !== 'undefined') {
            try {
              const convertResult = await ImageConverter.convertImage(imageFile);
              processedBlob = convertResult.blob;
              imageFormat = convertResult.format;
              console.log(`✅ 图片已处理 (${imageFile.name}): ${imageFormat}`);
            } catch (error) {
              console.warn('图片转换失败，尝试直接使用:', error);
              // 转换失败时，尝试直接使用原始文件
            }
          }

          const arrayBuffer = await processedBlob.arrayBuffer();
          let image;

          // 尝试根据格式嵌入图片
          try {
            // 先尝试 PNG
            if (imageFormat === 'png' || processedBlob.type === 'image/png') {
              image = await pdfDoc.embedPng(arrayBuffer);
            }
            // 再尝试 JPEG
            else if (imageFormat === 'jpeg' || processedBlob.type === 'image/jpeg' || processedBlob.type === 'image/jpg') {
              image = await pdfDoc.embedJpg(arrayBuffer);
            }
            // 最后尝试原始类型
            else if (imageFile.type === 'image/png') {
              image = await pdfDoc.embedPng(arrayBuffer);
            } else if (imageFile.type === 'image/jpeg' || imageFile.type === 'image/jpg') {
              image = await pdfDoc.embedJpg(arrayBuffer);
            } else {
              throw new Error(`不支持的图片格式: ${imageFile.type} (${imageFile.name})`);
            }
          } catch (embedError) {
            throw new Error(`无法嵌入图片 "${imageFile.name}": ${embedError.message}`);
          }

          const page = pdfDoc.addPage([image.width, image.height]);
          page.drawImage(image, {
            x: 0,
            y: 0,
            width: image.width,
            height: image.height,
          });
        }
      } else if (mode === 'text') {
        // 从文本创建PDF
        const page = pdfDoc.addPage([595, 842]); // A4 size
        const font = await pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);

        page.drawText(text, {
          x: 50,
          y: 792,
          size: 12,
          font: font,
          maxWidth: 495,
        });
      } else if (mode === 'blank') {
        // 创建空白PDF
        const numPages = parseInt(pages);
        for (let i = 0; i < numPages; i++) {
          pdfDoc.addPage([595, 842]); // A4 size
        }
      }

      const pdfBytes = await pdfDoc.save();
      const outputPath = await this.saveFile(pdfBytes, output, outputDir);

      return {
        success: true,
        outputPath: outputPath,
        message: '创建成功',
        pdfBytes: pdfBytes  // 返回字节数组用于预览
      };
    } catch (error) {
      throw new Error('创建失败: ' + error.message);
    }
  },

  /**
   * 执行OCR识别
   */
  async executeOCR(params) {
    const { files, language, pages, searchable, output, outputDir } = params;

    try {
      console.log('📝 OCR 识别参数:', { files, language, pages, searchable, output, outputDir });

      // 检查是否有文件
      if (!files || files.length === 0) {
        throw new Error('请选择要识别的文件');
      }

      const file = files[0]; // 当前只处理第一个文件

      // 1. 检测文件类型
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      const fileType = isPDF ? 'pdf' : 'image';

      console.log('📄 文件类型:', fileType, '文件名:', file.name);

      // 2. 上传文件（使用统一上传服务）
      console.log('📤 开始上传文件...');
      const uploadResult = await this.uploadFileForOCR(file, file.name);

      if (!uploadResult.success) {
        throw new Error(`文件上传失败: ${uploadResult.message}`);
      }

      console.log('✅ 文件上传成功:', uploadResult.fileUrl);

      // 3. 调用 OCR 识别接口
      console.log('🔍 开始 OCR 识别...');
      const ocrParams = {
        file_url: uploadResult.fileUrl,
        file_type: fileType,
        language: language || 'auto',
        pages: pages || 'all',
        searchable: searchable || false,
        original_filename: file.name
      };

      // 只有秒传时才有 file_id（整数），正常上传只有 upload_id（字符串）
      if (uploadResult.fileId && typeof uploadResult.fileId === 'number') {
        ocrParams.file_id = uploadResult.fileId;
      }

      const ocrResult = await this.performOCR(ocrParams);

      if (!ocrResult.success) {
        throw new Error(ocrResult.message || 'OCR识别失败');
      }

      console.log('✅ OCR 识别完成:', ocrResult.data);

      // 4. 处理返回结果
      const resultData = ocrResult.data;
      let outputPath = '';

      // 根据 searchable 参数决定 outputPath
      if (searchable) {
        // searchable=true: 使用可搜索PDF的URL
        outputPath = resultData.searchable_pdf_url;
        console.log('✅ 可搜索PDF URL:', outputPath);
      } else {
        // searchable=false: 保存 textContent 到本地文件
        if (resultData.text_content || resultData.text_preview) {
          const textToSave = resultData.text_content || resultData.text_preview;
          const textBytes = new TextEncoder().encode(textToSave);
          outputPath = await this.saveFile(textBytes, output, outputDir);
          console.log('✅ 文本内容已保存到:', outputPath);
        }
      }

      // 统一返回格式（映射后端字段）
      return {
        success: true,
        message: ocrResult.message || 'OCR识别成功',
        outputPath: outputPath,  // 根据 searchable 决定的路径
        textContent: resultData.text_content || resultData.text_preview || null,
        searchablePdfUrl: resultData.searchable_pdf_url || null,
        searchablePdfId: resultData.searchable_pdf_id || null,
        fileType: resultData.file_type,
        resultType: resultData.result_type,
        originalFilename: resultData.original_filename,
        fileSize: resultData.file_size,
        textPreview: resultData.text_preview,
        pageCount: resultData.page_count,
        recognizedPages: resultData.recognized_pages,
        languageDetected: resultData.language_detected
      };

    } catch (error) {
      console.error('❌ OCR 识别失败:', error);
      throw new Error('OCR识别失败: ' + error.message);
    }
  },

  /**
   * 调用后端 OCR 识别接口
   * @param {Object} params - OCR参数
   * @returns {Promise<Object>} OCR结果
   */
  async performOCR(params) {
    try {
      console.log("调用后端 OCR 识别接口");

      // 检查是否有 ApiService（支持自动 Token 刷新）
      const apiService = this.context?.services?.apiService;

      let result;
      if (apiService) {
        // 使用 ApiService（自动处理 Token 刷新）
        console.log('[PDF Tools OCR] 使用 ApiService 发送请求');
        result = await apiService.post('toolkit/ocr/recognize', params);
      } else {
        // 降级：使用原生 fetch（无 Token 自动刷新）
        console.warn('[PDF Tools OCR] ApiService 不可用，降级使用 fetch');

        // 获取token
        const token = this.getToken();
        if (!token) {
          throw new Error('未找到认证token，请先登录');
        }

        // 调用后端 OCR 接口
        const apiBaseUrl = (this.context?.apiConfig?.baseUrl || this.context?.config?.apiBaseUrl || 'https://api.baizesz.com').replace(/\/+$/, '');
        const apiUrl = `${apiBaseUrl}/toolkit/ocr/recognize`;
        console.log('🔍 [OCR API] 调用地址:', apiUrl);

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(params)
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        result = await response.json();
      }

      return result;

    } catch (error) {
      console.error('❌ OCR 接口调用失败:', error);
      throw error;
    }
  },

  /**
   * 获取认证 Token
   * @private
   */
  getToken() {
    console.log("getToken:", this.context, this.context.services.app);

    // 从 context 获取 token
    if (this.context && this.context.services && this.context.services.app) {
      const userManager = this.context.services.app.getService('userManager');
      if (userManager && userManager.getCurrentUser()) {
        return userManager.getCurrentUser().access_token;
      }
    }

    // 备用方案：从 window 获取
    if (typeof window !== 'undefined' && window.app) {
      const userManager = window.app.getService('userManager');
      if (userManager && userManager.getCurrentUser()) {
        return userManager.getCurrentUser().access_token;
      }
    }

    return null;
  },

  /**
   * 获取 OCR 配置（语言列表）
   * @param {string} apiBaseUrl - API 基础 URL
   * @returns {Promise<Array>} 语言列表
   */
  async fetchOCRConfig(apiBaseUrl) {
    try {
      // 检查缓存是否有效（10分钟内）
      const now = Date.now();
      const cache = this._ocrConfigCache;

      if (cache.data && cache.timestamp) {
        const elapsedTime = now - cache.timestamp;
        const remainingTime = cache.cacheDuration - elapsedTime;

        if (elapsedTime < cache.cacheDuration) {
          return cache.data;
        }
      }

      // 使用翻译接口获取语言列表
      const url = `${apiBaseUrl}/toolkit/translate/config`;
      console.log('🔄 [OCR Config] 获取 OCR 配置(从翻译接口):', url);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      if (result.success && result.data && result.data.source_languages) {
        const languages = result.data.source_languages;

        // 更新缓存
        this._ocrConfigCache.data = languages;
        this._ocrConfigCache.timestamp = now;

        console.log('✅ OCR 配置获取成功（翻译接口）:', languages.length, '种语言');
        console.log('💾 配置已缓存，有效期 10 分钟');

        return languages;
      } else {
        throw new Error(result.message || '配置数据格式错误');
      }
    } catch (error) {
      console.warn('⚠️ 获取 OCR 配置失败，使用默认配置:', error.message);

      // 如果有缓存数据（即使过期），优先使用缓存
      if (this._ocrConfigCache.data) {
        console.log('📦 使用过期缓存数据作为降级方案');
        return this._ocrConfigCache.data;
      }

      // 返回默认配置
      const defaultLanguages = this.getDefaultOCRLanguages();

      // 将默认配置也缓存起来
      this._ocrConfigCache.data = defaultLanguages;
      this._ocrConfigCache.timestamp = Date.now();

      return defaultLanguages;
    }
  },

  /**
   * 清除 OCR 配置缓存（调试用）
   */
  clearOCRConfigCache() {
    this._ocrConfigCache.data = null;
    this._ocrConfigCache.timestamp = null;
    console.log('🗑️ OCR 配置缓存已清除');
  },

  /**
   * 获取 OCR 配置缓存状态（调试用）
   * @returns {object} 缓存状态信息
   */
  getOCRConfigCacheStatus() {
    const cache = this._ocrConfigCache;
    const now = Date.now();

    if (!cache.data || !cache.timestamp) {
      return {
        hasCache: false,
        message: '无缓存'
      };
    }

    const elapsedTime = now - cache.timestamp;
    const remainingTime = cache.cacheDuration - elapsedTime;
    const isValid = elapsedTime < cache.cacheDuration;

    return {
      hasCache: true,
      isValid,
      languageCount: cache.data.length,
      elapsedMinutes: Math.floor(elapsedTime / 1000 / 60),
      elapsedSeconds: Math.floor((elapsedTime / 1000) % 60),
      remainingMinutes: Math.floor(remainingTime / 1000 / 60),
      remainingSeconds: Math.floor((remainingTime / 1000) % 60),
      message: isValid
        ? `缓存有效，剩余 ${Math.floor(remainingTime / 1000 / 60)}分${Math.floor((remainingTime / 1000) % 60)}秒`
        : `缓存已过期 ${Math.floor(Math.abs(remainingTime) / 1000 / 60)}分${Math.floor((Math.abs(remainingTime) / 1000) % 60)}秒`
    };
  },

  /**
   * 获取默认 OCR 语言列表（降级方案）
   * @returns {Array} 默认语言列表
   */
  getDefaultOCRLanguages() {
    return [
      { value: 'auto', label: '自动检测', label_en: 'Auto Detect' },
      { value: 'en', label: '英文', label_en: 'English' },
      { value: 'zh', label: '中文', label_en: 'Chinese' },
      { value: 'ja', label: '日文', label_en: 'Japanese' },
      { value: 'ko', label: '韩文', label_en: 'Korean' },
      { value: 'fr', label: '法文', label_en: 'French' },
      { value: 'de', label: '德文', label_en: 'German' },
      { value: 'es', label: '西班牙文', label_en: 'Spanish' },
      { value: 'ru', label: '俄文', label_en: 'Russian' },
      { value: 'ar', label: '阿拉伯文', label_en: 'Arabic' },
      { value: 'pt', label: '葡萄牙文', label_en: 'Portuguese' },
      { value: 'it', label: '意大利文', label_en: 'Italian' }
    ];
  },

  /**
   * 上传文件到服务器（OCR 专用）
   * 使用统一的文件上传服务
   * @param {File|Blob} file - 文件对象
   * @param {string} fileName - 文件名
   * @returns {Promise<{success: boolean, fileUrl: string, message: string}>}
   */
  async uploadFileForOCR(file, fileName) {
    try {
      console.log('📤 准备上传文件到服务器:', fileName);
      console.log('   文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // 检查 context 中是否有文件上传服务
      if (!this.context || !this.context.services || !this.context.services.fileUpload) {
        throw new Error('文件上传服务不可用');
      }

      const fileUploadService = this.context.services.fileUpload;

      // 如果是 Blob，需要转换为 File 对象
      let fileToUpload = file;
      if (file instanceof Blob && !(file instanceof File)) {
        fileToUpload = new File([file], fileName, { type: file.type || 'application/pdf' });
      }

      // 调用统一的文件上传服务
      const result = await fileUploadService.upload(fileToUpload, {
        fileType: 'document',  // OCR 文档类型
        description: `OCR识别文件: ${fileName}`,
        enableHash: true  // 启用秒传
      });

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
  },

  /**
   * 解析页面范围
   * @param {string} rangeStr - 页面范围字符串，如 "1-5", "all", "1,3,5"
   * @param {number} totalPages - 总页数
   * @returns {number[]} 页面索引数组
   */
  parsePageRange(rangeStr, totalPages) {
    if (rangeStr === 'all' || !rangeStr) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const indices = [];
    const parts = rangeStr.split(',');

    for (const part of parts) {
      const trimmed = part.trim();

      if (trimmed.includes('-')) {
        // 范围格式：1-5
        const [start, end] = trimmed.split('-').map(s => parseInt(s.trim()));
        for (let i = start - 1; i < end && i < totalPages; i++) {
          indices.push(i);
        }
      } else {
        // 单个页面：3
        const pageNum = parseInt(trimmed);
        if (pageNum > 0 && pageNum <= totalPages) {
          indices.push(pageNum - 1);
        }
      }
    }

    return indices;
  },

  /**
   * 读取已保存的文件（用于预览）
   * @param {string} filePath - 文件路径
   * @returns {Promise<Uint8Array>} PDF字节数组
   */
  async readFirstFile(filePath) {
    if (this.context && this.context.utils && this.context.utils.fs) {
      try {
        const fs = this.context.utils.fs;
        const buffer = fs.readFileSync(filePath);
        return new Uint8Array(buffer);
      } catch (error) {
        console.warn('读取文件用于预览失败:', error);
        return null;
      }
    }
    return null;
  },

  /**
   * 保存文件
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {string} fileName - 文件名
   * @param {string} outputDir - 输出目录
   * @returns {Promise<string>} 文件路径
   */
  async saveFile(pdfBytes, fileName, outputDir) {
    // 安全的保存实现：优先使用 Node fs（同步写入），其次使用 preload 暴露的 fileAPI / electronAPI
    const ctx = this.context || {};
    const utils = ctx.utils || {};

    try {
      // 如果注入的是 Node 的 fs（具有 writeFileSync），走同步路径
      if (utils.fs && typeof utils.fs.writeFileSync === 'function') {
        const fs = utils.fs;
        const path = utils.path;
        const os = utils.os;

        let fullPath;
        if (outputDir) {
          fullPath = (path && typeof path.join === 'function') ? path.join(outputDir, fileName) : outputDir + '/' + fileName;
        } else {
          const tmpDir = (os) ? (typeof os.tmpdir === 'function' ? os.tmpdir() : '/tmp') : '/tmp';
          fullPath = (path && typeof path.join === 'function') ? path.join(tmpDir, fileName) : tmpDir + '/' + fileName;
        }

        const buffer = (typeof Buffer !== 'undefined') ? Buffer.from(pdfBytes) : new Uint8Array(pdfBytes);
        fs.writeFileSync(fullPath, buffer);
        console.log('✅ PDF文件已保存:', fullPath);
        return fullPath;
      }

      // 如果注入的是 preload 暴露的 fileAPI（带 async writeFile）或全局 window.fileAPI
      const fileAPI = (utils.fs && typeof utils.fs.writeFile === 'function') ? utils.fs : (typeof window !== 'undefined' ? window.fileAPI : null);
      const pathAPI = (utils.path && typeof utils.path.join === 'function') ? utils.path : (typeof window !== 'undefined' ? window.pathAPI : null);
      const electronAPI = (utils.electronAPI && typeof utils.electronAPI.saveToDir === 'function') ? utils.electronAPI : (typeof window !== 'undefined' ? window.electronAPI : null);

      if (electronAPI && typeof electronAPI.saveToDir === 'function') {
        const dir = outputDir || await PDFHelpers.getTempDir();
        const data = (pdfBytes instanceof Uint8Array) ? pdfBytes : new Uint8Array(pdfBytes);
        const savedPath = await electronAPI.saveToDir(dir, fileName, data);
        console.log('✅ PDF文件已保存 via electronAPI.saveToDir:', savedPath);
        return savedPath;
      }

      if (fileAPI && typeof fileAPI.writeFile === 'function') {
        const dir = outputDir || await PDFHelpers.getTempDir();
        const fullPath = (pathAPI && typeof pathAPI.join === 'function') ? await (typeof pathAPI.join === 'function' ? pathAPI.join(dir, fileName) : (dir + '/' + fileName)) : (dir + '/' + fileName);

        const content = (pdfBytes instanceof Uint8Array) ? pdfBytes : new Uint8Array(pdfBytes);
        // fileAPI.writeFile 通过 IPC 返回 Promise
        await fileAPI.writeFile(fullPath, content);
        console.log('✅ PDF文件已保存 via fileAPI.writeFile:', fullPath);
        return fullPath;
      }

    } catch (error) {
      console.error('❌ 保存文件失败:', error);
    }

    // 浏览器环境：不自动弹窗，只返回文件名，保留前端下载回退
    console.log('⚠️ 浏览器环境下不支持自动保存，请使用"保存文件"按钮');
    return fileName;
  },

  /**
   * 构建命令参数
   * @param {string} operation - 操作类型
   * @param {object} params - 参数对象
   * @returns {array} 命令参数数组
   */
  buildArgs(operation, params) {
    const args = [operation];

    switch (operation) {
      case 'merge':
        return this.buildMergeArgs(params);
      case 'split':
        return this.buildSplitArgs(params);
      case 'create':
        return this.buildCreateArgs(params);
      case 'ocr':
        return this.buildOCRArgs(params);
      default:
        throw new Error(`未知的操作类型: ${operation}`);
    }
  },

  /**
   * 构建合并PDF参数
   */
  buildMergeArgs(params) {
    const { files, pages, addBookmark, output } = params;
    const args = ['merge', ...files];

    if (pages && pages !== 'all') {
      args.push('--pages', pages);
    }

    if (addBookmark) {
      args.push('--bookmark');
    }

    args.push('-o', output);
    return args;
  },

  /**
   * 构建拆分PDF参数
   */
  buildSplitArgs(params) {
    const { file, mode, pages, every, output } = params;
    const args = ['split', file];

    if (mode === 'pages' && pages) {
      args.push('--pages', pages);
    } else if (mode === 'every') {
      args.push('--every', every || '1');
    } else if (mode === 'single') {
      args.push('--single');
    }

    args.push('-o', output);
    return args;
  },

  /**
   * 构建创建PDF参数
   */
  buildCreateArgs(params) {
    const { mode, images, text, pages, output } = params;
    const args = ['create'];

    if (mode === 'images' && images) {
      args.push('--images', ...images);
    } else if (mode === 'text' && text) {
      args.push('--text', text);
    } else if (mode === 'blank' && pages) {
      args.push('--blank', pages);
    }

    args.push('-o', output);
    return args;
  },

  /**
   * 构建OCR参数
   */
  buildOCRArgs(params) {
    const { file, language, pages, searchable, output } = params;
    const args = ['ocr', file, '--lang', language || 'eng'];

    if (pages && pages !== 'all') {
      args.push('--pages', pages);
    }

    if (searchable) {
      args.push('--searchable');
    }

    args.push('-o', output);
    return args;
  },

  /**
   * 上传文件到服务器
   * @param {File} file - 文件对象
   * @param {object} services - 服务对象
   * @returns {Promise<string>} 服务器文件路径
   */
  async uploadFile(file, services) {
    // TODO: 实现文件上传逻辑
    // 这里需要根据实际的文件上传API进行调整
    try {
      // 示例实现
      const formData = new FormData();
      formData.append('file', file);

      // 假设有一个上传API
      // const response = await services.http.post('/api/upload', formData);
      // return response.filePath;

      // 临时返回文件名
      return file.name;
    } catch (error) {
      console.error('文件上传失败:', error);
      throw error;
    }
  },

  /**
   * 批量上传文件
   * @param {File[]} files - 文件数组
   * @param {object} services - 服务对象
   * @returns {Promise<string[]>} 服务器文件路径数组
   */
  async uploadFiles(files, services) {
    const uploadPromises = files.map(file => this.uploadFile(file, services));
    return Promise.all(uploadPromises);
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFApi = PDFApi;
}
