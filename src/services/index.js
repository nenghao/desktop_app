/**
 * 服务层统一导出
 */

import { UserManager } from './UserManager.js';
import { ChatApiService } from './api/ChatApiService.js';
import { StorageService } from './storage.js';
import { ConfigCacheService } from './ConfigCacheService.js';
import { getAgentDataService } from './agent/AgentDataService.js';
import { getGlobalEventBus } from '../core/GlobalEventManager.js';
import { initAppleAuthService } from './auth/AppleAuthService.js';

// 创建全局服务实例
let globalUserManager = null;
let globalChatApiService = null;
let globalStorageService = null;
let globalConfigCacheService = null;
let globalAgentDataService = null;

/**
 * 获取全局UserManager实例
 */
export function getUserManager(options = {}) {
  if (!globalUserManager) {
    // 确保UserManager使用全局服务实例
    const chatApiService = options.chatApiService || getChatApiService();
    const storageService = options.storageService || getStorageService();
    globalUserManager = new UserManager({
      ...options,
      chatApiService,
      storageService
    });
  }
  return globalUserManager;
}

/**
 * 获取全局ChatApiService实例
 */
export function getChatApiService() {
  if (!globalChatApiService) {
    globalChatApiService = new ChatApiService();
  }
  return globalChatApiService;
}

/**
 * 获取全局StorageService实例
 */
export function getStorageService() {
  if (!globalStorageService) {
    globalStorageService = new StorageService();
  }
  return globalStorageService;
}

/**
 * 获取全局ConfigCacheService实例
 */
export function getConfigCacheService() {
  if (!globalConfigCacheService) {
    const storageService = getStorageService();
    globalConfigCacheService = new ConfigCacheService(storageService);
  }
  return globalConfigCacheService;
}

/**
 * 获取全局AgentDataService实例（带eventBus）
 */
export function getGlobalAgentDataService() {
  if (!globalAgentDataService) {
    const eventBus = getGlobalEventBus();
    globalAgentDataService = getAgentDataService({ eventBus });
  }
  return globalAgentDataService;
}

/**
 * 初始化全局服务
 */
export async function initializeServices(options = {}) {
  try {
    console.log('🔧 开始初始化全局服务...');

    // 检测运行环境 - 使用统一的平台检测
    const isElectron = typeof window !== 'undefined' && (window.electronAPI || (window.process && window.process.type));
    const isWeb = !isElectron;
    console.log('🌍 运行环境:', isElectron ? 'Electron' : 'Web浏览器');

    // 在Electron环境下，等待更长时间确保localStorage准备就绪
    if (isElectron) {
      console.log('⏳ Electron环境，等待存储准备就绪...');
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // 🔥 关键改进: 只初始化不依赖网络的核心服务,其他服务异步初始化

    // 1. 初始化本地服务(不需要网络)
    const storageService = getStorageService();
    const configCacheService = getConfigCacheService();
    const chatApiService = getChatApiService();

    // 快速初始化ChatApiService(如果有初始化方法)
    if (chatApiService.initialize) {
      // 添加超时保护,避免阻塞
      await Promise.race([
        chatApiService.initialize(),
        new Promise(resolve => setTimeout(resolve, 2000))
      ]).catch(err => {
        console.warn('⚠️ ChatApiService初始化超时,继续启动:', err);
      });
    }

    // 2. 初始化UserManager(从本地存储快速恢复状态)
    const userManager = getUserManager({
      ...options,
      chatApiService,
      storageService
    });

    // 注入UserManager到服务
    chatApiService.userManager = userManager;

    // 等待UserManager初始化(主要是本地数据,应该很快)
    await Promise.race([
      userManager.ready(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('UserManager初始化超时')), 3000))
    ]).catch(err => {
      console.warn('⚠️ UserManager初始化超时,继续启动:', err);
    });

    // 3. 初始化AgentDataService
    const agentDataService = getGlobalAgentDataService();

    if (agentDataService.agentApiService) {
      agentDataService.agentApiService.userManager = userManager;
    }

    // 🔥 AgentDataService初始化改为后台进行,不阻塞UI
    agentDataService.initialize().catch(err => {
      console.warn('⚠️ AgentDataService后台初始化失败:', err);
    });

    // 4. Apple登录服务(不阻塞,Web和Electron都支持)
    try {
      const appleAuthService = initAppleAuthService();
      console.log('✅ Apple 登录服务已初始化');
    } catch (err) {
      console.warn('⚠️ Apple登录服务初始化失败:', err);
    }

    // 注册为全局服务
    window.configCacheService = configCacheService;
    window.agentDataService = agentDataService;

    console.log('✅ 核心服务初始化完成(部分服务后台加载中)');

    return {
      userManager,
      chatApiService,
      configCacheService,
      agentDataService
    };
  } catch (error) {
    console.error('❌ 全局服务初始化失败:', error);
    // 即使失败也返回基础服务,不要完全阻止启动
    return {
      userManager: getUserManager(options),
      chatApiService: getChatApiService(),
      configCacheService: getConfigCacheService(),
      agentDataService: getGlobalAgentDataService()
    };
  }
}

// 导出服务类
export { UserManager } from './UserManager.js';
export { ChatApiService } from './api/ChatApiService.js';
export { AgentDataService, getAgentDataService } from './agent/AgentDataService.js';
