(function() {
  'use strict';


// ==================== shared/utils/helpers.js ====================
// PDF工具 - 工具函数模块
// 提供通用的辅助功能

const PDFHelpers = {
  /**
   * 格式化文件大小
   * @param {number} bytes - 字节数
   * @returns {string} 格式化后的文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  },

  /**
   * HTML转义
   * @param {string} text - 需要转义的文本
   * @returns {string} 转义后的文本
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  /**
   * 生成时间戳文件名
   * @param {string[]} fileNames - 文件名数组
   * @param {string} extension - 文件扩展名
   * @returns {string} 生成的文件名
   */
  generateOutputFileName(fileNames, extension) {
    // 提取文件名（去除扩展名）
    const names = fileNames.map(name => {
      const lastDot = name.lastIndexOf('.');
      return lastDot > 0 ? name.substring(0, lastDot) : name;
    });

    // 拼接文件名
    let combinedName = names.join('+');

    // 添加时间戳
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];

    // 限制文件名长度（Windows文件名限制为255字符）
    const maxLength = 200; // 留出空间给时间戳和扩展名
    if (combinedName.length > maxLength) {
      combinedName = combinedName.substring(0, maxLength);
    }

    return `${combinedName}_${timestamp}.${extension}`;
  },

  /**
   * 格式化日期时间
   * @param {Date} date - 日期对象
   * @returns {string} 格式化后的日期时间
   */
  formatDateTime(date) {
    return date.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  },

  /**
   * 动态加载脚本
   * @param {string} url - 脚本URL
   * @returns {Promise} 加载Promise
   */
  loadScript(url) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  },

  /**
   * 获取临时目录路径（包含 questech 子目录）
   * @returns {Promise<string>} 临时目录路径
   */
  async getTempDir() {
    // 获取系统临时目录
    const tmpdir = window.osAPI.tmpdir();
    const baseTmpDir = await tmpdir;

    // 在临时目录下创建 questech 子目录
    const questechTempDir = `${baseTmpDir}/questech`;

    try {
      await window.fileAPI.ensureDir(questechTempDir);
      return questechTempDir;
    } catch (error) {
      console.warn('创建 questech 子目录失败，使用基础临时目录:', error);
      return baseTmpDir;
    }
  }
};




// ==================== shared/utils/imageConverter.js ====================
// PDF工具 - 图片格式转换模块
// 支持 HEIC、TIFF、BMP 等格式转换为 PNG/JPEG

const ImageConverter = {
  /**
   * 库加载状态
   */
  librariesLoaded: {
    utif: false,
    heic2any: false
  },

  /**
   * 动态加载 UTIF.js（用于 TIFF 转换）
   */
  async loadUTIF() {
    if (this.librariesLoaded.utif) {
      return;
    }

    if (typeof UTIF !== 'undefined') {
      this.librariesLoaded.utif = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/utif@3.1.0/UTIF.js';
      script.onload = () => {
        console.log('✅ UTIF.js 已加载');
        this.librariesLoaded.utif = true;
        resolve();
      };
      script.onerror = () => {
        console.error('❌ UTIF.js 加载失败');
        reject(new Error('无法加载 UTIF.js'));
      };
      document.head.appendChild(script);
    });
  },

  /**
   * 动态加载 heic2any（用于 HEIC 转换）
   */
  async loadHeic2any() {
    if (this.librariesLoaded.heic2any) {
      return;
    }

    if (typeof heic2any !== 'undefined') {
      this.librariesLoaded.heic2any = true;
      return;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js';
      script.onload = () => {
        console.log('✅ heic2any 已加载');
        this.librariesLoaded.heic2any = true;
        resolve();
      };
      script.onerror = () => {
        console.error('❌ heic2any 加载失败');
        reject(new Error('无法加载 heic2any'));
      };
      document.head.appendChild(script);
    });
  },

  /**
   * 检测图片格式
   * @param {File|Blob} file - 图片文件
   * @returns {string} 图片格式：'png', 'jpeg', 'bmp', 'tiff', 'heic', 'unknown'
   */
  detectImageFormat(file) {
    const fileName = file.name || '';
    const extension = fileName.split('.').pop().toLowerCase();
    const mimeType = file.type.toLowerCase();

    // 通过 MIME 类型检测
    if (mimeType.includes('png')) return 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpeg';
    if (mimeType.includes('bmp')) return 'bmp';
    if (mimeType.includes('tiff') || mimeType.includes('tif')) return 'tiff';
    if (mimeType.includes('heic') || mimeType.includes('heif')) return 'heic';

    // 通过文件扩展名检测
    if (extension === 'png') return 'png';
    if (extension === 'jpg' || extension === 'jpeg') return 'jpeg';
    if (extension === 'bmp') return 'bmp';
    if (extension === 'tif' || extension === 'tiff') return 'tiff';
    if (extension === 'heic' || extension === 'heif') return 'heic';

    return 'unknown';
  },

  /**
   * 转换图片为 PNG/JPEG 格式
   * @param {File|Blob} file - 原始图片文件
   * @returns {Promise<{blob: Blob, format: string}>} 转换后的图片 Blob 和格式
   */
  async convertImage(file) {
    const format = this.detectImageFormat(file);
    console.log('🔍 检测到图片格式:', format);

    try {
      switch (format) {
        case 'png':
        case 'jpeg':
          // PNG 和 JPEG 不需要转换，直接返回
          return { blob: file, format };

        case 'bmp':
          return await this.convertBMP(file);

        case 'tiff':
          return await this.convertTIFF(file);

        case 'heic':
          return await this.convertHEIC(file);

        default:
          throw new Error(`不支持的图片格式: ${format}`);
      }
    } catch (error) {
      console.error('图片转换失败:', error);
      throw new Error(`图片转换失败 (${format}): ${error.message}`);
    }
  },

  /**
   * 转换 BMP 为 PNG（使用 Canvas API）
   * @param {File|Blob} file - BMP 文件
   * @returns {Promise<{blob: Blob, format: string}>}
   */
  async convertBMP(file) {
    console.log('🔄 开始转换 BMP...');

    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);

      img.onload = () => {
        try {
          // 创建 Canvas
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          // 转换为 PNG Blob
          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              console.log('✅ BMP 转换为 PNG 成功');
              resolve({ blob, format: 'png' });
            } else {
              reject(new Error('Canvas toBlob 失败'));
            }
          }, 'image/png');
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法加载 BMP 图片'));
      };

      img.src = url;
    });
  },

  /**
   * 转换 TIFF 为 PNG（使用 UTIF.js）
   * @param {File|Blob} file - TIFF 文件
   * @returns {Promise<{blob: Blob, format: string}>}
   */
  async convertTIFF(file) {
    console.log('🔄 开始转换 TIFF...');

    // 加载 UTIF.js
    await this.loadUTIF();

    const arrayBuffer = await file.arrayBuffer();
    const ifds = UTIF.decode(arrayBuffer);

    if (!ifds || ifds.length === 0) {
      throw new Error('无法解码 TIFF 文件');
    }

    // 只转换第一页
    const ifd = ifds[0];
    UTIF.decodeImage(arrayBuffer, ifd);

    const rgba = UTIF.toRGBA8(ifd);

    // 创建 Canvas 并绘制
    const canvas = document.createElement('canvas');
    canvas.width = ifd.width;
    canvas.height = ifd.height;

    const ctx = canvas.getContext('2d');
    const imageData = ctx.createImageData(ifd.width, ifd.height);
    imageData.data.set(rgba);
    ctx.putImageData(imageData, 0, 0);

    // 转换为 PNG Blob
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          console.log('✅ TIFF 转换为 PNG 成功');
          resolve({ blob, format: 'png' });
        } else {
          reject(new Error('Canvas toBlob 失败'));
        }
      }, 'image/png');
    });
  },

  /**
   * 转换 HEIC 为 PNG（使用 heic2any）
   * @param {File|Blob} file - HEIC 文件
   * @returns {Promise<{blob: Blob, format: string}>}
   */
  async convertHEIC(file) {
    console.log('🔄 开始转换 HEIC...');

    // 加载 heic2any
    await this.loadHeic2any();

    if (typeof heic2any === 'undefined') {
      throw new Error('heic2any 库未加载');
    }

    try {
      // heic2any 返回 Blob 或 Blob[]
      const result = await heic2any({
        blob: file,
        toType: 'image/png',
        quality: 0.9
      });

      // 处理返回结果（可能是单个 Blob 或数组）
      const blob = Array.isArray(result) ? result[0] : result;

      console.log('✅ HEIC 转换为 PNG 成功');
      return { blob, format: 'png' };
    } catch (error) {
      // 检查是否是 CSP 相关错误
      const errorMsg = error.message || String(error);
      if (errorMsg.includes('worker') || errorMsg.includes('CSP') || errorMsg.includes('Content Security Policy')) {
        throw new Error('HEIC 转换失败：浏览器安全策略限制。请在 CSP 中添加 "worker-src \'self\' blob:" 或联系开发者');
      }
      throw new Error(`heic2any 转换失败: ${error.message}`);
    }
  },

  /**
   * 转换图片为 ArrayBuffer（用于 PDFLib）
   * @param {File|Blob} file - 图片文件
   * @returns {Promise<ArrayBuffer>} 转换后的图片 ArrayBuffer
   */
  async convertToArrayBuffer(file) {
    const { blob } = await this.convertImage(file);
    return await blob.arrayBuffer();
  },

  /**
   * 批量转换图片
   * @param {File[]} files - 图片文件数组
   * @returns {Promise<Array<{blob: Blob, format: string, originalFile: File}>>}
   */
  async convertMultipleImages(files) {
    const results = [];

    for (const file of files) {
      try {
        const result = await this.convertImage(file);
        results.push({
          ...result,
          originalFile: file
        });
      } catch (error) {
        console.error(`转换失败 (${file.name}):`, error);
        // 继续处理其他文件
        results.push({
          blob: null,
          format: 'error',
          originalFile: file,
          error: error.message
        });
      }
    }

    return results;
  },

  /**
   * 统一转换图片为 JPEG 格式
   * @param {File|Blob} file - 图片文件
   * @param {number} quality - JPEG 质量 (0-1)，默认 0.9
   * @returns {Promise<{blob: Blob, format: string}>}
   */
  async convertToJPEG(file, quality = 0.9) {
    console.log('🔄 转换图片为 JPEG 格式...');

    const format = this.detectImageFormat(file);

    // 如果已经是 JPEG，直接返回
    if (format === 'jpeg') {
      console.log('✅ 图片已经是 JPEG 格式');
      return { blob: file, format: 'jpeg' };
    }

    // 先转换为支持的格式（PNG）
    let imageBlob = file;
    if (format === 'heic' || format === 'tiff' || format === 'bmp') {
      const convertResult = await this.convertImage(file);
      imageBlob = convertResult.blob;
    }

    // 使用 Canvas 转换为 JPEG
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(imageBlob);

      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0);

          canvas.toBlob((blob) => {
            URL.revokeObjectURL(url);
            if (blob) {
              console.log(`✅ 图片已转换为 JPEG (质量: ${quality})`);
              resolve({ blob, format: 'jpeg' });
            } else {
              reject(new Error('Canvas toBlob 失败'));
            }
          }, 'image/jpeg', quality);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('无法加载图片'));
      };

      img.src = url;
    });
  },

  /**
   * 压缩图片到指定大小
   * @param {File|Blob} file - 图片文件
   * @param {number} maxSizeMB - 最大文件大小（MB），默认 5MB
   * @param {number} targetSizeMB - 目标压缩大小（MB），默认 4.5MB
   * @returns {Promise<{blob: Blob, originalSize: number, compressedSize: number, compressed: boolean}>}
   */
  async compressImage(file, maxSizeMB = 5, targetSizeMB = 4.5) {
    const originalSize = file.size;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    const targetSizeBytes = targetSizeMB * 1024 * 1024;

    console.log(`📊 原始文件大小: ${(originalSize / 1024 / 1024).toFixed(2)} MB`);

    // 如果文件小于最大限制，不需要压缩
    if (originalSize <= maxSizeBytes) {
      console.log('✅ 文件大小符合要求，无需压缩');
      return {
        blob: file,
        originalSize,
        compressedSize: originalSize,
        compressed: false
      };
    }

    console.log(`🔄 文件超过 ${maxSizeMB}MB，开始压缩...`);

    // 先转换为 JPEG（如果不是的话）
    let currentBlob = file;
    const format = this.detectImageFormat(file);
    if (format !== 'jpeg') {
      const jpegResult = await this.convertToJPEG(file, 0.9);
      currentBlob = jpegResult.blob;
      console.log(`📊 转换为 JPEG 后大小: ${(currentBlob.size / 1024 / 1024).toFixed(2)} MB`);

      // 转换后可能已经满足要求
      if (currentBlob.size <= targetSizeBytes) {
        console.log('✅ 转换为 JPEG 后已满足大小要求');
        return {
          blob: currentBlob,
          originalSize,
          compressedSize: currentBlob.size,
          compressed: true
        };
      }
    }

    // 二分法查找合适的质量参数
    let quality = 0.9;
    let minQuality = 0.1;
    let maxQuality = 0.9;
    let attempts = 0;
    const maxAttempts = 8;

    while (attempts < maxAttempts) {
      const compressed = await this.convertToJPEG(file, quality);
      const currentSize = compressed.blob.size;

      console.log(`🔍 尝试 ${attempts + 1}/${maxAttempts}: 质量=${quality.toFixed(2)}, 大小=${(currentSize / 1024 / 1024).toFixed(2)} MB`);

      if (currentSize <= targetSizeBytes) {
        // 找到合适的大小
        console.log(`✅ 压缩完成: ${(originalSize / 1024 / 1024).toFixed(2)} MB → ${(currentSize / 1024 / 1024).toFixed(2)} MB`);
        return {
          blob: compressed.blob,
          originalSize,
          compressedSize: currentSize,
          compressed: true
        };
      }

      // 调整质量参数
      if (currentSize > targetSizeBytes) {
        maxQuality = quality;
        quality = (minQuality + quality) / 2;
      } else {
        minQuality = quality;
        quality = (quality + maxQuality) / 2;
      }

      attempts++;
    }

    // 达到最大尝试次数，返回最后一次压缩结果
    const finalResult = await this.convertToJPEG(file, quality);
    console.log(`⚠️ 已达最大压缩尝试次数，最终大小: ${(finalResult.blob.size / 1024 / 1024).toFixed(2)} MB`);

    return {
      blob: finalResult.blob,
      originalSize,
      compressedSize: finalResult.blob.size,
      compressed: true
    };
  },

  /**
   * 为 OCR 处理图片：统一转换为 JPEG 并压缩
   * @param {File|Blob} file - 图片文件
   * @returns {Promise<{blob: Blob, fileName: string, originalSize: number, finalSize: number, compressed: boolean}>}
   */
  async prepareImageForOCR(file) {
    console.log(`🔧 准备 OCR 图片: ${file.name}`);

    try {
      // 1. 统一转换为 JPEG
      const jpegResult = await this.convertToJPEG(file, 0.9);
      
      // 2. 压缩到 5MB 以下
      const compressResult = await this.compressImage(jpegResult.blob, 5, 4.5);

      // 3. 生成新文件名
      const originalName = file.name.replace(/\.[^/.]+$/, '');
      const fileName = `${originalName}.jpg`;

      console.log(`✅ OCR 图片准备完成: ${fileName}`);
      console.log(`   原始大小: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   最终大小: ${(compressResult.compressedSize / 1024 / 1024).toFixed(2)} MB`);

      return {
        blob: compressResult.blob,
        fileName,
        originalSize: file.size,
        finalSize: compressResult.compressedSize,
        compressed: compressResult.compressed || jpegResult.format !== 'jpeg'
      };
    } catch (error) {
      console.error(`❌ OCR 图片准备失败 (${file.name}):`, error);
      throw new Error(`图片处理失败 (${file.name}): ${error.message}`);
    }
  }
};

