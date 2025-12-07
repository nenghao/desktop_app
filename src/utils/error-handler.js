/**
 * 错误处理工具
 */

export class ErrorHandler {
  static errors = [];
  static maxErrors = 100;
  static reportingEnabled = true;

  /**
   * 处理错误
   * @param {Error} error 错误对象
   * @param {string} context 错误上下文
   * @param {Object} metadata 额外元数据
   */
  static handleError(error, context = 'Unknown', metadata = {}) {
    const errorInfo = {
      id: this.generateErrorId(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      metadata,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 存储错误
    this.storeError(errorInfo);

    // 控制台输出
    console.error(`[ErrorHandler] ${context}:`, error);

    // 用户通知
    this.notifyUser(errorInfo);

    // 上报错误
    if (this.reportingEnabled) {
      this.reportError(errorInfo);
    }

    return errorInfo;
  }

  /**
   * 存储错误
   */
  static storeError(errorInfo) {
    this.errors.unshift(errorInfo);

    // 限制错误数量
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(0, this.maxErrors);
    }

    // 存储到本地存储
    try {
      const storedErrors = JSON.parse(localStorage.getItem('Questech_errors') || '[]');
      storedErrors.unshift(errorInfo);
      localStorage.setItem('Questech_errors', JSON.stringify(storedErrors.slice(0, 50)));
    } catch (e) {
      console.warn('无法存储错误到本地存储:', e);
    }
  }

  /**
   * 通知用户
   */
  static notifyUser(errorInfo) {
    // 这里可以集成通知系统
    console.log('用户通知:', errorInfo.message);
  }

  /**
   * 上报错误
   */
  static reportError(errorInfo) {
    // 在Electron环境中可以保存到本地文件
    if (window.electronAPI) {
      // Electron环境
      console.log('错误上报 (Electron):', errorInfo);
    } else {
      // Web环境
      console.log('错误上报 (Web):', errorInfo);
    }
  }

  /**
   * 生成错误ID
   */
  static generateErrorId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * 获取错误列表
   */
  static getErrors() {
    return [...this.errors];
  }

  /**
   * 清除错误
   */
  static clearErrors() {
    this.errors = [];
    localStorage.removeItem('Questech_errors');
  }
}
