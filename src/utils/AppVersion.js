/**
 * 应用版本信息工具
 * 统一管理应用版本信息的获取
 * 使用Vite环境变量从package.json获取版本，避免版本信息重复维护
 */

// 使用Vite环境变量
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
const APP_NAME = 'questech';
const APP_PRODUCT_NAME = '奇境探索';
const APP_DESCRIPTION = '奇境探索 - AI智能体';

export class AppVersion {
  /**
   * 获取应用版本
   */
  static getVersion() {
    return APP_VERSION;
  }

  /**
   * 获取应用名称
   */
  static getName() {
    return APP_NAME;
  }

  /**
   * 获取产品名称
   */
  static getProductName() {
    return APP_PRODUCT_NAME;
  }

  /**
   * 获取应用描述
   */
  static getDescription() {
    return APP_DESCRIPTION;
  }

  /**
   * 获取完整应用信息
   */
  static getAppInfo() {
    return {
      name: APP_NAME,
      productName: APP_PRODUCT_NAME,
      version: APP_VERSION,
      description: APP_DESCRIPTION
    };
  }

  /**
   * 获取版本信息字符串
   */
  static getVersionString() {
    return `${APP_PRODUCT_NAME} v${APP_VERSION}`;
  }

  /**
   * 检查是否为新版本（与已保存的版本比较）
   */
  static isNewVersion(savedVersion) {
    if (!savedVersion) return true;

    // 简单的版本比较逻辑
    const currentParts = APP_VERSION.split('.').map(Number);
    const savedParts = savedVersion.split('.').map(Number);

    for (let i = 0; i < Math.max(currentParts.length, savedParts.length); i++) {
      const current = currentParts[i] || 0;
      const saved = savedParts[i] || 0;

      if (current > saved) return true;
      if (current < saved) return false;
    }

    return false;
  }

  /**
   * 同步方法 - 获取版本信息（保持兼容性）
   */
  static getVersionSync() {
    return this.getVersion();
  }

  static getAppInfoSync() {
    return this.getAppInfo();
  }
}
