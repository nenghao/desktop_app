/**
 * 应用配置API服务
 * 专门处理应用配置相关的网络请求（侧边栏配置等）
 * 参考 UserApiService 的架构设计
 */

import { ApiService } from './ApiService.js';
import { API_CONFIG } from './api-config.js';

export class AppConfigApiService extends ApiService {
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

  // ==================== 配置相关API ====================

  /**
   * 获取侧边栏配置（无需认证）
   * @returns {Promise<Object>} 侧边栏配置
   */
  async fetchSidebarConfig() {
    try {
      console.log('⚙️ [AppConfigApiService] 获取侧边栏配置');

      // 检查请求缓存
      const cacheKey = 'sidebar_config';
      if (this.requestCache.has(cacheKey)) {
        console.log('📋 [AppConfigApiService] 使用请求缓存');
        return this.requestCache.get(cacheKey);
      }

      // 不需要认证，直接使用 GET 请求
      // 注意：代理会将 /api 重写，所以这里路径是 config/sidebar/
      const response = await this.get('config/sidebar/');

      // 缓存请求结果（5分钟）
      this.requestCache.set(cacheKey, response);
      setTimeout(() => {
        this.requestCache.delete(cacheKey);
      }, 5 * 60 * 1000);

      return response;
    } catch (error) {
      console.error('❌ [AppConfigApiService] 获取侧边栏配置失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用设置
   * @param {string} token - 认证Token
   * @returns {Promise<Object>} 应用设置
   */
  async fetchAppSettings(token) {
    try {
      console.log('⚙️ [AppConfigApiService] 获取应用设置');

      const response = await this.get('config/settings/', {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      return response;
    } catch (error) {
      console.error('❌ [AppConfigApiService] 获取应用设置失败:', error);
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
    console.error('❌ [AppConfigApiService] API错误:', error);

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
    console.log('🗑️ [AppConfigApiService] 请求缓存已清除');
  }

}

// 创建默认实例
export const appConfigApiService = new AppConfigApiService();

