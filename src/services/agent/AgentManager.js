/**
 * 智能体管理器 - 完全重构版本
 * 负责智能体的生命周期管理：下载、安装、执行、卸载
 * 整合所有Manager组件，提供统一的API接口
 */

import { AgentStorageManager } from './AgentStorageManager.js';
import { AgentDownloadManager } from './AgentDownloadManager.js';
import { AgentInstallManager } from './AgentInstallManager.js';
import { AgentExecutor } from './AgentExecutor.js';

export class AgentManager {
  constructor(options = {}) {
    this.storageManager = null;
    this.downloadManager = null;
    this.installManager = null;
    this.executor = null;
    this.eventBus = options.eventBus || null;
    this.initialized = false;
  }

  /**
   * 初始化智能体管理器
   */
  async initialize() {
    if (this.initialized) {
      console.log('✅ AgentManager 已初始化');
      return;
    }

    try {
      console.log('🔧 初始化 AgentManager...');

      // 初始化存储管理器
      this.storageManager = new AgentStorageManager();
      await this.storageManager.initialize();

      // 初始化下载管理器
      this.downloadManager = new AgentDownloadManager(this.storageManager);

      // 初始化安装管理器
      this.installManager = new AgentInstallManager(this.storageManager);
      await this.installManager.initialize();

      // 初始化执行器
      this.executor = new AgentExecutor(this.storageManager);

      // 设置事件监听器
      this.setupEventListeners();

      this.initialized = true;
      console.log('✅ AgentManager 初始化完成');

    } catch (error) {
      console.error('❌ AgentManager 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 设置事件监听器
   */
  setupEventListeners() {
    if (!this.eventBus) {
      console.warn('⚠️ [AgentManager] EventBus 未注入，无法监听事件');
      return;
    }

    // 监听强制更新事件（由 AgentDataService 自动触发）
    this.eventBus.on('agent:force-update', async (data) => {
      console.log('📢 [AgentManager] 收到强制更新事件:', data);
      await this.updateAgent(data.agentId);
    });

    console.log('✅ [AgentManager] 事件监听器已设置');
  }

  /**
   * 统一的智能体更新方法
   * 处理所有类型的更新（强制更新、用户触发更新）
   * @param {string} agentId - 智能体ID
   */
  async updateAgent(agentId) {
    try {
      console.log(`🔄 [AgentManager] 开始更新智能体: ${agentId}`);

      // 1. 从 AgentDataService 获取更新信息（包括详情和是否需要下载）
      const agentDataService = this.getAgentDataService();
      if (!agentDataService) {
        throw new Error('AgentDataService 未找到');
      }

      const { detailData, needsDownload, filesToDownload } = await agentDataService.getAgentUpdateInfo(agentId);
      if (!detailData) {
        throw new Error(`获取智能体更新信息失败: ${agentId}`);
      }

      console.log(`📋 [AgentManager] 智能体详情:`, {
        id: detailData.id,
        name: detailData.name,
        version: detailData.version,
        executables: detailData.detail?.executables,
        librarys: detailData.detail?.librarys
      });
      console.log(`📊 [AgentManager] 需要下载:`, needsDownload);
      console.log(`📊 [AgentManager] 待下载文件:`, filesToDownload);

      // 2. 如果需要下载，准备下载数据并执行下载和安装
      if (needsDownload.executables || needsDownload.librarys) {
        // 将新格式转换为下载管理器需要的格式
        const downloadData = this.prepareDownloadData(detailData, filesToDownload);

        await this.downloadAndInstallAgent(downloadData, (progress) => {
          console.log(`📊 [AgentManager] ${detailData.name} 更新进度:`, progress);
        });
      } else {
        console.log(`ℹ️ [AgentManager] 文件 hash 未变化，无需下载`);
      }

      console.log(`✅ [AgentManager] 智能体更新完成: ${detailData.name}`);

    } catch (error) {
      console.error(`❌ [AgentManager] 智能体更新失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 准备下载数据
   * 将 API 详情数据转换为下载管理器需要的格式
   * @param {Object} detailData - API 详情数据
   * @param {Object} filesToDownload - 需要下载的文件 { executables: {}, librarys: {} }
   * @returns {Object} 下载数据
   */
  prepareDownloadData(detailData, filesToDownload) {
    return {
      id: detailData.id,
      name: detailData.name,
      version: detailData.version,
      type: detailData.type,
      description: detailData.description,
      dependencies: detailData.detail?.dependencies || [],
      // 新格式：executables 和 librarys 是对象
      executables: filesToDownload.executables || {},
      librarys: filesToDownload.librarys || {}
    };
  }

  /**
   * 获取 AgentDataService 实例
   */
  getAgentDataService() {
    return window.agentDataService || window.app?.getService('agentDataService');
  }

  /**
   * 下载并安装智能体
   * @param {Object} agentData - 智能体数据（从API获取）
   * @param {Function} progressCallback - 进度回调函数
   * @returns {Promise<Object>} 安装结果
   */
  async downloadAndInstallAgent(agentData, progressCallback = null) {
    this.ensureInitialized();

    try {
      console.log(`📥 开始下载并安装智能体: ${agentData.id}`);

      // 检查是否已安装
      if (this.isAgentInstalled(agentData.id)) {
        console.log(`ℹ️ 智能体已安装: ${agentData.id}`);
        // TODO: 可以添加版本比较，决定是否更新
      }

      // 准备安装数据：确保 dependencies 从 detail 中读取
      const installData = {
        ...agentData,
        dependencies: agentData.detail?.dependencies || agentData.dependencies || []
      };

      console.log(`📦 智能体依赖信息:`, {
        id: installData.id,
        dependencies: installData.dependencies
      });

      // 1. 下载智能体文件
      const downloadTask = await this.downloadManager.downloadAgent(installData, progressCallback);

      // 2. 安装智能体
      const installResult = await this.installManager.installAgent(
        installData,
        downloadTask,
        progressCallback
      );

      console.log(`✅ 智能体下载安装完成: ${agentData.id}`);

      return installResult;

    } catch (error) {
      console.error(`❌ 智能体下载安装失败: ${agentData.id}`, error);
      throw error;
    }
  }

  /**
   * 执行智能体
   * @param {string} agentId - 智能体ID
   * @param {string} method - 方法名
   * @param {Array} args - 参数列表
   * @returns {Promise<Object>} 执行结果
   */
  async executeAgent(agentId, method, args = []) {
    this.ensureInitialized();

    try {
      return await this.executor.executeAgent(agentId, method, args);
    } catch (error) {
      console.error(`❌ 执行智能体失败: ${agentId}.${method}()`, error);
      throw error;
    }
  }

  /**
   * 检查智能体是否已安装
   * @param {string} agentId - 智能体ID
   * @returns {boolean} 是否已安装
   */
  isAgentInstalled(agentId) {
    this.ensureInitialized();
    return this.installManager.isInstalled(agentId);
  }

  /**
   * 验证智能体完整性并在需要时重新安装
   * @param {Object} agentData - 智能体数据
   * @param {Function} progressCallback - 进度回调
   * @returns {Promise<boolean>} 是否需要重新安装
   */
  async verifyAndRepairAgent(agentData, progressCallback = null) {
    this.ensureInitialized();

    try {
      const agentId = agentData.id;

      // 1. 检查是否在已安装列表中
      if (!this.isAgentInstalled(agentId)) {
        console.log(`📦 智能体未安装: ${agentId}`);
        return true; // 需要安装
      }

      // 2. 验证文件完整性
      console.log(`🔍 验证智能体文件完整性: ${agentId}`);
      const isIntact = await this.installManager.verifyAgentIntegrity(agentId);

      if (!isIntact) {
        console.log(`⚠️ 智能体文件不完整，需要重新安装: ${agentId}`);

        // 3. 从已安装列表中移除（但不删除文件，因为可能已经被删除了）
        const agent = this.installManager.getInstalledAgent(agentId);
        if (agent) {
          this.installManager.installedAgents.delete(agentId);
          await this.installManager.saveInstalledAgents();
          console.log(`🗑️ 已从安装列表中移除: ${agentId}`);
        }

        return true; // 需要重新安装
      }

      console.log(`✅ 智能体文件完整: ${agentId}`);
      return false; // 不需要重新安装

    } catch (error) {
      console.error(`❌ 验证智能体失败: ${agentData.id}`, error);
      return true; // 出错时，尝试重新安装
    }
  }

  /**
   * 获取已安装智能体信息
   * @param {string} agentId - 智能体ID
   * @returns {Object|null} 智能体信息
   */
  getInstalledAgent(agentId) {
    this.ensureInitialized();
    return this.installManager.getInstalledAgent(agentId);
  }

  /**
   * 获取所有已安装智能体
   * @returns {Array} 已安装智能体列表
   */
  getAllInstalledAgents() {
    this.ensureInitialized();
    return this.installManager.getAllInstalledAgents();
  }

  /**
   * 卸载智能体
   * @param {string} agentId - 智能体ID
   */
  async uninstallAgent(agentId) {
    this.ensureInitialized();

    try {
      await this.installManager.uninstallAgent(agentId);
      console.log(`✅ 智能体卸载成功: ${agentId}`);
    } catch (error) {
      console.error(`❌ 智能体卸载失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 获取智能体信息
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} 智能体信息
   */
  async getAgentInfo(agentId) {
    this.ensureInitialized();
    return await this.executor.getAgentInfo(agentId);
  }

  /**
   * 检查智能体是否可执行
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} 检查结果
   */
  async checkAgentExecutable(agentId) {
    this.ensureInitialized();
    return await this.executor.checkAgentExecutable(agentId);
  }

  /**
   * 取消下载
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   */
  async cancelDownload(agentId, version) {
    this.ensureInitialized();
    await this.downloadManager.cancelDownload(agentId, version);
  }

  /**
   * 获取下载进度
   * @param {string} agentId - 智能体ID
   * @param {string} version - 版本号
   * @returns {Object|null} 下载进度
   */
  getDownloadProgress(agentId, version) {
    this.ensureInitialized();
    return this.downloadManager.getDownloadProgress(agentId, version);
  }

  /**
   * 获取存储统计信息
   * @returns {Promise<Object>} 统计信息
   */
  async getStorageStats() {
    this.ensureInitialized();
    return await this.storageManager.getStorageStats();
  }

  /**
   * 清理缓存
   * @param {number} maxAge - 最大保留时间（毫秒）
   */
  async cleanupCache(maxAge) {
    this.ensureInitialized();
    await this.storageManager.cleanupCache(maxAge);
  }

  /**
   * 确保已初始化
   */
  ensureInitialized() {
    if (!this.initialized) {
      throw new Error('AgentManager 未初始化，请先调用 initialize()');
    }
  }

  // ==================== 固定智能体功能 ====================

  /**
   * 获取固定的智能体列表
   * @returns {Array} 固定的智能体列表
   */
  getPinnedAgents() {
    try {
      const pinnedData = localStorage.getItem('pinnedAgents');
      if (!pinnedData) {
        return [];
      }

      const pinnedAgents = JSON.parse(pinnedData);
      console.log('📌 获取固定智能体列表:', pinnedAgents);
      return Array.isArray(pinnedAgents) ? pinnedAgents : [];
    } catch (error) {
      console.error('❌ 获取固定智能体列表失败:', error);
      return [];
    }
  }

  /**
   * 固定智能体
   * @param {Object} agentData - 智能体数据
   */
  async pinAgent(agentData) {
    try {
      const pinnedAgents = this.getPinnedAgents();

      // 检查是否已固定
      const existingIndex = pinnedAgents.findIndex(a => a.id === agentData.id);
      if (existingIndex !== -1) {
        console.log('ℹ️ 智能体已固定:', agentData.id);
        return;
      }

      // 添加到固定列表
      const pinnedAgent = {
        id: agentData.id,
        name: agentData.name,
        icon: agentData.icon,
        route: `/agent/${agentData.id}`,
        order: pinnedAgents.length,
        pinnedAt: Date.now()
      };

      pinnedAgents.push(pinnedAgent);

      // 保存到localStorage
      localStorage.setItem('pinnedAgents', JSON.stringify(pinnedAgents));
      console.log('📌 已固定智能体:', agentData.id);

      // 发送全局事件通知 Sidebar 更新
      if (this.eventBus) {
        this.eventBus.emit('agent:pinned', {
          agentId: agentData.id,
          agentData: pinnedAgent,
          timestamp: Date.now()
        });
        console.log('📢 发送 agent:pinned 事件');
      }
    } catch (error) {
      console.error('❌ 固定智能体失败:', error);
      throw error;
    }
  }

  /**
   * 取消固定智能体
   * @param {string} agentId - 智能体ID
   */
  async unpinAgent(agentId) {
    try {
      const pinnedAgents = this.getPinnedAgents();

      // 过滤掉要取消固定的智能体
      const newPinnedAgents = pinnedAgents.filter(a => a.id !== agentId);

      // 保存到localStorage
      localStorage.setItem('pinnedAgents', JSON.stringify(newPinnedAgents));
      console.log('📌 已取消固定智能体:', agentId);

      // 发送全局事件通知 Sidebar 更新
      if (this.eventBus) {
        this.eventBus.emit('agent:unpinned', {
          agentId: agentId,
          timestamp: Date.now()
        });
        console.log('📢 发送 agent:unpinned 事件');
      }
    } catch (error) {
      console.error('❌ 取消固定智能体失败:', error);
      throw error;
    }
  }

  /**
   * 检查智能体是否已固定
   * @param {string} agentId - 智能体ID
   * @returns {boolean} 是否已固定
   */
  isPinned(agentId) {
    try {
      const pinnedAgents = this.getPinnedAgents();
      return pinnedAgents.some(a => a.id === agentId);
    } catch (error) {
      console.error('❌ 检查固定状态失败:', error);
      return false;
    }
  }

  /**
   * 重新排序固定的智能体
   * @param {Array} newOrder - 新的排序（智能体ID数组）
   */
  async reorderPinnedAgents(newOrder) {
    try {
      const pinnedAgents = this.getPinnedAgents();

      // 根据新顺序重新排列
      const reorderedAgents = newOrder.map((id, index) => {
        const agent = pinnedAgents.find(a => a.id === id);
        if (agent) {
          agent.order = index;
        }
        return agent;
      }).filter(a => a !== undefined);

      // 保存到localStorage
      localStorage.setItem('pinnedAgents', JSON.stringify(reorderedAgents));
      console.log('📌 已重新排序固定智能体:', newOrder);

      // 发送全局事件通知 Sidebar 更新
      if (this.eventBus) {
        this.eventBus.emit('agents:reordered', {
          newOrder: newOrder,
          timestamp: Date.now()
        });
        console.log('📢 发送 agents:reordered 事件');
      }
    } catch (error) {
      console.error('❌ 重新排序固定智能体失败:', error);
      throw error;
    }
  }
}

// 创建全局实例
export const agentManager = new AgentManager();

