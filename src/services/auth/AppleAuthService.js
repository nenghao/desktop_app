/**
 * Apple 登录服务 - Electron 场景
 * 处理自定义协议回调和后端 API 调用
 */

import { UserApiService } from '../api/UserApiService.js';
import { UserManager } from '../UserManager.js';
import { NotificationCenter } from '../../components/common/NotificationCenter.js';

export class AppleAuthService {
  constructor() {
    this.userApiService = new UserApiService();
    this.userManager = new UserManager();
    this.notificationCenter = new NotificationCenter();
    this.isProcessing = false;

    // 初始化协议监听
    this.initProtocolListener();
  }

  /**
   * 初始化协议监听（仅 Electron 环境）
   */
  initProtocolListener() {
    if (!window.electronAPI) {
      console.log('⚠️ 非 Electron 环境，跳过协议监听初始化');
      return;
    }

    // 监听 Apple 登录回调
    window.electronAPI.onAppleAuthCallback((params) => {
      console.log('📥 收到 Apple 登录回调:', params);
      this.handleCallback(params);
    });

    console.log('✅ Apple 协议监听已初始化');
  }

  /**
   * 处理 Apple 登录回调
   * 后台直接返回已注册用户的 token 信息，无需再调用登录接口
   */
  async handleCallback(params) {
    if (this.isProcessing) {
      console.warn('⚠️ 正在处理登录，请勿重复提交');
      return;
    }

    this.isProcessing = true;

    try {
      console.log('📥 收到 Apple 回调参数:', {
        hasToken: !!params.token,
        hasRefreshToken: !!params.refresh_token,
        hasUserIdentifier: !!params.user_identifier
      });

      // 验证必要参数 - 后台直接返回 token 信息
      if (!params.token || !params.refresh_token || !params.user_identifier) {
        throw new Error('缺少必要的认证信息');
      }

      console.log('🔐 开始获取用户信息...');
      this.notificationCenter.info('正在登录...');

      // 使用返回的 token 获取完整用户信息
      const userInfo = await this.userApiService.fetchUserInfo(
        params.token,
        params.user_identifier
      );

      if (userInfo) {
        console.log('✅ 获取用户信息成功');

        // 构造完整的用户数据（包含 token）
        const userData = {
          ...userInfo,
          access_token: params.token,
          refresh_token: params.refresh_token,
          user_identifier: params.user_identifier
        };

        // 保存用户信息
        this.userManager.setUser(userData);

        // 显示成功提示
        this.notificationCenter.success('登录成功！');

        // 触发登录成功事件
        window.dispatchEvent(new CustomEvent('apple-login-success', {
          detail: userData
        }));

        // 刷新页面或跳转
        setTimeout(() => {
          window.location.reload();
        }, 1000);

      } else {
        throw new Error('获取用户信息失败');
      }

    } catch (error) {
      console.error('❌ Apple 登录失败:', error);
      this.notificationCenter.error(error.message || 'Apple 登录失败，请重试');

      // 触发登录失败事件
      window.dispatchEvent(new CustomEvent('apple-login-error', {
        detail: { error: error.message }
      }));

    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * 销毁服务
   */
  destroy() {
    if (window.electronAPI && window.electronAPI.removeAppleAuthCallback) {
      window.electronAPI.removeAppleAuthCallback();
      console.log('🗑️ 已移除 Apple 协议监听');
    }
  }
}

// 创建全局实例（仅在 Electron 环境）
let appleAuthService = null;

export function initAppleAuthService() {
  if (window.electronAPI && !appleAuthService) {
    appleAuthService = new AppleAuthService();
    console.log('✅ Apple 登录服务已初始化');
  }
  return appleAuthService;
}

export function getAppleAuthService() {
  return appleAuthService;
}
