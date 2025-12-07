/**
 * 用户API服务 - 专门处理用户认证相关的网络请求
 * 支持双Token认证机制 (Access Token + Refresh Token)
 */

import { ApiService } from './ApiService.js';
import { NotificationCenter } from '../../components/common/NotificationCenter.js';
import { API_CONFIG } from './api-config.js';

export class UserApiService extends ApiService {
  constructor(options = {}) {
    // 使用统一的API配置
    super({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...API_CONFIG.defaultHeaders
      },
      ...options
    });

    this.isLoggingIn = false;
    this.notificationCenter = new NotificationCenter();
  }

  // ==================== 认证API ====================

  /**
   * 获取验证码
   */
  async getVerificationCode(phone) {
    return this.get('user/code/', {  // fullResponse = true
      phone: phone,
      template: 'sample'
    }, true);
  }

  /**
   * 用户登录（验证码方式）
   * 返回双Token格式
   */
  async login(phone, code, template) {

    if (this.isLoggingIn) {
      throw new Error('请勿重复提交');
    }

    this.isLoggingIn = true;

    try {
      console.log('🔐 发送登录请求...', { phone, codeLength: code.length, template });

      const response = await this.post('user/', {
        phone: phone,
        password: code,
        type: 1,
        template: template
      }, true);  // fullResponse = true，返回 {success, message, data} 格式

      console.log('📡 登录API原始响应:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        responseData: response
      });

      if (response && response.success && response.data) {
        const data = response.data;
        console.log('🔍 检查响应数据结构:', {
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          dataKeys: Object.keys(data),
          data: data
        });

        console.log('✅ 双Token登录成功');
        return response;
      }

      console.error('❌ 登录响应无效:', {
        response,
        hasSuccess: response?.success,
        hasData: response?.data,
        message: response?.message
      });
      throw new Error(response?.message || '登录失败');

    } catch (error) {
      console.error('❌ 登录请求失败:', error);
      const errorMessage = error.message || '登录失败';
      // 不在这里显示通知，由上层处理
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * Apple 登录 - Web 场景（使用 id_token）
   * @param {Object} appleData - Apple 登录数据
   * @param {number} appleData.type - 登录类型，固定为 2（Apple 登录）
   * @param {string} appleData.id_token - Apple 返回的 ID Token
   * @param {string} appleData.platform - 平台标识（web）
   * @param {string} [appleData.email] - 用户邮箱（首次登录时 Apple 会返回）
   * @param {string} [appleData.full_name] - 用户姓名（首次登录时 Apple 会返回）
   * @param {string} [appleData.version] - 应用版本
   * @returns {Promise<Object>} 登录响应
   */
  async loginWithApple(appleData) {
    if (this.isLoggingIn) {
      throw new Error('请勿重复提交');
    }

    this.isLoggingIn = true;

    try {
      console.log('🍎 发送 Apple 登录请求...', {
        hasIdToken: !!appleData.id_token,
        hasCode: !!appleData.code,
        platform: appleData.platform,
        hasEmail: !!appleData.email,
        hasFullName: !!appleData.full_name
      });

      const response = await this.post('user/', appleData, true);

      console.log('📡 Apple 登录API原始响应:', {
        hasResponse: !!response,
        responseType: typeof response,
        responseKeys: response ? Object.keys(response) : [],
        success: response?.success
      });

      if (response && response.success && response.data) {
        const data = response.data;
        console.log('🔍 检查 Apple 登录响应数据结构:', {
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          hasUserIdentifier: !!data.user_identifier,
          dataKeys: Object.keys(data)
        });

        console.log('✅ Apple 登录成功');
        return response;
      }

      console.error('❌ Apple 登录响应无效:', {
        response,
        hasSuccess: response?.success,
        hasData: response?.data,
        message: response?.message
      });
      throw new Error(response?.message || 'Apple 登录失败');

    } catch (error) {
      console.error('❌ Apple 登录请求失败:', error);
      const errorMessage = error.message || 'Apple 登录失败';
      return {
        success: false,
        message: errorMessage
      };
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * Apple 登录 - Electron 场景（使用 authorization code）
   * @param {Object} appleData - Apple 登录数据
   * @param {string} appleData.code - Apple 返回的授权码
   * @param {string} [appleData.id_token] - Apple 返回的 ID Token（可选）
   * @param {string} [appleData.user] - 用户信息 JSON 字符串（首次登录时）
   * @param {string} appleData.platform - 平台标识（electron）
   * @returns {Promise<Object>} 登录响应
   */
  async loginWithAppleCode(appleData) {
    if (this.isLoggingIn) {
      throw new Error('请勿重复提交');
    }

    this.isLoggingIn = true;

    try {
      console.log('🍎 Electron Apple 登录请求...', {
        hasCode: !!appleData.code,
        hasIdToken: !!appleData.id_token,
        hasUser: !!appleData.user,
        platform: appleData.platform
      });

      // 解析用户信息
      let parsedUser = null;
      if (appleData.user) {
        try {
          parsedUser = typeof appleData.user === 'string'
            ? JSON.parse(appleData.user)
            : appleData.user;
        } catch (e) {
          console.warn('⚠️ 解析用户信息失败:', e);
        }
      }

      // 构造请求数据
      const requestData = {
        type: 2, // Apple 登录
        code: appleData.code,
        platform: appleData.platform || 'electron'
      };

      // 添加可选参数
      if (appleData.id_token) {
        requestData.id_token = appleData.id_token;
      }
      if (parsedUser) {
        if (parsedUser.email) requestData.email = parsedUser.email;
        if (parsedUser.name) {
          requestData.full_name = `${parsedUser.name.firstName || ''} ${parsedUser.name.lastName || ''}`.trim();
        }
      }

      const response = await this.post('user/', requestData, true);

      console.log('📡 Electron Apple 登录响应:', {
        hasResponse: !!response,
        success: response?.success,
        hasData: !!response?.data
      });

      if (response && response.success && response.data) {
        console.log('✅ Electron Apple 登录成功');
        return response;
      }

      console.error('❌ Electron Apple 登录响应无效:', response);
      throw new Error(response?.message || 'Apple 登录失败');

    } catch (error) {
      console.error('❌ Electron Apple 登录失败:', error);
      return {
        success: false,
        message: error.message || 'Apple 登录失败'
      };
    } finally {
      this.isLoggingIn = false;
    }
  }

  /**
   * 刷新Token - 已移至ApiService集中管理
   * 保留此方法作为兼容接口
   */
  async refreshToken() {
    console.warn('⚠️ refreshToken已移至ApiService集中管理，所有401错误会自动触发Token刷新');
    return {
      success: false,
      message: 'Token刷新应由ApiService自动处理'
    };
  }

  /**
   * 检查登录状态
   */
  async checkLoginStatus(accessToken, userIdentifier) {
    if (!accessToken || !userIdentifier) {
      return { valid: false, reason: 'no_token_or_identifier', isAuthError: true };
    }

    try {
      const response = await this.get('user/', {
        user_identifier: userIdentifier
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response && response.success == true) {
        return {
          valid: true,
          userInfo: response.data
        };
      } else {
        return {
          valid: false,
          reason: 'invalid_response',
          status: response?.status,
          isAuthError: true
        };
      }
    } catch (error) {
      console.error('检查登录状态失败:', error);

      // 检查是否是认证错误或token过期：
      // 1. 检查错误消息中是否包含401相关信息
      // 2. 检查错误消息中是否包含token过期相关信息
      if (error.message.includes('401') ||
        error.message.includes('Unauthorized') ||
        error.message.includes('Invalid or expired authentication token') ||
        error.message.includes('1002') ||
        error.message.includes('1003') ||
        error.message.includes('1004')) {
        return {
          valid: false,
          reason: 'token_expired',
          error: error.message,
          isAuthError: true
        };
      }

      // 网络错误或其他非认证错误
      return {
        valid: false,
        reason: 'network_error',
        error: error.message,
        isAuthError: false
      };
    }
  }

  /**
   * 获取用户信息（通过API）
   */
  async fetchUserInfo(accessToken, userIdentifier) {
    if (!accessToken || !userIdentifier) {
      throw new Error('缺少认证信息');
    }

    try {
      console.log('🔍 fetchUserInfo 参数:', {
        hasToken: !!accessToken,
        tokenPrefix: accessToken.substring(0, 20),
        userIdentifier
      });

      const response = await this.get('user/', {
        user_identifier: userIdentifier
      }, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      if (response && response.success && response.data) {
        return response.data;
      } else {
        throw new Error('获取用户信息失败');
      }
    } catch (error) {
      console.error('获取用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   * @param {string} accessToken - 访问令牌
   * @param {string} userIdentifier - 用户标识符
   * @param {Object} updateData - 要更新的用户数据
   * @param {string} [updateData.username] - 用户名
   * @param {string} [updateData.email] - 邮箱
   * @param {string} [updateData.avatar] - 头像
   * @returns {Promise<Object>} 更新后的用户信息（包含新的token）
   */
  async updateUserInfo(accessToken, userIdentifier, updateData) {
    if (!accessToken || !userIdentifier) {
      throw new Error('缺少认证信息');
    }

    if (!updateData || Object.keys(updateData).length === 0) {
      throw new Error('没有需要更新的数据');
    }

    try {
      console.log('🔄 更新用户信息:', { userIdentifier, updateData });

      const response = await this.patch('user/', updateData, {
        params: {
          user_identifier: userIdentifier
        },
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });

      console.log('✅ 用户信息更新成功:', response);

      // patch 方法已经自动解包，response 可能直接是数据对象
      if (response && response.success && response.data) {
        // 服务器返回新的token，需要更新本地存储
        if (response.data.access_token && response.data.refresh_token) {
          console.log('🔑 收到新的token，需要更新本地存储');
        }
        return response
      } else {
        throw new Error(response.message || '更新用户信息失败');
      }
    } catch (error) {
      console.error('❌ 更新用户信息失败:', error);
      throw error;
    }
  }

}

// 创建默认实例
export const userApiService = new UserApiService();
