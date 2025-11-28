/**
 * 智能体数据服务
 * 从API获取智能体数据，支持本地缓存和后台更新
 */

import { DataCacheService } from '../DataCacheService.js';
import { AgentApiService } from '../api/AgentApiService.js';

export class AgentDataService {
  constructor(options = {}) {
    this.cache = new Map();
    this.agentsData = null;
    this.eventBus = options.eventBus;

    // 代码版本号
    this.CODE_VERSION = '3.0.0';

    // 新增：缓存和API服务
    this.dataCacheService = new DataCacheService();
    this.agentApiService = new AgentApiService();

    // 更新状态
    this.updateAvailable = false;
    this.newVersion = null;
    this.updateCheckInterval = null;

    // 智能体详情缓存
    this.detailCache = new Map();

    // 防止重复检查的标志
    this.isCheckingVersion = false;
  }

  /**
   * 初始化数据服务
   */
  async initialize() {
    if (this.agentsData) return;

    try {
      // 1. 检查是否有缓存
      if (this.dataCacheService.hasAgentsCache()) {
        // 2. 使用缓存数据
        const cachedData = this.dataCacheService.getAgentsData();
        if (cachedData && cachedData.data) {
          this.agentsData = cachedData.data;
          const lastFetchTime = cachedData.lastFetchTime;
          console.log('✅ [AgentDataService] 使用缓存数据，上次请求:', lastFetchTime ? new Date(lastFetchTime).toISOString() : '未知');

          // 3. 后台静默检查更新（基于时间间隔）
          this.checkForUpdates();
        } else {
          // 缓存数据无效，重新获取
          console.warn('⚠️ [AgentDataService] 缓存数据无效，重新获取');
          await this.fetchAndCacheData();
        }
      } else {
        // 4. 无缓存，直接请求API
        console.log('📡 [AgentDataService] 无缓存，从API获取数据');
        await this.fetchAndCacheData();
      }

      console.log('✅ [AgentDataService] 智能体数据服务初始化完成');
    } catch (error) {
      console.error('❌ [AgentDataService] 智能体数据服务初始化失败:', error);
      // 不抛出错误，使用默认数据
      if (!this.agentsData) {
        this.agentsData = this.getDefaultData();
      }
    }
  }

  /**
   * 获取并缓存数据
   */
  async fetchAndCacheData() {
    try {
      // 获取平台信息
      const { platform, arch } = this.getPlatformInfo();

      // 请求API（无需认证）
      console.log('📡 [AgentDataService] 从API获取数据...');
      const apiResponse = await this.agentApiService.fetchAgentsData(platform, arch);

      // 提取并缓存分类列表和分类-智能体映射
      const { categories, categoryAgentsMap, totalCount } = this.extractCategoryList(apiResponse);
      this.dataCacheService.saveAgentsCategories({
        categories: categories,
        categoryAgentsMap: categoryAgentsMap,
        totalCount: totalCount
      });

      // 保存到缓存（使用当前时间戳）
      if (apiResponse) {
        this.dataCacheService.saveAgentsData(apiResponse, Date.now());
        console.log('✅ [AgentDataService] 数据已缓存，时间:', new Date().toISOString());
      }

      // 更新内存数据
      this.agentsData = apiResponse;

    } catch (error) {
      console.error('❌ [AgentDataService] 获取数据失败:', error);

      // 如果有缓存，使用缓存
      if (this.dataCacheService.hasAgentsCache()) {
        const cachedData = this.dataCacheService.getAgentsData();
        if (cachedData && cachedData.data) {
          this.agentsData = cachedData.data;
          console.log('⚠️ [AgentDataService] API失败，使用缓存数据作为降级方案');
          return;
        }
      }

      // 使用默认数据
      this.agentsData = this.getDefaultData();
      console.log('⚠️ [AgentDataService] API失败且无缓存，使用默认数据');
    }
  }

