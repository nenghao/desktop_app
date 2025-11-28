/**
 * 智能体执行器
 * 注意: 智能体现在都在服务器端执行，本地不再需要执行功能
 * 此类保留用于兼容性,但大部分功能已迁移到服务器
 */

import { electronAdapter } from '../../utils/electron-adapter.js';

export class AgentExecutor {
  constructor(storageManager) {
    this.storageManager = storageManager;
  }

  /**
   * 执行智能体
   * 注意: 此方法已废弃，智能体现在在服务器端执行
   * @deprecated 请使用服务器端 API 执行智能体
   * @param {string} agentId - 智能体ID
   * @param {string} method - 方法名
   * @param {Array} args - 参数列表
   * @returns {Promise<Object>} 执行结果
   */
  async executeAgent(agentId, method, args = []) {
    console.warn(`⚠️ executeAgent 方法已废弃，智能体执行已迁移到服务器端`);
    throw new Error(`智能体执行功能已迁移到服务器，请使用服务器 API 执行智能体`);
  }


  /**
   * 加载manifest.json
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} manifest对象
   */
  async loadManifest(agentId) {
    if (!electronAdapter.isElectron) {
      throw new Error('浏览器环境无法加载manifest');
    }

    try {
      const manifestPath = await this.storageManager.getManifestPath(agentId);
      const content = await window.fileAPI.readFile(manifestPath);
      return JSON.parse(content);
    } catch (error) {
      throw new Error(`加载manifest失败: ${error.message}`);
    }
  }

  /**
   * 检查智能体是否可执行
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} 检查结果
   */
  async checkAgentExecutable(agentId) {
    try {
      const manifest = await this.loadManifest(agentId);
      
      return {
        executable: true,
        type: manifest.type,
        dependencyStatus: manifest.dependency_status,
        needsInstall: manifest.dependency_status === 'pending' || 
                      manifest.dependency_status === 'failed'
      };
    } catch (error) {
      return {
        executable: false,
        error: error.message
      };
    }
  }

  /**
   * 获取智能体信息
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} 智能体信息
   */
  async getAgentInfo(agentId) {
    const manifest = await this.loadManifest(agentId);
    
    return {
      id: manifest.id,
      name: manifest.name,
      version: manifest.version,
      type: manifest.type,
      installedAt: manifest.installed_at,
      dependencyStatus: manifest.dependency_status,
      platform: manifest.platform,
      entryPoint: manifest.entry_point
    };
  }
}

