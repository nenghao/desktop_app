// OCR Agent - API调用模块
// 专门处理 OCR 识别相关的 API 调用

const OCRApi = {
  // OCR 配置缓存
  _ocrConfigCache: {
    data: null,
    timestamp: null,
    cacheDuration: 10 * 60 * 1000  // 10 分钟（毫秒）
  },

  /**
   * 执行OCR识别
   * @param {object} params - OCR参数
   * @param {object} context - 上下文对象
   * @returns {Promise<object>} OCR结果
   */
  async executeOCR(params, context) {
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
      const uploadResult = await this.uploadFileForOCR(file, file.name, context);

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

      const ocrResult = await this.performOCR(ocrParams, context);

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
          outputPath = await BaseApi.saveFile(textBytes, output, outputDir, context);
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
   * @param {object} context - 上下文对象
   * @returns {Promise<Object>} OCR结果
   */
  async performOCR(params, context) {
    try {
      console.log("调用后端 OCR 识别接口");

      // 检查是否有 ApiService（支持自动 Token 刷新）
      const apiService = context?.services?.apiService;

      let result;
      if (apiService) {
        // 使用 ApiService（自动处理 Token 刷新）
        console.log('[OCR API] 使用 ApiService 发送请求');
        result = await apiService.post('/toolkit/ocr/recognize', params);
      } else {
        // 降级：使用原生 fetch（无 Token 自动刷新）
        console.warn('[OCR API] ApiService 不可用，降级使用 fetch');

        // 获取token
        const token = BaseApi.getToken(context);
        if (!token) {
          throw new Error('未找到认证token，请先登录');
        }

        // 调用后端 OCR 接口
        const apiBaseUrl = context?.apiConfig?.baseUrl || context?.config?.apiBaseUrl || 'https://api.baizesz.com';
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
   * @param {object} context - 上下文对象
   * @returns {Promise<{success: boolean, fileUrl: string, message: string}>}
   */
  async uploadFileForOCR(file, fileName, context) {
    try {
      console.log('📤 准备上传文件到服务器:', fileName);
      console.log('   文件大小:', (file.size / 1024 / 1024).toFixed(2), 'MB');

      // 检查 context 中是否有文件上传服务
      if (!context || !context.services || !context.services.fileUpload) {
        throw new Error('文件上传服务不可用');
      }

      const fileUploadService = context.services.fileUpload;

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
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.OCRApi = OCRApi;
}
