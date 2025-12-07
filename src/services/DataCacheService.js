/**
 * 数据缓存服务
 * 负责管理智能体数据和应用配置的本地缓存
 * 提供版本对比和缓存管理功能
 */

import { StorageService } from './storage.js';
import { API_REQUEST_CACHE } from './api/api-config.js';

export class DataCacheService {
  constructor(storageService) {
    this.storageService = storageService || new StorageService();
    
    // 缓存Key定义
    this.CACHE_KEYS = {
      AGENTS_DATA: 'agents_data',
      AGENTS_CATEGORIES: 'agents_categories',  // 分类列表缓存
      AGENTS_DETAIL_PREFIX: 'agent_detail_',   // 智能体详情缓存前缀
      SIDEBAR_CONFIG: 'sidebar_config',
      SIDEBAR_META: 'sidebar_config_meta'
    };
    
    // 缓存配置
    this.config = {
      enableCompression: false,
      enableEncryption: false
    };
  }

  // ==================== 智能体数据缓存 ====================

  /**
   * 保存智能体数据到缓存
   * @param {Object} data - 智能体数据
   * @param {number} lastFetchTime - 上次成功请求的时间戳（毫秒）
   */
  saveAgentsData(data, lastFetchTime) {
    try {
      const cacheData = {
        data: data,
        lastFetchTime: lastFetchTime || Date.now(),
        cached_at: new Date().toISOString()
      };

      // 保存数据
      this.storageService.set(this.CACHE_KEYS.AGENTS_DATA, cacheData);

      console.log('✅ [DataCacheService] 智能体数据已缓存，时间:', new Date(cacheData.lastFetchTime).toISOString());
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 保存智能体数据失败:', error);
      return false;
    }
  }

  /**
   * 获取智能体数据缓存
   * @returns {Object|null} 缓存的数据对象 { data, lastFetchTime, cached_at }
   */
  getAgentsData() {
    try {
      const cacheData = this.storageService.get(this.CACHE_KEYS.AGENTS_DATA);

      if (!cacheData) {
        console.log('ℹ️ [DataCacheService] 无智能体数据缓存');
        return null;
      }

      return cacheData;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取智能体数据失败:', error);
      return null;
    }
  }

  /**
   * 获取上次请求时间
   * @returns {number|null} 时间戳（毫秒）
   */
  getLastFetchTime() {
    try {
      const cacheData = this.storageService.get(this.CACHE_KEYS.AGENTS_DATA);
      return cacheData?.lastFetchTime || null;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取上次请求时间失败:', error);
      return null;
    }
  }

  /**
   * 判断是否需要重新请求智能体数据
   * @param {number} intervalMs - 时间间隔（毫秒），不传则使用cache-config.js配置文件中的值
   * @returns {boolean} true表示需要重新请求
   */
  shouldFetchAgents(intervalMs) {
    try {
      // 使用配置文件中的间隔时间
      const interval = intervalMs || API_REQUEST_CACHE.AGENTS_DATA;
      const lastFetchTime = this.getLastFetchTime();

      if (!lastFetchTime) {
        console.log('🔍 [DataCacheService] 无上次请求时间，需要请求');
        return true;
      }

      const timeDiff = Date.now() - lastFetchTime;
      const shouldFetch = timeDiff >= interval;

      console.log('🔍 [DataCacheService] 时间检查:', {
        lastFetchTime: new Date(lastFetchTime).toISOString(),
        timeDiff: `${Math.floor(timeDiff / 1000)}秒`,
        intervalMs: `${interval / 1000}秒`,
        shouldFetch
      });

      return shouldFetch;
    } catch (error) {
      console.error('❌ [DataCacheService] 检查是否需要请求失败:', error);
      return false;
    }
  }

  /**
   * 仅更新上次请求时间，不更新数据
   * @param {number} timestamp - 时间戳（毫秒）
   */
  updateLastFetchTime(timestamp) {
    try {
      const cacheData = this.storageService.get(this.CACHE_KEYS.AGENTS_DATA);

      if (!cacheData) {
        console.warn('⚠️ [DataCacheService] 无缓存数据，无法更新时间');
        return false;
      }

      cacheData.lastFetchTime = timestamp || Date.now();

      this.storageService.set(this.CACHE_KEYS.AGENTS_DATA, cacheData);
      console.log('✅ [DataCacheService] 已更新请求时间:', new Date(cacheData.lastFetchTime).toISOString());
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 更新请求时间失败:', error);
      return false;
    }
  }

  /**
   * 检查是否有智能体数据缓存
   * @returns {boolean}
   */
  hasAgentsCache() {
    return this.storageService.has(this.CACHE_KEYS.AGENTS_DATA);
  }

  /**
   * 清除智能体数据缓存
   */
  clearAgentsCache() {
    try {
      this.storageService.remove(this.CACHE_KEYS.AGENTS_DATA);
      this.storageService.remove(this.CACHE_KEYS.AGENTS_CATEGORIES);
      console.log('🗑️ [DataCacheService] 智能体数据缓存已清除');
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 清除智能体数据缓存失败:', error);
      return false;
    }
  }

