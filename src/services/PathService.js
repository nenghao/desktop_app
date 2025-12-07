/**
 * 路径服务
 * 提供应用各种路径的访问和管理
 *
 * 目录规划：
 * - Roaming (同步数据): C:\Users\xxx\AppData\Roaming\Questech
 *   - 用户配置、偏好设置、账户信息等
 *
 * - Local (本地数据): C:\Users\xxx\AppData\Local\Questech
 *   - cache: 缓存目录 (自动管理)
 *   - plugins: 已安装的插件
 *   - logs: 应用日志
 *
 * Web 环境：
 *   - 使用相对路径和 URL
 *   - 使用 IndexedDB/LocalStorage 替代文件系统
 */

import { isElectron, isWeb } from '../utils/platform-detector.js';

export class PathService {
  constructor() {
    this.paths = null;
    this.isElectron = isElectron();
    this.isWeb = isWeb();

    // Web 环境的虚拟路径配置
    if (this.isWeb) {
      this.paths = {
        userData: '/user-data',
        cache: '/cache',
        plugins: '/plugins',
        logs: '/logs',
        temp: '/temp'
      };
    }
  }

  /**
   * 初始化路径配置
   */
  async initialize() {
    if (this.isWeb) {
      console.log('🌐 [PathService] Web 环境，使用虚拟路径配置');
      return;
    }

    if (!this.isElectron) {
      console.warn('⚠️ [PathService] 未知环境，路径服务不可用');
      return;
    }

    try {
      this.paths = await window.electronAPI.getAppPaths();
      console.log('✅ [PathService] Electron 路径配置已加载:', this.paths);
    } catch (error) {
      console.error('❌ [PathService] 加载路径配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取所有路径配置
   */
  getPaths() {
    return this.paths;
  }

  /**
   * 获取用户数据目录 (Roaming)
   * 用于存储用户配置、偏好、账户信息等需要同步的数据
   */
  getUserDataPath() {
    return this.paths?.userData;
  }

  /**
   * 获取缓存目录 (Local)
   * 用于存储缓存、临时文件等不应同步的数据
   */
  getCachePath() {
    return this.paths?.cache;
  }

  /**
   * 获取插件目录 (Local)
   * 用于存储已安装的插件
   */
  getPluginsPath() {
    return this.paths?.plugins;
  }

  /**
   * 获取日志目录 (Local)
   * 用于存储应用日志
   */
  getLogsPath() {
    return this.paths?.logs;
  }

  /**
   * 获取临时目录
   */
  getTempPath() {
    return this.paths?.temp;
  }

  /**
   * 获取特定类型的路径
   * @param {string} pathType - 路径类型: userData, cache, plugins, logs, temp
   */
  async getSpecificPath(pathType) {
    if (this.isWeb) {
      // Web 环境返回虚拟路径
      return this.paths?.[pathType] || null;
    }

    if (!this.isElectron) {
      return null;
    }

    try {
      return await window.electronAPI.getSpecificPath(pathType);
    } catch (error) {
      console.error(`❌ [PathService] 获取路径失败 [${pathType}]:`, error);
      return null;
    }
  }

  /**
   * 打印路径信息（用于调试）
   */
  printPaths() {
    if (!this.paths) {
      console.log('路径配置未初始化');
      return;
    }

    const envType = this.isWeb ? 'Web 虚拟路径' : 'Electron 本地路径';
    console.log(`📁 应用路径配置 (${envType}):`);
    console.log('  - 用户数据 (Roaming):', this.paths.userData);
    console.log('  - 缓存 (Local):', this.paths.cache);
    console.log('  - 插件 (Local):', this.paths.plugins);
    console.log('  - 日志 (Local):', this.paths.logs);
    console.log('  - 临时目录:', this.paths.temp);
  }

  /**
   * 检查路径服务是否可用
   */
  isAvailable() {
    return !!this.paths;
  }

  /**
   * 获取当前环境类型
   */
  getEnvironment() {
    return this.isElectron ? 'electron' : 'web';
  }
}

// 创建单例实例
export const pathService = new PathService();
