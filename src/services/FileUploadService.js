/**
 * 文件上传服务
 * 提供统一的文件上传API，供智能体使用
 *
 * 采用预签名URL三步上传流程：
 * 1. 创建上传URL（需要token，支持SHA-256秒传）
 * 2. 使用返回的URL上传文件（如果秒传则跳过）
 * 3. 确认上传完成（如果秒传则跳过）
 *
 * v2.7 更新：
 * - 使用浏览器原生 Web Crypto API 计算 SHA-256
 * - 支持秒传功能（相同SHA-256的文件无需重复上传）
 * - 无需外部依赖库
 */

export class FileUploadService {
  constructor(options = {}) {
    // 基础配置
    this.agentId = options.agentId;
    this.agentData = options.agentData;

    // 服务依赖
    this.notificationCenter = options.notificationCenter || window.notificationCenter;
    this.statusBarManager = options.statusBarManager;
    this.app = options.app || window.app;
    this.eventBus = options.eventBus;

    // 上传配置
    this.baseURL = options.baseURL || '';  // 空字符串，使用相对路径
    this.createUploadURL = '/common/upload/create';  // 移除 /api 前缀
    this.completeUploadURL = '/common/upload/complete';  // 移除 /api 前缀
    this.statusUploadURL = '/common/upload/status';  // 移除 /api 前缀
    this.defaultMaxSize = options.defaultMaxSize || 100 * 1024 * 1024; // 默认100MB
    this.defaultAllowedTypes = options.defaultAllowedTypes || null; // null表示允许所有类型

    // Token获取方法
    this.getToken = options.getToken || (() => {
      // 优先从 UserManager 获取token，传入 options.userManager 实例
      if (options.userManager && options.userManager.getCurrentUser()) {
        return options.userManager.getCurrentUser().access_token;
      }
      return null;
    });

    // 上传状态
    this.activeUploads = new Map(); // 存储正在进行的上传任务
    this.uploadHistory = []; // 上传历史记录

    console.log('📤 FileUploadService 初始化完成:', {
      agentId: this.agentId,
      agentName: this.agentData?.name,
      baseURL: this.baseURL
    });
  }