  /**
   * 检查更新（后台静默）
   * 基于时间间隔，10分钟内不重复请求
   */
  async checkForUpdates() {
    try {
      // 检查是否需要重新请求（10分钟间隔）
      if (!this.dataCacheService.shouldFetchAgents()) {
        console.log('⏰ [AgentDataService] 距离上次请求不足10分钟，跳过更新检查');
        return;
      }

      console.log('🔍 [AgentDataService] 后台检查更新（超过10分钟间隔）...');

      // 获取平台信息
      const { platform, arch } = this.getPlatformInfo();

      // 请求最新数据（无需认证，强制刷新API缓存）
      const apiResponse = await this.agentApiService.fetchAgentsData(platform, arch, false, true);

      // 提取并缓存分类列表和分类-智能体映射
      const { categories, categoryAgentsMap, totalCount } = this.extractCategoryList(apiResponse);
      this.dataCacheService.saveAgentsCategories({
        categories: categories,
        categoryAgentsMap: categoryAgentsMap,
        totalCount: totalCount
      });

      // 对比新旧数据是否有变化
      const hasDataChanged = this.hasDataChanged(this.agentsData, apiResponse);

      if (hasDataChanged) {
        console.log('🆕 [AgentDataService] 发现数据变化，更新缓存');

        // 保存新数据到缓存（记录当前时间）
        this.dataCacheService.saveAgentsData(apiResponse, Date.now());

        // 更新内存数据
        this.agentsData = apiResponse;

        // 清除内存缓存（getAgentsByCategory 的缓存）
        this.cache.clear();
        console.log('🗑️ [AgentDataService] 已清除内存缓存');

        // 发送数据更新事件（让 AgentStore 刷新 UI）
        if (this.eventBus) {
          console.log('📢 [AgentDataService] EventBus 实例:', this.eventBus);
          this.eventBus.emit('agents:data-updated', {
            timestamp: Date.now()
          });
          console.log('📢 [AgentDataService] 已发送 agents:data-updated 事件');
        }
      } else {
        console.log('✅ [AgentDataService] 数据无变化，仅更新请求时间');
        // 数据无变化，只更新请求时间
        this.dataCacheService.updateLastFetchTime(Date.now());
      }
    } catch (error) {
      console.warn('⚠️ [AgentDataService] 静默更新检查失败，继续使用缓存数据:', error);
    }
  }

  /**
   * 检查并更新智能体（完整流程）
   * 这是 Sidebar 切换时调用的主方法
   * 基于时间间隔，10分钟内不重复请求
   * @returns {Promise<Object>} { hasUpdate: boolean, updatedAgents: Array }
   */
  async checkAndUpdateAgents() {
    // 防止重复检查
    if (this.isCheckingVersion) {
      console.log('⏳ [AgentDataService] 正在检查，跳过重复请求');
      return { hasUpdate: false, updatedAgents: [] };
    }

    try {
      this.isCheckingVersion = true;
      console.log('🔍 [AgentDataService] 开始检查智能体数据...');

      // 1. 检查是否需要重新请求（10分钟间隔）
      if (!this.dataCacheService.shouldFetchAgents()) {
        console.log('⏰ [AgentDataService] 距离上次请求不足10分钟，使用缓存数据');
        return { hasUpdate: false, updatedAgents: [] };
      }

      console.log('🔄 [AgentDataService] 超过10分钟间隔，开始后台请求...');

      // 2. 请求智能体列表（完整数据，强制刷新API缓存）
      const { platform, arch } = this.getPlatformInfo();
      const apiResponse = await this.agentApiService.fetchAgentsData(platform, arch, false, true);

      // 3. 对比新旧数据（在保存新数据前对比，否则旧数据会丢失）
      const agentsToUpdate = this.compareAgentVersions(apiResponse);
      const hasDataChanged = this.hasDataChanged(this.agentsData, apiResponse);

      // 4. 提取分类列表（用于侧边栏显示）
      const { categories, categoryAgentsMap, totalCount } = this.extractCategoryList(apiResponse);
      this.dataCacheService.saveAgentsCategories({
        categories,
        categoryAgentsMap,
        totalCount
      });

      if (hasDataChanged) {
        console.log('🆕 [AgentDataService] 发现数据变化，更新缓存');

        // 5. 保存新数据到缓存（记录当前时间）
        this.dataCacheService.saveAgentsData(apiResponse, Date.now());

        // 6. 更新内存数据
        this.agentsData = apiResponse;

        // 6.5 清除内存缓存（getAgentsByCategory 的缓存）
        this.cache.clear();
        console.log('🗑️ [AgentDataService] 已清除内存缓存');

        // 7. 发送数据更新事件（让 AgentStore 刷新 UI）
        if (this.eventBus) {
          console.log('📢 [AgentDataService] EventBus 实例:', this.eventBus);
          this.eventBus.emit('agents:data-updated', {
            timestamp: Date.now()
          });
          console.log('📢 [AgentDataService] 已发送 agents:data-updated 事件');
        } else {
          console.warn('⚠️ [AgentDataService] EventBus 未初始化，无法发送更新事件');
        }

        // 8. 处理需要更新的智能体
        if (agentsToUpdate.length > 0) {
          if (typeof this.handleForceUpdateAgents === 'function') {
            try {
              await this.handleForceUpdateAgents(agentsToUpdate);
            } catch (error) {
              console.error('❌ [AgentDataService] 处理智能体更新失败:', error);
            }
          }
        }

        return {
          hasUpdate: true,
          updatedAgents: agentsToUpdate
        };
      } else {
        console.log('✅ [AgentDataService] 数据无变化，仅更新请求时间');
        // 数据无变化，只更新请求时间
        this.dataCacheService.updateLastFetchTime(Date.now());

        return { hasUpdate: false, updatedAgents: [] };
      }

    } catch (error) {
      console.error('❌ [AgentDataService] 检查更新失败:', error);
      return { hasUpdate: false, updatedAgents: [], error };
    } finally {
      this.isCheckingVersion = false;
    }
  }