  /**
   * 保存智能体分类列表到缓存
   * @param {Array} categories - 分类列表
   */
  saveAgentsCategories(categories) {
    try {
      this.storageService.set(this.CACHE_KEYS.AGENTS_CATEGORIES, categories);
      console.log('✅ [DataCacheService] 智能体分类列表已缓存，数量:', categories.length);
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 保存智能体分类列表失败:', error);
      return false;
    }
  }

  /**
   * 获取智能体分类列表缓存
   * @returns {Array|null} 缓存的分类列表
   */
  getAgentsCategories() {
    try {
      const categories = this.storageService.get(this.CACHE_KEYS.AGENTS_CATEGORIES);

      if (!categories) {
        console.log('ℹ️ [DataCacheService] 无智能体分类列表缓存');
        return null;
      }

      return categories;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取智能体分类列表缓存失败:', error);
      return null;
    }
  }

  /**
   * 清除智能体分类列表缓存
   */
  clearAgentsCategoriesCache() {
    try {
      this.storageService.remove(this.CACHE_KEYS.AGENTS_CATEGORIES);
      console.log('🗑️ [DataCacheService] 智能体分类列表缓存已清除');
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 清除智能体分类列表缓存失败:', error);
      return false;
    }
  }


  // ==================== 侧边栏配置缓存 ====================

  /**
   * 保存侧边栏配置到缓存
   * @param {Object} data - 侧边栏配置数据
   * @param {string} version - 配置版本号
   */
  saveSidebarConfig(data, version) {
    try {
      const cacheData = {
        version: version,
        last_updated: data.last_updated || new Date().toISOString(),
        data: data
      };

      // 保存数据
      this.storageService.set(this.CACHE_KEYS.SIDEBAR_CONFIG, cacheData);

      // 更新元数据
      const metadata = {
        version: version,
        cached_at: new Date().toISOString(),
        last_checked: new Date().toISOString(),
        update_available: false,
        new_version: null
      };
      this.storageService.set(this.CACHE_KEYS.SIDEBAR_META, metadata);

      console.log('✅ [DataCacheService] 侧边栏配置已缓存，版本:', version);
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 保存侧边栏配置失败:', error);
      return false;
    }
  }

  /**
   * 获取侧边栏配置缓存
   * @returns {Object|null} 缓存的配置对象
   */
  getSidebarConfig() {
    try {
      const cacheData = this.storageService.get(this.CACHE_KEYS.SIDEBAR_CONFIG);

      if (!cacheData) {
        console.log('ℹ️ [DataCacheService] 无侧边栏配置缓存');
        return null;
      }

      return cacheData;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取侧边栏配置失败:', error);
      return null;
    }
  }

  /**
   * 获取侧边栏配置版本号
   * @returns {string|null} 版本号
   */
  getSidebarConfigVersion() {
    try {
      const metadata = this.storageService.get(this.CACHE_KEYS.SIDEBAR_META);
      return metadata?.version || null;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取侧边栏配置版本失败:', error);
      return null;
    }
  }

  /**
   * 检查是否有侧边栏配置缓存
   * @returns {boolean}
   */
  hasSidebarCache() {
    return this.storageService.has(this.CACHE_KEYS.SIDEBAR_CONFIG);
  }

  /**
   * 清除侧边栏配置缓存
   */
  clearSidebarCache() {
    try {
      this.storageService.remove(this.CACHE_KEYS.SIDEBAR_CONFIG);
      this.storageService.remove(this.CACHE_KEYS.SIDEBAR_META);
      console.log('🗑️ [DataCacheService] 侧边栏配置缓存已清除');
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 清除侧边栏配置缓存失败:', error);
      return false;
    }
  }

  // ==================== 元数据管理 ====================

  /**
   * 获取缓存元数据
   * @param {string} cacheKey - 缓存键名
   * @returns {Object|null} 元数据对象
   */
  getCacheMetadata(cacheKey) {
    try {
      if (cacheKey === this.CACHE_KEYS.SIDEBAR_CONFIG) {
        return this.storageService.get(this.CACHE_KEYS.SIDEBAR_META);
      }
      // 智能体数据不再使用独立的元数据，直接返回null
      return null;
    } catch (error) {
      console.error('❌ [DataCacheService] 获取缓存元数据失败:', error);
      return null;
    }
  }

  /**
   * 更新缓存元数据
   * @param {string} cacheKey - 缓存键名
   * @param {Object} metadata - 元数据对象
   */
  updateCacheMetadata(cacheKey, metadata) {
    try {
      if (cacheKey === this.CACHE_KEYS.SIDEBAR_CONFIG) {
        const metaKey = this.CACHE_KEYS.SIDEBAR_META;
        const existingMeta = this.storageService.get(metaKey) || {};
        const updatedMeta = { ...existingMeta, ...metadata };

        this.storageService.set(metaKey, updatedMeta);
        return true;
      }
      // 智能体数据不再使用独立的元数据
      return false;
    } catch (error) {
      console.error('❌ [DataCacheService] 更新缓存元数据失败:', error);
      return false;
    }
  }

