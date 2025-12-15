/**
 * 公共API服务 - 处理通用的API请求（Dashboard、配置等）
 */
import { ApiService } from "./ApiService.js";
import { API_CONFIG, API_REQUEST_CACHE } from "./api-config.js";

export class CommonApiService extends ApiService {
  constructor(options = {}) {
    // 使用统一的API配置
    super({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...API_CONFIG.defaultHeaders,
      },
      ...options,
    });

    // 缓存和请求时间记录
    this.cache = {
      aigcContent: { data: null, lastFetchTime: null },
      perspectives: { data: null, lastFetchTime: null }
    };
  }

  /**
   * 检查是否需要重新请求
   * @param {string} key - 缓存键名
   * @param {number} intervalMs - 时间间隔（毫秒）
   * @returns {boolean} true表示需要重新请求
   */
  shouldFetch(key, intervalMs) {
    const cacheEntry = this.cache[key];
    if (!cacheEntry || !cacheEntry.lastFetchTime) {
      console.log(`🔍 [CommonApiService] ${key} 无缓存，需要请求`);
      return true;
    }

    const timeDiff = Date.now() - cacheEntry.lastFetchTime;
    const shouldFetch = timeDiff >= intervalMs;

    console.log(`🔍 [CommonApiService] ${key} 时间检查:`, {
      lastFetchTime: new Date(cacheEntry.lastFetchTime).toISOString(),
      timeDiff: `${Math.floor(timeDiff / 1000)}秒`,
      intervalMs: `${intervalMs / 1000}秒`,
      shouldFetch
    });

    return shouldFetch;
  }

  // ==================== Dashboard 相关API ====================

  /**
   * 获取 Dashboard 首页所有数据（包含今日要闻、AI资讯、AI日报）
   * @param {Object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（跳过缓存检查）
   * @returns {Promise<{success: boolean, data: any, message?: string}>} 返回原始响应
   */
  async getDashboardData(options = {}) {
    const { forceRefresh = false } = options;

    try {
      const intervalMs = API_REQUEST_CACHE.AIGC_CONTENT;

      // 检查是否需要重新请求
      if (!forceRefresh && !this.shouldFetch('aigcContent', intervalMs)) {
        console.log('✅ [CommonApiService] 使用缓存的Dashboard数据');
        return this.cache.aigcContent.data;
      }

      // API端点: /content/aigc/
      const response = await this.get("content/aigc/");

      // 只有响应成功时才缓存
      if (response && response.success) {
        // 更新缓存
        this.cache.aigcContent = {
          data: response,
          lastFetchTime: Date.now()
        };
        console.log('💾 [CommonApiService] 已缓存成功的Dashboard数据');
      } else {
        console.warn('⚠️ [CommonApiService] 响应失败，不缓存数据');
      }

      return response;
    } catch (error) {
      console.error("❌ [CommonApiService.getDashboardData] 获取Dashboard数据失败:", error);

      // 如果是网络初始化错误，可能是API配置问题
      if (error.message && error.message.includes('Failed to fetch')) {
        console.error('❌ [CommonApiService] 网络初始化失败，可能是API配置问题');
        console.error('   请检查 api-config.js 中的 baseURL 配置');
      }

      // 如果请求失败且有缓存，返回缓存数据
      if (this.cache.aigcContent.data) {
        console.warn('⚠️ [CommonApiService] 请求失败，返回缓存的Dashboard数据');
        return this.cache.aigcContent.data;
      }
      throw error;
    }
  }

  // ==================== AI日报相关API ====================

  /**
   * 获取AI日报列表
   * @param {Object} params - 查询参数 {page, limit}
   * @returns {Promise<{success: boolean, data: {items: Array, pagination: Object}}>}
   */
  async getAIDailyList(params = {}) {
    try {
      return await this.get("content/aigc/daily", params);
    } catch (error) {
      console.error("❌ [CommonApiService.getAIDailyList] 获取AI日报列表失败:", error);
      throw error;
    }
  }

  /**
   * 获取AI日报详情
   * @param {string} oid - 日报ID
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async getAIDailyDetail(oid) {
    try {
      return await this.get("content/aigc/daily", { oid });
    } catch (error) {
      console.error("❌ [CommonApiService.getAIDailyDetail] 获取AI日报详情失败:", error);
      throw error;
    }
  }

  // ==================== AI资讯相关API ====================

  /**
   * 获取AI资讯列表
   * @param {Object} params - 查询参数 {page, limit}
   * @returns {Promise<{success: boolean, data: {items: Array, pagination: Object}}>}
   */
  async getAINewsList(params = {}) {
    try {
      return await this.get("content/aigc/news", params);
    } catch (error) {
      console.error("❌ [CommonApiService.getAINewsList] 获取AI资讯列表失败:", error);
      throw error;
    }
  }

  /**
   * 获取AI资讯详情
   * @param {string} oid - 资讯ID
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async getAINewsDetail(oid) {
    try {
      return await this.get("content/aigc/news", { oid });
    } catch (error) {
      console.error("❌ [CommonApiService.getAINewsDetail] 获取AI资讯详情失败:", error);
      throw error;
    }
  }

  // ==================== AI解读相关API ====================

  /**
   * 获取AI解读
   * @param {string} oid - 内容ID
   * @param {string} type - 内容类型 (daily/news)
   * @returns {Promise<{success: boolean, data: Object}>}
   */
  async getAIInterpret(oid, type = 'news') {
    try {
      // TODO: 替换为真实的AI解读API端点
      // 目前使用模拟数据，等待后端提供真实接口
      return await this.get(`content/aigc/${type}/interpret`, { oid });
    } catch (error) {
      console.error("❌ [CommonApiService.getAIInterpret] 获取AI解读失败:", error);
      // 如果API失败，返回模拟数据作为降级方案
      return {
        success: true,
        data: {
          keyPoints: '这是一篇关于AI技术发展的重要资讯，涉及多个前沿技术突破和行业应用案例。',
          deepAnalysis: '从技术角度看，本文展示了AI技术在多个垂直领域的快速渗透。企业正在通过AI提升效率、优化用户体验，这标志着AI从实验室走向大规模商业化应用的重要阶段。',
          impact: '对行业的影响是深远的：一方面加速了传统行业的数字化转型，另一方面也对从业者提出了新的技能要求。建议相关企业及时跟进技术趋势，提前布局AI能力建设。'
        }
      };
    }
  }

  // ==================== 分析视角相关API ====================

  /**
   * 获取分析视角列表
   * @returns {Promise<{success: boolean, data: {perspectives: Array}}>}
   */
  async getPerspectives() {
    try {
      const intervalMs = API_REQUEST_CACHE.PERSPECTIVES;

      // 检查是否需要重新请求
      if (!this.shouldFetch('perspectives', intervalMs)) {
        console.log('✅ [CommonApiService] 使用缓存的分析视角数据');
        return this.cache.perspectives.data;
      }

      // API端点: /content/perspectives/
      const response = await this.get("content/perspectives/");

      // 更新缓存
      this.cache.perspectives = {
        data: response,
        lastFetchTime: Date.now()
      };

      console.log('💾 [CommonApiService] 已缓存分析视角数据');
      return response;
    } catch (error) {
      console.error("❌ [CommonApiService.getPerspectives] 获取分析视角失败:", error);
      // 如果请求失败且有缓存，返回缓存数据
      if (this.cache.perspectives.data) {
        console.warn('⚠️ [CommonApiService] 请求失败，返回缓存的分析视角数据');
        return this.cache.perspectives.data;
      }
      throw error;
    }
  }
}

// 创建默认实例
export const commonApiService = new CommonApiService();

/**
 * 获取 CommonApiService 全局实例
 * 确保整个应用使用同一个实例
 */
export function getCommonApiService() {
  return commonApiService;
}
