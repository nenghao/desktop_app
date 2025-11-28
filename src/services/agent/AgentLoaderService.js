/**
 * 智能体加载服务
 */

import { ExecutableAgent } from './agents/ExecutableAgent.js';
import { AgentStatus, AgentConfigValidator } from '../types/agent.js';
import { electronAdapter } from '../utils/electron-adapter.js';

export class AgentLoaderService {
  constructor() {
    this.loadedAgents = new Map();
    this.loadingQueue = new Map();
    this.downloadQueue = new Map();
    this.agentRegistry = new Map();
    this.maxConcurrentLoads = 3;
    this.maxConcurrentDownloads = 2;

    this.setupEventListeners();
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听应用退出事件
    if (electronAdapter.isElectronApp()) {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  /**
   * 注册智能体
   */
  registerAgent(config) {
    // 验证配置
    const validation = AgentConfigValidator.validate(config);
    if (!validation.valid) {
      throw new Error(`智能体配置无效: ${validation.errors.join(', ')}`);
    }

    this.agentRegistry.set(config.id, config);
    console.log(`✅ 智能体已注册: ${config.id}`);
  }

  /**
   * 获取智能体配置
   */
  getAgentConfig(agentId) {
    return this.agentRegistry.get(agentId);
  }

  /**
   * 检查智能体是否已加载
   */
  isAgentLoaded(agentId) {
    return this.loadedAgents.has(agentId);
  }

  /**
   * 获取已加载的智能体
   */
  getLoadedAgent(agentId) {
    return this.loadedAgents.get(agentId);
  }

  /**
   * 加载智能体
   */
  async loadAgent(agentId) {
    // 检查是否已加载
    if (this.loadedAgents.has(agentId)) {
      return this.loadedAgents.get(agentId);
    }

    // 检查是否正在加载
    if (this.loadingQueue.has(agentId)) {
      return await this.loadingQueue.get(agentId);
    }

    // 开始加载
    const loadPromise = this.performLoad(agentId);
    this.loadingQueue.set(agentId, loadPromise);

    try {
      const agent = await loadPromise;
      this.loadedAgents.set(agentId, agent);
      return agent;
    } finally {
      this.loadingQueue.delete(agentId);
    }
  }

  /**
   * 执行加载
   */
  async performLoad(agentId) {
    console.log(`🔄 开始加载智能体: ${agentId}`);

    try {
      // 获取智能体配置
      const config = await this.getOrFetchAgentConfig(agentId);

      // 检查智能体文件是否存在
      await this.ensureAgentFiles(agentId, config);

      // 创建智能体实例
      const agent = new ExecutableAgent(config);

      // 初始化智能体
      await agent.initialize();

      console.log(`✅ 智能体加载成功: ${agentId}`);
      return agent;

    } catch (error) {
      console.error(`❌ 智能体加载失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 获取或获取智能体配置
   */
  async getOrFetchAgentConfig(agentId) {
    // 先从注册表获取
    let config = this.agentRegistry.get(agentId);

    if (!config) {
      // 从本地文件获取
      config = await this.loadAgentConfigFromFile(agentId);
    }

    if (!config) {
      // 从远程获取
      config = await this.fetchAgentConfigFromRemote(agentId);
    }

    if (!config) {
      throw new Error(`无法找到智能体配置: ${agentId}`);
    }

    return config;
  }

  /**
   * 从文件加载智能体配置
   */
  async loadAgentConfigFromFile(agentId) {
    try {
      const agentDir = await this.getAgentDirectory(agentId);
      const configPath = electronAdapter.path.join(agentDir, 'agent.json');

      const exists = await electronAdapter.fileExists(configPath);
      if (!exists) {
        return null;
      }

      const result = await electronAdapter.readFile(configPath);
      if (result.success) {
        return JSON.parse(result.content);
      }

      return null;
    } catch (error) {
      console.error(`读取智能体配置文件失败: ${agentId}`, error);
      return null;
    }
  }

  /**
   * 从远程获取智能体配置
   */
  async fetchAgentConfigFromRemote(agentId) {
    try {
      if (window.app && window.app.getService) {
        const apiService = window.app.getService('apiService');
        if (apiService) {
          const response = await apiService.get(`/agents/${agentId}/config`);
          return response.data;
        }
      }

      return null;
    } catch (error) {
      console.error(`获取远程智能体配置失败: ${agentId}`, error);
      return null;
    }
  }

  /**
   * 确保智能体文件存在
   */
  async ensureAgentFiles(agentId, config) {
    const agentDir = await this.getAgentDirectory(agentId);
    const executablePath = electronAdapter.path.join(agentDir, config.executable);

    const exists = await electronAdapter.fileExists(executablePath);

    if (!exists) {
      // 下载智能体文件
      await this.downloadAgent(agentId, config);
    }
  }

  /**
   * 下载智能体
   */
  async downloadAgent(agentId, config) {
    // 检查是否正在下载
    if (this.downloadQueue.has(agentId)) {
      return await this.downloadQueue.get(agentId);
    }

    // 开始下载
    const downloadPromise = this.performDownload(agentId, config);
    this.downloadQueue.set(agentId, downloadPromise);

    try {
      await downloadPromise;
    } finally {
      this.downloadQueue.delete(agentId);
    }
  }

  /**
   * 执行下载
   */
  async performDownload(agentId, config) {
    console.log(`📥 开始下载智能体: ${agentId}`);

    try {
      // 创建智能体目录
      const agentDir = await this.getAgentDirectory(agentId);
      await this.ensureDirectory(agentDir);

      // 下载可执行文件
      await this.downloadExecutable(agentId, config, agentDir);

      // 下载其他资源文件
      await this.downloadResources(agentId, config, agentDir);

      // 保存配置文件
      await this.saveAgentConfig(agentId, config, agentDir);

      console.log(`✅ 智能体下载成功: ${agentId}`);

    } catch (error) {
      console.error(`❌ 智能体下载失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 下载可执行文件
   */
  async downloadExecutable(agentId, config, agentDir) {
    const executableUrl = this.getDownloadUrl(agentId, config.executable);
    const executablePath = electronAdapter.path.join(agentDir, config.executable);

    await this.downloadFile(executableUrl, executablePath);

    // 设置可执行权限（Unix系统）
    if (electronAdapter.getPlatform() !== 'win32') {
      // 在实际实现中，需要设置文件权限
    }
  }

  /**
   * 下载资源文件
   */
  async downloadResources(agentId, config, agentDir) {
    if (!config.resources || config.resources.length === 0) {
      return;
    }

    for (const resource of config.resources) {
      const resourceUrl = this.getDownloadUrl(agentId, resource.path);
      const resourcePath = electronAdapter.path.join(agentDir, resource.path);

      await this.downloadFile(resourceUrl, resourcePath);
    }
  }

  /**
   * 下载文件
   */
  async downloadFile(url, filePath) {
    if (electronAdapter.isElectronApp()) {
      // Electron环境中的文件下载
      const response = await fetch(url);
      const buffer = await response.arrayBuffer();
      const uint8Array = new Uint8Array(buffer);

      await electronAdapter.writeFile(filePath, uint8Array);
    } else {
      // Web环境中的模拟下载
      console.log(`模拟下载文件: ${url} -> ${filePath}`);
    }
  }

  /**
   * 保存智能体配置
   */
  async saveAgentConfig(agentId, config, agentDir) {
    const configPath = electronAdapter.path.join(agentDir, 'agent.json');
    const configContent = JSON.stringify(config, null, 2);

    await electronAdapter.writeFile(configPath, configContent);
  }

  /**
   * 获取下载URL
   */
  getDownloadUrl(agentId, filePath) {
    const baseUrl = 'http://localhost:8080/downloads/agents';
    return `${baseUrl}/${agentId}/${filePath}`;
  }

  /**
   * 获取智能体目录
   */
  async getAgentDirectory(agentId) {
    if (electronAdapter.isElectronApp()) {
      const userDataPath = await electronAdapter.getAppPath('userData');
      return electronAdapter.path.join(userDataPath, 'agents', agentId);
    } else {
      return `/agents/${agentId}`;
    }
  }

  /**
   * 确保目录存在
   */
  async ensureDirectory(dirPath) {
    if (electronAdapter.isElectronApp()) {
      // 在实际实现中，需要创建目录
      console.log(`确保目录存在: ${dirPath}`);
    }
  }

  /**
   * 卸载智能体
   */
  async unloadAgent(agentId) {
    const agent = this.loadedAgents.get(agentId);

    if (agent) {
      try {
        // 停止智能体
        if (agent.status === AgentStatus.RUNNING) {
          await agent.stop();
        }

        // 清理资源
        await agent.cleanup?.();

        this.loadedAgents.delete(agentId);

        console.log(`✅ 智能体已卸载: ${agentId}`);

      } catch (error) {
        console.error(`❌ 智能体卸载失败: ${agentId}`, error);
        throw error;
      }
    }
  }

  /**
   * 删除智能体文件
   */
  async removeAgent(agentId) {
    // 先卸载智能体
    await this.unloadAgent(agentId);

    try {
      // 删除智能体目录
      const agentDir = await this.getAgentDirectory(agentId);

      if (electronAdapter.isElectronApp()) {
        // 在实际实现中，需要删除目录
        console.log(`删除智能体目录: ${agentDir}`);
      }

      // 从注册表移除
      this.agentRegistry.delete(agentId);

      console.log(`✅ 智能体已删除: ${agentId}`);

    } catch (error) {
      console.error(`❌ 智能体删除失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 获取所有已加载的智能体
   */
  getAllLoadedAgents() {
    return Array.from(this.loadedAgents.values());
  }

  /**
   * 获取加载状态
   */
  getLoadingStatus() {
    return {
      loaded: this.loadedAgents.size,
      loading: this.loadingQueue.size,
      downloading: this.downloadQueue.size
    };
  }

  /**
   * 清理资源
   */
  async cleanup() {
    console.log('🧹 清理智能体加载服务...');

    // 停止所有智能体
    const stopPromises = Array.from(this.loadedAgents.values()).map(agent => {
      if (agent.status === AgentStatus.RUNNING) {
        return agent.stop().catch(error => {
          console.error(`停止智能体失败: ${agent.config.id}`, error);
        });
      }
    });

    await Promise.all(stopPromises);

    // 清理映射
    this.loadedAgents.clear();
    this.loadingQueue.clear();
    this.downloadQueue.clear();

    console.log('✅ 智能体加载服务清理完成');
  }
}

/**
 * 创建全局智能体加载服务实例
 */
export const agentLoaderService = new AgentLoaderService();
