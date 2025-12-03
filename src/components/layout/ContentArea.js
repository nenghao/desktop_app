/**
 * 内容区域组件
 */

export class ContentArea {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.router = options.router;
    this.userManager = options.userManager;

    this.container = null;
    this.currentView = null;
    this.lastRenderedPath = null;
    this.currentComponent = null;
    this.isRendering = false;
  }

  async render(container) {
    this.container = container;

    this.container.innerHTML = `
      <div class="content-wrapper">
        <div class="content-main" id="content-main">
          <div class="welcome-screen">
            <div class="welcome-content">
              <h1>欢迎使用 奇境探索</h1>
              <p>AI智能体</p>
              <div class="welcome-actions">
                <button class="btn btn-primary" id="explore-agents">探索智能体</button>
                <button class="btn btn-secondary" id="start-chat">开始聊天</button>
              </div>
            </div>
          </div>
        </div>
        
        <div class="content-overlay" id="content-overlay" style="display: none;">
        </div>
      </div>
    `;

    this.setupEventListeners();
    console.log('✅ ContentArea 渲染完成');
  }

  setupEventListeners() {
    const exploreBtn = this.container.querySelector('#explore-agents');
    if (exploreBtn) {
      exploreBtn.addEventListener('click', () => {
        this.router.navigate('/agents');
      });
    }

    const chatBtn = this.container.querySelector('#start-chat');
    if (chatBtn) {
      chatBtn.addEventListener('click', () => {
        this.router.navigate('/chat');
      });
    }

    this.eventBus.off('route:change', this.handleRouteChange);
    this.handleRouteChange = this.handleRouteChange.bind(this);
    this.eventBus.on('route:change', this.handleRouteChange);
  }

  async handleRouteChange(event) {
    if (!event || !event.data || !event.data.to) {
      console.warn('路由变化事件数据无效:', event);
      return;
    }

    const { to } = event.data;
    console.log('🎯 处理路由变化到:', to.path);

    try {
      await this.renderView(to);
    } catch (error) {
      console.error('页面渲染失败:', error);
      this.renderError(error);
    }
  }

  async renderView(route) {
    console.log('🎯 ContentArea.renderView 被调用:', route.path);
    const contentMain = this.container.querySelector('#content-main');
    if (!contentMain) return;

    if (this.isRendering) {
      console.log('🔄 正在渲染中，跳过重复渲染请求');
      return;
    }

    const currentFullPath = route.fullPath || route.path;
    const currentPath = route.path;

    // 检查路径是否真的变化了（比较 path 而不是 fullPath，因为 query 参数变化不应该跳过渲染）
    if (this.lastRenderedPath === currentFullPath && this.currentView === currentPath) {
      console.log('🔄 路径未变化，跳过重复渲染:', currentFullPath);
      return;
    }

    console.log('🚀 开始渲染视图:', route.path, '上次渲染:', this.lastRenderedPath);
    this.isRendering = true;

    try {
      // 清理旧组件（确保完全卸载）
      await this.cleanupCurrentComponent();

      switch (route.path) {
        case '/dashboard':
          this.currentView = '/dashboard';
          await this.renderDashboard(route);
          break;
        case '/agents':
          this.currentView = '/agents';
          await this.renderAgentStoreComponent(route);
          break;
        case '/chat':
          this.currentView = '/chat';
          await this.renderChat();
          break;
        case '/news/daily':
        case '/news/list':
        case '/news/detail':
          // 这些路由由 Dashboard 组件内部处理
          this.currentView = route.path;
          await this.renderDashboard(route);
          break;
        case '/debug-plugin':
          this.currentView = '/debug-plugin';
          // 仅在开发环境加载调试功能
          if (this.isDebugEnvironment()) {
            await this.renderPluginDebugger(route);
          } else {
            await this.renderNotFound();
          }
          break;
        default:
          if (route.path.startsWith('/agent/')) {
            this.currentView = route.path;
            await this.renderAgentDetail(route);
          } else {
            this.currentView = route.path;
            await this.renderNotFound();
          }
          break;
      }

      this.lastRenderedPath = currentFullPath;
      console.log('✅ 视图渲染完成:', this.currentView);

    } finally {
      this.isRendering = false;
    }
  }

  async renderDashboard(route) {
    const contentMain = this.container.querySelector('#content-main');

    try {
      // 动态导入 Dashboard 组件
      const { Dashboard } = await import('../../views/Dashboard.js');

      // 清空容器（确保干净的渲染环境）
      contentMain.innerHTML = '';

      // 创建新的 Dashboard 实例（每次都创建新实例，避免状态污染）
      const dashboard = new Dashboard({
        eventBus: this.eventBus,
        router: this.router
      });

      // 保存实例以便后续清理
      this.currentComponent = dashboard;

      // 渲染 Dashboard
      await dashboard.render(contentMain, { route });

      console.log('✅ Dashboard 组件渲染完成', route?.path || '/');
    } catch (error) {
      console.error('❌ 加载 Dashboard 组件失败:', error);
      this.renderErrorView(contentMain, error);
    }
  }

  async renderAgentStoreComponent(route) {
    const contentMain = this.container.querySelector('#content-main');

    const existingAgentStore = contentMain.querySelector('.agent-store-agent-store');
    if (existingAgentStore && this.currentComponent) {
      console.log('🔄 AgentStore 已存在，跳过重复渲染');
      return;
    }

    if (!existingAgentStore) {
      contentMain.innerHTML = '';
    }

    try {
      const { AgentStore } = await import('../../views/agents/AgentStore.js');

      let agentStore;
      if (this.currentComponent && this.currentComponent.constructor.name === 'AgentStore') {
        agentStore = this.currentComponent;
        console.log('🔄 重用现有 AgentStore 实例');
      } else {
        agentStore = new AgentStore({ eventBus: this.eventBus });
        this.currentComponent = agentStore;
        console.log('🆕 创建新的 AgentStore 实例');
      }

      const routeProps = {
        route: route,
        params: route.params || {},
        query: route.query || {}
      };

      console.log('🔗 传递给 AgentStore 的路由参数:', routeProps);
      await agentStore.render(contentMain, routeProps);
      console.log('✅ AgentStore组件渲染完成');
    } catch (error) {
      console.error('❌ 加载 AgentStore 组件失败:', error);
      contentMain.innerHTML = `
        <div class="agent-store-agent-store">
          <div class="agent-store-header">
            <h1>智能体商店</h1>
            <p>加载失败，请刷新页面重试</p>
          </div>
        </div>
      `;
    }
  }

  async renderChat() {
    const contentMain = this.container.querySelector('#content-main');

    const { ChatInterface } = await import('../chat/ChatInterface.js');

    contentMain.innerHTML = '';

    let settingsModal = null;
    if (window.app && window.app.getService) {
      try {
        settingsModal = window.app.getService('settingsModal');
      } catch (error) {
        console.warn('无法获取设置模态框实例:', error);
      }
    }

    this.chatInterface = new ChatInterface({
      userManager: this.userManager,
      eventBus: this.eventBus,
      settingsModal: settingsModal,
      stateManager: this.stateManager
    });
    
    this.currentComponent = this.chatInterface;
    
    await this.chatInterface.render(contentMain);
  }


  async renderAgentDetail(route) {
    const contentMain = this.container.querySelector('#content-main');
    contentMain.innerHTML = '';

    try {
      const { AgentDetail } = await import('../../views/agents/AgentDetail.js');
      const agentDetail = new AgentDetail({
        eventBus: this.eventBus
      });
      this.currentComponent = agentDetail;
      await agentDetail.render(contentMain);
      console.log('✅ AgentDetail组件渲染完成');
    } catch (error) {
      console.error('❌ 加载 AgentDetail 组件失败:', error);
      const agentId = route.params.id || 'unknown';
      contentMain.innerHTML = `
        <div class="agent-detail">
          <div class="error-content">
            <h2>加载失败</h2>
            <p>智能体 ${agentId} 加载失败，请刷新页面重试</p>
          </div>
        </div>
      `;
    }
  }

  async renderNotFound() {
    const contentMain = this.container.querySelector('#content-main');
    contentMain.innerHTML = `
      <div class="not-found">
        <div class="not-found-content">
          <h1>404</h1>
          <p>Debug 环境下，禁用了界面。</p>
          <button class="btn btn-primary" onclick="window.app.getService('router').navigate('/dashboard')">
            返回首页
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 检查是否为调试环境
   * @returns {boolean}
   */
  isDebugEnvironment() {
    // 检查是否在开发环境
    const isDev = import.meta.env.DEV || import.meta.env.MODE === 'development';

    // 检查是否在调试窗口（通过 nodeIntegration 判断）
    const isDebugWindow = window.require !== undefined;

    return isDev || isDebugWindow;
  }

  async renderPluginDebugger(route) {
    const contentMain = this.container.querySelector('#content-main');
    contentMain.innerHTML = '';

    try {
      const { DebugPluginDebugger } = await import('../../debug/DebugPluginDebugger.js');

      const pluginDebugger = new DebugPluginDebugger();
      this.currentComponent = pluginDebugger;

      // 从 query 参数获取插件路径（如果有）
      const pluginPath = route.query?.path || null;

      await pluginDebugger.render(pluginPath);
      console.log('✅ DebugPluginDebugger组件渲染完成');
    } catch (error) {
      console.error('❌ 加载 DebugPluginDebugger 组件失败:', error);
      contentMain.innerHTML = `
        <div class="error-view">
          <div class="error-content">
            <h1>插件调试器加载失败</h1>
            <p>${error.message}</p>
            <button class="btn btn-primary" onclick="window.location.reload()">
              刷新页面
            </button>
          </div>
        </div>
      `;
    }
  }

  renderError(error) {
    const contentMain = this.container.querySelector('#content-main');
    this.renderErrorView(contentMain, error);
  }

  renderErrorView(container, error) {
    container.innerHTML = `
      <div class="error-view">
        <div class="error-content">
          <h1>出错了</h1>
          <p>${error.message}</p>
          <button class="btn btn-primary" onclick="window.location.reload()">
            刷新页面
          </button>
        </div>
      </div>
    `;
  }

  async cleanupCurrentComponent() {
    if (this.currentComponent && typeof this.currentComponent.unmount === 'function') {
      try {
        await this.currentComponent.unmount();
        console.log('✅ 当前组件已清理');
      } catch (error) {
        console.error('❌ 清理组件失败:', error);
      }
    }
    this.currentComponent = null;
  }

  async unmount() {
    await this.cleanupCurrentComponent();

    if (this.eventBus && this.handleRouteChange) {
      this.eventBus.off('route:change', this.handleRouteChange);
    }

    if (this.container) {
      this.container.innerHTML = '';
    }
    this.container = null;
    this.currentView = null;
    console.log('✅ ContentArea 卸载完成');
  }
}