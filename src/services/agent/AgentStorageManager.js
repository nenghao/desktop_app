/**
 * 智能体存储管理器
 * 负责管理智能体文件的存储路径和目录结构
 * 遵循各操作系统的标准路径规范
 */

import { electronAdapter } from '../../utils/electron-adapter.js';

export class AgentStorageManager {
  constructor() {
    this.basePath = null;
    this.platform = null;
    this.initialized = false;
  }

  /**
   * 初始化存储管理器
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ AgentStorageManager 已初始化');
      return;
    }

    try {
      // 检测平台
      this.platform = this.detectPlatform();
      console.log(`🖥️ 检测到平台: ${this.platform}`);

      // 获取存储根路径
      this.basePath = await this.getAgentStoragePath();
      console.log(`📁 智能体存储路径: ${this.basePath}`);

      // 确保必要的目录存在
      await this.ensureDirectories();

      this.initialized = true;
      console.log('✅ AgentStorageManager 初始化完成');

    } catch (error) {
      console.error('❌ AgentStorageManager 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 检测操作系统平台
   */
  detectPlatform() {
    if (electronAdapter.isElectron) {
      return electronAdapter.getPlatform();
    }
    
    // 浏览器环境回退
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('win')) return 'win';
    if (userAgent.includes('mac')) return 'darwin';
    if (userAgent.includes('linux')) return 'linux';
  
