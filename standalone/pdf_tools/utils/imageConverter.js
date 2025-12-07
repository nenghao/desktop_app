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
