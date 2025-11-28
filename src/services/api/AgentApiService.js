/**
 * 智能体API服务
 * 专门处理智能体相关的网络请求
 * 参考 UserApiService 的架构设计
 */

import { ApiService } from './ApiService.js';
import { API_CONFIG } from './api-config.js';

export class AgentApiService extends ApiService {
  constructor(options = {}) {
    // 使用统一的API配置，并添加额外的请求头
    super({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...API_CONFIG.defaultHeaders,
        'Accept': '*/*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'Cache-Control': 'no-cache',
        'DNT': '1'
      },
      ...options
    });

    // 请求状态
    this.isRequesting = false;
    this.requestCache = new Map(); // 请求缓存，防止重复请求
  }

  // ==================== 智能体相关API ====================

  /**
   * 获取智能体数据（无需认证）
   * @param {string} platform - 平台 (win/mac/linux)
   * @param {string} arch - 架构 (amd64/arm64/x86)
   * @param {boolean} recommended - 是否只获取推荐的智能体
   * @param {boolean} forceRefresh - 是否强制刷新，忽略缓存
   * @returns {Promise<Object>} 智能体数据
   */
  async fetchAgentsData(platform, arch, recommended = false, forceRefresh = false) {
    try {
      // 检查请求缓存（除非强制刷新）
      const cacheKey = `agents_${platform}_${arch}_${recommended}`;
      if (!forceRefresh && this.requestCache.has(cacheKey)) {
        return this.requestCache.get(cacheKey);
      }

      if (forceRefresh) {
        this.requestCache.delete(cacheKey);
      }

      const params = {
        platform,
        arch,
        recommended
      };

      // 不需要认证，直接使用 GET 请求
      const response = await this.get('agent/', params);
      if (!response.data) {
        throw new Error('获取智能体数据失败');
      }
      const data = response.data;
      // 缓存请求结果（5分钟）
      this.requestCache.set(cacheKey, data);
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('❌ [AgentApiService] 获取智能体数据失败:', error);
      throw error;
    }
  }

  /**
   * 获取智能体详情（无需认证）
   * 注意：现在智能体已改为纯 JS/CSS 加载方式，不再需要 platform 和 arch 参数
   * @param {string} agentId - 智能体ID
   * @param {string} platform - 平台 (win/mac/linux) - 已废弃
   * @param {string} arch - 架构 (amd64/arm64/x86) - 已废弃
   * @returns {Promise<Object>} 智能体详情
   */
  async getAgentDetail(agentId, platform = 'win', arch = 'amd64') {
    try {
      console.log('🔍 [AgentApiService] 获取智能体详情:', { agentId });
      // 注意：platform 和 arch 参数已废弃，不再使用

      // 检查请求缓存
      const cacheKey = `agent_detail_${agentId}`;
      if (this.requestCache.has(cacheKey)) {
        console.log('📋 [AgentApiService] 使用详情缓存');
        return this.requestCache.get(cacheKey);
      }

      // 旧版本：带 platform/arch 参数（已废弃）
      // const params = {
      //   platform,
      //   arch
      // };
      // const response = await this.get(`agent/${agentId}`, params);

      // 新版本：不带 platform/arch 参数（纯 JS/CSS 加载方式）
      const response = await this.get(`agent/${agentId}`);
      if (!response.data) {
        throw new Error('获取智能体详情失败');
      }
      const data = response.data;
      // 缓存请求结果（5分钟）
      this.requestCache.set(cacheKey, data);
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return data;
    } catch (error) {
      console.error('❌ [AgentApiService] 获取智能体详情失败:', error);
      throw error;
    }
  }

  // ==================== 错误处理 ====================

  /**
   * 处理API错误
   * @param {Error} error - 错误对象
   * @returns {Object} 格式化的错误信息
   */
  handleApiError(error) {
    console.error('❌ [AgentApiService] API错误:', error);

    // 检查是否是认证错误
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return {
        type: 'auth_error',
        message: '认证失败，请重新登录',
        originalError: error
      };
    }

    // 检查是否是网络错误
    if (error.message.includes('Failed to fetch') || error.message.includes('Network')) {
      return {
        type: 'network_error',
        message: '网络连接失败，请检查网络设置',
        originalError: error
      };
    }

    // 检查是否是超时错误
    if (error.message.includes('timeout')) {
      return {
        type: 'timeout_error',
        message: '请求超时，请稍后重试',
        originalError: error
      };
    }

    // 其他错误
    return {
      type: 'unknown_error',
      message: error.message || '未知错误',
      originalError: error
    };
  }

  /**
   * 清除请求缓存
   */
  clearRequestCache() {
    this.requestCache.clear();
    console.log('🗑️ [AgentApiService] 请求缓存已清除');
  }

}

// 创建默认实例
export const agentApiService = new AgentApiService();