  /**
   * 标记有新版本可用
   * @param {string} cacheKey - 缓存键名
   * @param {string} newVersion - 新版本号
   */
  markUpdateAvailable(cacheKey, newVersion) {
    return this.updateCacheMetadata(cacheKey, {
      update_available: true,
      new_version: newVersion,
      last_checked: new Date().toISOString()
    });
  }

  // ==================== 缓存管理 ====================

  // ==================== 智能体详情缓存 ====================

  /**
   * 保存智能体详情到缓存
   * @param {string} agentId - 智能体ID
   * @param {Object} detailData - 详情数据
   */
  saveAgentDetail(agentId, detailData) {
    try {
      const cacheKey = `${this.CACHE_KEYS.AGENTS_DETAIL_PREFIX}${agentId}`;
      const cacheData = {
        agentId,
        data: detailData,
        timestamp: Date.now(),
        cli_hash: detailData.cli_hash || null,
        lib_hash: detailData.lib_hash || null
      };

      this.storageService.set(cacheKey, cacheData);
      console.log(`✅ [DataCacheService] 智能体详情已缓存: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ [DataCacheService] 保存智能体详情失败: ${agentId}`, error);
      return false;
    }
  }

  /**
   * 获取智能体详情缓存
   * @param {string} agentId - 智能体ID
   * @returns {Object|null} 详情数据
   */
  getAgentDetail(agentId) {
    try {
      const cacheKey = `${this.CACHE_KEYS.AGENTS_DETAIL_PREFIX}${agentId}`;
      const cacheData = this.storageService.get(cacheKey);

      if (!cacheData) {
        return null;
      }

      return cacheData.data;
    } catch (error) {
      console.error(`❌ [DataCacheService] 获取智能体详情失败: ${agentId}`, error);
      return null;
    }
  }

  /**
   * 检查智能体详情是否有缓存
   * @param {string} agentId - 智能体ID
   * @returns {boolean}
   */
  hasAgentDetailCache(agentId) {
    const cacheKey = `${this.CACHE_KEYS.AGENTS_DETAIL_PREFIX}${agentId}`;
    return this.storageService.has(cacheKey);
  }

  /**
   * 清除智能体详情缓存
   * @param {string} agentId - 智能体ID
   */
  clearAgentDetail(agentId) {
    try {
      const cacheKey = `${this.CACHE_KEYS.AGENTS_DETAIL_PREFIX}${agentId}`;
      this.storageService.remove(cacheKey);
      console.log(`🗑️ [DataCacheService] 智能体详情缓存已清除: ${agentId}`);
      return true;
    } catch (error) {
      console.error(`❌ [DataCacheService] 清除智能体详情缓存失败: ${agentId}`, error);
      return false;
    }
  }

  /**
   * 清除所有智能体详情缓存
   */
  clearAllAgentDetails() {
    try {
      const allKeys = this.storageService.keys();
      const detailKeys = allKeys.filter(key =>
        key.startsWith(this.CACHE_KEYS.AGENTS_DETAIL_PREFIX)
      );

      detailKeys.forEach(key => {
        this.storageService.remove(key);
      });

      console.log(`🗑️ [DataCacheService] 已清除 ${detailKeys.length} 个智能体详情缓存`);
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 清除所有智能体详情缓存失败:', error);
      return false;
    }
  }

  // ==================== 通用缓存管理 ====================

  /**
   * 清除所有数据缓存
   */
  clearAllDataCache() {
    try {
      this.clearAgentsCache();
      this.clearSidebarCache();
      this.clearAllAgentDetails();
      console.log('🗑️ [DataCacheService] 所有数据缓存已清除');
      return true;
    } catch (error) {
      console.error('❌ [DataCacheService] 清除所有缓存失败:', error);
      return false;
    }
  }

  /**
   * 获取缓存信息
   * @returns {Object} 缓存信息对象
   */
  getCacheInfo() {
    const agentsCache = this.getAgentsData();
    return {
      agents: {
        hasCache: this.hasAgentsCache(),
        lastFetchTime: agentsCache?.lastFetchTime || null,
        cached_at: agentsCache?.cached_at || null,
        shouldFetch: this.shouldFetchAgents()
      },
      sidebar: {
        hasCache: this.hasSidebarCache(),
        version: this.getSidebarConfigVersion(),
        metadata: this.getCacheMetadata(this.CACHE_KEYS.SIDEBAR_CONFIG)
      }
    };
  }

  /**
   * 设置配置
   * @param {Object} config - 配置对象
   */
  setConfig(config) {
    this.config = { ...this.config, ...config };
  }
}

// 创建单例实例
export const dataCacheService = new DataCacheService();