  /**
   * 对比智能体版本，找出需要更新的智能体
   * @param {Object} apiResponse - 新的API响应数据
   * @returns {Array} 需要更新的智能体列表（包含新增、版本变化、强制更新的智能体）
   */
  compareAgentVersions(apiResponse) {
    if (!apiResponse || !apiResponse.items) {
      return [];
    }

    const newAgents = apiResponse.items;
    const agentsToUpdate = [];

    // 获取本地缓存的智能体数据（旧数据）
    const cachedData = this.dataCacheService.getAgentsData();
    const oldAgentsMap = new Map();

    // 从缓存中提取智能体列表（兼容新旧两种数据格式）
    if (cachedData && cachedData.data) {
      const rawData = cachedData.data;

      // 新格式：后端原始数据 { version, last_updated, items: [...] }
      if (rawData.items && Array.isArray(rawData.items)) {
        rawData.items.forEach(agent => {
          oldAgentsMap.set(agent.id, agent);
        });
      }
      // 旧格式：convertApiFormat 转换后的数据 { version, last_updated, categories: {...} }
      else if (rawData.categories && typeof rawData.categories === 'object') {
        Object.values(rawData.categories).forEach(category => {
          if (category.agents && Array.isArray(category.agents)) {
            category.agents.forEach(agent => {
              if (!oldAgentsMap.has(agent.id)) {
                oldAgentsMap.set(agent.id, agent);
              }
            });
          }
        });
      } else {
        // 无法识别的格式，清除缓存
        this.dataCacheService.clearAgentsCache();
      }
    }

    // 遍历新的智能体列表，对比版本
    newAgents.forEach(newAgent => {
      const oldAgent = oldAgentsMap.get(newAgent.id);

      if (!oldAgent) {
        // 新增的智能体
        agentsToUpdate.push({
          ...newAgent,
          oldVersion: null,
          updateReason: 'new'
        });
      } else if (oldAgent.version !== newAgent.version) {
        // 版本号变化的智能体
        const updateReason = newAgent.force_update === true ? 'force_update' : 'version_change';
        agentsToUpdate.push({
          ...newAgent,
          oldVersion: oldAgent.version,
          updateReason
        });
      }
      // 版本未变化，不需要更新（即使 force_update=true 也忽略）
    });

    return agentsToUpdate;
  }

  /**
   * 查找需要强制更新的智能体（已废弃，使用 compareAgentVersions 替代）
   * @deprecated 使用 compareAgentVersions 方法替代
   * @param {Object} apiResponse - API 响应数据
   * @returns {Array} 需要强制更新的智能体列表
   */
  findForceUpdateAgents(apiResponse) {
    if (!apiResponse || !apiResponse.items) {
      return [];
    }

    return apiResponse.items.filter(agent => agent.force_update === true);
  }

  /**
   * 处理强制更新的智能体
   * 只触发事件，具体更新逻辑由 AgentManager 处理
   * @param {Array} agents - 需要强制更新的智能体列表
   */
  async handleForceUpdateAgents(agents) {
    for (const agent of agents) {
      try {
        // 获取智能体更新信息
        const updateInfo = await this.getAgentUpdateInfo(agent.id);

        if (!updateInfo || !updateInfo.detailData) {
          // 即使获取详情失败，也要清除UI缓存
          try {
            const { AgentUILoader } = await import('./AgentUILoader.js');
            const uiLoader = new AgentUILoader();
            await uiLoader.clearCache(agent.id);
          } catch (err) {
            console.error(`❌ [AgentDataService] 清除UI缓存失败: ${agent.id}`, err);
          }
          continue;
        }

        const { detailData, needsDownload, filesToDownload } = updateInfo;

        // 清除UI缓存
        try {
          const { AgentUILoader } = await import('./AgentUILoader.js');
          const uiLoader = new AgentUILoader();
          await uiLoader.clearCache(agent.id);
        } catch (err) {
          console.error(`❌ [AgentDataService] 清除UI缓存失败: ${agent.id}`, err);
        }

        // 如果需要下载文件，触发下载事件
        if (needsDownload.executables || needsDownload.librarys) {
          if (this.eventBus) {
            this.eventBus.emit('agent:force-update', {
              agentId: agent.id,
              detailData,
              needsDownload,
              filesToDownload
            });
          }
        }

      } catch (error) {
        console.error(`❌ [AgentDataService] 处理更新失败: ${agent.id}`, error);
      }
    }
  }

