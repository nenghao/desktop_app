/**
 * Questech SPA 主应用类
 * 负责应用的整体管理和协调
 */

import { Router } from './core/Router.js';
import { StateManager } from './core/StateManager.js';
import { ComponentLoader } from './core/ComponentLoader.js';
import { EventBus } from './core/EventBus.js';
// AgentManager 现在通过 ServiceRegistry 管理，不需要直接导入
import { ThemeManager } from './services/theme-manager.js';
import { StorageService } from './services/storage.js';
import { NotificationCenter } from './components/common/NotificationCenter.js';
import { ElectronAdapter } from './utils/electron-adapter.js';
import { AppLayout } from './components/layout/AppLayout.js';
import { routes } from './router/index.js';
import { appConfig } from './config/app-config.js';
import { VersionManager } from './utils/VersionManager.js';
import { VersionUpdateModal } from './components/version/VersionUpdateModal.js';
import { AppVersion } from './utils/AppVersion.js';
import serviceRegistry from './core/ServiceRegistry.js';


export class App {
  constructor() {
    this.initialized = false;
    this.mounted = false;

    // 核心服务实例
    this.eventBus = null;
    this.stateManager = null;
    this.router = null;
    this.componentLoader = null;
    this.agentManager = null;
    this.themeManager = null;
    this.storageService = null;
    this.notificationCenter = null;
    this.electronAdapter = null;

    // 全局服务
    this.userManager = null;
    this.chatApiService = null;
    this.configCacheService = null;

    // 服务注册表
    this.serviceRegistry = serviceRegistry;

    // 布局组件
    this.layout = null;

    // 应用容器
    this.container = null;

    // 版本更新模态框
    this.versionUpdateModal = null;
  }

  /**
   * 初始化应用
   */
  async initialize(services = {}) {
    if (this.initialized) {
      console.warn('应用已经初始化');
      return;
    }

    // 保存全局服务引用
    this.userManager = services.userManager;
    this.chatApiService = services.chatApiService;
    this.configCacheService = services.configCacheService;

    try {
      console.log('🔧 正在初始化 Questech SPA...');

      // 1. 初始化核心服务
      await this.initializeCoreServices();

      // 2. 初始化业务服务
      await this.initializeBusinessServices();

      // 3. 初始化路由
      await this.initializeRouter();

      // 4. 初始化布局
      await this.initializeLayout();

      // 5. 加载用户配置
      await this.loadUserConfiguration();

      // 6. 设置全局事件监听
      this.setupGlobalEventListeners();

      // 7. 创建版本管理器并进行版本检查（最后执行）
      this.versionManager = new VersionManager({
        eventBus: this.eventBus
      });

      await this.versionManager.handleAppStartup(AppVersion.getVersion());

      this.initialized = true;
      console.log('✅ Questech SPA 初始化完成');
      console.log(`📱 当前版本: ${AppVersion.getVersion()} (${AppVersion.getProductName()})`);

    } catch (error) {
      console.error('❌ Questech SPA 初始化失败:', error);
      throw error;
    }
  }

  /**
   * 初始化核心服务
   */
  async initializeCoreServices() {
    // 事件总线 - 最先初始化
    this.eventBus = new EventBus();

    // Electron适配器
    this.electronAdapter = new ElectronAdapter();

    // 状态管理器
    this.stateManager = new StateManager(this.eventBus);
    await this.stateManager.initialize();

    // 组件加载器
    this.componentLoader = new ComponentLoader();

    // 初始化服务注册表（包括AgentManager），传入 eventBus
    await this.serviceRegistry.initializeCoreServices(this.eventBus);

    // 获取AgentManager实例（已在ServiceRegistry中初始化）
    this.agentManager = this.serviceRegistry.getService('agentManager');

    console.log('✅ 核心服务初始化完成');
  }

  /**
   * 初始化业务服务
   */
  async initializeBusinessServices() {
    // 存储服务
    this.storageService = new StorageService();

    // 主题管理器
    this.themeManager = new ThemeManager({
      eventBus: this.eventBus,
      storageService: this.storageService
    });
    await this.themeManager.initialize();

    // 通知管理器
    this.notificationCenter = new NotificationCenter({
      eventBus: this.eventBus,
      container: document.body
    });

    // 设置全局访问
    window.notificationCenter = this.notificationCenter;

    console.log('✅ 业务服务初始化完成');
  }

