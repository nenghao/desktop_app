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

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.BaseApi = BaseApi;
}