  /**
   * 获取智能体更新信息（包括详情和是否需要下载）
   * 统一处理详情获取、缓存对比、hash检查
   * @param {string} agentId - 智能体ID
   * @returns {Promise<Object>} { detailData, needsDownload, filesToDownload }
   */
  async getAgentUpdateInfo(agentId) {
    try {
      // 旧版本：需要平台信息（已废弃）
      // const { platform, arch } = this.getPlatformInfo();
      const cachedDetail = this.dataCacheService.getAgentDetail(agentId);
      // 新版本：不再传递 platform 和 arch 参数（纯 JS/CSS 加载方式）
      const detailData = await this.agentApiService.getAgentDetail(agentId);

      if (!detailData) {
        return {
          detailData: null,
          needsDownload: { executables: false, librarys: false },
          filesToDownload: { executables: {}, librarys: {} }
        };
      }

      const downloadInfo = this.checkFilesToDownload(detailData, cachedDetail);
      this.dataCacheService.saveAgentDetail(agentId, detailData);

      return {
        detailData,
        needsDownload: downloadInfo.needsDownload,
        filesToDownload: downloadInfo.filesToDownload
      };

    } catch (error) {
      console.error(`❌ [AgentDataService] 获取更新信息失败: ${agentId}`, error);
      throw error;
    }
  }

  /**
   * 对比新旧数据是否有变化
   * @param {Object} oldData - 旧数据
   * @param {Object} newData - 新数据
   * @returns {boolean} true表示数据有变化
   */
  hasDataChanged(oldData, newData) {
    // return true;
    // 如果旧数据不存在，认为有变化
    if (!oldData) {
      return true;
    }

    // 如果新数据不存在，认为无变化
    if (!newData) {
      return false;
    }

    // 方案1：对比数组长度
    if (oldData.items?.length !== newData.items?.length) {
      console.log('📊 [AgentDataService] 数据长度变化:', {
        old: oldData.items?.length,
        new: newData.items?.length
      });
      return true;
    } else {
      console.log('📊 [AgentDataService] 数据长度无变化:', oldData.items?.length);
    }

    // 方案2：对比所有智能体的ID列表
    const oldIds = oldData.items?.map(a => a.id).sort().join(',') || '';
    const newIds = newData.items?.map(a => a.id).sort().join(',') || '';
    if (oldIds !== newIds) {
      console.log('📊 [AgentDataService] 智能体ID列表变化');
      return true;
    } else {
      console.log('📊 [AgentDataService] 智能体ID列表无变化:', oldIds);
    }

    // 方案3：对比每个智能体的版本号
    for (let i = 0; i < newData.items?.length; i++) {
      const newAgent = newData.items[i];
      const oldAgent = oldData.items?.find(a => a.id === newAgent.id);

      if (oldAgent && oldAgent.version !== newAgent.version) {
        console.log(`📊 [AgentDataService] 智能体版本变化: ${newAgent.id}`, {
          old: oldAgent.version,
          new: newAgent.version
        });
        return true;
      } else {
        console.log(`📊 [AgentDataService] 智能体版本无变化: ${newAgent.id}`, {
          old: oldAgent.version,
          new: newAgent.version
        });
      }
    }

    return false;
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // 检测操作系统
    let os = 'win';
    if (platform.includes('mac')) {
      os = 'mac';
    } else if (platform.includes('linux')) {
      os = 'linux';
    }

    // 检测架构
    let arch = 'amd64';
    if (userAgent.includes('arm') || userAgent.includes('aarch64')) {
      arch = 'arm64';
    } else if (userAgent.includes('x86') && !userAgent.includes('x86_64')) {
      arch = 'x86';
    }

    return { platform: os, arch };
  }