  /**
   * 选择文件（打开文件选择对话框）
   * @param {Object} options - 选项
   * @param {boolean} options.multiple - 是否允许多选
   * @param {string} options.accept - 接受的文件类型（MIME类型或扩展名）
   * @returns {Promise<File[]>} 选择的文件数组
   */
  async selectFiles(options = {}) {
    return new Promise((resolve, reject) => {
      try {
        // 创建隐藏的文件输入元素
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = options.multiple || false;

        if (options.accept) {
          input.accept = options.accept;
        }

        // 监听文件选择
        input.addEventListener('change', (event) => {
          const files = Array.from(event.target.files || []);

          if (files.length === 0) {
            resolve([]);
          } else {
            console.log('📁 用户选择了文件:', files.map(f => f.name));
            resolve(files);
          }

          // 清理DOM
          input.remove();
        });

        // 监听取消
        input.addEventListener('cancel', () => {
          console.log('❌ 用户取消了文件选择');
          resolve([]);
          input.remove();
        });

        // 触发文件选择
        input.click();

      } catch (error) {
        console.error('❌ 文件选择失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 上传单个文件（三步流程）
   * @param {File} file - 要上传的文件
   * @param {Object} options - 上传选项
   * @param {number} options.maxSize - 最大文件大小（字节）
   * @param {string[]} options.allowedTypes - 允许的MIME类型数组
   * @param {Function} options.onProgress - 进度回调 (percent) => {}
   * @param {string} options.fileType - 文件类型：image, document, video, audio, archive
   * @param {string} options.description - 文件描述
   * @returns {Promise<Object>} 上传结果
   */
  async upload(file, options = {}) {
    let uploadId = null;

    try {
      console.log('📤 开始上传文件:', file.name);

      // 1. 验证文件
      const validation = this.validateFile(file, options);
      if (!validation.valid) {
        throw new Error(validation.error);
      }

      // 2. 创建上传任务
      const uploadTask = {
        id: null, // 将在步骤1后设置
        file: file,
        status: 'creating',
        progress: 0,
        startTime: Date.now(),
        xhr: null
      };

      // 显示上传开始通知
      if (this.notificationCenter) {
        this.notificationCenter.info(`准备上传: ${file.name}`);
      }

      // === 步骤1: 创建上传URL ===
      console.log('📝 步骤1: 创建上传URL...');
      const createResult = await this.createUploadUrl(file, options);

      // 检查是否为秒传（重复文件）
      if (createResult.is_duplicate) {
        console.log('⚡ 文件已存在，秒传成功！');

        // 显示秒传成功通知
        if (this.notificationCenter) {
          this.notificationCenter.success(`秒传成功: ${file.name}`);
        }

        // 发布秒传成功事件
        if (this.eventBus) {
          this.eventBus.emit('file-upload-instant', {
            agentId: this.agentId,
            fileName: file.name,
            fileUrl: createResult.file_url,
            fileInfo: createResult.file_info
          });
        }

        // 返回秒传结果
        return {
          success: true,
          instant: true,  // 标记为秒传
          fileId: createResult.file_id,
          fileName: createResult.file_info.original_filename,
          savedFileName: createResult.file_info.stored_filename,
          fileSize: createResult.file_info.file_size,
          fileType: createResult.file_info.file_type,
          url: createResult.file_url,
          filePath: createResult.file_url,  // 秒传时使用file_url
          uploadTime: createResult.file_info.uploaded_at,
          confirmedTime: createResult.file_info.uploaded_at
        };
      }

      // 正常上传流程
      uploadId = createResult.upload_id;
      uploadTask.id = uploadId;
      uploadTask.createResult = createResult;

      this.activeUploads.set(uploadId, uploadTask);

      // === 步骤2: 上传文件 ===
      console.log('📤 步骤2: 上传文件到预签名URL...');
      uploadTask.status = 'uploading';
      await this.uploadToPresignedUrl(file, createResult, uploadTask, options);

      // === 步骤3: 确认上传完成 ===
      console.log('✅ 步骤3: 确认上传完成...');
      uploadTask.status = 'confirming';
      const completeResult = await this.completeUpload(uploadId);

      // 上传成功
      uploadTask.status = 'completed';
      uploadTask.progress = 100;
      uploadTask.endTime = Date.now();
      uploadTask.result = completeResult;

      // 添加到历史记录
      this.uploadHistory.push({
        uploadId: uploadId,
        fileName: file.name,
        fileSize: file.size,
        status: 'completed',
        startTime: uploadTask.startTime,
        endTime: uploadTask.endTime,
        duration: uploadTask.endTime - uploadTask.startTime,
        result: completeResult
      });

      // 清理活动上传
      this.activeUploads.delete(uploadId);

      // 显示成功通知
      if (this.notificationCenter) {
        this.notificationCenter.success(`上传成功: ${file.name}`);
      }

      // 发布上传成功事件
      if (this.eventBus) {
        this.eventBus.emit('file-upload-success', {
          agentId: this.agentId,
          uploadId: uploadId,
          fileName: file.name,
          result: completeResult
        });
      }

      console.log('✅ 文件上传完成:', completeResult);

      // 返回标准化的结果
      return {
        success: true,
        instant: false,  // 标记为正常上传
        fileId: completeResult.file_id || completeResult.upload_id,
        fileName: completeResult.original_filename,
        savedFileName: completeResult.saved_filename,
        fileSize: completeResult.file_size,
        fileType: completeResult.file_type,
        url: completeResult.file_url,
        filePath: completeResult.file_path,
        uploadTime: completeResult.upload_time,
        confirmedTime: completeResult.confirmed_time,
        sha256Hash: completeResult.sha256_hash  // v2.7 新增：使用SHA-256替代MD5
      };

    } catch (error) {
      console.error('❌ 文件上传失败:', error);

      // 清理活动上传
      if (uploadId) {
        this.activeUploads.delete(uploadId);
      }

      // 添加失败记录到历史
      this.uploadHistory.push({
        uploadId: uploadId || 'unknown',
        fileName: file.name,
        fileSize: file.size,
        status: 'failed',
        startTime: Date.now(),
        error: error.message
      });

      // 显示错误通知
      if (this.notificationCenter) {
        this.notificationCenter.error(`上传失败: ${error.message}`);
      }

      // 发布上传失败事件
      if (this.eventBus) {
        this.eventBus.emit('file-upload-error', {
          agentId: this.agentId,
          fileName: file.name,
          error: error.message
        });
      }

      throw error;
    }
  }

  /**
   * 计算文件SHA-256哈希（使用浏览器原生 Web Crypto API）
   * @private
   */
  async calculateFileSHA256(file) {
    return new Promise((resolve) => {
      try {
        const fileReader = new FileReader();

        fileReader.onload = async (e) => {
          try {
            const arrayBuffer = e.target.result;

            // 使用浏览器原生 Web Crypto API 计算 SHA-256
            const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

            console.log('🔐 文件SHA-256计算完成:', hashHex);
            resolve(hashHex);
          } catch (error) {
            console.warn('⚠️ SHA-256计算失败，跳过秒传功能:', error);
            resolve(null);
          }
        };

        fileReader.onerror = () => {
          console.warn('⚠️ 读取文件失败，跳过哈希计算');
          resolve(null);
        };

        fileReader.readAsArrayBuffer(file);
      } catch (error) {
        console.warn('⚠️ 哈希计算失败，跳过秒传功能:', error);
        resolve(null);
      }
    });
  }

  /**
   * 步骤1: 创建上传URL
   * @private
   */
  async createUploadUrl(file, options) {
    const token = this.getToken();
    if (!token) {
      throw new Error('未找到认证token，请先登录');
    }

    const requestBody = {
      filename: file.name,
      file_size: file.size,
      content_type: file.type,
      description: options.description || `由智能体 ${this.agentData?.name || this.agentId} 上传`
    };

    // 计算文件SHA-256（用于秒传）
    if (options.enableHash !== false) {  // 默认启用哈希秒传
      try {
        const sha256Hash = await this.calculateFileSHA256(file);
        if (sha256Hash) {
          requestBody.sha256_hash = sha256Hash;
          console.log('🔐 文件SHA-256:', sha256Hash);
        }
      } catch (error) {
        console.warn('⚠️ SHA-256计算失败，继续正常上传:', error);
      }
    }

    console.log('📝 创建上传URL请求:', requestBody);

    // 修复：确保 this.baseURL 和 this.createUploadURL 正确组合
    // 确保 baseURL 末尾没有斜杠，createUploadURL 开头有斜杠
    const normalizedBaseURL = this.baseURL.replace(/\/$/, ''); // 移除 baseURL 末尾的斜杠
    const normalizedCreateUploadURL = this.createUploadURL.startsWith('/') ? this.createUploadURL : '/' + this.createUploadURL; // 确保 createUploadURL 开头有斜杠
    const fullCreateUrl = `${normalizedBaseURL}${normalizedCreateUploadURL}`;

    const response = await fetch(fullCreateUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`创建上传URL失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '创建上传URL失败');
    }

    console.log('✅ 上传URL创建成功:', result.data);
    return result.data;
  }

  /**
   * 步骤2: 上传文件到预签名URL
   * @private
   */
  async uploadToPresignedUrl(file, createResult, uploadTask, options) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      uploadTask.xhr = xhr;

      const { upload_url, upload_id, upload_method, headers: uploadHeaders } = createResult;

      // 拼接完整的上传URL：upload_url + "/" + upload_id
      // 修复：确保 upload_url 是完整的URL，如果不是则使用 this.baseURL 作为前缀
      let fullUploadUrl;
      if (upload_url.startsWith('http://') || upload_url.startsWith('https://')) {
        // 如果 upload_url 已经是完整URL，直接使用
        fullUploadUrl = `${upload_url}/${upload_id}`;
      } else {
        // 如果 upload_url 是相对路径，则使用 this.baseURL 作为前缀
        // 确保 baseURL 末尾没有斜杠，upload_url 开头有斜杠
        const normalizedBaseURL = this.baseURL.replace(/\/$/, ''); // 移除 baseURL 末尾的斜杠
        const normalizedUploadUrl = upload_url.startsWith('/') ? upload_url : '/' + upload_url; // 确保 upload_url 开头有斜杠
        fullUploadUrl = `${normalizedBaseURL}${normalizedUploadUrl}/${upload_id}`;
      }

      // 处理后端返回的 0.0.0.0 或 127.0.0.1 地址
      // 在 Electron 生产环境下，需要将 0.0.0.0 替换为实际的 API 地址
      fullUploadUrl = this.normalizeUploadUrl(fullUploadUrl);

      console.log('📤 上传URL:', fullUploadUrl);

      // 上传进度
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          uploadTask.progress = percent;

          // 调用进度回调
          if (options.onProgress) {
            options.onProgress(percent);
          }

          // 更新状态栏
          if (this.statusBarManager) {
            this.statusBarManager.updateStatusOnly('uploading', `上传中: ${percent}%`);
          }

          console.log(`📊 上传进度: ${percent}%`);
        }
      });

      // 上传完成
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = xhr.responseText ? JSON.parse(xhr.responseText) : { success: true };

            // 更新状态栏
            if (this.statusBarManager) {
              this.statusBarManager.updateStatusOnly('ready', '文件已上传');
            }

            console.log('✅ 文件上传到服务器成功');
            resolve(response);
          } catch (error) {
            // 某些云存储可能不返回JSON
            console.log('✅ 文件上传到服务器成功（无JSON响应）');
            resolve({ success: true });
          }
        } else {
          reject(new Error(`上传失败: HTTP ${xhr.status}`));
        }
      });

      // 上传错误
      xhr.addEventListener('error', () => {
        reject(new Error('网络错误'));
      });

      // 上传中止
      xhr.addEventListener('abort', () => {
        reject(new Error('上传已取消'));
      });

      // 本地存储：使用 multipart/form-data
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_token', uploadHeaders['X-Upload-Token']);

      xhr.open(upload_method || 'POST', fullUploadUrl);
      xhr.setRequestHeader('X-Upload-Token', uploadHeaders['X-Upload-Token']);
      xhr.send(formData);
    });
  }

  /**
   * 步骤3: 确认上传完成
   * @private
   */
  async completeUpload(uploadId, checksum = null) {
    const requestBody = {
      upload_id: uploadId
    };

    // 可选：添加文件校验和
    if (checksum) {
      requestBody.checksum = checksum;
    }

    console.log('✅ 确认上传完成请求:', requestBody);

    // 修复：确保 this.baseURL 和 this.completeUploadURL 正确组合
    // 确保 baseURL 末尾没有斜杠，completeUploadURL 开头有斜杠
    const normalizedBaseURL = this.baseURL.replace(/\/$/, ''); // 移除 baseURL 末尾的斜杠
    const normalizedCompleteUploadURL = this.completeUploadURL.startsWith('/') ? this.completeUploadURL : '/' + this.completeUploadURL; // 确保 completeUploadURL 开头有斜杠

    const fullCompleteUrl = `${normalizedBaseURL}${normalizedCompleteUploadURL}`;
    console.log('📝 完整的确认上传URL:', fullCompleteUrl);

    const response = await fetch(fullCompleteUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`确认上传失败: ${response.status} ${errorText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.message || '确认上传失败');
    }

    console.log('✅ 上传确认成功:', result.data);
    return result.data;
  }

  /**
   * 规范化上传URL，处理 0.0.0.0 和 127.0.0.1 地址
   * @private
   */
  normalizeUploadUrl(url) {
    try {
      // 如果不是完整URL，直接返回（相对路径）
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        return url;
      }

      const urlObj = new URL(url);

      // 如果是 0.0.0.0 或 127.0.0.1，需要替换
      if (urlObj.hostname === '0.0.0.0' || urlObj.hostname === '127.0.0.1') {
        // 检测环境
        const isElectronEnv = typeof window !== 'undefined' &&
          (window.process?.type === 'renderer' ||
            navigator.userAgent.toLowerCase().includes('electron'));

        const isDev = typeof window !== 'undefined' &&
          window.electronAPI &&
          typeof window.electronAPI.isDev === 'boolean' ?
          window.electronAPI.isDev :
          import.meta.env.DEV;

        // Electron 生产环境：替换为线上地址
        if (isElectronEnv && !isDev) {
          urlObj.hostname = 'api.baizesz.com';
          urlObj.protocol = 'https:';
          console.log('🔄 [Electron 生产] 替换上传URL:', urlObj.toString());
          return urlObj.toString();
        }

        // Electron 开发环境：替换为开发服务器地址
        if (isElectronEnv && isDev) {
          urlObj.hostname = '192.168.0.103';
          console.log('🔄 [Electron 开发] 替换上传URL:', urlObj.toString());
          return urlObj.toString();
        }

        // Web 开发环境：转换为相对路径，让 Vite 代理处理
        if (!isElectronEnv && isDev) {
          // 提取路径部分（去掉 hostname 和 port）
          const pathWithQuery = urlObj.pathname + urlObj.search;
          console.log('🔄 [Web 开发] 转换为相对路径:', pathWithQuery);
          return pathWithQuery;
        }

        // Web 生产环境：替换为线上地址
        if (!isElectronEnv && !isDev) {
          urlObj.hostname = 'api.baizesz.com';
          urlObj.protocol = 'https:';
          console.log('🔄 [Web 生产] 替换上传URL:', urlObj.toString());
          return urlObj.toString();
        }
      }

      // 其他情况直接返回
      return url;
    } catch (error) {
      console.warn('⚠️ URL规范化失败，使用原始URL:', error);
      return url;
    }
  }


  /**
   * 验证文件
   * @private
   */
  validateFile(file, options = {}) {
    // 检查文件大小
    const maxSize = options.maxSize || this.defaultMaxSize;
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件大小超过限制 (最大: ${this.formatFileSize(maxSize)})`
      };
    }

    // 检查文件类型
    const allowedTypes = options.allowedTypes || this.defaultAllowedTypes;
    if (allowedTypes && allowedTypes.length > 0) {
      const isAllowed = allowedTypes.some(type => {
        // 支持通配符，如 "image/*"
        if (type.endsWith('/*')) {
          const prefix = type.slice(0, -2);
          return file.type.startsWith(prefix);
        }
        return file.type === type;
      });

      if (!isAllowed) {
        return {
          valid: false,
          error: `不支持的文件类型: ${file.type}`
        };
      }
    }

    return { valid: true };
  }

  /**
   * 上传多个文件
   * @param {File[]} files - 文件数组
   * @param {Object} options - 上传选项
   * @returns {Promise<Object[]>} 上传结果数组
   */
  async uploadMultiple(files, options = {}) {
    console.log(`📤 开始批量上传 ${files.length} 个文件`);

    const results = [];
    const errors = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      try {
        const result = await this.upload(file, {
          ...options,
          onProgress: (percent) => {
            // 批量上传的进度回调
            if (options.onProgress) {
              const totalPercent = Math.round(((i + percent / 100) / files.length) * 100);
              options.onProgress(totalPercent, i, files.length);
            }
          }
        });

        results.push({ file: file.name, success: true, result });

      } catch (error) {
        console.error(`❌ 文件上传失败: ${file.name}`, error);
        errors.push({ file: file.name, success: false, error: error.message });
      }
    }

    console.log(`✅ 批量上传完成: 成功 ${results.length}, 失败 ${errors.length}`);

    return {
      success: results,
      errors: errors,
      total: files.length
    };
  }

  /**
   * 取消上传
   * @param {string} uploadId - 上传ID
   */
  cancelUpload(uploadId) {
    const uploadTask = this.activeUploads.get(uploadId);

    if (uploadTask && uploadTask.xhr) {
      uploadTask.xhr.abort();
      uploadTask.status = 'cancelled';
      this.activeUploads.delete(uploadId);

      console.log('🚫 上传已取消:', uploadId);

      if (this.notificationCenter) {
        this.notificationCenter.warning('上传已取消');
      }

      return true;
    }

    return false;
  }

  /**
   * 获取活动上传列表
   */
  getActiveUploads() {
    return Array.from(this.activeUploads.values()).map(task => ({
      id: task.id,
      fileName: task.file.name,
      fileSize: task.file.size,
      status: task.status,
      progress: task.progress,
      startTime: task.startTime
    }));
  }

  /**
   * 获取上传历史
   */
  getUploadHistory() {
    return this.uploadHistory.map(task => ({
      id: task.id,
      fileName: task.file.name,
      fileSize: task.file.size,
      status: task.status,
      startTime: task.startTime,
      endTime: task.endTime,
      duration: task.endTime - task.startTime
    }));
  }

  /**
   * 格式化文件大小
   * @private
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * 清理服务（销毁时调用）
   */
  destroy() {
    // 取消所有活动上传
    this.activeUploads.forEach((_task, uploadId) => {
      this.cancelUpload(uploadId);
    });

    this.activeUploads.clear();
    this.uploadHistory = [];

    console.log('🧹 FileUploadService 已清理');
  }
}

