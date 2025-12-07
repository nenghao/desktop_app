/**
 * 用户管理类
 * 统一管理用户状态、认证、权限等
 */

import { UserApiService } from './api/UserApiService.js';
import { StorageService } from './storage.js';

export class UserManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;

    // 使用传入的UserApiService实例，或创建新实例
    // 并将UserManager注入到ApiService中，实现集中式Token管理
    this.userApiService = options.userApiService || new UserApiService({
      userManager: this  // 注入UserManager引用
    });

    // 使用传入的StorageService实例，或创建新实例
    this.storageService = options.storageService || new StorageService();

    // 用户状态
    this.currentUser = null;
    this.isAuthenticated = false;

    // 事件监听器
    this.listeners = new Map();

    // 初始化标志和Promise
    this.initialized = false;
    this.initPromise = null;

    // 监听token过期事件
    this.setupTokenExpirationListener();

    // 自动开始初始化（异步，不阻塞构造函数）
    this.initPromise = this.initialize();
  }

  /**
   * 初始化用户管理器
   * 注意：此方法在构造函数中自动调用，外部通常不需要手动调用
   * 如果需要等待初始化完成，可以 await userManager.ready()
   */
  async initialize() {
    // 防止重复初始化
    if (this.initialized) {
      console.warn('⚠️ UserManager 已经初始化，跳过重复初始化');
      return;
    }

    try {
      console.log('🔧 开始初始化 UserManager...');

      // 等待一小段时间确保localStorage准备就绪（特别是在Electron环境下）
      await new Promise(resolve => setTimeout(resolve, 100));

      // 从本地存储恢复用户状态
      await this.restoreUserState();

      // 验证用户状态
      if (this.currentUser) {
        console.log('🔍 发现保存的用户信息，开始验证...');
        const isValid = await this.validateUserState();

        if (isValid) {
          console.log('✅ 登录状态已恢复');
        } else {
          console.log('❌ 登录状态验证失败，已清除');
        }
      } else {
        console.log('ℹ️ 未发现保存的用户信息');
      }

      this.initialized = true;
      console.log('✅ UserManager 初始化完成');
    } catch (error) {
      console.error('❌ UserManager 初始化失败:', error);
      // 初始化失败时清除可能损坏的数据
      this.clearUserStorage();
    }
  }

  /**
   * 等待初始化完成
   * 使用方式：await userManager.ready()
   */
  async ready() {
    if (this.initPromise) {
      await this.initPromise;
    }
    return this;
  }

  /**
   * 用户登录
   */
  async login(phone, code, template) {
    try {
      console.log('🔐 开始登录流程...', { phone, codeLength: code.length });

      // 调用登录API
      const response = await this.userApiService.login(phone, code, template);
      console.log('📡 登录API响应:', {
        hasResponse: !!response,
        success: response?.success,
        data: response?.data,
      });

      if (response && response.success && response.data) {
        console.log('👤 登录成功，用户数据:', {
          username: response.data.username,
          userIdentifier: response.data.user_identifier,
          hasAccessToken: !!response.data.access_token,
          hasRefreshToken: !!response.data.refresh_token
        });

        // 设置用户信息 
        await this.setUser(response.data);
        // 验证数据是否保存成功
        const savedUserInfo = localStorage.getItem('Questech_userState');
        console.log('💾 数据保存:', { userInfo: savedUserInfo });
        
        console.log('💾 数据保存验证:', {
          userInfoSaved: !!savedUserInfo,
          userInfoLength: savedUserInfo?.length || 0
        });

        // 触发登录成功事件
        this.emit('login:success', this.currentUser);

        // 触发数据重新加载事件
        this.emit('data:reload', this.currentUser);

        console.log('✅ 登录流程完成');
        return { success: true, user: this.currentUser };
      } else {
        console.error('❌ 登录API响应无效:', response);
        throw new Error(response?.message || '登录失败');
      }
    } catch (error) {
      // 触发登录失败事件
      this.emit('login:error', error);
      throw error;
    }
  }

  /**
   * 用户登出
   */
  async logout() {
    try {
      // 清除用户状态
      this.currentUser = null;
      this.isAuthenticated = false;

      // 清除本地存储
      this.clearUserStorage();

      // 更新状态管理器
      if (this.stateManager) {
        this.stateManager.setState('user.profile', null);
        this.stateManager.setState('user.authenticated', false);
      }

      // ChatApiService不再管理用户状态

      // 触发登出事件
      this.emit('logout', null);

      console.log('✅ 用户已登出');
    } catch (error) {
      console.error('❌ 登出失败:', error);
      throw error;
    }
  }

  /**
   * 设置用户信息（双Token格式）
   */
  async setUser(loginData) {
    try {
      // 验证双Token格式数据
      if (!loginData.user_identifier || !loginData.access_token || !loginData.refresh_token) {
        throw new Error('登录数据格式不正确，缺少必要的用户信息或Token');
      }

      // 控制不要是子对象，应该是一个平的数据对象
      // 希望接收的是data解包后的数据，不是整个响应对象
      if (loginData.success !== undefined || loginData.message !== undefined) {
        console.warn('⚠️ 警告: loginData 含有 success/message 字段，应传入解包后的 data 对象');
      }

      // 合并用户信息和Token信息
      this.currentUser = {
        ...loginData,
        token_updated_at: Date.now()
      };

      this.isAuthenticated = true;

      // 保存到本地存储
      this.saveUserToStorage(1);

      // 更新状态管理器
      if (this.stateManager) {
        this.stateManager.setState('user.profile', this.currentUser);
        this.stateManager.setState('user.authenticated', true);
      }

      // 触发用户更新事件
      this.emit('user:updated', this.currentUser);

      console.log('✅ 用户信息已设置:', this.currentUser.username);
    } catch (error) {
      console.error('❌ 设置用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser() {
    return this.currentUser;
  }

  /**
   * 仅更新Token信息（用于自动Token刷新）
   * 不触发完整的用户信息更新，只更新currentUser里面的token字段
   */
  updateTokenOnly(tokenData) {
    try {
      if (!this.currentUser) {
        throw new Error('用户未登录，无法更新Token');
      }

      // 更新Token信息
      this.currentUser.access_token = tokenData.access_token;
      this.currentUser.refresh_token = tokenData.refresh_token;
      this.currentUser.expires_in = tokenData.expires_in || 3600;
      this.currentUser.token_updated_at = Date.now();

      // 保存到本地存储（包含完整用户信息）
      this.saveUserToStorage(4);

      // 更新状态管理器
      if (this.stateManager) {
        this.stateManager.setState('user.profile', this.currentUser);
      }

      // 触发Token更新事件
      this.emit('tokens:updated', {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      console.log('✅ Token已更新（自动刷新）');
    } catch (error) {
      console.error('❌ 更新Token失败:', error);
      throw error;
    }
  }

  /**
   * 检查是否已认证
   */
  isUserAuthenticated() {
    return this.isAuthenticated && this.currentUser !== null;
  }

  /**
   * 获取用户显示名称
   */
  getDisplayName() {
    if (!this.currentUser) return '未登录';
    return this.currentUser.username || this.currentUser.phone || '用户';
  }

  /**
   * 获取用户头像
   */
  getAvatar() {
    if (!this.currentUser) return 'bi bi-person';
    return this.currentUser.avatar || 'bi bi-emoji-wink';
  }

  /**
   * 获取头像的绝对路径
   * @param {string} avatarName - 头像名称（如 "emoji-smile"）
   * @returns {string} 头像的绝对路径
   */
  getAvatarPath(avatarName) {
    console.log('getAvatarPath', avatarName);
    
    if (!avatarName) {
      avatarName = 'emoji-wink'; // 默认头像
    }

    // 确保头像名称不包含 .svg 后缀
    const avatarFileName = avatarName.replace('.svg', '');

    // 返回绝对路径
    return `/src/assets/avatar/${avatarFileName}.svg`;
  }

  /**
   * 获取当前用户头像的绝对路径
   * @returns {string} 当前用户头像的绝对路径
   */
  getCurrentUserAvatarPath() {
    const avatar = this.getAvatar();
    return this.getAvatarPath(avatar);
  }

  /**
   * 获取可用头像列表
   * @returns {Array} 头像列表，每个元素包含 name 和 path
   */
  getAvatarList() {
    const avatarNames = [
      'emoji-smile',
      'emoji-laughing',
      'emoji-heart-eyes',
      'emoji-wink',
      'emoji-sunglasses',
      'emoji-neutral',
      'emoji-frown',
      'emoji-angry',
      'emoji-dizzy',
      'emoji-kiss',
      'emoji-expressionless',
      'emoji-smile-upside-down'
    ];

    return avatarNames.map(name => ({
      name: name,
      path: this.getAvatarPath(name)
    }));
  }

  /**
   * 验证用户状态（支持自动Token刷新）
   */
  async validateUserState() {
    try {
      const accessToken = this.currentUser?.access_token;

      if (!this.currentUser || !accessToken) {
        console.warn('⚠️ 缺少用户信息或access token，自动登出');
        await this.logout();
        return false;
      }

      // 检查access token是否有效
      console.log('🔍 开始验证用户状态...');
      const result = await this.userApiService.checkLoginStatus(
        accessToken,
        this.currentUser.user_identifier
      );

      if (!result.valid) {
        if (result.isAuthError) {
          // 明确的认证错误：token过期、失效等情况
          console.warn(`⚠️ 认证错误确认: ${result.reason}`, result.error);

          // Token刷新已由ApiService统一处理
          // 如果走到这里，说明ApiService的自动Token刷新也失败了
          console.warn(`⚠️ 认证失败（ApiService自动刷新失败），执行强制登出: ${result.reason}`);
          await this.logout();
          return false;
        } else {
          // 非认证错误：网络问题、服务器暂时不可用等
          console.warn(`⚠️ 网络或服务器错误，保持当前登录状态: ${result.reason}`, result.error);
          return true;
        }
      }

      // 如果获取到了最新的用户信息，更新本地用户信息
      if (result.userInfo) {
        await this.updateUserInfo(result.userInfo);
        console.log('✅ 用户信息已更新');
      }

      return true;
    } catch (error) {
      // 请求过程中发生异常，通常是网络问题或服务器错误
      console.error('❌ 验证用户状态请求异常:', error);
      console.warn('⚠️ 由于网络或服务器问题无法验证，保持当前登录状态');
      return true;
    }
  }

  /**
   * 更新用户信息（不重新登录）
   */
  async updateUserInfo(userInfo) {
    try {
      // 保持原有的tokens
      const currentAccessToken = this.currentUser?.access_token;
      const currentRefreshToken = this.currentUser?.refresh_token;

      // 更新用户信息，保持tokens
      this.currentUser = {
        ...this.currentUser,  // 先保留当前所有字段
        ...userInfo,          // 然后用新信息覆盖
        access_token: currentAccessToken,   // 确保token不被覆盖
        refresh_token: currentRefreshToken,
        expires_in: this.currentUser?.expires_in || 3600,
        token_updated_at: this.currentUser?.token_updated_at
      };

      console.log('✅ 用户信息已更新:', {
        username: this.currentUser.username,
        userIdentifier: this.currentUser.user_identifier
      });

      // 保存到本地存储
      this.saveUserToStorage(2);

      // 更新状态管理器
      if (this.stateManager) {
        this.stateManager.setState('user.profile', this.currentUser);
      }

      // 触发用户更新事件
      this.emit('user:updated', this.currentUser);

    } catch (error) {
      console.error('❌ 更新用户信息失败:', error);
      throw error;
    }
  }

  /**
   * 更新Token信息
   */
  async updateTokens(tokenData) {
    try {
      if (!this.currentUser) {
        throw new Error('用户未登录');
      }

      // 更新Token信息
      this.currentUser.access_token = tokenData.access_token;
      this.currentUser.refresh_token = tokenData.refresh_token;
      this.currentUser.expires_in = tokenData.expires_in || 3600;
      this.currentUser.token_updated_at = Date.now();

      // 保存到本地存储
      this.saveUserToStorage(3);

      // 更新状态管理器
      if (this.stateManager) {
        this.stateManager.setState('user.profile', this.currentUser);
      }

      // 触发Token更新事件
      this.emit('tokens:updated', {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token
      });

      console.log('✅ Token信息已更新');
    } catch (error) {
      console.error('❌ 更新Token信息失败:', error);
      throw error;
    }
  }

  /**
   * 从本地存储恢复用户状态
   */
  async restoreUserState() {
    try {
      console.log('🔍 开始恢复用户状态...');

      const userState = this.storageService.get('userState');
      if (userState) {
        console.log('👤 恢复用户状态:', {
          username: userState.username,
          userIdentifier: userState.user_identifier,
          hasToken: !!userState.token
        });

        this.currentUser = userState;
        this.isAuthenticated = true;

        // 更新状态管理器
        if (this.stateManager) {
          this.stateManager.setState('user.profile', this.currentUser);
          this.stateManager.setState('user.authenticated', true);
        }

        console.log('✅ 用户状态已恢复');
      } else {
        console.log('ℹ️ 没有找到保存的用户信息');
      }

    } catch (error) {
      console.error('❌ 恢复用户状态失败:', error);
      this.clearUserStorage();
    }
  }

  /**
   * 保存用户到本地存储
   */
  saveUserToStorage(flag = 1) {
    console.log('保存用户到本地存储', flag);
    
    try {
      if (this.currentUser) {
        // 直接保存完整的用户数据
        const saveSuccess = this.storageService.set('userState', this.currentUser);

        console.log('💾 用户数据已保存:', {
          username: this.currentUser.username,
          saveSuccess,
          timestamp: new Date().toLocaleString()
        });
      }
    } catch (error) {
      console.error('❌ 保存用户数据失败:', error);
    }
  }

  /**
   * 清除用户存储
   */
  clearUserStorage() {
    try {
      this.storageService.remove('userState');
      console.log('✅ 用户数据已清除');
    } catch (error) {
      console.error('❌ 清除用户数据失败:', error);
    }
  }

  /**
   * 添加事件监听器
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);

    // 返回取消监听函数
    return () => {
      const callbacks = this.listeners.get(event);
      if (callbacks) {
        const index = callbacks.indexOf(callback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
      }
    };
  }

  /**
   * 移除事件监听器
   */
  off(event, callback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * 触发事件
   */
  emit(event, data) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`❌ 事件回调执行失败 [${event}]:`, error);
        }
      });
    }

    // 同时通过EventBus发送事件
    if (this.eventBus) {
      this.eventBus.emit(`user:${event}`, data);
    }
  }

  /**
   * 检查token状态（仅在需要时调用）
   */
  async checkTokenIfNeeded() {
    if (!this.currentUser || !this.currentUser.access_token) {
      console.warn('⚠️ 缺少用户信息或access token');
      return false;
    }

    try {
      return await this.validateUserState();
    } catch (error) {
      // 捕获验证过程中的异常，但不强制登出
      console.error('❌ Token检查过程异常:', error);
      console.warn('⚠️ 由于网络或服务器问题无法验证，保持当前登录状态');
      return false;
    }
  }

  /**
   * 手动刷新用户信息
   */
  async refreshUserInfo() {
    try {
      if (!this.currentUser || !this.currentUser.user_identifier) {
        throw new Error('用户未登录');
      }

      const userInfo = await this.userApiService.fetchUserInfo(
        this.currentUser.access_token,
        this.currentUser.user_identifier
      );
      await this.updateUserInfo(userInfo);

      console.log('✅ 用户信息刷新成功');
      return userInfo;
    } catch (error) {
      console.error('❌ 刷新用户信息失败:', error);

      // 如果是认证错误，自动登出
      if (error.response?.status === 401) {
        await this.logout();
      }

      throw error;
    }
  }

  /**
   * 设置token过期监听器
   * 注意：Token刷新已由ApiService统一处理，此监听器仅用于记录日志
   */
  setupTokenExpirationListener() {
    if (this.eventBus) {
      this.eventBus.on('auth:token-expired', async () => {
        console.log('🔄 收到token过期事件（由ApiService自动处理刷新）');
        // Token刷新已由ApiService集中处理
        // 如果刷新失败，ApiService会自动调用logout
      });
    }
  }

  /**
   * 销毁用户管理器
   */
  destroy() {
    this.listeners.clear();
    this.currentUser = null;
    this.isAuthenticated = false;
  }
}