  /**
   * 检查哪些文件需要下载
   * 新逻辑：使用本地缓存的 hash 去查询新接口，如果返回空 URL，说明文件有更新
   * @param {Object} newDetail - 新的详情数据
   * @param {Object} cachedDetail - 缓存的详情数据
   * @returns {Object} { needsDownload: { executables: boolean, librarys: boolean }, filesToDownload: { executables: {}, librarys: {} } }
   */
  checkFilesToDownload(newDetail, cachedDetail) {
    const result = {
      needsDownload: {
        executables: false,
        librarys: false
      },
      filesToDownload: {
        executables: {},
        librarys: {}
      }
    };

    // 获取新接口的文件列表
    const newExecutables = newDetail.detail?.executables || {};
    const newLibrarys = newDetail.detail?.librarys || {};

    // 如果没有缓存，下载所有文件
    if (!cachedDetail || !cachedDetail.detail) {
      console.log(`📥 [AgentDataService] 无缓存，下载所有文件`);

      if (Object.keys(newExecutables).length > 0) {
        result.needsDownload.executables = true;
        result.filesToDownload.executables = newExecutables;
      }

      if (Object.keys(newLibrarys).length > 0) {
        result.needsDownload.librarys = true;
        result.filesToDownload.librarys = newLibrarys;
      }

      return result;
    }

    // 获取缓存的文件列表
    const cachedExecutables = cachedDetail.detail?.executables || {};
    const cachedLibrarys = cachedDetail.detail?.librarys || {};

    // 检查 executables：用缓存的 hash 去新接口查询
    const cachedExeHashes = Object.keys(cachedExecutables);
    for (const hash of cachedExeHashes) {
      // 如果新接口中没有这个 hash，说明文件有更新
      if (!newExecutables[hash]) {
        console.log(`🔄 [AgentDataService] Executable hash 不存在于新接口: ${hash}`);
        result.needsDownload.executables = true;
        // 下载所有新的 executables
        result.filesToDownload.executables = newExecutables;
        break;
      }
    }

    // 检查是否有新增的 executable hash
    const newExeHashes = Object.keys(newExecutables);
    if (!result.needsDownload.executables && newExeHashes.length > cachedExeHashes.length) {
      console.log(`🔄 [AgentDataService] 发现新增的 executable 文件`);
      result.needsDownload.executables = true;
      result.filesToDownload.executables = newExecutables;
    }

    // 检查 librarys：用缓存的 hash 去新接口查询
    const cachedLibHashes = Object.keys(cachedLibrarys);
    for (const hash of cachedLibHashes) {
      // 如果新接口中没有这个 hash，说明文件有更新
      if (!newLibrarys[hash]) {
        console.log(`🔄 [AgentDataService] Library hash 不存在于新接口: ${hash}`);
        result.needsDownload.librarys = true;
        // 下载所有新的 librarys
        result.filesToDownload.librarys = newLibrarys;
        break;
      }
    }

    // 检查是否有新增的 library hash
    const newLibHashes = Object.keys(newLibrarys);
    if (!result.needsDownload.librarys && newLibHashes.length > cachedLibHashes.length) {
      console.log(`🔄 [AgentDataService] 发现新增的 library 文件`);
      result.needsDownload.librarys = true;
      result.filesToDownload.librarys = newLibrarys;
    }

    return result;
  }

  /**
   * 转换API格式为内部格式
   * API格式: { version, last_updated, items: [...] }
   * 内部格式: { version, last_updated, categories: { [categoryName]: { agents: [...] } } }
   */
  convertApiFormat(data) {
    if (!data || !data.items) {
      console.warn('⚠️ [AgentDataService] API响应格式无效', {
        hasResponse: !!data,
        hasItems: data?.items !== undefined,
        responseKeys: data ? Object.keys(data) : []
      });
      return this.getDefaultData();
    }

    // 根据 category 字段分组智能体
    const categoriesMap = {};

    data.items.forEach(item => {
      // 获取智能体的分类（支持多分类）
      const itemCategories = item.category || [];

      // 如果没有分类，跳过（不添加到任何分类中）
      if (itemCategories.length === 0) {
        return;
      }

      itemCategories.forEach(categoryName => {
        // 直接使用 categoryName 作为 ID（不做任何转换）
        const categoryId = categoryName;

        // 如果分类不存在，创建它
        if (!categoriesMap[categoryId]) {
          categoriesMap[categoryId] = {
            id: categoryId,
            name: categoryName,
            description: `${categoryName}类智能体`,
            agents: []
          };
        }

        // 将智能体添加到分类中
        categoriesMap[categoryId].agents.push(item);
      });
    });

    return {
      version: data.version || '1.0.0',
      last_updated: data.last_updated || new Date().toISOString(),
      categories: categoriesMap
    };
  }