// 导出到全局（开发模式使用）
if (typeof window !== 'undefined') {
  window.ImageConverter = ImageConverter;
}


// ==================== shared/ui/file-list.js ====================
// PDF工具 - 文件列表组件模块
// 负责文件列表的渲染和管理

const PDFFileList = {
  /**
   * 处理文件选择事件
   * @param {Event} event - 文件选择事件
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  handleFileSelection(event, toolName, listId, selectedFiles, container) {
    const files = event.target.files;
    const listContainer = container.querySelector(`#${listId}`);

    if (!listContainer || files.length === 0) {
      return;
    }

    // 初始化文件列表
    if (!selectedFiles[toolName]) {
      selectedFiles[toolName] = [];
    }

    // 添加新文件到列表（不清空之前的）
    Array.from(files).forEach(file => {
      // 检查是否已存在同名文件
      const exists = selectedFiles[toolName].some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFiles[toolName].push(file);
      }
    });

    // 清空文件输入框，以便可以再次选择相同文件
    event.target.value = '';

    // 渲染文件列表
    this.renderFileList(toolName, listId, selectedFiles, container);
  },

  /**
   * 渲染文件列表
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  renderFileList(toolName, listId, selectedFiles, container) {
    const listContainer = container.querySelector(`#${listId}`);
    if (!listContainer) return;

    const files = selectedFiles[toolName] || [];

    if (files.length === 0) {
      listContainer.innerHTML = '<div class="pdf-file-list-empty">未选择文件</div>';
      return;
    }

    const fileListHTML = files.map((file, index) => `
      <div class="pdf-file-item" data-index="${index}">
        <span class="pdf-file-icon">📄</span>
        <span class="pdf-file-name">${this.escapeHtml(file.name)}</span>
        <span class="pdf-file-size">(${PDFHelpers.formatFileSize(file.size)})</span>
        <button type="button" class="pdf-file-remove" data-tool="${toolName}" data-index="${index}" title="删除">✕</button>
      </div>
    `).join('');

    listContainer.innerHTML = fileListHTML;

    // 绑定删除按钮事件
    listContainer.querySelectorAll('.pdf-file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.target.dataset.tool;
        const index = parseInt(e.target.dataset.index);
        this.removeFile(tool, index, listId, selectedFiles, container);
      });
    });
  },

  /**
   * 删除单个文件
   * @param {string} toolName - 工具名称
   * @param {number} index - 文件索引
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  removeFile(toolName, index, listId, selectedFiles, container) {
    if (selectedFiles[toolName]) {
      selectedFiles[toolName].splice(index, 1);
      this.renderFileList(toolName, listId, selectedFiles, container);
    }
  },

  /**
   * 清空文件列表
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  clearFileList(toolName, listId, selectedFiles, container) {
    selectedFiles[toolName] = [];
    this.renderFileList(toolName, listId, selectedFiles, container);
  },

  /**
   * HTML转义（使用helpers中的函数）
   */
  escapeHtml(text) {
    return PDFHelpers.escapeHtml(text);
  }
};




