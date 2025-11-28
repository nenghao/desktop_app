/**
 * 应用服务注册表
 *
 * 功能说明：
 * - 提供统一的服务注册和访问机制
 * - 支持任何类型的服务实例管理
 * - 实现依赖注入模式，降低组件间耦合
 * - 集成到App.js的getService()体系中
 *
 * 使用场景：
 * - 业务服务：userManager, chatApiService, eventBus, agentManager
 * - 工具服务：themeManager, storageService, notificationCenter
 *
 * 设计目标：
 * - 替代分散的服务创建方式
 * - 统一服务访问接口（window.app.getService()）
 * - 支持服务生命周期管理
 * - 为依赖注入统一化提供基础设施
 */

class ServiceRegistry {
  constructor() {
    this.services = new Map(); // 存储所有已注册的服务实例
    this.initialized = false;  // 标记核心服务是否已初始化
  }

  /**
   * 注册服务实例
   *
   * 支持注册任何类型的服务：
   * - 业务服务：userManager, chatApiService, eventBus, agentManager
   * - 工具服务：themeManager, storageService等
   *
   * @param {string} name - 服务名称，用于后续获取服务的标识符
   * @param {*} instance - 服务实例，可以是任何对象或类实例
   * @example
   * serviceRegistry.registerService('agentManager', agentManagerInstance);
   * serviceRegistry.registerService('userManager', userManagerInstance);
   */
  registerService(name, instance) {
    if (this.services.has(name)) {
      console.warn(`⚠️ 服务 '${name}' 已存在，将被覆盖`);
    }

    this.services.set(name, instance);
    console.log(`✅ 服务 '${name}' 注册成功`);
  }

  /**
   * 获取已注册的服务实例
   *
   * 这是统一的服务访问入口，替代以下分散的访问方式：
   * - 直接实例化服务 → window.app.getService('serviceName')
   * - 直接导入服务模块 → window.app.getService('serviceName')
   *
   * @param {string} name - 服务名称
   * @returns {*} 服务实例
   * @throws {Error} 如果服务未注册则抛出错误
   * @example
   * const agentManager = serviceRegistry.getService('agentManager');
   * const userManager = serviceRegistry.getService('userManager');
   */
  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`❌ 服务 '${name}' 未找到，请确保已注册`);
    }
    return service;
  }

  /**
   * 检查服务是否已注册
   *
   * 用于在获取服务前进行安全检查，避免抛出异常
   *
   * @param {string} name - 服务名称
   * @returns {boolean} true表示服务已注册，false表示未注册
   * @example
   * if (serviceRegistry.hasService('agentManager')) {
   *   const agentManager = serviceRegistry.getService('agentManager');
   * }
   */
  hasService(name) {
    return this.services.has(name);
  }

  /**
   * 注销服务
   *
   * 从注册表中移除指定的服务实例，通常用于：
   * - 应用关闭时的资源清理
   * - 服务重新注册前的清理
   * - 测试环境的服务隔离
   *
   * @param {string} name - 服务名称
   * @example
   * serviceRegistry.unregisterService('agentManager');
   */
  unregisterService(name) {
    if (this.services.has(name)) {
      this.services.delete(name);
      console.log(`🗑️ 服务 '${name}' 已注销`);
    } else {
      console.warn(`⚠️ 尝试注销不存在的服务 '${name}'`);
    }
  }

  /**
   * 获取所有已注册的服务名称列表
   *
   * 用于调试、监控或动态服务发现
   *
   * @returns {string[]} 所有已注册服务的名称数组
   * @example
   * const services = serviceRegistry.getServiceNames();
   * console.log('已注册的服务:', services); // ['agentManager', 'agentApiService', ...]
   */
  getServiceNames() {
    return Array.from(this.services.keys());
  }

  /**
   * 清空所有已注册的服务
   * 
   * 主要用于：
   * - 应用重启时的完全清理
   * - 测试环境的服务重置
   * - 内存泄漏防护
   * 
   * @example
   * serviceRegistry.clear(); // 清空所有服务
   */
  clear() {
    const serviceNames = this.getServiceNames();
    this.services.clear();
    console.log(`🧹 已清空 ${serviceNames.length} 个服务:`, serviceNames);
  }

  /**
   * 初始化核心服务
   *
   * 自动注册应用启动时必需的核心服务实例。
   * 目前包括智能体管理服务，未来可扩展到所有核心服务。
   *
   * 当前注册的服务：
   * - agentApiService: 智能体API服务（从服务器获取智能体数据）
   * - agentManager: 智能体管理器（下载、安装、执行智能体）
   *
   * 未来可扩展的服务：
   * - eventBus: 事件总线服务
   * - userManager: 用户管理服务
   * - chatApiService: 聊天API服务
   * - themeManager: 主题管理服务
   * - storageService: 存储服务
   * - notificationCenter: 通知管理服务
   *
   * @throws {Error} 如果服务初始化失败
   * @example
   * await serviceRegistry.initializeCoreServices();
   * const agentManager = serviceRegistry.getService('agentManager');
   */
  async initializeCoreServices(eventBus = null) {
    if (this.initialized) {
      console.log('🔄 服务注册表已初始化');
      return;
    }

    console.log('🚀 开始初始化核心服务...');

    try {
      // 注册智能体API服务
      const { agentApiService } = await import('../services/api/AgentApiService.js');
      this.registerService('agentApiService', agentApiService);

      // 注册智能体管理器（传入 eventBus）
      const { AgentManager } = await import('../services/agent/AgentManager.js');
      const agentManager = new AgentManager({ eventBus });
      await agentManager.initialize();
      this.registerService('agentManager', agentManager);

      this.initialized = true;
      console.log('✅ 核心服务初始化完成');
    } catch (error) {
      console.error('❌ 核心服务初始化失败:', error);
      throw error;
    }
  }

  /**
   * 获取服务注册表的状态信息
   * 
   * 返回当前注册表的详细状态，用于：
   * - 应用调试和监控
   * - 健康检查
   * - 开发工具集成
   * 
   * @returns {Object} 状态信息对象
   * @returns {boolean} returns.initialized - 是否已完成核心服务初始化
   * @returns {number} returns.serviceCount - 已注册服务的数量
   * @returns {string[]} returns.services - 所有已注册服务的名称列表
   * 
   * @example
   * const status = serviceRegistry.getStatus();
   * console.log(`已注册 ${status.serviceCount} 个服务:`, status.services);
   * // 输出: 已注册 2 个服务: ['pythonEnvironment', 'dependencyManager']
   */
  getStatus() {
    return {
      initialized: this.initialized,
      serviceCount: this.services.size,
      services: this.getServiceNames()
    };
  }
}

// 创建全局服务注册表实例
const serviceRegistry = new ServiceRegistry();

// 导出类和单例实例
export { ServiceRegistry };
export default serviceRegistry;
