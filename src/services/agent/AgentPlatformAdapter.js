/**
 * Agent 平台适配器
 * 为 Agent 相关服务提供跨平台支持（Electron/Web）
 */

import { isElectron, isWeb, safeElectronCall } from '../../utils/platform-detector.js';

export class AgentPlatformAdapter {
  constructor() {
    this.isElectron = isElectron();
    this.isWeb = isWeb();
  }

  /**
   * 检查本地 Agent 功能是否可用
   * Web 环境下本地 Agent 功能不可用
   */
  isLocalAgentAvailable() {
    return this.isElectron;
  }

  /**
   * 读取本地 Agent 文件
   * @param {string} agentId Agent ID
   * @returns {Promise<Object|null>}
   */
  async readLocalAgent(agentId) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地 Agent 读取');
      return null;
    }

    return await safeElectronCall(
      async () => window.electronAPI.readAgentFile(agentId),
      null
    );
  }

  /**
   * 写入本地 Agent 文件
   * @param {string} agentId Agent ID
   * @param {Object} data Agent 数据
   * @returns {Promise<boolean>}
   */
  async writeLocalAgent(agentId, data) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地 Agent 写入');
      return false;
    }

    return await safeElectronCall(
      async () => window.electronAPI.writeAgentFile(agentId, data),
      false
    );
  }

  /**
   * 删除本地 Agent
   * @param {string} agentId Agent ID
   * @returns {Promise<boolean>}
   */
  async deleteLocalAgent(agentId) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地 Agent 删除');
      return false;
    }

    return await safeElectronCall(
      async () => window.electronAPI.deleteAgentFile(agentId),
      false
    );
  }

  /**
   * 获取本地 Agent 列表
   * @returns {Promise<Array>}
   */
  async getLocalAgentList() {
    if (!this.isLocalAgentAvailable()) {
      console.log('🌐 Web 环境不支持本地 Agent 列表');
      return [];
    }

    return await safeElectronCall(
      async () => window.electronAPI.getLocalAgents(),
      []
    );
  }

  /**
   * 下载 Agent 到本地
   * @param {string} url 下载URL
   * @param {string} savePath 保存路径
   * @returns {Promise<boolean>}
   */
  async downloadAgent(url, savePath) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持 Agent 下载到本地');
      return false;
    }

    return await safeElectronCall(
      async () => window.electronAPI.downloadAgent(url, savePath),
      false
    );
  }

  /**
   * 安装本地 Agent
   * @param {string} agentPath Agent 路径
   * @returns {Promise<boolean>}
   */
  async installLocalAgent(agentPath) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地 Agent 安装');
      return false;
    }

    return await safeElectronCall(
      async () => window.electronAPI.installAgent(agentPath),
      false
    );
  }

  /**
   * 卸载本地 Agent
   * @param {string} agentId Agent ID
   * @returns {Promise<boolean>}
   */
  async uninstallLocalAgent(agentId) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地 Agent 卸载');
      return false;
    }

    return await safeElectronCall(
      async () => window.electronAPI.uninstallAgent(agentId),
      false
    );
  }

  /**
   * 打开本地文件选择器
   * @returns {Promise<string|null>}
   */
  async openFileDialog(options = {}) {
    if (!this.isLocalAgentAvailable()) {
      console.warn('🌐 Web 环境不支持本地文件选择');
      return null;
    }

    return await safeElectronCall(
      async () => window.electronAPI.openFileDialog(options),
      null
    );
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo() {
    return {
      platform: this.isElectron ? 'electron' : 'web',
      localAgentSupport: this.isLocalAgentAvailable(),
      features: {
        localFileAccess: this.isElectron,
        download: this.isElectron,
        install: this.isElectron
      }
    };
  }
}

// 导出单例
export const agentPlatformAdapter = new AgentPlatformAdapter();

// 打印环境信息
if (process.env.NODE_ENV === 'development') {
  const info = agentPlatformAdapter.getEnvironmentInfo();
  console.log('🔌 Agent 平台适配器:', info);
}