    return 'unknown';
  };

  /**
   * 获取智能体存储根路径
   * 遵循各操作系统的标准路径规范
   */
  async getAgentStoragePath() {
    if (electronAdapter.isElectron) {
      // Electron环境：使用userData路径
      const userDataPath = await electronAdapter.getAppPath('userData');
      return electronAdapter.path.join(userDataPath, 'agents');
    } else {
      // 浏览器环境：使用相对路径（用于开发测试）
      return './agents';
    }
  }

  /**
   * 确保必要的目录存在
   */
  async ensureDirectories() {
    // 构建目录路径列表（需要await path.join）
    const directories = [];

    directories.push(this.basePath); // agents/

    if (electronAdapter.isElectron) {
      directories.push(await window.pathAPI.join(this.basePath, 'installed'));
      directories.push(await window.pathAPI.join(this.basePath, 'cache'));
      directories.push(await window.pathAPI.join(this.basePath, 'cache', 'downloads'));
      directories.push(await window.pathAPI.join(this.basePath, 'temp'));
    } else {
      directories.push(`${this.basePath}/installed`);
      directories.push(`${this.basePath}/cache`);
      directories.push(`${this.basePath}/cache/downloads`);
      directories.push(`${this.basePath}/temp`);
    }

    for (const dir of directories) {
      try {
        await this.ensureDirectory(dir);
        console.log(`📂 目录已确保存在: ${dir}`);
      } catch (error) {
        console.error(`❌ 创建目录失败: ${dir}`, error);
        throw error;
      }
    }
  }

  /**
   * 确保单个目录存在
   */
  async ensureDirectory(dirPath) {
    if (electronAdapter.isElectron) {
      // 通过Electron API创建目录
      if (window.electronAPI && window.electronAPI.ensureDirectory) {
        await window.electronAPI.ensureDirectory(dirPath);
      } else {
        console.warn('⚠️ ensureDirectory API 不可用');
      }
    } else {
      // 浏览器环境：无法创建目录，仅记录
      console.log(`🌐 浏览器环境，跳过目录创建: ${dirPath}`);
    }
  }

  /**
   * 获取智能体安装目录
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   * @returns {Promise<string>} 安装目录路径
   */
  async getAgentInstallPath(agentId, version) {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(
        this.basePath,
        'installed',
        agentId,
        `v${version}`
      );
    } else {
      return `${this.basePath}/installed/${agentId}/v${version}`;
    }
  }

  /**
   * 获取智能体当前版本目录（通过软链接）
   * @param {string} agentId - 智能体ID
   * @returns {Promise<string>} 当前版本目录路径
   */
  async getAgentCurrentPath(agentId) {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(
        this.basePath,
        'installed',
        agentId,
        'current'
      );
    } else {
      return `${this.basePath}/installed/${agentId}/current`;
    }
  }

  /**
   * 获取智能体根目录
   * @param {string} agentId - 智能体ID
   * @returns {Promise<string>} 智能体根目录路径
   */
  async getAgentRootPath(agentId) {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(
        this.basePath,
        'installed',
        agentId
      );
    } else {
      return `${this.basePath}/installed/${agentId}`;
    }
  }

  /**
   * 获取缓存目录
   * @returns {Promise<string>} 缓存目录路径
   */
  async getCachePath() {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(this.basePath, 'cache', 'downloads');
    } else {
      return `${this.basePath}/cache/downloads`;
    }
  }

  /**
   * 获取临时目录
   * @returns {Promise<string>} 临时目录路径
   */
  async getTempPath() {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(this.basePath, 'temp');
    } else {
      return `${this.basePath}/temp`;
    }
  }

  /**
   * 获取已安装智能体列表文件路径
   * @returns {Promise<string>} 列表文件路径
   */
  async getInstalledAgentsListPath() {
    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(this.basePath, 'installed_agents.json');
    } else {
      return `${this.basePath}/installed_agents.json`;
    }
  }

  /**
   * 获取智能体manifest.json路径
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号（可选，默认使用current）
   * @returns {Promise<string>} manifest.json路径
   */
  async getManifestPath(agentId, version = null) {
    const basePath = version
      ? await this.getAgentInstallPath(agentId, version)
      : await this.getAgentCurrentPath(agentId);

    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(basePath, 'manifest.json');
    } else {
      return `${basePath}/manifest.json`;
    }
  }

  /**
   * 获取缓存文件路径
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   * @param {string} fileName - 文件名
   * @returns {Promise<string>} 缓存文件路径
   */
  async getCacheFilePath(agentId, version, fileName) {
    const cachePath = await this.getCachePath();

    if (electronAdapter.isElectron) {
      return await window.pathAPI.join(
        cachePath,
        `${agentId}_v${version}_${fileName}`
      );
    } else {
      return `${cachePath}/${agentId}_v${version}_${fileName}`;
    }
  }

  /**
   * 检查智能体是否已安装
   * @param {string} agentId - 智能体ID
   * @returns {Promise<boolean>} 是否已安装
   */
  async isAgentInstalled(agentId) {
    const currentPath = await this.getAgentCurrentPath(agentId);

    if (electronAdapter.isElectron) {
      return await electronAdapter.fileExists(currentPath);
    }

    return false;
  }

  /**
   * 获取智能体已安装的版本列表
   * @param {string} agentId - 智能体ID
   * @returns {Promise<string[]>} 版本列表
   */
  async getInstalledVersions(agentId) {
    const agentRootPath = await this.getAgentRootPath(agentId);

    if (!electronAdapter.isElectron) {
      return [];
    }

    try {
      // 通过Electron API读取目录
      if (window.electronAPI && window.electronAPI.readDirectory) {
        const entries = await window.electronAPI.readDirectory(agentRootPath);
        
        // 过滤出版本目录（以v开头的目录）
        const versions = entries
          .filter(entry => entry.isDirectory && entry.name.startsWith('v'))
          .map(entry => entry.name.substring(1)); // 移除v前缀
        
        return versions;
      }
    } catch (error) {
      console.error(`❌ 读取版本列表失败: ${agentId}`, error);
    }
    
    return [];
  }

  /**
   * 清理缓存文件
   * @param {number} maxAge - 最大保留时间（毫秒），默认7天
   */
  async cleanupCache(maxAge = 7 * 24 * 60 * 60 * 1000) {
    if (!electronAdapter.isElectron) {
      console.log('🌐 浏览器环境，跳过缓存清理');
      return;
    }

    try {
      const cachePath = await this.getCachePath();

      if (window.electronAPI && window.electronAPI.cleanupOldFiles) {
        const deletedCount = await window.electronAPI.cleanupOldFiles(cachePath, maxAge);
        console.log(`🧹 缓存清理完成，删除 ${deletedCount} 个文件`);
      }
    } catch (error) {
      console.error('❌ 缓存清理失败:', error);
    }
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStorageStats() {
    if (!electronAdapter.isElectron) {
      return {
        totalSize: 0,
        installedCount: 0,
        cacheSize: 0
      };
    }

    try {
      const stats = {
        totalSize: 0,
        installedCount: 0,
        cacheSize: 0
      };

      // 获取已安装智能体数量
      if (window.electronAPI && window.electronAPI.readDirectory) {
        const installedPath = await window.pathAPI.join(this.basePath, 'installed');
        const entries = await window.electronAPI.readDirectory(installedPath);
        stats.installedCount = entries.filter(e => e.isDirectory).length;
      }

      // 获取目录大小
      if (window.electronAPI && window.electronAPI.getDirectorySize) {
        stats.totalSize = await window.electronAPI.getDirectorySize(this.basePath);
        const cachePath = await this.getCachePath();
        stats.cacheSize = await window.electronAPI.getDirectorySize(cachePath);
      }

      return stats;
    } catch (error) {
      console.error('❌ 获取存储统计失败:', error);
      return {
        totalSize: 0,
        installedCount: 0,
        cacheSize: 0
      };
    }
  }

  /**
   * 获取基础路径
   * @returns {string} 基础路径
   */
  getBasePath() {
    return this.basePath;
  }

  /**
   * 获取平台信息
   * @returns {string} 平台标识
   */
  getPlatform() {
    return this.platform;
  }
}

// 创建全局实例
export const agentStorageManager = new AgentStorageManager();