  /**
   * 初始化路由
   */
  async initializeRouter() {
    this.router = new Router({
      routes,
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      componentLoader: this.componentLoader,
      agentManager: this.agentManager
    });

    await this.router.initialize();
    console.log('✅ 路由系统初始化完成');
  }

  /**
   * 初始化布局
   */
  async initializeLayout() {
    this.layout = new AppLayout({
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      router: this.router,
      themeManager: this.themeManager,
      electronAdapter: this.electronAdapter,
      userManager: this.userManager,
      agentManager: this.agentManager
    });

    console.log('✅ 布局组件初始化完成');
  }

  /**
   * 获取TitleBar实例
   */
  get titleBar() {
    return this.layout ? this.layout.titleBar : null;
  }

  /**
   * 获取Router实例
   */
  getRouter() {
    return this.router;
  }

  /**
   * 加载用户配置
   */
  async loadUserConfiguration() {
    try {
      // 1. 加载用户偏好设置 - 使用ConfigCacheService
      let userPreferences = {};

      if (this.configCacheService) {
        // 从配置缓存服务初始化设置
        const initializedSettings = this.configCacheService.initializeSettings();
        userPreferences = {
          theme: initializedSettings.theme,
          language: initializedSettings.language
        };
      } else {
        // 回退到直接从存储服务获取
        userPreferences = this.storageService.get('userPreferences', {});
      }

      // 2. 应用主题设置
      if (userPreferences.theme) {
        await this.themeManager.switchTheme(userPreferences.theme);
      }

      // 3. 应用语言设置
      if (userPreferences.language) {
        this.stateManager.setState('app.language', userPreferences.language);
      }

      // 4. 应用其他设置
      this.stateManager.setState('user.preferences', userPreferences);

      console.log('✅ 用户配置加载完成');

      // 5. 检查登录状态（在配置加载完成后）
      if (this.userManager) {
        console.log('🔍 检查保存的登录状态...');
        const currentUser = this.userManager.getCurrentUser();
        if (currentUser) {
          console.log('📱 发现保存的用户信息:', currentUser.username);
          // UserManager在初始化时已经验证过了，这里只需要确认状态
          if (this.userManager.isAuthenticated) {
            console.log('✅ 登录状态已恢复');
          }
        } else {
          console.log('ℹ️ 未发现保存的登录信息');
        }
      }

    } catch (error) {
      console.warn('⚠️ 用户配置加载失败:', error);
    }
  }

