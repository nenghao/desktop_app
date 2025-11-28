/**
 * 应用主布局组件
 */

import { Sidebar } from './Sidebar.js';
import { Header } from './Header.js';
import { ContentArea } from './ContentArea.js';
// import { TitleBar } from './TitleBar.js'; // 不再使用自定义标题栏
import { agentStatusBarManager } from '../../services/agent/AgentStatusBarManager.js';
import { ConfigCacheService } from '../../services/ConfigCacheService.js';
// 定义侧边栏状态缓存键名常量
const SIDEBAR_COLLAPSED_KEY = 'sidebar_collapsed_state';

export class AppLayout {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.router = options.router;
    this.themeManager = options.themeManager;
    this.electronAdapter = options.electronAdapter;
    this.userManager = options.userManager;
    this.agentManager = options.agentManager;
    this.configCacheService = options.configCacheService || new ConfigCacheService();

    this.container = null;
    this.titleBar = null;
    this.sidebar = null;
    this.header = null;
    this.contentArea = null;

    this.isMobile = false;
    this.sidebarCollapsed = false;

    // 绑定方法
    this.handleResize = this.handleResize.bind(this);
    this.handleKeydown = this.handleKeydown.bind(this);
  }

  /**
   * 渲染布局
   * @param {Element} container 容器元素
   */
  async render(container) {
    this.container = container;

    // console.log('🔍 开始渲染AppLayout');
    // console.log('🔍 容器元素:', container);
    // console.log('🔍 容器innerHTML长度:', container.innerHTML.length);

    // 检查移动设备
    this.checkMobile();

    // 创建布局结构
    this.createLayoutStructure();

    // 检查侧边栏元素是否存在
    const sidebarElement = container.querySelector('#app-sidebar');
    // console.log('🔍 侧边栏元素查找结果:', sidebarElement);

    if (!sidebarElement) {
      console.error('❌ 侧边栏元素不存在！');
    }

    // 初始化子组件
    await this.initializeComponents();

    // 设置事件监听
    this.setupEventListeners();

    // 应用初始状态
    this.applyInitialState();

    console.log('✅ AppLayout 渲染完成');
  }

  /**
   * 创建布局结构
   */
  createLayoutStructure() {
    // 检查是否在Electron环境中
    const isElectron = this.electronAdapter && this.electronAdapter.isElectron;

    this.container.innerHTML = `
      <div class="app-layout ${isElectron ? 'electron-app' : 'web-app'}">
        <!-- 使用系统原生标题栏，移除自定义标题栏容器 -->
        <div class="app-body">
          <aside class="app-sidebar" id="app-sidebar">
            <!-- 侧边栏内容将在这里渲染 -->
          </aside>

          <main class="app-main">
            <header class="app-header" id="app-header">
              <!-- 头部内容将在这里渲染 -->
            </header>

            <div class="app-content" id="app-content">
              <!-- 主要内容将在这里渲染 -->
            </div>

            <footer class="app-footer hidden" id="app-footer" style="display: none;">
              <div class="footer-left">
              </div>
              <div class="footer-spacer"></div>
              <div class="footer-right">
              </div>
            </footer>
          </main>
        </div>
      </div>
    `;

    console.log('🔍 布局结构已创建');

    // 设置全局实例，供其他组件使用
    window.appLayout = this;

    // 初始化状态栏管理器
    this.statusBarManager = agentStatusBarManager;
    this.statusBarManager.handleRouteChange(); // 检查当前路由
  }

  /**
   * 初始化子组件
   */
  async initializeComponents() {
    // 在容器内查找元素，而不是全局document
    // const titleBarContainer = this.container.querySelector('#app-title-bar'); // 不再使用
    const sidebarContainer = this.container.querySelector('#app-sidebar');
    const headerContainer = this.container.querySelector('#app-header');
    const contentContainer = this.container.querySelector('#app-content');

    if (!sidebarContainer || !headerContainer || !contentContainer) {
      throw new Error('布局容器元素未找到');
    }

    // 🔥 关键改进: 所有组件初始化改为非阻塞,同时进行
    const initPromises = [];

    // 初始化标题栏（快速,不依赖网络）
    // 注释掉自定义标题栏，改用系统原生标题栏
    // if (titleBarContainer) {
    //   this.titleBar = new TitleBar({
    //     eventBus: this.eventBus,
    //     electronAdapter: this.electronAdapter
    //   });
    //   initPromises.push(
    //     this.titleBar.render(titleBarContainer).catch(err => {
    //       console.warn('标题栏渲染失败:', err);
    //     })
    //   );
    // }

    // 初始化侧边栏（已优化为骨架屏+异步加载）
    const agentDataService = window.agentDataService ||
      (window.app?.getService ? window.app.getService('agentDataService') : null);

    this.sidebar = new Sidebar({
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      router: this.router,
      userManager: this.userManager,
      agentManager: this.agentManager,
      agentDataService: agentDataService
    });
    // 侧边栏的render现在是同步返回(只渲染骨架屏),内容异步加载
    initPromises.push(
      this.sidebar.render(sidebarContainer).catch(err => {
        console.warn('侧边栏渲染失败:', err);
      })
    );

    // 初始化头部（快速,不依赖网络）
    this.header = new Header({
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      router: this.router,
      agentManager: this.agentManager
    });
    initPromises.push(
      this.header.render(headerContainer).catch(err => {
        console.warn('头部渲染失败:', err);
      })
    );

    // 初始化内容区域（快速,路由内容按需加载）
    this.contentArea = new ContentArea({
      eventBus: this.eventBus,
      stateManager: this.stateManager,
      router: this.router,
      userManager: this.userManager
    });
    initPromises.push(
      this.contentArea.render(contentContainer).catch(err => {
        console.warn('内容区域渲染失败:', err);
      })
    );

    // 等待所有基础UI渲染完成(但不等待异步数据加载)
    await Promise.allSettled(initPromises);
    console.log('✅ 所有布局组件基础框架已渲染');
  }


  /**
   * 切换侧边栏显示状态
   */
  toggleSidebar() {
    if (this.sidebar && this.sidebar.toggleCollapse) {
      this.sidebar.toggleCollapse();
    } else {
      // 降级处理：直接操作CSS类
      const sidebarElement = this.container.querySelector('#app-sidebar');
      if (sidebarElement) {
        sidebarElement.classList.toggle('collapsed');
      }
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 窗口大小变化
    window.addEventListener('resize', this.handleResize);

    // 键盘快捷键
    document.addEventListener('keydown', this.handleKeydown);

    // 应用事件
    this.eventBus.on('layout:toggle-sidebar', () => {
      this.toggleSidebar();
    });

    this.eventBus.on('layout:collapse-sidebar', () => {
      this.collapseSidebar();
    });

    this.eventBus.on('layout:expand-sidebar', () => {
      this.expandSidebar();
    });

    // 状态变化监听
    this.stateManager.subscribe('ui.sidebar.collapsed', (collapsed) => {
      this.setSidebarCollapsed(collapsed);
    });

    // 路由变化监听
    this.eventBus.on('route:change', (event) => {
      this.handleRouteChange(event);
    });
  }

  /**
   * 处理窗口大小变化
   */
  handleResize() {
    const wasMobile = this.isMobile;
    this.checkMobile();

    // 如果从桌面切换到移动端，自动折叠侧边栏
    if (!wasMobile && this.isMobile) {
      this.collapseSidebar();
    }

    // 发布窗口大小变化事件
    this.eventBus.emit('layout:resize', {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: this.isMobile
    });
  }

  /**
   * 处理键盘事件
   */
  handleKeydown(event) {
    // Ctrl+B 切换侧边栏
    if (event.ctrlKey && event.key === 'b') {
      event.preventDefault();
      this.toggleSidebar();
    }

    // ESC 关闭移动端侧边栏
    if (event.key === 'Escape' && this.isMobile) {
      this.collapseSidebar();
    }
  }

  /**
   * 处理路由变化
   */
  handleRouteChange(event) {
    if (!event || !event.data || !event.data.to) {
      console.warn('路由变化事件数据无效:', event);
      return;
    }

    const { to } = event.data;

    // 当路由为"/dashboard"（小纸条）时，隐藏app-header
    const appHeader = this.container.querySelector('#app-header');
    if (appHeader) {
      if (to.path === '/dashboard') {
        // 隐藏头部
        appHeader.style.display = 'none';
      } else {
        // 显示头部
        appHeader.style.display = 'block';
      }
    }

    // 在移动端，路由变化时自动关闭侧边栏
    if (this.isMobile && !this.sidebarCollapsed) {
      this.collapseSidebar();
    }

    // 更新页面标题
    if (to.meta && to.meta.title) {
      document.title = `奇境探索 - ${to.meta.title}`;
    }
  }

  /**
   * 切换侧边栏
   */
  toggleSidebar() {
    if (this.sidebarCollapsed) {
      this.expandSidebar();
    } else {
      this.collapseSidebar();
    }
  }

  /**
   * 折叠侧边栏
   */
  collapseSidebar() {
    this.setSidebarCollapsed(true);
    this.stateManager.setState('ui.sidebar.collapsed', true);
    // 保存到缓存
    try {
      const saved = this.configCacheService.saveSetting(SIDEBAR_COLLAPSED_KEY, true);
      // 同时保存到localStorage作为备用
      localStorage.setItem(`Questech_${SIDEBAR_COLLAPSED_KEY}`, 'true');
    } catch (error) {
      console.error('❌ 保存侧边栏状态时发生错误:', error);
    }
  }

  /**
   * 展开侧边栏
   */
  expandSidebar() {
    this.setSidebarCollapsed(false);
    this.stateManager.setState('ui.sidebar.collapsed', false);
    // 保存到缓存
    try {
      const saved = this.configCacheService.saveSetting(SIDEBAR_COLLAPSED_KEY, false);
      console.log(`🔍 侧边栏展开状态保存到缓存 (键: ${SIDEBAR_COLLAPSED_KEY}): ${saved ? '成功' : '失败'}`);
      // 同时保存到localStorage作为备用
      localStorage.setItem(`Questech_${SIDEBAR_COLLAPSED_KEY}`, 'false');
      console.log('🔍 侧边栏展开状态已保存到localStorage作为备用');
    } catch (error) {
      console.error('❌ 保存侧边栏状态时发生错误:', error);
    }
  }

  /**
   * 设置侧边栏折叠状态
   * @param {boolean} collapsed 是否折叠
   */
  setSidebarCollapsed(collapsed) {
    this.sidebarCollapsed = collapsed;

    const sidebarElement = this.container.querySelector('#app-sidebar');
    const layoutElement = this.container.querySelector('.app-layout');

    if (!sidebarElement || !layoutElement) {
      console.warn('侧边栏或布局元素未找到');
      return;
    }

    if (collapsed) {
      sidebarElement.classList.add('collapsed');
      layoutElement.classList.add('sidebar-collapsed');
    } else {
      sidebarElement.classList.remove('collapsed');
      layoutElement.classList.remove('sidebar-collapsed');
    }

    // 在移动端，使用不同的类名
    if (this.isMobile) {
      if (collapsed) {
        sidebarElement.classList.remove('open');
      } else {
        sidebarElement.classList.add('open');
      }
    }
  }

  /**
   * 检查是否为移动设备
   */
  checkMobile() {
    // 更智能的移动设备检测
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth <= 768;
    const userAgent = navigator.userAgent.toLowerCase();
    const isMobileUserAgent = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);

    // 只有在真正的移动设备上才启用移动端模式
    // 在Electron桌面应用中，即使窗口小也不应该启用移动端模式
    const isElectron = window.electronAPI && window.electronAPI.isElectron;

    if (isElectron) {
      // 在Electron中，永远不启用移动端模式
      this.isMobile = false;
    } else {
      // 在浏览器中，需要同时满足小屏幕和移动设备特征
      this.isMobile = isSmallScreen && (isTouchDevice || isMobileUserAgent);
    }

    const layoutElement = this.container.querySelector('.app-layout');
    if (layoutElement) {
      if (this.isMobile) {
        layoutElement.classList.add('mobile');
      } else {
        layoutElement.classList.remove('mobile');
      }
    }

    // console.log(`🔍 移动设备检测:`);
    // console.log(`  - 窗口宽度: ${window.innerWidth}px`);
    // console.log(`  - 触摸设备: ${isTouchDevice}`);
    // console.log(`  - 移动端UA: ${isMobileUserAgent}`);
    // console.log(`  - Electron环境: ${isElectron}`);
    console.log(`  - 最终判定: ${this.isMobile ? '移动端' : '桌面端'}`);
  }

  /**
   * 应用初始状态
   */
  applyInitialState() {
    console.log('🔍 开始应用初始状态...');
    let sidebarState = false; // 默认展开

    try {
      // 首先尝试从ConfigCacheService加载
      sidebarState = this.configCacheService.getCachedSetting(SIDEBAR_COLLAPSED_KEY, false);
      // 如果ConfigCacheService没有返回有效的值，尝试从localStorage备用存储加载
      const localStorageValue = localStorage.getItem(`Questech_${SIDEBAR_COLLAPSED_KEY}`);
      if (localStorageValue !== null) {
        const localStorageState = localStorageValue === 'true';
        // 如果ConfigCacheService返回的值与localStorage不同，使用localStorage的值
        if (sidebarState !== localStorageState) {
          sidebarState = localStorageState;
        }
      }
    } catch (error) {
      console.error('❌ 加载侧边栏状态时发生错误:', error);
    }

    // 设置侧边栏状态
    this.sidebarCollapsed = sidebarState;
    this.setSidebarCollapsed(sidebarState);
    this.stateManager.setState('ui.sidebar.collapsed', sidebarState);

    // 检查侧边栏元素的实际状态
    // setTimeout(() => {
    //   const sidebarElement = this.container.querySelector('#app-sidebar');
    //   if (sidebarElement) {
    //     const computedStyle = window.getComputedStyle(sidebarElement);
    //     console.log(`🔍 侧边栏元素状态:`);
    //     console.log(`  - display: ${computedStyle.display}`);
    //     console.log(`  - transform: ${computedStyle.transform}`);
    //     console.log(`  - width: ${computedStyle.width}`);
    //     console.log(`  - classes: ${sidebarElement.className}`);
    //     console.log(`  - innerHTML length: ${sidebarElement.innerHTML.length}`);
    //   }
    // }, 100);
  }

  /**
   * 更新状态指示器
   * @param {string} status 状态文本
   * @param {string} type 状态类型
   */
  updateStatus(status, type = 'info') {
    const statusIndicator = document.getElementById('status-indicator');
    if (statusIndicator) {
      statusIndicator.textContent = status;
      statusIndicator.className = `status-${type}`;
    }
  }

  /**
   * 显示加载状态
   */
  showLoading() {
    const layoutElement = this.container.querySelector('.app-layout');
    if (layoutElement) {
      layoutElement.classList.add('loading');
    }
  }

  /**
   * 隐藏加载状态
   */
  hideLoading() {
    const layoutElement = this.container.querySelector('.app-layout');
    if (layoutElement) {
      layoutElement.classList.remove('loading');
    }
  }

  /**
   * 更新智能体名称（委托给状态栏管理器）
   */
  updateAgentName(agentName) {
    if (this.statusBarManager) {
      this.statusBarManager.updateAgentName(agentName);
    }
  }

  /**
   * 更新Python状态（委托给状态栏管理器）
   * @param {string} status - 状态：uninitialized, initializing, ready, error
   * @param {string} message - 状态消息
   */
  updatePythonStatus(status, message) {
    if (this.statusBarManager) {
      this.statusBarManager.updateStatusOnly(status, message);
    }
  }

  /**
   * 更新智能体和状态（委托给状态栏管理器）
   * @param {string} agentName - 智能体名称
   * @param {string} status - 状态
   * @param {string} message - 状态消息
   */
  updateAgent(agentName, status, message) {
    if (this.statusBarManager) {
      this.statusBarManager.updateAgent(agentName, status, message);
    }
  }

  /**
   * 卸载布局
   */
  async unmount() {
    // 移除事件监听
    window.removeEventListener('resize', this.handleResize);
    document.removeEventListener('keydown', this.handleKeydown);

    // 卸载子组件
    if (this.sidebar) {
      await this.sidebar.unmount();
    }

    if (this.header) {
      await this.header.unmount();
    }

    if (this.contentArea) {
      await this.contentArea.unmount();
    }

    // 清空容器
    if (this.container) {
      this.container.innerHTML = '';
    }

    console.log('✅ AppLayout 卸载完成');
  }
}