// ==================== shared/ui/preview.js ====================
// PDF工具 - PDF预览组件模块
// 负责在pdf-result区域显示PDF预览

const PDFPreview = {
  /**
   * 生成通用的操作结果详情HTML
   * @param {object} result - 操作结果信息
   * @param {string} pdfPath - PDF文件路径（如果有）
   * @returns {string} HTML字符串
   */
  getResultDetailsHTML(result, pdfPath = null) {
    let html = '';

    // 1. 源文件
    if (result.files && result.files.length > 0) {
      html += `<div><strong>源文件:</strong>${result.files.join(', ')}</div>`;
    } else if (result.file) {
      html += `<div><strong>源文件:</strong>${PDFHelpers.escapeHtml(result.file)}</div>`;
    }

    // 2. 模式（create的mode、split的mode、ocr的language统一显示为模式）
    if (result.mode) {
      const modeLabels = {
        'images': '从图片创建',
        'text': '从文本创建',
        'blank': '空白PDF',
        'pages': '按页面范围',
        'every': '每N页拆分',
        'single': '每页单独拆分'
      };
      html += `<div><strong>模式:</strong>${modeLabels[result.mode] || result.mode}</div>`;
    } else if (result.language) {
      // OCR的语言也显示为"模式"
      html += `<div><strong>模式:</strong>${PDFHelpers.escapeHtml(result.language)}</div>`;
    }

    // 额外的OCR统计信息
    if (result.pageCount) {
      html += `<div><strong>页数:</strong>${result.recognizedPages || 0}/${result.pageCount}</div>`;
    }
    if (result.confidence) {
      html += `<div><strong>识别度:</strong>${(result.confidence * 100).toFixed(1)}%</div>`;
    }

    // 3. 输出（实际文件路径，可点击打开）
    if (pdfPath) {
      html += `<div><strong>输出:</strong><code class="pdf-path-code pdf-path-clickable" title="点击打开">${PDFHelpers.escapeHtml(pdfPath)}</code></div>`;
    } else if (result.output) {
      html += `<div><strong>输出:</strong><span class="pdf-output-text">${PDFHelpers.escapeHtml(result.output)}</span></div>`;
    }

    // 4. 识别文本（仅OCR有此项）
    if (result.textContent) {
      html += `
        <div class="pdf-text-content-container">
          <div class="pdf-text-content-label"><strong>识别文本:</strong></div>
          <div class="pdf-text-content">${PDFHelpers.escapeHtml(result.textContent)}</div>
        </div>
      `;
    }

    return html;
  },

  /**
   * 在结果区域显示PDF预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} container - 容器元素
   * @param {object} result - 操作结果信息
   */
  showPreview(pdfPath, container, result, pdfBytes) {
    const resultContainer = container.querySelector('#pdf-result');
    if (!resultContainer) return;

    const operationNames = {
      merge: '合并PDF',
      split: '拆分PDF',
      create: '创建PDF',
      ocr: 'OCR识别'
    };

    // Determine success/failure state
    const isSuccess = result.success !== false;
    const titleText = isSuccess ? `${operationNames[result.operation] || '操作'}成功` : `${operationNames[result.operation] || '操作'}失败`;

    // Get icon HTML from IconUtils if available, fallback to simple emoji
    const getIconHtml = (name, size = 24) => {
      try {
        if (typeof window !== 'undefined' && window.IconUtils && typeof window.IconUtils.getIcon === 'function') {
          return window.IconUtils.getIcon(name, { size, strokeWidth: 1.5 });
        }
      } catch (e) {
        // ignore and fallback
      }
      return isSuccess ? '📄' : '⚠️';
    };

    const iconHtml = getIconHtml(isSuccess ? 'file-down' : 'flag', 28);

    // 检查是否为 OCR 结果且有文本内容
    const isOCRResult = result.operation === 'ocr';
    const hasTextContent = isOCRResult && result.textContent;
    // searchable=true 且有 searchablePdfUrl 为可搜索PDF模式
    const hasSearchablePDF = isOCRResult && result.searchable && result.searchablePdfUrl;

    resultContainer.innerHTML = `
      <div class="pdf-result-header">
        <div class="pdf-result-header-left">
          <div class="pdf-result-icon">${iconHtml}</div>
          <div class="pdf-result-info">
            <div class="pdf-result-title">${PDFHelpers.escapeHtml(titleText)}</div>
          </div>
        </div>
        <div class="pdf-result-header-right">
          ${hasTextContent ? (
            hasSearchablePDF ? `
              <button id="pdf-preview-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">预览</button>
              <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
            ` : `
              <button id="pdf-copy-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">复制</button>
              <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
            `
          ) : `
            <button id="pdf-preview-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">预览</button>
            <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
          `}
        </div>
      </div>

      ${isSuccess ? `
        <div class="pdf-result-success">
          <div class="pdf-result-details">
            ${this.getResultDetailsHTML(result, pdfPath)}
          </div>
        </div>
      ` : `
        <div class="pdf-result-error">
          <div class="pdf-result-details">
            <div><strong>原因：</strong>${PDFHelpers.escapeHtml(result.message || '未知错误')}</div>
            ${result.errorDetail ? `<div><strong>详细：</strong>${PDFHelpers.escapeHtml(result.errorDetail)}</div>` : ''}
          </div>
        </div>
      `}
    `;

    // 复制 pdfBytes 以避免 ArrayBuffer detached 问题
    let pdfBytesCopy = null;
    if (pdfBytes) {
      pdfBytesCopy = new Uint8Array(pdfBytes);
    }

    // 保存已下载文件路径（用于点击输出路径）
    let savedFilePath = pdfPath;

    // 绑定按钮事件
    const copyBtn = resultContainer.querySelector('#pdf-copy-btn');
    const previewBtn = resultContainer.querySelector('#pdf-preview-btn');
    const downloadBtn = resultContainer.querySelector('#pdf-download-btn');

    // 复制按钮（OCR 纯文本模式）
    if (copyBtn && hasTextContent) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.textContent);
          copyBtn.textContent = '✓ 已复制';
          setTimeout(() => {
            copyBtn.textContent = '复制';
          }, 2000);
        } catch (error) {
          console.error('复制失败:', error);
          alert('复制失败: ' + error.message);
        }
      });
    }

    // 预览按钮
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (isOCRResult && hasSearchablePDF && result.searchablePdfUrl) {
          // OCR 可搜索PDF：打开URL
          window.open(result.searchablePdfUrl, '_blank');
        } else if (pdfBytesCopy) {
          // 本地PDF：显示预览弹窗
          const freshCopy = new Uint8Array(pdfBytesCopy);
          this.showPreviewModal(freshCopy, result.output, container);
        } else if (pdfPath) {
          this.showPreviewModal(null, result.output, container, pdfPath);
        }
      });
    }

    // 下载/保存按钮
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        if (isOCRResult && hasTextContent) {
          if (hasSearchablePDF && result.searchablePdfUrl) {
            // OCR 可搜索PDF：下载URL指向的PDF
            try {
              const response = await fetch(result.searchablePdfUrl);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const originalFileName = result.file ? result.file.replace(/\.[^.]+$/, '') : 'output';
              const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0].slice(0, 12);
              a.download = `${originalFileName}_searchable_${timestamp}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('下载PDF失败:', error);
              alert('下载PDF失败: ' + error.message);
            }
          } else {
            // OCR 纯文本：保存TXT文件
            const originalFileName = result.file ? result.file.replace(/\.[^.]+$/, '') : 'output';
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0].slice(0, 12);
            const fileName = `${originalFileName}_ocr_${timestamp}.txt`;
            const filePath = await this.downloadTextFile(result.textContent, fileName);
            if (filePath) {
              savedFilePath = filePath;
            }
          }
        } else {
          // 其他操作：下载本地PDF文件
          this.downloadFile(pdfPath, result.output, pdfBytesCopy);
        }
      });
    }

    // Clickable output path
    const pathElement = resultContainer.querySelector('.pdf-path-clickable');
    if (pathElement) {
      pathElement.addEventListener('click', () => {
        if (isOCRResult && hasSearchablePDF && result.searchablePdfUrl) {
          window.open(result.searchablePdfUrl, '_blank');
        } else if (savedFilePath) {
          this.openFile(savedFilePath);
        } else if (pdfPath) {
          this.openFile(pdfPath);
        } else {
          alert('请先保存文件');
        }
      });
    }
  },

  /**
   * 显示预览弹窗
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {string} fileName - 文件名
   * @param {HTMLElement} container - 容器元素
   * @param {string} pdfPath - PDF文件路径（可选）
   */
  showPreviewModal(pdfBytes, fileName, container, pdfPath = null) {
    // 查找或创建弹窗容器 - 使用更健壮的查找方式
    let workspace = container.querySelector('.pdf-tools-workspace');
    if (!workspace) {
      workspace = container.closest('.pdf-tools-workspace');
    }
    if (!workspace) {
      // 如果还找不到，说明container本身可能就是workspace的父容器
      workspace = container;
    }

    let modal = workspace.querySelector('.pdf-preview-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'pdf-preview-modal';
      workspace.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="pdf-preview-modal-overlay"></div>
      <div class="pdf-preview-modal-content">
        <div class="pdf-preview-modal-header">
          <div class="pdf-preview-modal-title">
            <span class="pdf-preview-modal-icon">📄</span>
            <span>${PDFHelpers.escapeHtml(fileName)}</span>
          </div>
          <button class="pdf-preview-modal-close" title="关闭">✕</button>
        </div>
        <div class="pdf-preview-modal-body" id="pdf-modal-viewer">
          <div class="pdf-preview-loading">
            <div class="pdf-preview-spinner"></div>
            <div>正在加载预览...</div>
          </div>
        </div>
      </div>
    `;

    // 显示弹窗
    modal.style.display = 'flex';

    // 绑定关闭事件
    const closeBtn = modal.querySelector('.pdf-preview-modal-close');
    const overlay = modal.querySelector('.pdf-preview-modal-overlay');

    const closeModal = () => {
      modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // 加载预览
    const viewer = modal.querySelector('#pdf-modal-viewer');
    if (pdfBytes) {
      this.renderModalPreviewFromBytes(pdfBytes, viewer);
    } else if (pdfPath) {
      this.renderModalPreviewFromPath(pdfPath, viewer);
    }
  },

  /**
   * 从字节数组渲染弹窗预览
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderModalPreviewFromBytes(pdfBytes, viewer) {
    try {
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJSFromBytes(pdfBytes, viewer);
      } else {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.renderWithIframe(url, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 从路径渲染弹窗预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderModalPreviewFromPath(pdfPath, viewer) {
    try {
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJS(pdfPath, viewer);
      } else {
        this.renderWithIframe(pdfPath, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 从字节数组加载PDF预览
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} container - 容器元素
   */
  async loadPDFPreviewFromBytes(pdfBytes, container) {
    const viewer = container.querySelector('#pdf-preview-viewer');
    if (!viewer) return;

    try {
      // 检查是否可以使用PDF.js
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJSFromBytes(pdfBytes, viewer);
      } else {
        // 创建 Blob URL 并使用 iframe
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.renderWithIframe(url, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败，请下载后查看</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 加载PDF预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} container - 容器元素
   */
  async loadPDFPreview(pdfPath, container) {
    const viewer = container.querySelector('#pdf-preview-viewer');
    if (!viewer) return;

    try {
      // 检查是否可以使用PDF.js
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJS(pdfPath, viewer);
      } else {
        // 回退到iframe或embed
        this.renderWithIframe(pdfPath, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败，请下载后查看</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 使用PDF.js从字节数组渲染PDF
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderWithPDFJSFromBytes(pdfBytes, viewer) {
    try {
      // 复制数据以避免 ArrayBuffer detached 问题
      const pdfData = new Uint8Array(pdfBytes);

      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      // 只渲染第一页作为预览
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 设置合适的缩放比例
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染页面
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      viewer.innerHTML = '';
      viewer.appendChild(canvas);

      // 添加页面信息
      if (pdf.numPages > 1) {
        const pageInfo = document.createElement('div');
        pageInfo.className = 'pdf-preview-info';
        pageInfo.textContent = `第 1 / ${pdf.numPages} 页（仅显示第一页预览）`;
        viewer.appendChild(pageInfo);
      }
    } catch (error) {
      throw new Error('PDF.js渲染失败: ' + error.message);
    }
  },

  /**
   * 使用PDF.js渲染PDF
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderWithPDFJS(pdfPath, viewer) {
    try {
      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;

      // 只渲染第一页作为预览
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 设置合适的缩放比例
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染页面
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      viewer.innerHTML = '';
      viewer.appendChild(canvas);

      // 添加页面信息
      if (pdf.numPages > 1) {
        const pageInfo = document.createElement('div');
        pageInfo.className = 'pdf-preview-info';
        pageInfo.textContent = `第 1 / ${pdf.numPages} 页（仅显示第一页预览）`;
        viewer.appendChild(pageInfo);
      }
    } catch (error) {
      throw new Error('PDF.js渲染失败: ' + error.message);
    }
  },

  /**
   * 使用iframe渲染PDF
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  renderWithIframe(pdfPath, viewer) {
    viewer.innerHTML = `
      <iframe
        src="${pdfPath}"
        class="pdf-preview-iframe"
        type="application/pdf">
        <p>您的浏览器不支持PDF预览，请 <a href="${pdfPath}" download>下载文件</a> 查看。</p>
      </iframe>
    `;
  },

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   * @param {HTMLElement} container - 容器元素
   */
  showError(message, container) {
    const resultContainer = container.querySelector('#pdf-result');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="pdf-result-error">
        <div class="pdf-error-icon">⚠️</div>
        <div class="pdf-error-message">${PDFHelpers.escapeHtml(message)}</div>
      </div>
    `;
  },

  /**
   * 下载文件
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名（可选）
   * @param {Uint8Array} pdfBytes - PDF字节数组（可选）
   */
  async downloadFile(filePath, fileName, pdfBytes = null) {
    try {
      const defaultFileName = fileName || (filePath ? (filePath.split('/').pop() || filePath.split('\\').pop()) : 'document.pdf');

      if (window.electronAPI && window.electronAPI.showSaveDialog) {
        // Electron环境 - 使用保存对话框
        const result = await window.electronAPI.showSaveDialog({
          defaultPath: defaultFileName,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result && !result.canceled && result.filePath) {
          // 复制文件到选择的位置
          if (filePath && window.electronAPI && typeof window.electronAPI.copyFile === 'function') {
            await window.electronAPI.copyFile(filePath, result.filePath);
          } else if (pdfBytes) {
            // 从字节数组保存：优先使用 preload 暴露的 fileAPI
            const fileAPI = (typeof window !== 'undefined' && window.fileAPI) ? window.fileAPI : null;
            const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

            const data = (pdfBytes instanceof Uint8Array) ? pdfBytes : new Uint8Array(pdfBytes);

            if (fileAPI && typeof fileAPI.writeFile === 'function') {
              await fileAPI.writeFile(result.filePath, data);
            } else if (electronAPI && typeof electronAPI.saveToDir === 'function') {
              // saveToDir 接受目录和文件名
              const parts = result.filePath.replace(/\\/g, '/').split('/');
              const name = parts.pop();
              const dir = parts.join('/') || '.';
              await electronAPI.saveToDir(dir, name, data);
            } else if (window.require) {
              const fs = window.require('fs');
              const buffer = (typeof Buffer !== 'undefined') ? Buffer.from(data) : data;
              fs.writeFileSync(result.filePath, buffer);
            } else {
              // 回退到浏览器下载
              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName || (result.filePath.split('/').pop() || 'document.pdf');
              a.click();
              URL.revokeObjectURL(url);
            }

            alert('文件已保存到: ' + result.filePath);
          }
        }
      } else {
        // Web环境 - 使用Blob下载
        if (pdfBytes) {
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName;
          a.click();
          URL.revokeObjectURL(url);
        } else if (filePath) {
          const a = document.createElement('a');
          a.href = filePath;
          a.download = defaultFileName;
          a.click();
        }
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      alert('下载文件失败: ' + error.message);
    }
  },

  /**
   * 下载文本文件
   * @param {string} textContent - 文本内容
   * @param {string} fileName - 文件名
   * @returns {Promise<string|null>} 保存的文件路径（Electron环境）或 null（Web环境）
   */
  async downloadTextFile(textContent, fileName) {
    try {
      // 检查是否为 Electron 环境
      const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

      if (electronAPI && electronAPI.showSaveDialog) {
        // Electron 环境 - 使用保存对话框
        const result = await electronAPI.showSaveDialog({
          defaultPath: fileName,
          filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result && !result.canceled && result.filePath) {
          // 保存文件
          const fileAPI = (typeof window !== 'undefined' && window.fileAPI) ? window.fileAPI : null;
          if (fileAPI && fileAPI.writeFile) {
            const encoder = new TextEncoder();
            const data = encoder.encode(textContent);
            await fileAPI.writeFile(result.filePath, data);
            console.log('✅ 文本文件保存成功:', result.filePath);
            return result.filePath;
          }
        }
        return null;
      } else {
        // Web 环境 - 使用 Blob 下载
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log('✅ 文本文件下载成功:', fileName);
        return null;  // Web 环境无法获取保存路径
      }
    } catch (error) {
      console.error('下载文本文件失败:', error);
      alert('下载文本文件失败: ' + error.message);
      return null;
    }
  },

  /**
   * 打开文件所在的文件夹
   * @param {string} filePath - 文件路径
   */
  async openFile(filePath) {
    try {
      // 优先使用 preload 暴露的 electronAPI（contextBridge）
      const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

      if (electronAPI && typeof electronAPI.showItemInFolder === 'function') {
        await electronAPI.showItemInFolder(filePath);
        console.log('✅ 已通过 preload 的 electronAPI 在文件管理器中打开:', filePath);
        return;
      }

      // 回退到老的 window.require 方法（只有在 nodeIntegration=true 时可用）
      if (window.require) {
        const { shell } = window.require('electron');

        try {
          const result = await shell.showItemInFolder(filePath);
          if (result === '') {
            console.log('✅ 已在文件管理器中打开:', filePath);
            return;
          }
        } catch (e) {
          // ignore and fallback
        }

        const path = window.require('path');
        const folderPath = path.dirname(filePath);
        await shell.openPath(folderPath);
        return;
      }

      console.warn('⚠️ 无法打开文件夹：既没有 preload 的 electronAPI，也没有 window.require（非Electron环境或受限）。');
      alert('仅在 Electron 环境下支持打开文件夹');
    } catch (error) {
      console.error('打开文件夹失败:', error);
      alert('打开文件夹失败: ' + error.message);
    }
  }
};




// ==================== shared/ui/history.js ====================
// PDF工具 - 历史记录组件模块
// 负责操作历史的管理和渲染

const PDFHistory = {
  // 历史记录存储键名
  STORAGE_KEY: 'pdf_tools_history',

  // 最大缓存数量
  MAX_HISTORY_COUNT: 10,
  /**
   * 渲染历史记录列表
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   */
  renderHistory(history, container) {
    const historyList = container.querySelector('#history-list');
    if (!historyList) return;

    if (history.length === 0) {
      historyList.innerHTML = '<div class="pdf-history-empty">暂无操作历史（记录保存在本地，最多保存10条，新的会覆盖旧的）</div>';
      return;
    }

    const operationNames = {
      merge: '合并',
      split: '拆分',
      create: '创建',
      ocr: 'OCR'
    };

    historyList.innerHTML = history.map((item, index) => {
      // 优先使用 result.outputPath（真实文件路径），回退到 tempFilePath
      const filePath = item.result.outputPath || item.tempFilePath;

      return `
        <div class="pdf-history-item" data-index="${index}">
          <span class="pdf-history-operation">${operationNames[item.operation] || item.operation}</span>
          ${filePath ? `
            <span class="pdf-history-filename pdf-history-filename-clickable" data-path="${PDFHelpers.escapeHtml(filePath)}" title="打开文件所在文件夹">
              ${PDFHelpers.escapeHtml(item.result.output)}
            </span>
          ` : `
            <span class="pdf-history-filename">${PDFHelpers.escapeHtml(item.result.output)}</span>
          `}
          <span class="pdf-history-time">${item.timestamp}</span>
        </div>
      `;
    }).join('');

    // 绑定文件名点击事件 - 打开文件所在文件夹
    historyList.querySelectorAll('.pdf-history-filename-clickable').forEach(fileNameEl => {
      fileNameEl.addEventListener('click', (e) => {
        const filePath = e.currentTarget.dataset.path;
        if (filePath) {
          PDFPreview.openFile(filePath);
        }
      });
    });
  },

  /**
   * 从 LocalStorage 加载历史记录
   * @returns {Array} 历史记录数组
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        console.log('📚 从缓存加载历史记录:', history.length, '条');
        return history;
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
    return [];
  },

  /**
   * 保存历史记录到 LocalStorage
   * @param {Array} history - 历史记录数组
   */
  saveToStorage(history) {
    try {
      // 只保存前 MAX_HISTORY_COUNT 条，并且只保存必要的字段以减少存储空间
      const toSave = history.slice(0, this.MAX_HISTORY_COUNT).map(item => ({
        operation: item.operation,
        result: {
          message: item.result.message,
          output: item.result.output,
          outputPath: item.result.outputPath
          // 不保存其他可能很大的字段（如 pdfBytes, preview 等）
        },
        timestamp: item.timestamp,
        tempFilePath: item.tempFilePath
      }));

      const jsonString = JSON.stringify(toSave);
      const sizeKB = (new Blob([jsonString]).size / 1024).toFixed(2);

      localStorage.setItem(this.STORAGE_KEY, jsonString);
      console.log(`💾 历史记录已保存: ${toSave.length} 条 (${sizeKB} KB)`);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('💥 LocalStorage 配额已满，尝试清理旧记录...');
        // 如果存储失败，尝试只保存前5条
        try {
          const reducedSave = history.slice(0, 5).map(item => ({
            operation: item.operation,
            result: {
              message: item.result.message,
              output: item.result.output,
              outputPath: item.result.outputPath
            },
            timestamp: item.timestamp,
            tempFilePath: item.tempFilePath
          }));
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reducedSave));
          console.log('✅ 已保存前 5 条历史记录');
        } catch (retryError) {
          console.error('❌ 仍然无法保存，清空历史记录缓存');
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } else {
        console.error('保存历史记录失败:', error);
      }
    }
  },

  /**
   * 添加历史记录
   * @param {string} operation - 操作类型
   * @param {object} result - 操作结果
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   * @param {object} services - 服务对象
   * @returns {Promise<object>} 添加的历史记录项
   */
  async addToHistory(operation, result, history, container, services) {
    // 保存文件到临时目录
    let tempFilePath = null;
    if (result.outputPath) {
      try {
        tempFilePath = await this.saveToTempDirectory(result.outputPath, result.output, services);
      } catch (error) {
        console.warn('保存到临时目录失败:', error);
      }
    }

    const historyItem = {
      operation,
      result,
      timestamp: PDFHelpers.formatDateTime(new Date()),
      tempFilePath: tempFilePath
    };

    history.unshift(historyItem);

    // 限制历史记录数量为 MAX_HISTORY_COUNT
    if (history.length > this.MAX_HISTORY_COUNT) {
      history.splice(this.MAX_HISTORY_COUNT);
    }

    // 保存到 LocalStorage
    this.saveToStorage(history);

    this.renderHistory(history, container);

    return historyItem;
  },

  /**
   * 保存文件到临时目录
   * @param {string} sourcePath - 源文件路径
   * @param {string} fileName - 文件名
   * @param {object} services - 服务对象
   * @returns {Promise<string>} 临时文件路径
   */
  async saveToTempDirectory(sourcePath, fileName, services) {
    // 获取系统临时目录
    const tmpdir = await PDFHelpers.getTempDir();

    // 生成临时文件名
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const tempFileName = `${fileName.replace('.pdf', '')}_${timestamp}.pdf`;

    // TODO: 实际的文件复制逻辑
    // 由于当前环境限制，先返回模拟路径
    // 实际实现需要调用文件系统API
    // await services.fileSystem.copy(sourcePath, path.join(tmpdir, tempFileName));

    return `${tmpdir}/${tempFileName}`;
  },

  /**
   * 清空历史记录
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   * @param {object} utils - 工具对象
   */
  clearHistory(history, container, utils) {
    history.length = 0;

    // 清空 LocalStorage
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ 历史记录缓存已清空');

    this.renderHistory(history, container);
    utils.notificationCenter.info('历史记录已清空');
  },

  /**
   * 导出历史记录
   * @param {Array} history - 历史记录数组
   * @param {object} utils - 工具对象
   */
  exportHistory(history, utils) {
    if (history.length === 0) {
      utils.notificationCenter.warning('没有历史记录可导出');
      return;
    }

    const content = history.map(item =>
      `${item.timestamp}\t${item.operation}\t${item.result.message}\t${item.result.output}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_tools_history_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    utils.notificationCenter.success('历史记录已导出');
  }
};




// ==================== shared/api/base-api.js ====================
// 共享 API 模块 - 基础 API 调用
// 提供通用的 API 调用方法

const BaseApi = {
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
   * @param {object} context - 上下文对象
   * @returns {Promise<Uint8Array>} PDF字节数组
   */
  async readFirstFile(filePath, context) {
    if (context && context.utils && context.utils.fs) {
      try {
        const fs = context.utils.fs;
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
   * @param {Uint8Array} bytes - 文件字节数组
   * @param {string} fileName - 文件名
   * @param {string} outputDir - 输出目录
   * @param {object} context - 上下文对象
   * @returns {Promise<string>} 文件路径
   */
  async saveFile(bytes, fileName, outputDir, context) {
    // 安全的保存实现：优先使用 Node fs（同步写入），其次使用 preload 暴露的 fileAPI / electronAPI
    const ctx = context || {};
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

        const buffer = (typeof Buffer !== 'undefined') ? Buffer.from(bytes) : new Uint8Array(bytes);
        fs.writeFileSync(fullPath, buffer);
        console.log('✅ 文件已保存:', fullPath);
        return fullPath;
      }

      // 如果注入的是 preload 暴露的 fileAPI（带 async writeFile）或全局 window.fileAPI
      const fileAPI = (utils.fs && typeof utils.fs.writeFile === 'function') ? utils.fs : (typeof window !== 'undefined' ? window.fileAPI : null);
      const pathAPI = (utils.path && typeof utils.path.join === 'function') ? utils.path : (typeof window !== 'undefined' ? window.pathAPI : null);
      const electronAPI = (utils.electronAPI && typeof utils.electronAPI.saveToDir === 'function') ? utils.electronAPI : (typeof window !== 'undefined' ? window.electronAPI : null);

      if (electronAPI && typeof electronAPI.saveToDir === 'function') {
        const dir = outputDir || await PDFHelpers.getTempDir();
        const data = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
        const savedPath = await electronAPI.saveToDir(dir, fileName, data);
        console.log('✅ 文件已保存 via electronAPI.saveToDir:', savedPath);
        return savedPath;
      }

      if (fileAPI && typeof fileAPI.writeFile === 'function') {
        const dir = outputDir || await PDFHelpers.getTempDir();
        const fullPath = (pathAPI && typeof pathAPI.join === 'function') ? await (typeof pathAPI.join === 'function' ? pathAPI.join(dir, fileName) : (dir + '/' + fileName)) : (dir + '/' + fileName);

        const content = (bytes instanceof Uint8Array) ? bytes : new Uint8Array(bytes);
        // fileAPI.writeFile 通过 IPC 返回 Promise
        await fileAPI.writeFile(fullPath, content);
        console.log('✅ 文件已保存 via fileAPI.writeFile:', fullPath);
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
   * 获取认证 Token
   * @param {object} context - 上下文对象
   * @returns {string|null} Token
   */
  getToken(context) {
    // 从 context 获取 token
    if (context && context.services && context.services.app) {
      const userManager = context.services.app.getService('userManager');
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
  }
};




// ==================== pdf_tools/api/pdf-api.js ====================
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
        const apiBaseUrl = this.context?.apiConfig?.baseUrl || this.context?.config?.apiBaseUrl || 'https://api.baizesz.com';
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




// ==================== pdf_tools/ui/panels.js ====================
// PDF工具 - 面板HTML生成模块
// 负责生成各个工具面板的HTML

const PDFPanels = {
  /**
   * 获取文件选择组HTML（公共组件）
   */
  getFileSelectionGroupHTML(toolName, accept = '.pdf', buttonIcon = '📁', buttonText = '选择文件', emptyText = '未选择文件') {
    return `
      <div class="pdf-file-selection-group">
        <div class="pdf-file-selection-header">
          <label class="pdf-file-selection-label">
            <input type="file" id="${toolName}-files" accept="${accept}" multiple class="pdf-file-input">
            <span class="pdf-file-btn">${buttonIcon} ${buttonText}</span>
          </label>
          <button type="button" id="${toolName}-clear-files" class="pdf-btn pdf-btn-clear">🗑️ 清空列表</button>
        </div>
        <div class="pdf-file-list-container" id="${toolName}-file-list-container">
          <div class="pdf-file-list" id="${toolName}-file-list">
            <div class="pdf-file-list-empty">${emptyText}</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 获取页面范围设置HTML（公共组件）
   * @param {string} toolName - 工具名称
   * @param {boolean} showSplitMode - 是否显示拆分方式选择框
   * @param {boolean} showOCRLanguage - 是否显示OCR语言选择框
   */
  getPageRangeHTML(toolName, showSplitMode = false, showOCRLanguage = false) {
    const showLeftControl = showSplitMode || showOCRLanguage;
    return `
      <div class="pdf-input-group">
        <div style="display: flex; gap: var(--spacing-2); align-items: center;">
          ${showSplitMode ? `
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <label style="margin: 0; white-space: nowrap;">拆分方式:</label>
            <select id="${toolName}-mode" class="pdf-select" style="width: auto;">
              <option value="pages">按页面范围</option>
              <option value="every">每N页拆分</option>
              <option value="single">每页单独拆分</option>
            </select>
          </div>
          ` : ''}
          ${showOCRLanguage ? `
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <label style="margin: 0; white-space: nowrap;">识别语言:</label>
            <select id="${toolName}-language" class="pdf-select" style="width: auto;">
              <option value="">加载中...</option>
            </select>
          </div>
          ` : ''}
          <div style="display: flex; align-items: center; gap: 4px; flex: 1;" id="${toolName}-pages-group">
            <label style="margin: 0; white-space: nowrap;">页面范围:</label>
            <input type="text" id="${toolName}-pages" placeholder="例如: 1-5 / 2,4,6 / 默认所有" class="pdf-text-input" style="flex: 1;">
          </div>
        </div>
        ${showSplitMode ? `
        <div id="${toolName}-every-group" style="display:none; margin-top: var(--spacing-2);">
          <label>每几页拂分：</label>
          <input type="number" id="${toolName}-every" value="1" min="1" class="pdf-text-input">
        </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * 获取输出目录设置HTML（公共组件）
   */
  getOutputDirectoryHTML(toolName) {
    return `
      <div class="pdf-input-group">
        <div style="display: flex; gap: var(--spacing-2); align-items: center;">
          <label style="margin: 0; white-space: nowrap;">输出目录:</label>
          <input type="text" id="${toolName}-output-dir" placeholder="设置后会自动保存，否则手动保存" class="pdf-text-input" style="flex: 1;">
          <button type="button" id="${toolName}-select-output-dir" class="pdf-btn pdf-btn-secondary" style="height: 30px; flex-shrink: 0;">📁 选择</button>
        </div>
      </div>
    `;
  },

  /**
   * 获取复选框HTML（公共组件）
   * @param {string} id - 复选框ID
   * @param {string} label - 复选框文本
   */
  getCheckboxHTML(id, label) {
    return `
      <label class="pdf-checkbox-wrapper">
        <input type="checkbox" id="${id}" class="pdf-checkbox">
        <span class="pdf-checkbox-label">${label}</span>
      </label>
    `;
  },

  /**
   * 获取提交按钮HTML（公共组件）
   */
  getSubmitButtonHTML() {
    return `<button type="submit" class="pdf-btn pdf-btn-primary pdf-create-btn">开始处理</button>`;
  },

  /**
   * 获取合并PDF面板HTML
   */
  getMergePanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('merge', '.pdf', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('merge')}
        ${this.getCheckboxHTML('merge-bookmark', '添加书签')}
        ${this.getOutputDirectoryHTML('merge')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取拆分PDF面板HTML
   */
  getSplitPanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('split', '.pdf', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('split', true)}
        ${this.getOutputDirectoryHTML('split')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取创建PDF面板HTML
   */
  getCreatePanelHTML() {
    return `
      <div class="pdf-panel-content">
        <div class="pdf-input-group">
          <label>创建方式:</label>
          <select id="create-mode" class="pdf-select">
            <option value="images">从图片创建</option>
            <option value="text">从文本创建</option>
            <option value="blank">创建空白PDF</option>
          </select>
          <label class="pdf-file-selection-label">
            <input type="file" id="create-images" accept="image/*" multiple class="pdf-file-input">
            <span class="pdf-file-btn">🖼️ 添加图片</span>
          </label>
          <button type="button" id="create-clear-files" class="pdf-btn pdf-btn-clear">🗑️ 清空列表</button>
        </div>
        <div class="pdf-file-selection-group" id="create-images-group">
          <div class="pdf-file-list-container" id="create-file-list-container">
            <div class="pdf-file-list" id="create-image-list">
              <div class="pdf-file-list-empty">未选择图片</div>
            </div>
          </div>
        </div>
        <div class="pdf-input-group pdf-input-group-fullwidth" id="create-text-group" style="display:none;">
          <textarea id="create-text" rows="8" placeholder="输入文本内容..." class="pdf-textarea"></textarea>
        </div>
        <div class="pdf-input-group" id="create-blank-group" style="display:none;">
          <label>页数：</label>
          <input type="number" id="create-pages" value="1" min="1" class="pdf-text-input">
        </div>
        ${this.getOutputDirectoryHTML('create')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取OCR识别面板HTML
   */
  getOCRPanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('ocr', '.pdf,image/*', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('ocr', false, true)}
        ${this.getCheckboxHTML('ocr-searchable', '创建可搜索PDF（在原PDF上添加文字层）')}
        ${this.getOutputDirectoryHTML('ocr')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  }
};




// ==================== pdf_tools/core/PDFToolsAgent.js ====================
// PDF工具 - 核心代理类
// 负责整体逻辑协调和业务流程

class PDFToolsAgent {
  constructor(context) {
    this.context = context;
    this.container = context.container;
    this.agentData = context.agentData;
    this.config = context.config;
    this.services = context.services;
    this.utils = context.utils;
    this.statusBarManager = context.services.statusBarManager;
    this.app = context.services.app;

    // 从缓存加载历史记录
    this.operationHistory = PDFHistory.loadFromStorage();

    this.currentTool = 'merge';
    this.selectedFiles = {}; // 存储每个工具的文件列表
    this.tempFiles = []; // 存储临时文件路径，用于清理

    // OCR 配置
    this.ocrLanguages = []; // OCR 语言列表
    // 从 context 动态获取 API 基础地址（支持 debug 和 release 环境）
    this.apiBaseUrl = context?.apiConfig?.baseUrl || context?.config?.apiBaseUrl || 'https://api.baizesz.com';
    console.log('🔧 [PDF Tools] API 基础地址:', this.apiBaseUrl);
  }

  // 清理临时文件和历史记录
  destroy() {
    // 清理临时文件
    this.tempFiles.forEach(filePath => {
      try {
        console.log('清理临时文件:', filePath);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    });

    // 清空历史记录
    this.operationHistory = [];
    this.tempFiles = [];
  }

  async render() {
    const agentName = this.agentData.name || 'PDF工具集';

    this.utils.updateAgentStatus(agentName, 'ready', '就绪');

    this.renderHTML();

    this.initializeEventListeners();

    this.switchTool('create');

    // 渲染假数据历史记录
    PDFHistory.renderHistory(this.operationHistory, this.container);

    // 启用表单
    this.enableForm();
  }

  enableForm() {
    const form = this.container.querySelector('#pdf-tools-form');

    if (form) {
      form.style.opacity = '1';
      form.style.pointerEvents = 'auto';
    }
  }

  renderHTML() {
    this.container.innerHTML = `
      <div class="pdf-tools-workspace">
        <div class="pdf-tool-selector">
          <div class="pdf-categories">
            <button class="pdf-category-btn pdf-active" data-tool="create">
              <span class="pdf-icon">📑</span>
              创建PDF
            </button>
            <button class="pdf-category-btn" data-tool="merge">
              <span class="pdf-icon">📑</span>
              合并PDF
            </button>
            <button class="pdf-category-btn" data-tool="split">
              <span class="pdf-icon">✂️</span>
              拆分PDF
            </button>
            <button class="pdf-category-btn" data-tool="ocr">
              <span class="pdf-icon">🔍</span>
              OCR识别
            </button>
          </div>
        </div>

        <form id="pdf-tools-form" class="pdf-form" style="opacity: 0.6; pointer-events: none;">
          <div class="pdf-tool-panel" id="tool-panel"></div>
        </form>

        <div class="pdf-result" id="pdf-result">
          <div class="pdf-result-placeholder">
            <div class="pdf-placeholder-icon">📋</div>
            <p>选择工具并配置参数开始处理PDF</p>
            <p class="pdf-help-text">支持PDF合并、拆分、创建和OCR文字识别</p>
          </div>
        </div>

        <div class="pdf-history" id="pdf-history">
          <div class="pdf-history-header">
            <h4 title="操作历史:最多保存10条，新的会覆盖旧的">操作历史</h4>
            <div class="pdf-history-controls">
              <button id="clear-history" class="pdf-btn pdf-btn-secondary">清空历史</button>
              <button id="export-history" class="pdf-btn pdf-btn-secondary">导出历史</button>
            </div>
          </div>
          <div class="pdf-history-list" id="history-list"></div>
        </div>
      </div>
    `;
  }

  initializeEventListeners() {
    const form = this.container.querySelector('#pdf-tools-form');
    const clearHistoryBtn = this.container.querySelector('#clear-history');
    const exportHistoryBtn = this.container.querySelector('#export-history');
    const categoryBtns = this.container.querySelectorAll('.pdf-category-btn');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleOperation();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        PDFHistory.clearHistory(this.operationHistory, this.container, this.utils);
      });
    }

    if (exportHistoryBtn) {
      exportHistoryBtn.addEventListener('click', () => {
        PDFHistory.exportHistory(this.operationHistory, this.utils);
      });
    }

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.switchTool(tool);
      });
    });
  }

  switchTool(tool) {
    this.currentTool = tool;

    const categoryBtns = this.container.querySelectorAll('.pdf-category-btn');
    categoryBtns.forEach(btn => {
      if (btn.dataset.tool === tool) {
        btn.classList.add('pdf-active');
      } else {
        btn.classList.remove('pdf-active');
      }
    });

    // 清空 pdf-result 区域，恢复占位符
    const resultContainer = this.container.querySelector('#pdf-result');
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="pdf-result-placeholder">
          <div class="pdf-placeholder-icon">📋</div>
          <p>选择工具并配置参数开始处理PDF</p>
          <p class="pdf-help-text">支持PDF合并、拆分、创建和OCR文字识别</p>
        </div>
      `;
    }

    this.showToolPanel(tool);
  }

  showToolPanel(tool) {
    const toolPanel = this.container.querySelector('#tool-panel');
    if (!toolPanel) return;

    const panels = {
      merge: PDFPanels.getMergePanelHTML(),
      split: PDFPanels.getSplitPanelHTML(),
      create: PDFPanels.getCreatePanelHTML(),
      ocr: PDFPanels.getOCRPanelHTML()
    };

    toolPanel.innerHTML = panels[tool] || '';

    // 重新绑定事件
    this.bindToolPanelEvents(tool);
  }

  bindToolPanelEvents(tool) {
    // 绑定文件选择事件
    if (tool === 'merge') {
      const fileInput = this.container.querySelector('#merge-files');
      const clearBtn = this.container.querySelector('#merge-clear-files');
      const selectDirBtn = this.container.querySelector('#merge-select-output-dir');

      if (fileInput) {
        fileInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'merge', 'merge-file-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('merge', 'merge-file-list', this.selectedFiles, this.container)
        );
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('merge'));
      }
    } else if (tool === 'create') {
      const modeSelect = this.container.querySelector('#create-mode');
      const imageInput = this.container.querySelector('#create-images');
      const clearBtn = this.container.querySelector('#create-clear-files');
      const selectDirBtn = this.container.querySelector('#create-select-output-dir');

      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => this.handleCreateModeChange(e.target.value));
      }

      if (imageInput) {
        imageInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'create', 'create-image-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('create', 'create-image-list', this.selectedFiles, this.container)
        );
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('create'));
      }
    } else if (tool === 'split') {
      const fileInput = this.container.querySelector('#split-files');
      const clearBtn = this.container.querySelector('#split-clear-files');
      const modeSelect = this.container.querySelector('#split-mode');
      const selectDirBtn = this.container.querySelector('#split-select-output-dir');

      if (fileInput) {
        fileInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'split', 'split-file-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('split', 'split-file-list', this.selectedFiles, this.container)
        );
      }

      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => this.handleSplitModeChange(e.target.value));
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('split'));
      }
    } else if (tool === 'ocr') {
      const fileInput = this.container.querySelector('#ocr-files');
      const clearBtn = this.container.querySelector('#ocr-clear-files');
      const selectDirBtn = this.container.querySelector('#ocr-select-output-dir');

      if (fileInput) {
        fileInput.addEventListener('change', (e) => {
          // OCR 文件选择时检测文件类型
          this.handleOCRFileSelection(e);
        });
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('ocr', 'ocr-file-list', this.selectedFiles, this.container)
        );
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('ocr'));
      }

      // 加载 OCR 语言列表
      this.loadOCRLanguages();
    }
  }

  handleCreateModeChange(mode) {
    const imagesGroup = this.container.querySelector('#create-images-group');
    const textGroup = this.container.querySelector('#create-text-group');
    const blankGroup = this.container.querySelector('#create-blank-group');

    if (imagesGroup) imagesGroup.style.display = mode === 'images' ? 'block' : 'none';
    if (textGroup) textGroup.style.display = mode === 'text' ? 'block' : 'none';
    if (blankGroup) blankGroup.style.display = mode === 'blank' ? 'block' : 'none';
  }

  handleSplitModeChange(mode) {
    const everyGroup = this.container.querySelector('#split-every-group');
    const pagesInput = this.container.querySelector('#split-pages');

    if (everyGroup) {
      everyGroup.style.display = mode === 'every' ? 'block' : 'none';
    }

    // 根据模式调整页面范围输入框的占位符
    if (pagesInput) {
      if (mode === 'single') {
        pagesInput.disabled = true;
        pagesInput.placeholder = '每页单独拆分无需设置';
      } else {
        pagesInput.disabled = false;
        pagesInput.placeholder = '例如: 1-5, 6-10';
      }
    }
  }

  async handleOperation() {
    // 获取提交按钮
    const submitBtn = this.container.querySelector('button[type="submit"]');

    try {
      // 禁用按钮并显示加载状态
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('pdf-btn-loading');

        // 保存原始文本并更新按钮文本
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.innerHTML = `<span class="pdf-spinner"></span>处理中...`;
      }

      this.utils.updateStatus('processing', '处理中...');

      let result;
      switch (this.currentTool) {
        case 'merge':
          result = await this.handleMerge();
          break;
        case 'split':
          result = await this.handleSplit();
          break;
        case 'create':
          result = await this.handleCreate();
          break;
        case 'ocr':
          result = await this.handleOCR();
          break;
        default:
          throw new Error('未知的工具类型');
      }

      // 显示结果和预览 - 统一使用 showPreview 方法
      PDFPreview.showPreview(result.outputPath || '', this.container, result, result.pdfBytes);

      // 添加到历史记录
      await PDFHistory.addToHistory(this.currentTool, result, this.operationHistory, this.container, this.services);

      this.utils.updateStatus('ready', '就绪');

      // 根据是否设置了输出目录显示不同的提示
      if (result.hasOutputDir) {
        this.utils.notificationCenter.success(`成功！文件已自动保存到: ${result.outputPath}`);
      } else {
        this.utils.notificationCenter.success('成功！点击"保存"按钮进行保存');
      }

    } catch (error) {
      console.error('操作失败:', error);
      PDFPreview.showError(error.message, this.container);
      this.utils.notificationCenter.error('操作失败: ' + error.message);
      this.utils.updateStatus('error', '操作失败');
    } finally {
      // 恢复按钮状态
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('pdf-btn-loading');
        submitBtn.textContent = submitBtn.dataset.originalText || '开始处理';
      }
    }
  }

  async handleMerge() {
    const pagesInput = this.container.querySelector('#merge-pages');
    const bookmarkCheckbox = this.container.querySelector('#merge-bookmark');
    const outputDirInput = this.container.querySelector('#merge-output-dir');

    const selectedFiles = this.selectedFiles['merge'] || [];

    if (selectedFiles.length < 2) {
      throw new Error('请至少选择两个PDF文件');
    }

    // 直接传递File对象数组
    const files = selectedFiles;
    const pages = pagesInput?.value.trim() || 'all';
    const addBookmark = bookmarkCheckbox?.checked || false;
    const outputDir = outputDirInput?.value.trim() || '';

    // 自动生成输出文件名
    const output = PDFHelpers.generateOutputFileName(selectedFiles.map(f => f.name), 'pdf');

    // 调用API
    const result = await PDFApi.executeOperation('merge', {
      files,
      pages,
      addBookmark,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      return {
        operation: 'merge',
        files: selectedFiles.map(f => f.name),
        output: output,
        message: '合并成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '合并失败');
    }
  }

  async handleSplit() {
    const modeSelect = this.container.querySelector('#split-mode');
    const pagesInput = this.container.querySelector('#split-pages');
    const everyInput = this.container.querySelector('#split-every');
    const outputDirInput = this.container.querySelector('#split-output-dir');

    const selectedFiles = this.selectedFiles['split'] || [];
    if (selectedFiles.length === 0) {
      throw new Error('请选择PDF文件');
    }

    const file = selectedFiles[0];  // 直接传递File对象
    const fileName = selectedFiles[0].name;
    const mode = modeSelect?.value || 'pages';
    const pages = pagesInput?.value.trim();
    const every = everyInput?.value || '1';
    const outputDir = outputDirInput?.value.trim() || '';

    // 调用API
    const result = await PDFApi.executeOperation('split', {
      file,
      mode,
      pages,
      every,
      outputDir
    }, this.context);

    if (result.success) {
      return {
        operation: 'split',
        file: fileName,
        mode: mode,
        output: outputDir || '输出目录',
        message: '拆分成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '拆分失败');
    }
  }

  async handleCreate() {
    const modeSelect = this.container.querySelector('#create-mode');
    const textInput = this.container.querySelector('#create-text');
    const pagesInput = this.container.querySelector('#create-pages');
    const outputDirInput = this.container.querySelector('#create-output-dir');

    const mode = modeSelect?.value || 'images';
    const outputDir = outputDirInput?.value.trim() || '';

    let images = null;
    let text = null;
    let pages = null;

    if (mode === 'images') {
      const selectedFiles = this.selectedFiles['create'] || [];
      if (selectedFiles.length === 0) {
        throw new Error('请选择图片文件');
      }
      images = selectedFiles;  // 直接传递File对象数组
    } else if (mode === 'text') {
      text = textInput?.value.trim();
      if (!text) throw new Error('请输入文本内容');
    } else if (mode === 'blank') {
      pages = pagesInput?.value || '1';
    }

    // 自动生成输出文件名
    let output;
    if (mode === 'images' && images) {
      const fileNames = (this.selectedFiles['create'] || []).map(f => f.name);
      output = PDFHelpers.generateOutputFileName(fileNames, 'pdf');
    } else {
      output = 'document_' + new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0] + '.pdf';
    }

    // 调用API
    const result = await PDFApi.executeOperation('create', {
      mode,
      images,
      text,
      pages,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      // 获取源文件信息
      let sourceFiles = null;
      if (mode === 'images' && images) {
        sourceFiles = images.map(f => f.name);
      } else if (mode === 'text') {
        sourceFiles = ['文本内容'];
      } else if (mode === 'blank') {
        sourceFiles = [`空白PDF (${pages}页)`];
      }

      return {
        operation: 'create',
        mode: mode,
        files: sourceFiles,  // 添加源文件信息
        output: output,
        message: '创建成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '创建失败');
    }
  }

  async handleOCR() {
    const languageSelect = this.container.querySelector('#ocr-language');
    const pagesInput = this.container.querySelector('#ocr-pages');
    const searchableCheckbox = this.container.querySelector('#ocr-searchable');
    const outputDirInput = this.container.querySelector('#ocr-output-dir');

    const selectedFiles = this.selectedFiles['ocr'] || [];
    if (selectedFiles.length === 0) {
      throw new Error('请选择PDF或图片文件');
    }

    const file = selectedFiles[0];  // 直接传递File对象
    const fileName = selectedFiles[0].name;
    const language = languageSelect?.value || 'auto';  // 默认自动检测
    const pages = pagesInput?.value.trim() || 'all';
    const searchable = searchableCheckbox?.checked || false;
    const output = searchable ? 'searchable.pdf' : 'output.txt';
    const outputDir = outputDirInput?.value.trim() || '';

    // 调用API
    const result = await PDFApi.executeOperation('ocr', {
      files: selectedFiles,  // 传递所有选中的文件
      language,
      pages,
      searchable,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      // 决定 output 显示内容
      let outputDisplay;

      if (searchable && result.searchablePdfUrl) {
        // searchable=true: 直接显示完整的 URL
        outputDisplay = result.searchablePdfUrl;
      } else if (result.outputPath) {
        // searchable=false: 显示本地文件路径
        outputDisplay = result.outputPath;
      } else {
        // 默认
        outputDisplay = output;
      }

      return {
        operation: 'ocr',
        file: fileName,
        language: language,
        output: outputDisplay,
        message: 'OCR识别成功',
        outputPath: result.outputPath || '',
        searchable: searchable,
        textContent: result.textContent,
        searchablePdfUrl: result.searchablePdfUrl,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || 'OCR识别失败');
    }
  }

  /**
   * 加载 OCR 语言列表
   */
  async loadOCRLanguages() {
    try {
      this.utils.updateStatus('loading', '加载 OCR 配置...');

      // 从 API 获取语言列表
      const languages = await PDFApi.fetchOCRConfig(this.apiBaseUrl);
      this.ocrLanguages = languages;

      // 更新下拉框
      this.renderOCRLanguageSelect(languages);

      this.utils.updateStatus('ready', '就绪');
      console.log('✅ OCR 语言列表加载成功:', languages.length, '种语言');
    } catch (error) {
      console.error('❌ OCR 语言列表加载失败:', error);
      this.utils.notificationCenter.warning('OCR 配置加载失败，使用默认配置');
    }
  }

  /**
   * 渲染 OCR 语言选择框
   */
  renderOCRLanguageSelect(languages) {
    const languageSelect = this.container.querySelector('#ocr-language');
    if (!languageSelect || !languages || languages.length === 0) {
      return;
    }

    // 清空并重新填充选项
    languageSelect.innerHTML = languages.map(lang =>
      `<option value="${lang.value}">${lang.label}</option>`
    ).join('');

    console.log('✅ OCR 语言选择框渲染完成');
  }

  /**
   * 处理 OCR 文件选择（检测文件类型，控制页面范围显示）
   */
  async handleOCRFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // 处理文件列表
    PDFFileList.handleFileSelection(event, 'ocr', 'ocr-file-list', this.selectedFiles, this.container);

    // 检测第一个文件的类型
    const firstFile = files[0];
    const isPDF = firstFile.type === 'application/pdf' || firstFile.name.toLowerCase().endsWith('.pdf');

    // 控制"页面范围"选项的显示/隐藏
    const pagesGroup = this.container.querySelector('#ocr-pages-group');
    if (pagesGroup) {
      if (isPDF) {
        pagesGroup.style.display = 'flex';
        console.log('✅ 检测到 PDF 文件，显示页面范围选项');
      } else {
        pagesGroup.style.display = 'none';
        console.log('✅ 检测到图片文件，隐藏页面范围选项');
      }
    }

    // 如果是图片，进行预处理（转换 + 压缩）
    if (!isPDF && typeof ImageConverter !== 'undefined') {
      try {
        this.utils.updateStatus('processing', '处理图片...');

        const processedFiles = [];
        for (const file of files) {
          try {
            const processed = await ImageConverter.prepareImageForOCR(file);

            // 创建新的 File 对象
            const newFile = new File([processed.blob], processed.fileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            processedFiles.push(newFile);

            // 显示压缩信息
            if (processed.compressed) {
              const originalMB = (processed.originalSize / 1024 / 1024).toFixed(2);
              const finalMB = (processed.finalSize / 1024 / 1024).toFixed(2);
              console.log(`✅ 图片已优化: ${file.name} (${originalMB}MB → ${finalMB}MB)`);
            }
          } catch (error) {
            console.error(`❌ 图片处理失败 (${file.name}):`, error);
            this.utils.notificationCenter.warning(`图片处理失败: ${file.name}`);
          }
        }

        // 更新选中的文件列表
        if (processedFiles.length > 0) {
          this.selectedFiles['ocr'] = processedFiles;
          console.log(`✅ 共处理 ${processedFiles.length} 个图片文件`);
        }

        this.utils.updateStatus('ready', '就绪');
      } catch (error) {
        console.error('❌ 图片处理失败:', error);
        this.utils.notificationCenter.error('图片处理失败: ' + error.message);
        this.utils.updateStatus('ready', '就绪');
      }
    }
  }

  async handleSelectOutputDir(toolName) {
    try {
      // 调用 Electron API 选择目录
      if (window.electronAPI && window.electronAPI.showOpenDialog) {
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openDirectory']
        });

        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
          const dirPath = result.filePaths[0];
          const outputInput = this.container.querySelector(`#${toolName}-output-dir`);
          if (outputInput) {
            outputInput.value = dirPath;
          }
          this.utils.notificationCenter.success('目录已选择');
        }
      } else {
        this.utils.notificationCenter.warning('当前环境不支持目录选择功能');
      }
    } catch (error) {
      console.error('选择目录失败:', error);
      this.utils.notificationCenter.error('选择目录失败: ' + error.message);
    }
  }
}





  // 动态加载外部库
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // 检查是否已经加载
      const existingScript = document.querySelector(`script[src="${src}"]`);
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }

  async function loadLibraries() {
    const libraries = [
      'https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js',
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js'
    ];

    console.log('📚 加载PDF库...');

    for (const lib of libraries) {
      try {
        await loadScript(lib);
        console.log('✅ 已加载:', lib);
      } catch (error) {
        console.error('❌ 加载失败:', lib, error);
        throw error;
      }
    }

    // 配置 pdf.js worker
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }

  async function init(context) {
    const { container, agentData, config, services, utils } = context;

    console.log('🚀 初始化PDF工具集UI:', agentData.name);

    // 加载必要的库
    await loadLibraries();

    const pdfTools = new PDFToolsAgent(context);
    await pdfTools.render();
  }

  // 注册到全局命名空间（使用智能体ID）
  // 这样可以避免使用 eval 或 new Function()，符合 CSP 安全策略
  window.__AGENT_INIT__ = window.__AGENT_INIT__ || {};
  window.__AGENT_INIT__['pdf_tools'] = init;
  
  console.log('[PDF Tools Bundle] 已注册到 window.__AGENT_INIT__.pdf_tools');
})();