  /**
   * 从API响应中提取分类列表（去重）并缓存每个分类对应的智能体
   * @param {Object} apiResponse - API响应数据
   * @returns {Object} { categories: [...], categoryAgentsMap: {...} }
   */
  extractCategoryList(apiResponse) {
    if (!apiResponse || !apiResponse.items) {
      return { categories: [], categoryAgentsMap: {}, totalCount: 0 };
    }

    // 使用Map来统计每个分类的智能体数量和智能体列表
    const categoryMap = new Map();
    const categoryAgentsMap = {}; // 存储每个分类对应的智能体列表

    apiResponse.items.forEach(item => {
      const itemCategories = item.category || [];

      // 如果没有分类，跳过
      if (itemCategories.length === 0) {
        return;
      }

      itemCategories.forEach(categoryName => {
        // 直接使用 categoryName 作为 ID
        const categoryId = categoryName;

        if (categoryMap.has(categoryId)) {
          // 分类已存在，增加计数
          const category = categoryMap.get(categoryId);
          category.count++;
          // 添加智能体到该分类的列表
          categoryAgentsMap[categoryId].push(item);
        } else {
          // 新分类，添加到Map
          categoryMap.set(categoryId, {
            id: categoryId,
            name: categoryName,
            count: 1
          });
          // 初始化该分类的智能体列表
          categoryAgentsMap[categoryId] = [item];
        }
      });
    });

    // 转换为数组并排序（按名称排序）
    const categoryList = Array.from(categoryMap.values()).sort((a, b) => {
      return a.name.localeCompare(b.name, 'zh-CN');
    });

    const totalCount = apiResponse.items.length;

    console.log('📋 [AgentDataService] 提取分类列表:', categoryList);
    console.log('📊 [AgentDataService] 总智能体数量:', totalCount);

    return {
      categories: categoryList,
      categoryAgentsMap: categoryAgentsMap,
      totalCount: totalCount
    };
  }

  /**
   * 获取缓存的分类数据
   * @returns {Object} { categories: [], categoryAgentsMap: {}, totalCount: 0 }
   */
  getCachedCategoryData() {
    const cached = this.dataCacheService.getAgentsCategories();
    if (cached && cached.categories && cached.categories.length > 0) {
      console.log('📋 [AgentDataService] 使用缓存的分类数据:', cached);
      return cached;
    }

    // 如果没有缓存，返回空数据
    console.log('ℹ️ [AgentDataService] 无分类缓存数据');
    return {
      categories: [],
      categoryAgentsMap: {},
      totalCount: 0
    };
  }

  /**
   * 根据分类ID获取智能体列表
   * @param {string} categoryId - 分类ID
   * @returns {Array} 智能体列表
   */
  getAgentsByCategoryId(categoryId) {
    const cached = this.dataCacheService.getAgentsCategories();
    if (cached && cached.categoryAgentsMap && cached.categoryAgentsMap[categoryId]) {
      return cached.categoryAgentsMap[categoryId];
    }
    return [];
  }

  /**
   * 获取平台信息
   */
  getPlatformInfo() {
    const userAgent = navigator.userAgent.toLowerCase();
    const platform = navigator.platform.toLowerCase();

    // 检测操作系统
    let os = 'win';
    if (platform.includes('mac')) {
      os = 'mac';
    } else if (platform.includes('linux')) {
      os = 'linux';
    }

    // 检测架构
    let arch = 'amd64';
    if (userAgent.includes('arm') || userAgent.includes('aarch64')) {
      arch = 'arm64';
    } else if (userAgent.includes('x86') && !userAgent.includes('x86_64')) {
      arch = 'x86';
    }

    console.log('🖥️ [AgentDataService] 平台信息:', { platform: os, arch });
    return { platform: os, arch };
  }

  /**
   * 获取认证Token
   */
  getAuthToken() {
    try {
      // 尝试从UserManager获取
      if (window.userManager && typeof window.userManager.getAccessToken === 'function') {
        return window.userManager.getAccessToken();
      }

      // 尝试从localStorage获取
      const token = localStorage.getItem('Questech_access_token');
      return token;
    } catch (error) {
      console.warn('⚠️ [AgentDataService] 获取Token失败:', error);
      return null;
    }
  }

  /**
   * 发送更新通知
   */
  notifyUpdate(newVersion) {
    console.log('📢 [AgentDataService] 发送更新通知，新版本:', newVersion);

    // 发送事件通知（不构建 message，由 App.js 统一处理显示格式）
    if (this.eventBus) {
      this.eventBus.emit('data:update-available', {
        type: 'agents',
        version: newVersion,
        action: 'reload'
      });
    }
  }

  /**
   * 应用更新（重新加载数据）
   */
  async applyUpdate() {
    try {
      console.log('🔄 [AgentDataService] 应用更新...');

      // 从缓存读取新数据
      const cachedData = this.dataCacheService.getAgentsData();
      if (cachedData && cachedData.data) {
        this.agentsData = cachedData.data;
        this.updateAvailable = false;
        this.newVersion = null;

        // 清除内存缓存
        this.cache.clear();

        console.log('✅ [AgentDataService] 更新已应用');
        return true;
      }

      return false;
    } catch (error) {
      console.error('❌ [AgentDataService] 应用更新失败:', error);
      return false;
    }
  }

