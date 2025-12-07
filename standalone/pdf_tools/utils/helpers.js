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

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFHelpers = PDFHelpers;
}