  /**
   * 设置全局事件监听
   */
  setupGlobalEventListeners() {
    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      this.eventBus.emit('window:resize', {
        width: window.innerWidth,
        height: window.innerHeight
      });
    });

    // 监听在线状态变化
    window.addEventListener('online', () => {
      this.stateManager.setState('app.online', true);
      this.eventBus.emit('app:online');
    });

    window.addEventListener('offline', () => {
      this.stateManager.setState('app.online', false);
      this.eventBus.emit('app:offline');
    });

    // 监听页面可见性变化
    document.addEventListener('visibilitychange', () => {
      const isVisible = !document.hidden;
      this.stateManager.setState('app.visible', isVisible);
      this.eventBus.emit('app:visibility-change', isVisible);
    });

    // 监听数据更新事件
    this.eventBus.on('data:update-available', (updateInfo) => {
      this.handleDataUpdate(updateInfo);
    });

    // 监听版本更新事件
    this.eventBus.on('app:update-version', (updateInfo) => {
      this.handleVersionUpdate(updateInfo);
    });

    // 监听设置主题变化事件
    this.eventBus.on('settings:theme:change', (eventObj) => {
      const theme = eventObj.data || eventObj;
      if (this.themeManager) {
        this.themeManager.switchTheme(theme);
      } else {
        console.error('❌ App: ThemeManager 未初始化');
      }
    });

    console.log('✅ 全局事件监听设置完成');
  }

  /**
   * 挂载应用到DOM
   */
  async mount(container) {
    if (this.mounted) {
      console.warn('应用已经挂载');
      return;
    }

    if (!this.initialized) {
      throw new Error('应用未初始化，请先调用 initialize()');
    }

    try {
      this.container = container;

      // console.log('🔍 开始渲染布局到容器:', container);

      // 渲染布局
      await this.layout.render(container);

      console.log('🔍 布局渲染完成，现在启动路由');

      // 启动路由
      this.router.start();

      this.mounted = true;

      // 暂时不触发应用挂载事件
      // this.eventBus.emit('app:mounted');

      console.log('✅ 应用挂载完成（跳过路由）');

      // ===== 临时测试通知：带按钮的通知（用于调试UI）=====
      // 应用挂载2秒后显示
      // setTimeout(() => {
      //   if (this.notificationCenter) {
      //     this.notificationCenter.show({
      //       type: 'info',
      //       title: '🧪 测试通知',
      //       message: '这是一个带按钮的测试通知，不会自动消失。请检查UI样式。',
      //       duration: 5000, // 这个值会被忽略，因为有 actions
      //       actions: [
      //         {
      //           text: '确认',
      //           onClick: () => {
      //             console.log('✅ 点击了确认按钮');
      //           }
      //         }
      //       ]
      //     });
      //   }
      // }, 2000);

      // 检查容器内容
      // setTimeout(() => {
      //   console.log('🔍 挂载后检查容器内容:');
      //   console.log('  - 容器HTML长度:', container.innerHTML.length);
      //   const sidebar = container.querySelector('#app-sidebar');
      //   console.log('  - 侧边栏元素:', sidebar);
      //   if (sidebar) {
      //     console.log('  - 侧边栏内容:', sidebar.innerHTML.substring(0, 200));
      //   }
      // }, 100);

    } catch (error) {
      console.error('❌ 应用挂载失败:', error);
      throw error;
    }
  }

  /**
   * 卸载应用
   */
  async unmount() {
    if (!this.mounted) {
      return;
    }

    try {
      // 停止路由
      this.router.stop();

      // 卸载布局
      if (this.layout) {
        await this.layout.unmount();
      }

      // 销毁版本更新模态框
      if (this.versionUpdateModal) {
        this.versionUpdateModal.destroy();
        this.versionUpdateModal = null;
      }

      // 清空容器
      if (this.container) {
        this.container.innerHTML = '';
      }

      this.mounted = false;

      // 触发应用卸载事件
      this.eventBus.emit('app:unmounted');

      console.log('✅ 应用卸载完成');

    } catch (error) {
      console.error('❌ 应用卸载失败:', error);
      throw error;
    }
  }

  /**
   * 获取应用信息
   */
  getInfo() {
    return {
      ...AppVersion.getAppInfo(),
      initialized: this.initialized,
      mounted: this.mounted,
      buildTime: appConfig.buildTime
    };
  }

  /**
   * 获取服务实例
   */
  getService(serviceName) {
    // 优先从服务注册表获取
    if (this.serviceRegistry.hasService(serviceName)) {
      return this.serviceRegistry.getService(serviceName);
    }

    // 回退到传统服务获取方式
    const services = {
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      router: this.router,
      componentLoader: this.componentLoader,
      agentManager: this.agentManager,
      themeManager: this.themeManager,
      storageService: this.storageService,
      notificationCenter: this.notificationCenter,
      userManager: this.userManager,
      chatApiService: this.chatApiService,
      configCacheService: this.configCacheService,
      agentDataService: window.agentDataService || null
    };

    return services[serviceName] || null;
  }

  /**
   * 异步获取服务（带重试机制）
   */
  async getServiceAsync(serviceName, maxRetries = 10, delay = 100) {
    for (let i = 0; i < maxRetries; i++) {
      const service = this.getService(serviceName);
      if (service) {
        return service;
      }

      // 如果是最后一次重试，抛出错误
      if (i === maxRetries - 1) {
        throw new Error(`无法获取 ${serviceName} 服务，请确保应用已正确初始化`);
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  /**
   * 安全获取服务（不抛出错误）
   */
  getSafeService(serviceName) {
    return this.getService(serviceName);
  }

  /**
   * 检查服务是否可用
   */
  isServiceReady(serviceName) {
    return !!this.getService(serviceName);
  }

  /**
   * 等待服务可用
   */
  async waitForService(serviceName, timeout = 5000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const service = this.getService(serviceName);
      if (service) {
        return service;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error(`等待 ${serviceName} 服务超时`);
  }

  /**
   * 处理数据更新通知
   * @param {Object} updateInfo - 更新信息
   */
  handleDataUpdate(updateInfo) {
    console.log('📢 [App] 收到数据更新通知:', updateInfo);

    // EventBus 可能会包装事件数据，需要从 data 字段获取实际数据
    const eventData = updateInfo.data || updateInfo;
    const { type, version, message } = eventData;

    console.log('📦 [App] 解析事件数据:', { type, version, message });

    // 使用 NotificationCenter 显示更新提示
    if (this.notificationCenter) {
      const typeText = type === 'agents' ? '智能体数据' : type === 'sidebar_config' ? '侧边栏配置' : '应用数据';
      const icon = type === 'agents' ? '🤖' : '⚙️';

      this.notificationCenter.show({
        type: 'info',
        title: `${icon} 发现新版本`,
        message: message || `${typeText}已更新到 v${version}`,
        duration: 0, // 不自动关闭
        actions: [
          {
            text: '重启',
            onClick: () => {
              console.log('🔄 [App] 用户选择重启应用');
              this.handleReloadApp();
            }
          }
        ]
      });
    }
  }

  /**
   * 处理版本更新事件
   * @param {Object} updateInfo - 版本更新信息
   */
  handleVersionUpdate(updateInfo) {
    console.log('📢 [App] 收到版本更新通知:', updateInfo);

    // EventBus 可能会包装事件数据，需要从 data 字段获取实际数据
    const eventData = updateInfo.data || updateInfo;
    const {
      currentVersion,
      latestVersion,
      updateInfo: versionInfo,
      downloadUrl,
      forceUpdate,
      reason
    } = eventData;

    console.log('📦 [App] 解析版本更新信息:', {
      currentVersion,
      latestVersion,
      forceUpdate,
      reason
    });

    // 显示版本更新模态框
    this.showVersionUpdateModal(eventData);
  }

  /**
   * 显示版本更新模态框
   * @param {Object} updateInfo - 版本更新信息
   */
  showVersionUpdateModal(updateInfo) {
    // 如果已有模态框存在，先销毁
    if (this.versionUpdateModal) {
      this.versionUpdateModal.destroy();
      this.versionUpdateModal = null;
    }

    // 创建新的版本更新模态框
    this.versionUpdateModal = new VersionUpdateModal({
      updateInfo: updateInfo,
      forceUpdate: updateInfo.forceUpdate || false,
      title: updateInfo.forceUpdate ? '需要更新' : '发现新版本',
      confirmText: updateInfo.forceUpdate ? '立即更新' : '立即更新',
      cancelText: '稍后提醒'
    });

    // 绑定事件监听器
    this.versionUpdateModal.on('confirm', (updateInfo) => {
      console.log('✅ [App] 用户确认版本更新', updateInfo);
      this.emitGlobal('version-update:user-confirm', updateInfo);
    });

    this.versionUpdateModal.on('cancel', (updateInfo) => {
      console.log('❌ [App] 用户取消版本更新', updateInfo);
      this.emitGlobal('version-update:user-cancel', updateInfo);
    });

    this.versionUpdateModal.on('update-error', (error) => {
      console.error('❌ [App] 版本更新失败', error);
      // 显示错误提示
      if (this.notificationCenter) {
        this.notificationCenter.show({
          type: 'error',
          title: '更新失败',
          message: '版本更新过程中发生错误，请稍后重试',
          duration: 5000
        });
      }
    });

    // 显示模态框
    this.versionUpdateModal.show();
  }

  /**
   * 重新加载应用
   */
  handleReloadApp() {
    console.log('🔄 [App] 重新加载应用...');

    // 显示加载提示
    if (this.notificationCenter) {
      this.notificationCenter.show({
        type: 'info',
        title: '正在重启...',
        message: '应用即将重新加载',
        duration: 1000
      });
    }

    // 延迟重新加载，给用户一点反馈时间
    setTimeout(() => {
      window.location.reload();
    }, 500);
  }
}