  /**
   * 根据分类ID获取智能体列表
   * TODO: 将来替换为真实的API调用
   */
  async getAgentsByCategory(categoryId) {
    await this.initialize();

    // 检查缓存
    if (this.cache.has(categoryId)) {
      console.log(`📋 从缓存获取分类数据: ${categoryId}`);
      return this.cache.get(categoryId);
    }

    console.log(`🌐 请求分类数据: ${categoryId}`);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 300));

    // TODO: 将来替换为真实的API调用
    // const response = await fetch(`/api/agents/category/${categoryId}`);
    // const result = await response.json();

    let result;

    if (categoryId === 'all' || !categoryId) {
      // 获取所有智能体
      result = this.getAllAgents();
    } else {
      // 获取特定分类的智能体（从缓存的分类数据中获取）
      const categoriesData = this.dataCacheService.getAgentsCategories();
      const categoryAgentsMap = categoriesData?.categoryAgentsMap || {};
      const agentIds = categoryAgentsMap[categoryId] || [];

      // 从 items 中筛选出该分类的智能体
      const categoryAgents = [];
      if (this.agentsData && this.agentsData.items) {
        agentIds.forEach(agentId => {
          const agent = this.agentsData.items.find(a => a.id === agentId);
          if (agent) {
            categoryAgents.push(agent);
          }
        });
      }

      result = {
        category: { id: categoryId, name: categoryId },
        agents: categoryAgents
      };
    }

    // 缓存结果
    this.cache.set(categoryId, result);

    return result;
  }

  /**
   * 获取所有智能体（去重）
   */
  getAllAgents() {
    // 现在使用原始API数据格式：{ items: [...] }
    if (!this.agentsData || !this.agentsData.items) {
      console.warn('⚠️ [AgentDataService] 智能体数据未加载');
      return {
        category: { id: 'all', name: '全部智能体' },
        agents: [],
        categories: []
      };
    }

    // 直接使用 items 数组
    const allAgents = this.agentsData.items || [];

    // 从缓存的分类列表中获取分类信息
    const categoriesData = this.dataCacheService.getAgentsCategories();
    const categories = categoriesData?.categories || [];

    return {
      category: { id: 'all', name: '全部智能体' },
      agents: allAgents,
      categories: categories
    };
  }

  /**
   * 根据智能体ID获取详细信息
   * @param {string} agentId - 智能体ID
   * @param {boolean} forceApi - 是否强制从API获取详情（默认false，优先使用本地缓存）
   * @returns {Promise<Object>} 智能体详情数据
   */
  async getAgentById(agentId, forceApi = false) {
    await this.initialize();

    console.log(`🌐 [AgentDataService] 请求智能体详情: ${agentId}, forceApi: ${forceApi}`);

    // 如果不强制从API获取，优先从本地缓存查找
    if (!forceApi) {
      console.log('🔍 [AgentDataService] 优先从本地缓存查找智能体:', agentId);

      // 从 items 数组中查找智能体
      if (this.agentsData && this.agentsData.items) {
        const agent = this.agentsData.items.find(a => a.id === agentId);
        if (agent) {
          console.log('✅ [AgentDataService] 从本地缓存找到智能体:', agent.name);
          return agent;
        }
      }

      console.warn('⚠️ [AgentDataService] 本地缓存未找到智能体，尝试从API获取');

      // 检查详情缓存（仅在不强制从API获取时使用）
      if (this.detailCache.has(agentId)) {
        console.log('📋 [AgentDataService] 使用详情缓存:', agentId);
        return this.detailCache.get(agentId);
      }
    } else {
      // 如果强制从API获取，清除该智能体的缓存
      if (this.detailCache.has(agentId)) {
        console.log('🗑️ [AgentDataService] forceApi=true，清除详情缓存:', agentId);
        this.detailCache.delete(agentId);
      }
    }

    try {
      // 旧版本：需要平台信息（已废弃）
      // const { platform, arch } = this.getPlatformInfo();
      // const agentDetail = await this.agentApiService.getAgentDetail(agentId, platform, arch);
      
      // 新版本：不再传递 platform 和 arch 参数（纯 JS/CSS 加载方式）
      const agentDetail = await this.agentApiService.getAgentDetail(agentId);

      if (agentDetail) {
        console.log('✅ [AgentDataService] 从 API 获取详情成功');

        // 缓存结果（5分钟）
        this.detailCache.set(agentId, agentDetail);
        setTimeout(() => {
          this.detailCache.delete(agentId);
        }, 5 * 60 * 1000);

        return agentDetail;
      }
    } catch (error) {
      console.error('❌ [AgentDataService] API 获取详情失败:', error);

      // 如果强制从API获取但失败了，尝试从本地缓存降级
      if (forceApi && this.agentsData && this.agentsData.items) {
        console.warn('⚠️ [AgentDataService] API失败，降级到本地缓存');

        const agent = this.agentsData.items.find(a => a.id === agentId);
        if (agent) {
          console.log('✅ [AgentDataService] 从本地缓存找到智能体（降级）:', agent.name);
          return agent;
        }
      }

      throw error;
    }

    throw new Error(`智能体不存在: ${agentId}`);
  }

  /**
   * 搜索智能体
   * TODO: 将来替换为真实的API调用
   */
  async searchAgents(query) {
    await this.initialize();

    console.log(`🔍 搜索智能体: ${query}`);

    // 模拟网络延迟
    await new Promise(resolve => setTimeout(resolve, 400));

    // TODO: 将来替换为真实的API调用
    // const response = await fetch(`/api/agents/search?q=${encodeURIComponent(query)}`);
    // return await response.json();

    // 当前实现：从本地数据中搜索
    const results = [];
    const lowerQuery = query.toLowerCase();

    if (this.agentsData && this.agentsData.items) {
      for (const agent of this.agentsData.items) {
        if (
          agent.name.toLowerCase().includes(lowerQuery) ||
          agent.description.toLowerCase().includes(lowerQuery) ||
          agent.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
        ) {
          results.push(agent);
        }
      }
    }

    return {
      query: query,
      results: results,
      total: results.length
    };
  }

  /**
   * 获取默认数据（当无法从服务器获取时使用）
   */
  getDefaultData() {
    return {
      "version": "1.0.0",
      "last_updated": "2025-01-06T10:00:00Z",
      "categories": {
        "power_agent_tools": {
          "id": "power_agent_tools",
          "name": "工具类",
          "description": "实用工具类智能体",
          "agents": [
            {
              "id": "math_calculator",
              "name": "数学计算器",
              "description": "基于Python的数学计算工具，支持基础运算和数学函数",
              "icon": "🧮",
              "version": "1.0.0",
              "author": "Questech Team",
              "type": "python",
              "status": "available",
              "detail": {
                "executables": {},
                "librarys": {},
                "dependencies": []
              },
              "size": "15KB",
              "tags": [
                "数学",
                "计算",
                "工具"
              ],
              "category": [
                "工具"
              ],
              "rating": 4.8,
              "downloads": 1250,
              "features": [
                "基础四则运算 (+, -, *, /)",
                "高级运算 (**, //, %)",
                "数学函数 (sqrt, sin, cos, tan, log等)",
                "表达式计算",
                "错误处理"
              ],
              "examples": [
                "55 + 3",
                "sqrt(16)",
                "sin(0)",
                "2 ** 3"
              ]
            },
            {
              "id": "pdf_tools",
              "name": "PDF 工具集",
              "description": "包含PDF合并、创建和OCR文字识别功能的工具集",
              "icon": "📝",
              "version": "1.0.0",
              "author": "Questech Team",
              "type": "package",
              "status": "available",
              "detail": {
                "executables": {},
                "librarys": {},
                "dependencies": []
              },
              "size": "55.6MB",
              "tags": [
                "PDF",
                "办公"
              ],
              "category": [
                "工具"
              ],
              "rating": 4.6,
              "downloads": 980,
              "features": null,
              "examples": null
            }
          ]
        }
      }
    };
  }

  /**
   * 清除缓存
   */
  clearCache() {
    this.cache.clear();
    this.detailCache.clear();
    console.log('🗑️ [AgentDataService] 智能体数据缓存已清除');
  }

  /**
   * 清除详情缓存
   * @param {string} agentId - 可选，指定要清除的智能体ID，不传则清除所有
   */
  clearDetailCache(agentId = null) {
    if (agentId) {
      this.detailCache.delete(agentId);
      console.log(`🗑️ [AgentDataService] 已清除智能体详情缓存: ${agentId}`);
    } else {
      this.detailCache.clear();
      console.log('🗑️ [AgentDataService] 已清除所有智能体详情缓存');
    }
  }
}

// 创建单例实例（延迟初始化，等待 eventBus 注入）
let _agentDataServiceInstance = null;

/**
 * 获取或创建 AgentDataService 单例
 * @param {Object} options - 配置选项
 * @returns {AgentDataService}
 */
export function getAgentDataService(options = {}) {
  if (!_agentDataServiceInstance) {
    _agentDataServiceInstance = new AgentDataService(options);
  }
  return _agentDataServiceInstance;
}

// 为了向后兼容，导出一个默认实例（不带 eventBus）
export const agentDataService = new AgentDataService();
