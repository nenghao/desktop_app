/**
 * 智能体详情视图
 */

import { agentDataService } from '../../services/agent/AgentDataService.js';
import { agentStatusBarManager } from '../../services/agent/AgentStatusBarManager.js';
import { NotificationCenter } from '../../components/common/NotificationCenter.js';
import { IconUtils } from '../../utils/IconUtils.js';
import { AgentInfoSidebar } from '../../components/agent/AgentInfoSidebar.js';
import { getGlobalEventBus, createNamespace } from '../../core/GlobalEventManager.js';
import { AgentUILoader } from '../../services/agent/AgentUILoader.js';
import { FileUploadService } from '../../services/FileUploadService.js';
import { API_CONFIG } from '../../services/api/api-config.js';
import '../../styles/views/agent-detail.css';
import '../../styles/components/agent-info-sidebar.css'; // 导入智能体信息侧边栏样式

export class AgentDetail {
  constructor(options = {}) {
    this.container = null;
    this.agentId = null;
    this.agentData = null;
    this.isLoading = false;
    this.isInitialized = false; // 防重复初始化标志
    this.isDestroyed = false; // 组件销毁标志
    this.agentInfoSidebar = null; // 智能体信息侧边栏

    // 使用传入的 eventBus 或回退到全局 eventBus
    this.eventBus = options.eventBus || getGlobalEventBus();
    this.agentEvents = createNamespace('agent-detail');
  }

  /**
   * 渲染智能体详情
   */
  async render(container, props = {}) {
    // 防止重复渲染
    if (this.isInitialized || this.isDestroyed) {
      console.log('🔄 AgentDetail 已初始化或已销毁，跳过重复渲染');
      return;
    }

    this.container = container;
    this.agentId = this.extractAgentIdFromUrl();

    if (!this.agentId) {
      this.renderError('智能体ID不存在');
      return;
    }

    try {
      // 首先初始化基础结构和 footer（无论智能体是否加载成功都要显示）
      this.initializeBaseStructure();

      // 显示加载动画
      if (window.agentStatusBarManager) {
        window.agentStatusBarManager.showLoading();
      }

      // 从数据服务获取智能体数据
      this.agentData = await this.getAgentData(this.agentId);

      if (!this.agentData) {
        this.renderAgentError('智能体不存在');
        return;
      }

      await this.renderAgentDetail();
      this.setupEventListeners();

      // 初始化智能体信息侧边栏
      await this.initializeAgentInfoSidebar();

      // 标记为已初始化
      this.isInitialized = true;
    } catch (error) {
      console.error('❌ 加载智能体详情失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('加载智能体详情失败: ' + error.message);
      }

      this.renderAgentError('加载智能体详情失败: ' + error.message);
    } finally {
      // 隐藏加载动画
      if (window.agentStatusBarManager) {
        window.agentStatusBarManager.hideLoading();
      }
    }
  }

  /**
   * 从URL中提取智能体ID
   */
  extractAgentIdFromUrl() {
    const hash = window.location.hash;
    const match = hash.match(/\/agent\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * 获取智能体数据
   * 详情页强制从API获取完整数据（包含下载链接、UI配置等）
   */
  async getAgentData(agentId) {
    try {
      // 强制从API获取详情（forceApi = true）
      const agentDetail = await agentDataService.getAgentById(agentId, true);
      return agentDetail;
    } catch (error) {
      console.error('❌ 获取智能体数据失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('获取智能体数据失败: ' + error.message);
      }
      return null;
    }
  }

  /**
   * 初始化基础结构（包括 footer，无论智能体是否加载成功都要显示）
   */
  initializeBaseStructure() {
    // 创建基础HTML结构
    this.container.innerHTML = `
      <div class="agent-detail">
        <!-- 智能体详情容器 -->
        <div class="agent-content-container" id="agent-content-container">
          <!-- 默认错误显示组件 -->
          <div class="agent-error-display" id="agent-error-display" style="display: none;">
            <div class="error-icon">❌</div>
            <h3 class="error-title" id="error-title">加载失败</h3>
            <p class="error-message" id="error-message">智能体加载时出现错误</p>
            <div class="error-code" id="error-code" style="display: none;">
              <strong>错误代码：</strong>
              <code id="error-code-text"></code>
            </div>
          </div>

          <!-- 依赖安装器覆盖层（默认隐藏） -->
          <div class="dependency-installer-overlay" id="dependency-installer-overlay" style="display: none;">
            <!-- DependencyInstaller 将渲染到这里 -->
          </div>

          <!-- 智能体主内容 -->
          <div class="agent-main-content" id="agent-main-content">
            <!-- 智能体具体内容（动态加载） -->
          </div>
        </div>
      </div>
    `;

    // 初始化 footer 相关功能（无论智能体是否加载成功都要显示）
    this.initializeFooter();
  }

  /**
   * 初始化 footer 功能
   */
  initializeFooter() {
    // Footer控件已移至Header，隐藏footer
    const footer = document.getElementById('app-footer');
    if (footer) {
      footer.classList.add('hidden');
      console.log('🔍 已隐藏 app-footer');
    }
  }

  /**
   * 渲染智能体详情
   */
  async renderAgentDetail() {
    const agent = this.agentData;
    const mainContentContainer = this.container.querySelector('#agent-main-content');

    if (!mainContentContainer) {
      console.error('❌ 找不到智能体主内容容器');
      return;
    }

    // 显示智能体标题
    this.showAgentTitle(agent.name);

    // 显示状态栏（统一在AgentDetail中控制）
    // 注：footer 已移至 header，暂时不显示
    // agentStatusBarManager.show();

    // 检查URL参数，看是否需要自动安装
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
    const shouldAutoInstall = urlParams.get('action') === 'install';

    // 检查智能体是否需要安装（根据 detail.librarys 和 detail.executables）
    const needsInstallation = this.checkIfNeedsInstallation(agent);

    // 验证智能体完整性并确定是否需要重新安装
    let needsReinstall = false;
    if (needsInstallation) {
      const agentManager = window.app?.getService('agentManager');
      if (agentManager) {
        needsReinstall = await agentManager.verifyAndRepairAgent(agent);
        console.log('🔍 智能体完整性验证结果:', {
          agentId: agent.id,
          needsReinstall
        });
      }
    }

    // 检查智能体是否已安装（基于完整性验证结果）
    const isInstalled = needsInstallation ? !needsReinstall : true;

    // 将安装状态添加到 agent 数据中，供 UI 使用
    agent.isInstalled = isInstalled;
    agent.needsInstallation = needsInstallation;

    // 先加载并显示智能体UI（无论是否需要安装）
    console.log('🚀 开始加载智能体UI:', agent.id, '需要安装:', needsInstallation, '已安装:', isInstalled);
    await this.loadAndRenderAgentUI(agent, mainContentContainer);

    // 如果需要安装但未安装，显示依赖安装器覆盖层并开始安装
    if (needsInstallation && !isInstalled) {
      console.log('� 智能体需要安装，显示依赖安装器并开始下载/安装');
      await this.showDependencyInstaller();

      // 开始下载和安装
      await this.downloadAndInstallAgent(agent);

      // 安装完成后隐藏覆盖层
      this.hideDependencyInstaller();
      console.log('✅ 智能体安装完成，隐藏依赖安装器');
    } else {
      console.log('ℹ️ 智能体不需要安装或已安装，不显示依赖安装器');
    }
  }

  /**
   * 动态加载并渲染智能体UI
   * @param {Object} agent - 智能体数据
   * @param {HTMLElement} container - 容器元素
   */
  async loadAndRenderAgentUI(agent, container) {
    // 1. 检查是否有 UI 配置（ui_config 在 detail 对象中）
    const uiConfig = agent.detail?.ui_config || agent.ui_config; // 兼容旧格式

    console.log('🔍 检查UI配置:', {
      agentId: agent.id,
      has_ui: agent.has_ui,
      has_detail: !!agent.detail,
      ui_config: uiConfig,
      version: agent.version
    });

    if (!agent.has_ui || !uiConfig) {
      console.warn('⚠️ 智能体没有UI配置');
      console.warn('  - has_ui:', agent.has_ui);
      console.warn('  - detail:', agent.detail);
      console.warn('  - ui_config:', uiConfig);
      console.warn('  ℹ️ 如果服务端已经配置了UI，请检查API返回数据');

      // 显示空界面提示
      container.innerHTML = `
        <div class="agent-ui-empty">
          <div style="font-size: 4rem; margin-bottom: 1rem;">📦</div>
          <h3 style="margin-bottom: 0.5rem; color: var(--color-text);">智能体UI未配置</h3>
          <p>
            此智能体暂未提供UI界面<br>
            请联系管理员配置智能体UI资源
          </p>
        </div>
      `;
      return;
    }

    // 2. 显示加载状态
    this.showLoadingState(container);

    try {
      // 3. 使用 AgentUILoader 加载 UI 代码
      const uiLoader = new AgentUILoader();

      // 检查是否需要强制刷新（通过URL参数）
      // 注意：hash 路由中参数在 hash 后面，需要从 hash 中提取
      const hash = window.location.hash; // 例如: #/agents/math_calculator?dev=true
      const queryString = hash.includes('?') ? hash.split('?')[1] : '';
      const urlParams = new URLSearchParams(queryString);

      console.log('🔍 [DEBUG] 当前URL:', window.location.href);
      console.log('🔍 [DEBUG] Hash:', hash);
      const forceRefresh = urlParams.get('force_refresh') === 'true';
      const devMode = urlParams.get('dev') === 'true';

      if (forceRefresh) {
        await uiLoader.clearCache(agent.id);
        // 清除URL参数
        urlParams.delete('force_refresh');
        const hashPath = hash.split('?')[0];
        const newQuery = urlParams.toString();
        const newHash = newQuery ? `${hashPath}?${newQuery}` : hashPath;
        window.location.hash = newHash;
      }

      // 创建包含 version 的新对象（不修改原始 uiConfig）
      // version 从 agent.version 获取（与 ui_config 同级）
      const uiConfigWithVersion = {
        ...uiConfig,
        version: agent.version
      };

      // 加载UI（开发模式下禁用缓存）
      const uiBundle = await uiLoader.loadAgentUI(agent.id, uiConfigWithVersion, {
        disableCache: devMode
      });

      // 4. 注入 CSS
      this.injectAgentCSS(agent.id, uiBundle.cssCode);

      // 5. 执行 JS 代码，渲染 UI
      await this.executeAgentUI(container, uiBundle, agent);

      console.log('✅ 智能体UI渲染完成:', agent.id);

    } catch (error) {
      console.error('❌ 加载智能体UI失败:', error);

      // 显示错误界面
      container.innerHTML = `
        <div style="
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          padding: 2rem;
          text-align: center;
        ">
          <div style="font-size: 4rem; margin-bottom: 1rem;">⚠️</div>
          <h3 style="margin-bottom: 0.5rem; color: var(--color-text);">UI加载失败</h3>
          <p style="color: var(--color-text-secondary); margin-bottom: 1rem;">
            ${error.message}
          </p>
          <button
            class="btn btn-primary"
            onclick="window.location.reload()"
            style="
              padding: 0.75rem 1.5rem;
              background: var(--color-primary);
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            "
          >
            刷新重试
          </button>
        </div>
      `;

      // 显示错误提示
      if (window.notificationCenter) {
        window.notificationCenter.error(`UI加载失败: ${error.message}`);
      }
    }
  }

  /**
   * 使用降级方案（显示友好的错误信息）
   * @param {Object} agent - 智能体数据
   * @param {HTMLElement} container - 容器元素
   */
  async useFallbackUI(agent, container) {
    console.log('🔄 使用降级方案:', agent.id);

    // 显示友好的错误信息
    this.renderPlaceholder(container, agent);
  }

  /**
   * 显示加载状态
   * @param {HTMLElement} container - 容器元素
   */
  showLoadingState(container) {
    container.innerHTML = `
      <div class="agent-ui-loading">
        <div class="loading-spinner"></div>
        <p>正在加载智能体UI...</p>
      </div>
    `;
  }

  /**
   * 注入智能体CSS
   * @param {string} agentId - 智能体ID
   * @param {string} cssCode - CSS代码
   */
  injectAgentCSS(agentId, cssCode) {
    const styleId = `agent-ui-style-${agentId}`;

    // 检查是否已经注入
    let styleElement = document.getElementById(styleId);

    if (styleElement) {
      // 更新现有样式
      styleElement.textContent = cssCode;
      console.log('🔄 更新智能体CSS:', agentId);
    } else {
      // 创建新样式
      styleElement = document.createElement('style');
      styleElement.id = styleId;
      styleElement.textContent = cssCode;
      document.head.appendChild(styleElement);
      console.log('✅ 注入智能体CSS:', agentId);
    }
  }

  /**
   * 执行智能体UI代码
   * @param {HTMLElement} container - 容器元素
   * @param {Object} uiBundle - UI Bundle对象
   * @param {Object} agentData - 智能体数据
   */
  async executeAgentUI(container, uiBundle, agentData) {
    try {
      // 创建文件上传服务实例
      const fileUploadService = new FileUploadService({
        agentId: agentData.id,
        agentData: agentData,
        baseURL: API_CONFIG.baseURL,  // 添加 API 基础地址
        notificationCenter: window.notificationCenter,
        statusBarManager: agentStatusBarManager,
        app: window.app,
        eventBus: this.eventBus,
        userManager: window.app?.getService('userManager')  // 添加用户管理服务用于获取token
      });

      // 创建沙箱上下文
      const context = {
        container: container,
        agentData: agentData,
        config: uiBundle.config,

        // API 配置 - 从统一配置获取
        apiConfig: {
          baseUrl: API_CONFIG.baseURL,
          timeout: API_CONFIG.timeout
        },

        // 提供服务引用
        services: {
          statusBarManager: agentStatusBarManager,
          app: window.app,
          fileUpload: fileUploadService,  // 添加文件上传服务
          userManager: window.app?.getService('userManager')  // 添加用户管理服务
        },

        // 提供必要的工具函数
        utils: {
          // 图标工具
          IconUtils: IconUtils,
          notificationCenter: window.notificationCenter,
          // 状态栏快捷方法
          updateStatus: (status, message) => {
            if (agentStatusBarManager) {
              agentStatusBarManager.updateStatusOnly(status, message);
            }
          },
          updateAgentStatus: (agentName, status, message) => {
            if (agentStatusBarManager) {
              agentStatusBarManager.updateAgent(agentName, status, message);
            }
          },
          // 依赖安装器控制
          showDependencyInstaller: () => {
            this.showDependencyInstaller();
          },
          hideDependencyInstaller: () => {
            this.hideDependencyInstaller();
          },
          // 执行智能体方法
          executeAgent: async (method, args = []) => {
            try {
              const agentManager = window.app?.getService('agentManager');
              if (!agentManager) {
                throw new Error('AgentManager 服务不可用');
              }

              const result = await agentManager.executeAgent(agentData.id, method, args);
              return result;
            } catch (error) {
              console.error(`❌ 执行智能体方法失败: ${method}`, error);
              throw error;
            }
          },
          // 文件上传快捷方法
          selectFiles: async (options = {}) => {
            return await fileUploadService.selectFiles(options);
          },
          uploadFile: async (file, options = {}) => {
            return await fileUploadService.upload(file, options);
          },
          uploadMultipleFiles: async (files, options = {}) => {
            return await fileUploadService.uploadMultiple(files, options);
          },
          selectAndUploadFile: async (options = {}) => {
            // 选择并上传文件的一站式方法
            const files = await fileUploadService.selectFiles({
              multiple: options.multiple || false,
              accept: options.accept
            });

            if (files.length === 0) {
              return null;
            }

            if (files.length === 1) {
              return await fileUploadService.upload(files[0], options);
            } else {
              return await fileUploadService.uploadMultiple(files, options);
            }
          }
        }
      };

      // 在 Electron 环境中添加 Node.js 模块或使用 preload 暴露的桥接 API（兼容两种配置）
      try {
        if (window.require) {
          context.utils.fs = window.require('fs');
          context.utils.path = window.require('path');
          context.utils.os = window.require('os');
        } else {
          // 回退到 preload 暴露的受限 API
          if (window.fileAPI) context.utils.fs = window.fileAPI;
          if (window.pathAPI) context.utils.path = window.pathAPI;
          if (window.osAPI) context.utils.os = window.osAPI;
          if (window.electronAPI) context.utils.electronAPI = window.electronAPI;
        }
      } catch (error) {
        console.warn('无法加载 Node.js 模块或预加载API:', error);
      }

      // 执行 bundle.js 代码
      try {
        // 统一使用动态 script 标签加载方式（符合 CSP 策略）
        console.log('🔄 使用动态 script 标签加载智能体 bundle.js');

        // 创建 script 标签并加载
        await this.loadBundleViaScript(uiBundle.bundleCode, agentData.id);

        // 从全局命名空间获取 init 函数
        if (!window.__AGENT_INIT__ || typeof window.__AGENT_INIT__[agentData.id] !== 'function') {
          throw new Error(`智能体UI代码格式错误：未找到 window.__AGENT_INIT__.${agentData.id} 函数`);
        }

        const init = window.__AGENT_INIT__[agentData.id];
        console.log(`✅ 已从 window.__AGENT_INIT__.${agentData.id} 获取 init 函数`);

        // 调用初始化函数，传入 context
        await init(context);

        // 执行完成后立即清理全局注册（最小化内存占用）
        if (window.__AGENT_INIT__[agentData.id]) {
          delete window.__AGENT_INIT__[agentData.id];
          console.log(`🗑️ 已清理 window.__AGENT_INIT__.${agentData.id}（用完即清）`);
        }

      } catch (syntaxError) {
        console.error('❌ Bundle代码执行失败:', syntaxError);
        throw syntaxError;
      }

    } catch (error) {
      console.error('❌ 执行智能体UI代码失败:', error);
      throw new Error(`UI代码执行失败: ${error.message}`);
    }
  }

  /**
   * 渲染占位内容
   * @param {HTMLElement} container - 容器元素
   * @param {Object} agent - 智能体数据
   */
  renderPlaceholder(container, agent) {
    container.innerHTML = `
      <div class="workspace-placeholder">
        <div class="placeholder-icon">${agent.icon || '🤖'}</div>
        <h3>${agent.name}</h3>
        <p>${agent.description || '暂无描述'}</p>
        <div class="placeholder-info">
          <p><small>智能体ID: ${agent.id}</small></p>
          <p><small>版本: ${agent.version || '1.0.0'}</small></p>
        </div>
        <div class="placeholder-actions">
          <button class="btn btn-secondary" id="retry-load-ui">重新加载</button>
        </div>
      </div>
    `;

    // 绑定重新加载按钮
    const retryBtn = container.querySelector('#retry-load-ui');
    if (retryBtn) {
      retryBtn.addEventListener('click', async () => {
        console.log('🔄 重新加载智能体UI');
        await this.loadAndRenderAgentUI(agent, container);
      });
    }
  }

  /**
   * 显示依赖安装器覆盖层
   */
  async showDependencyInstaller() {
    const overlay = this.container.querySelector('#dependency-installer-overlay');
    if (overlay) {
      overlay.classList.add('show');
      overlay.style.display = 'block';

      console.log('📦 显示安装进度覆盖层');

      // 显示简单的加载提示（不使用旧的 DependencyInstaller 组件）
      // 使用 CSS 变量适配深浅色主题
      overlay.innerHTML = `
        <div class="dependency-installer-content">
          <div class="loading-spinner"></div>
          <p class="installer-title">正在下载和安装智能体...</p>
          <p class="installer-subtitle">请稍候，这可能需要几分钟时间</p>
        </div>
      `;
    }
  }

  /**
   * 隐藏依赖安装器覆盖层
   */
  hideDependencyInstaller() {
    const overlay = this.container.querySelector('#dependency-installer-overlay');
    if (overlay) {
      overlay.classList.remove('show');
      overlay.style.display = 'none';
      overlay.innerHTML = ''; // 清空内容

      console.log('📦 隐藏依赖安装器覆盖层');
    }
  }

  /**
   * 渲染智能体错误信息（只在内容区域显示错误，footer 保持正常）
   */
  renderAgentError(message) {
    // 使用新的统一错误显示方法
    this.showAgentError({
      title: '加载失败',
      message: message,
      show: true
    });
  }

  /**
   * 显示/隐藏智能体错误信息（统一的错误显示方法）
   * @param {Object} options - 错误显示选项
   * @param {string} options.title - 错误标题
   * @param {string} options.message - 错误详情
   * @param {string} [options.errorCode] - 错误代码（可选）
   * @param {boolean} options.show - 是否显示错误（true显示，false隐藏）
   */
  showAgentError(options = {}) {
    const {
      title = '加载失败',
      message = '智能体加载时出现错误',
      errorCode = null,
      show = true
    } = options;

    const errorDisplay = this.container.querySelector('#agent-error-display');
    const errorTitle = this.container.querySelector('#error-title');
    const errorMessage = this.container.querySelector('#error-message');
    const errorCodeContainer = this.container.querySelector('#error-code');
    const errorCodeText = this.container.querySelector('#error-code-text');
    const mainContent = this.container.querySelector('#agent-main-content');

    if (!errorDisplay) {
      console.error('❌ 找不到错误显示容器');
      return;
    }

    if (show) {
      // 更新错误内容
      if (errorTitle) errorTitle.textContent = title;
      if (errorMessage) errorMessage.textContent = message;

      // 处理错误代码
      if (errorCode && errorCodeContainer && errorCodeText) {
        errorCodeText.textContent = errorCode;
        errorCodeContainer.style.display = 'block';
      } else if (errorCodeContainer) {
        errorCodeContainer.style.display = 'none';
      }

      // 显示错误，隐藏主内容
      errorDisplay.style.display = 'block';
      if (mainContent) mainContent.style.display = 'none';
    } else {
      // 隐藏错误，显示主内容
      errorDisplay.style.display = 'none';
      if (mainContent) mainContent.style.display = 'block';
    }
  }

  /**
   * 渲染错误页面（完整页面错误）
   */
  renderError(message) {
    this.container.innerHTML = `
      <div class="agent-detail">
        <div class="error-content">
          <div class="error-icon">❌</div>
          <h2>加载失败</h2>
          <p>${message}</p>
          <button class="btn btn-primary" id="back-btn-alt">返回智能体列表</button>
        </div>
      </div>
    `;
  }

  /**
   * 初始化智能体信息侧边栏
   */
  async initializeAgentInfoSidebar() {
    try {
      console.log('🔧 开始初始化智能体信息侧边栏...');
      // 创建侧边栏容器，添加到AgentDetail容器中
      let sidebarContainer = this.container.querySelector('#agent-info-sidebar-container');
      if (!sidebarContainer) {
        sidebarContainer = document.createElement('div');
        sidebarContainer.id = 'agent-info-sidebar-container';
        // 添加到AgentDetail容器中
        this.container.appendChild(sidebarContainer);
        console.log('  - 创建了新的侧边栏容器');
      } else {
        console.log('  - 使用现有的侧边栏容器');
      }

      // 初始化侧边栏组件
      this.agentInfoSidebar = new AgentInfoSidebar();
      console.log('  - AgentInfoSidebar 实例已创建');
      await this.agentInfoSidebar.render(sidebarContainer);
      console.log('  - AgentInfoSidebar 已渲染');

      // 绑定事件，通过GlobalEventManager处理
      this.agentInfoSidebar.on('example-click', (data) => {
        console.log('📝 示例被点击:', data.example);

        // 发布示例点击事件
        this.agentEvents.emit('example-clicked', {
          agentId: this.agentId,
          example: data.example,
          timestamp: Date.now()
        });

        // 处理示例点击
        this.handleExampleClick(data.example);
      });

      this.agentInfoSidebar.on('pin-agent', (data) => {
        const { agentData, isPinned } = data;
        console.log('📌 智能体固定状态切换:', agentData.name, isPinned ? '固定' : '取消固定');

        // 发布对应的事件（固定或取消固定）
        const eventName = isPinned ? 'agent-pinned' : 'agent-unpinned';
        this.agentEvents.emit(eventName, {
          agentId: this.agentId,
          agentData: agentData,
          isPinned: isPinned,
          timestamp: Date.now()
        });

        // 处理固定/取消固定智能体（传递完整的 data 对象）
        this.handlePinAgent(data);
      });

      console.log('✅ 智能体信息侧边栏初始化完成');
    } catch (error) {
      console.error('❌ 智能体信息侧边栏初始化失败:', error);
    }
  }

  /**
   * 处理示例点击事件
   */
  handleExampleClick(example) {
    // 如果是数学计算器，自动填入示例到输入框
    if (this.agentData?.type === 'python' && this.agentData?.id === 'math_calculator') {
      const inputElement = this.container.querySelector('#calc-input');
      if (inputElement) {
        inputElement.value = example;
        inputElement.focus();
        // 注意：计算逻辑现在在 bundle.js 中处理
      }
    }
  }

  /**
   * 处理固定智能体事件
   * @param {Object} data - 事件数据
   * @param {Object} data.agentData - 智能体数据
   * @param {boolean} data.isPinned - 是否固定
   */
  async handlePinAgent(data) {
    try {
      const { agentData, isPinned } = data;

      // 获取 AgentManager
      const agentManager = window.app?.getService('agentManager');
      if (!agentManager) {
        console.error('❌ AgentManager 服务不可用');
        if (window.notificationCenter) {
          window.notificationCenter.error('操作失败：服务不可用');
        }
        return;
      }

      // 根据状态调用对应的方法
      if (isPinned) {
        // 固定智能体
        await agentManager.pinAgent(agentData);
        console.log('✅ 智能体已固定到侧边栏:', agentData.name);

        // 显示成功通知
        if (window.notificationCenter) {
          window.notificationCenter.success(`${agentData.name} 已固定到侧边栏`);
        }
      } else {
        // 取消固定智能体
        await agentManager.unpinAgent(agentData.id);
        console.log('✅ 智能体已从侧边栏移除:', agentData.name);

        // 显示成功通知
        if (window.notificationCenter) {
          window.notificationCenter.success(`${agentData.name} 已从侧边栏移除`);
        }
      }
    } catch (error) {
      console.error('❌ 固定状态切换失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('操作失败: ' + error.message);
      }
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 返回按钮（只在错误页面有）
    const backBtn = this.container.querySelector('#back-btn-alt');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        this.goBack();
      });
    }

    // 启动智能体按钮
    const startBtn = this.container.querySelector('#start-agent');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        this.startAgent();
      });
    }

    // 固定按钮
    const pinBtn = this.container.querySelector('#pin-agent-btn');
    if (pinBtn) {
      this.setupPinButton(pinBtn);
    }

    // 监听来自Header的信息按钮点击事件
    this.eventBus.on('agent-detail:show-info-sidebar', () => {
      console.log('🎯 AgentDetail: 收到显示侧边栏事件');
      this.showAgentInfoSidebar();
    });

    // 注意：示例按钮和表单提交事件现在由 bundle.js 处理
  }

  /**
   * 返回智能体列表
   */
  goBack() {
    if (window.app && window.app.getService) {
      window.app.getService('router').navigate('/agents');
    } else {
      window.location.hash = '#/agents';
    }
  }

  /**
   * 启动智能体
   */
  async startAgent() {
    if (!this.agentData) return;

    // 检查是否是本地智能体
    if (this.agentData.isLocal && this.agentData.executable) {
      try {
        // 启动本地智能体
        await this.startLocalAgent();
      } catch (error) {
        console.error('启动本地智能体失败:', error);
        if (window.notificationCenter) {
          window.notificationCenter.error(`启动 ${this.agentData.name} 失败: ${error.message}`);
        }
      }
    } else {
      // 其他类型的智能体
      if (window.notificationCenter) {
        window.notificationCenter.info(`启动 ${this.agentData.name} 功能开发中...`);
      }
    }
  }

  /**
   * 启动本地智能体
   */
  async startLocalAgent() {
    try {
      // 根据智能体ID启动对应的本地组件
      switch (this.agentData.id) {
        case 'local-data-calculator':
          await this.startDataCalculator();
          break;
        default:
          throw new Error('未知的本地智能体类型');
      }
    } catch (error) {
      console.error('启动本地智能体失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error(`启动本地智能体失败: ${error.message}`);
      }
      this.showError(`启动失败: ${error.message}`);
    }
  }

  /**
   * 启动数据计算器
   */
  async startDataCalculator() {
    try {
      // 创建数据计算器实例
      this.localAgentInstance = new LocalDataCalculator();

      // 获取操作容器
      const operationContainer = this.container.querySelector('#operation-container');
      if (!operationContainer) {
        throw new Error('操作容器不存在');
      }

      // 在操作容器中渲染数据计算器
      await this.localAgentInstance.render(operationContainer);

      console.log('✅ 本地数据计算器启动成功');
    } catch (error) {
      console.error('❌ 启动数据计算器失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('数据计算器启动失败: ' + error.message);
      }
      throw new Error('数据计算器启动失败');
    }
  }

  /**
   * 显示错误信息
   */
  showError(message) {
    // 优先使用新的内容容器
    const contentContainer = this.container.querySelector('#agent-content-container');
    const operationContainer = this.container.querySelector('#operation-container');

    const targetContainer = contentContainer || operationContainer;

    if (targetContainer) {
      targetContainer.innerHTML = `
        <div class="error-content">
          <div class="error-icon">❌</div>
          <h3>启动失败</h3>
          <p>${message}</p>
        </div>
      `;
    }
  }

  /**
   * 显示智能体标题
   */
  showAgentTitle(agentName) {
    console.log('🔍 尝试显示智能体标题:', agentName);
    console.log('🔍 window.app:', window.app);
    console.log('🔍 window.app.titleBar:', window.app ? window.app.titleBar : 'app不存在');

    // 通过全局app实例获取TitleBar
    if (window.app && window.app.titleBar) {
      console.log('✅ 调用titleBar.showAgentTitle');
      window.app.titleBar.showAgentTitle(agentName);
    } else {
      console.warn('❌ 无法访问titleBar实例');
    }
  }

  /**
   * 隐藏智能体标题
   */
  hideAgentTitle() {
    // 通过全局app实例获取TitleBar
    if (window.app && window.app.titleBar) {
      window.app.titleBar.hideAgentTitle();
    }
  }

  /**
   * 处理返回导航
   */
  handleBackNavigation() {
    // 使用路由器导航到智能体列表页面
    if (window.app && window.app.getRouter) {
      window.app.getRouter().navigate('/agents');
    } else {
      // 备用方案：直接修改hash
      window.location.hash = '#/agents';
    }
  }

  /**
   * 显示智能体信息侧边栏
   */
  showAgentInfoSidebar() {
    console.log('🔍 showAgentInfoSidebar 被调用');
    console.log('  - agentInfoSidebar:', this.agentInfoSidebar ? '已初始化' : '未初始化');
    console.log('  - agentData:', this.agentData ? '存在' : '不存在');

    if (this.agentInfoSidebar && this.agentData) {
      console.log('📋 显示智能体信息侧边栏:', this.agentData.name);

      // 发布侧边栏显示事件
      this.agentEvents.emit('sidebar-shown', {
        agentId: this.agentId,
        agentName: this.agentData.name,
        timestamp: Date.now()
      });

      this.agentInfoSidebar.show(this.agentData);
    } else {
      console.warn('❌ 智能体信息侧边栏未初始化或智能体数据不存在');
      if (!this.agentInfoSidebar) {
        console.warn('  - agentInfoSidebar 未初始化');
      }
      if (!this.agentData) {
        console.warn('  - agentData 不存在');
      }
    }
  }

  /**
   * 启动数学计算器智能体
   */
  // 旧的智能体启动方法已删除（startMathCalculatorAgent, startPDFConverterAgent, startPythonAgent）
  // 现在所有智能体都通过动态加载的方式启动
  // 现在所有计算逻辑都在 bundle.js 中处理

  /**
   * 添加到历史记录
   */
  addToHistory(expression, result, success) {
    const historyList = this.container.querySelector('#history-list');
    if (!historyList) return;

    const historyItem = document.createElement('div');
    historyItem.className = `history-item ${success ? 'success' : 'error'}`;
    historyItem.innerHTML = `
      <div class="history-expression">${expression}</div>
      <div class="history-result">${success ? '= ' + result : '错误: ' + result}</div>
      <div class="history-time">${new Date().toLocaleTimeString()}</div>
    `;

    // 插入到顶部
    historyList.insertBefore(historyItem, historyList.firstChild);

    // 限制历史记录数量
    const items = historyList.querySelectorAll('.history-item');
    if (items.length > 10) {
      items[items.length - 1].remove();
    }
  }



  /**
   * 设置固定按钮
   */
  async setupPinButton(pinBtn) {
    try {
      console.log('🔧 开始设置固定按钮...');

      // 使用统一的服务获取方式
      const agentManager = await window.app.getServiceAsync('agentManager');

      if (!agentManager) {
        console.warn('⚠️ AgentManager 未找到');
        return;
      }

      console.log('✅ AgentManager 获取成功');

      // 检查当前固定状态并更新按钮
      this.updatePinButtonState(pinBtn, agentManager);

      // 添加点击事件
      pinBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        console.log('🖱️ Pin按钮被点击');
        await this.handlePinToggle(pinBtn, agentManager);
      });

      console.log('✅ 固定按钮设置完成');
    } catch (error) {
      console.error('❌ 设置固定按钮失败:', error);
    }
  }

  /**
   * 更新固定按钮状态
   */
  updatePinButtonState(pinBtn, agentManager) {
    if (!this.agentId || !agentManager) return;

    const isPinned = agentManager.isPinned(this.agentId);
    const pinIcon = pinBtn.querySelector('.pin-icon');

    if (isPinned) {
      pinBtn.classList.add('pinned');
      pinBtn.title = '取消固定';
      if (pinIcon) pinIcon.innerHTML = IconUtils.getIcon('pin', { size: 16 });
    } else {
      pinBtn.classList.remove('pinned');
      pinBtn.title = '固定到侧边栏';
      if (pinIcon) pinIcon.innerHTML = IconUtils.getIcon('pin', { size: 16 });
    }
  }

  /**
   * 处理固定状态切换
   */
  async handlePinToggle(pinBtn, agentManager) {
    if (!this.agentId || !this.agentData) {
      console.warn('⚠️ 智能体ID或数据不存在');
      return;
    }

    const isPinned = agentManager.isPinned(this.agentId);
    console.log('📌 当前固定状态:', isPinned);

    try {
      if (isPinned) {
        await agentManager.unpinAgent(this.agentId);
        console.log('📌 智能体已取消固定:', this.agentId);
        if (window.notificationCenter) {
          window.notificationCenter.success('智能体已从侧边栏移除');
        }
      } else {
        await agentManager.pinAgent(this.agentId, this.agentData);
        console.log('📌 智能体已固定:', this.agentId);
        if (window.notificationCenter) {
          window.notificationCenter.success('智能体已固定到侧边栏');
        }
      }

      // 更新按钮状态
      this.updatePinButtonState(pinBtn, agentManager);

      // 添加成功动画
      pinBtn.classList.add('pin-success');
      setTimeout(() => {
        pinBtn.classList.remove('pin-success');
      }, 300);

    } catch (error) {
      console.error('❌ 固定状态切换失败:', error);
      if (window.notificationCenter) {
        window.notificationCenter.error('固定状态切换失败: ' + error.message);
      }
    }
  }

  /**
   * 检查智能体是否需要安装
   * 根据 detail.librarys 和 detail.executables 判断
   * @param {Object} agent - 智能体数据
   * @returns {boolean} 是否需要安装
   */
  checkIfNeedsInstallation(agent) {
    // 如果没有 detail 对象，不需要安装
    if (!agent.detail) {
      console.log('ℹ️ 智能体没有 detail 对象，不需要安装');
      return false;
    }

    const { librarys, executables } = agent.detail;

    // 检查 librarys 是否有下载链接
    const hasLibrarys = librarys && typeof librarys === 'object' && Object.keys(librarys).length > 0;

    // 检查 executables 是否有下载链接
    const hasExecutables = executables && typeof executables === 'object' && Object.keys(executables).length > 0;

    const needsInstallation = hasLibrarys || hasExecutables;

    console.log('🔍 检查智能体是否需要安装:', {
      agentId: agent.id,
      hasLibrarys,
      hasExecutables,
      needsInstallation
    });

    return needsInstallation;
  }

  /**
   * 下载并安装智能体
   * @param {Object} agent - 智能体数据
   */
  async downloadAndInstallAgent(agent) {
    try {
      console.log('📥 开始下载并安装智能体:', agent.id);

      // 获取AgentManager实例
      const agentManager = window.app?.getService('agentManager');

      if (!agentManager) {
        throw new Error('AgentManager 服务不可用');
      }

      // 调用 AgentManager 的下载和安装方法
      await agentManager.downloadAndInstallAgent(agent, (progress) => {
        // 更新进度（可以在依赖安装器中显示）
        console.log('📊 安装进度:', progress);
      });

      console.log('✅ 智能体下载和安装完成:', agent.id);

    } catch (error) {
      console.error('❌ 智能体下载和安装失败:', error);
      throw error;
    }
  }

  /**
   * 检查智能体是否已安装
   * @param {string} agentId - 智能体ID
   * @returns {Promise<boolean>} 是否已安装
   */
  async checkAgentInstalled(agentId) {
    try {
      // 获取AgentManager实例
      const agentManager = window.app?.getService('agentManager');

      if (!agentManager) {
        console.warn('⚠️ AgentManager 服务不可用');
        return false;
      }

      // 检查方法是否存在
      if (typeof agentManager.isAgentInstalled !== 'function') {
        console.error('❌ agentManager.isAgentInstalled 不是一个函数');
        console.log('agentManager 对象:', agentManager);
        console.log('agentManager 的方法:', Object.getOwnPropertyNames(Object.getPrototypeOf(agentManager)));
        return false;
      }

      // 检查是否已安装
      const isInstalled = agentManager.isAgentInstalled(agentId);
      console.log(`📦 智能体 ${agentId} 安装状态:`, isInstalled);

      return isInstalled;
    } catch (error) {
      console.error('❌ 检查智能体安装状态失败:', error);
      console.error('错误堆栈:', error.stack);
      return false;
    }
  }

  /**
   * 显示未安装状态
   * @param {HTMLElement} container - 容器元素
   * @param {Object} agent - 智能体数据
   */
  showNotInstalledState(container, agent) {
    container.innerHTML = `
      <div class="agent-not-installed">
        <div class="not-installed-icon">📦</div>
        <h3>智能体未安装</h3>
        <p>此智能体需要先安装才能使用</p>
        <p class="agent-info">
          <strong>${agent.name}</strong> v${agent.version || '1.0.0'}
        </p>
        <button id="install-agent-btn" class="install-button">
          <span class="install-icon">⬇️</span>
          <span class="install-text">安装智能体</span>
        </button>
      </div>
    `;

    // 添加安装按钮样式
    const style = document.createElement('style');
    style.textContent = `
      .agent-not-installed {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 2rem;
        text-align: center;
      }

      .not-installed-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      .agent-not-installed h3 {
        font-size: 1.5rem;
        margin-bottom: 0.5rem;
        color: #333;
      }

      .agent-not-installed p {
        color: #666;
        margin-bottom: 0.5rem;
      }

      .agent-info {
        margin: 1rem 0;
        padding: 0.5rem 1rem;
        background: #f5f5f5;
        border-radius: 4px;
      }

      .install-button {
        margin-top: 1.5rem;
        padding: 0.75rem 2rem;
        font-size: 1rem;
        background: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: background 0.3s;
      }

      .install-button:hover {
        background: #45a049;
      }

      .install-button:disabled {
        background: #ccc;
        pointer-events: none;
      }

      .install-icon {
        font-size: 1.2rem;
      }
    `;
    document.head.appendChild(style);

    // 更新Footer状态为"未安装"
    agentStatusBarManager.updateStatusOnly('error', '智能体未安装');

    // 添加安装按钮事件监听
    const installBtn = container.querySelector('#install-agent-btn');
    if (installBtn) {
      installBtn.addEventListener('click', async () => {
        await this.installAgent(agent);
      });
    }
  }

  /**
   * 安装智能体
   * @param {Object} agent - 智能体数据
   */
  async installAgent(agent) {
    try {
      console.log('🚀 开始安装智能体:', agent.id);

      // 禁用安装按钮
      const installBtn = this.container.querySelector('#install-agent-btn');
      if (installBtn) {
        installBtn.disabled = true;
        installBtn.querySelector('.install-text').textContent = '安装中...';
      }

      // 获取AgentManager实例
      const agentManager = window.app?.getService('agentManager');

      if (!agentManager) {
        throw new Error('AgentManager 服务不可用');
      }

      // 获取平台信息
      const rawPlatform = window.electronAPI?.platform || 'win32';
      const rawArch = window.electronAPI?.arch || 'x64';

      // 转换为后端API期望的格式
      // Node.js platform: win32/darwin/linux
      // 后端API期望: win/mac/linux
      let platform = rawPlatform;
      if (rawPlatform === 'win32') {
        platform = 'win';
      } else if (rawPlatform === 'darwin') {
        platform = 'mac';
      }
      // linux保持不变

      // 转换架构格式
      // Node.js arch: x64/arm64/ia32
      // 后端API期望: amd64/arm64/x86
      let arch = rawArch;
      if (rawArch === 'x64') {
        arch = 'amd64';
      } else if (rawArch === 'ia32') {
        arch = 'x86';
      }
      // arm64保持不变

      console.log('🖥️ 原始平台信息:', { rawPlatform, rawArch });
      console.log('🖥️ 转换后平台信息:', { platform, arch });

      // 从API获取智能体完整数据（包含下载链接）
      const agentApiService = window.app?.getService('agentApiService');
      if (!agentApiService) {
        throw new Error('AgentApiService 服务不可用');
      }

      const agentsData = await agentApiService.fetchAgentsData(platform, arch);
      console.log('📦 API返回的智能体数据:', agentsData);

      // 处理不同的API响应格式
      let agentsList = [];

      if (Array.isArray(agentsData)) {
        // 直接是数组
        agentsList = agentsData;
      } else if (agentsData.data) {
        // 标准响应格式: { success: true, message: "...", data: {...} }
        const dataObj = agentsData.data;

        if (Array.isArray(dataObj)) {
          // data 直接是数组
          agentsList = dataObj;
        } else if (dataObj.items && Array.isArray(dataObj.items)) {
          // data.items 是数组
          agentsList = dataObj.items;
        } else if (dataObj.agents && Array.isArray(dataObj.agents)) {
          // data.agents 是数组
          agentsList = dataObj.agents;
        }
      } else if (agentsData.items && Array.isArray(agentsData.items)) {
        // { items: [...] } 格式
        agentsList = agentsData.items;
      } else if (agentsData.agents && Array.isArray(agentsData.agents)) {
        // { agents: [...] } 格式
        agentsList = agentsData.agents;
      }

      console.log('📦 解析后的智能体列表:', agentsList);
      console.log('📦 智能体列表长度:', agentsList.length);
      console.log('📦 智能体ID列表:', agentsList.map(a => a.id));

      const fullAgentData = agentsList.find(a => a.id === agent.id);

      if (!fullAgentData) {
        console.error('❌ 未找到智能体数据:', agent.id);
        console.error('可用的智能体:', agentsList.map(a => a.id));
        throw new Error(`无法获取智能体下载信息: ${agent.id}`);
      }

      console.log('✅ 找到智能体数据:', fullAgentData);

      // 开始下载和安装
      await agentManager.downloadAndInstallAgent(fullAgentData, (progress) => {
        // 更新Footer进度
        this.updateInstallProgress(progress);
      });

      console.log('✅ 智能体安装完成:', agent.id);

      // 显示成功消息
      if (window.notificationCenter) {
        window.notificationCenter.success('智能体安装成功！');
      }

      // 重新渲染智能体详情（现在已安装）
      await this.renderAgentDetail();

    } catch (error) {
      console.error('❌ 智能体安装失败:', error);

      // 显示错误消息
      if (window.notificationCenter) {
        window.notificationCenter.error('智能体安装失败: ' + error.message);
      }

      // 更新Footer状态
      agentStatusBarManager.updateStatusOnly('failed', '安装失败: ' + error.message);

      // 恢复安装按钮
      const installBtn = this.container.querySelector('#install-agent-btn');
      if (installBtn) {
        installBtn.disabled = false;
        installBtn.querySelector('.install-text').textContent = '重试安装';
      }
    }
  }

  /**
   * 更新安装进度
   * @param {Object} progress - 进度信息
   */
  updateInstallProgress(progress) {
    const { type, message, current, total, fileProgress, totalProgress } = progress;

    switch (type) {
      case 'downloading':
        const downloadMsg = `下载中 (${current}/${total}) ${fileProgress}%`;
        agentStatusBarManager.updateStatusOnly('downloading', downloadMsg);
        break;

      case 'installing':
        agentStatusBarManager.updateStatusOnly('installing', message || '安装中...');
        break;

      case 'dependency_check':
        agentStatusBarManager.updateStatusOnly('dependency_check', message || '检查依赖...');
        break;

      case 'dependency_install':
        agentStatusBarManager.updateStatusOnly('dependency_install', message || '安装依赖...');
        break;

      case 'completed':
        agentStatusBarManager.updateStatusOnly('completed', message || '安装完成 ✓');
        // 3秒后恢复为就绪状态
        setTimeout(() => {
          agentStatusBarManager.updateStatusOnly('ready', 'Python环境就绪');
        }, 3000);
        break;

      case 'failed':
        agentStatusBarManager.updateStatusOnly('failed', message || '安装失败 ✗');
        break;

      default:
        console.log('📊 安装进度:', progress);
    }
  }

  /**
   * 通过动态 script 标签加载 bundle.js（符合 CSP 策略）
   * @param {string} bundleCode - bundle.js 代码
   * @param {string} agentId - 智能体ID
   */
  async loadBundleViaScript(bundleCode, agentId) {
    return new Promise((resolve, reject) => {
      try {
        // 创建 script 标签
        const scriptId = `agent-bundle-${agentId}`;

        // 移除旧的 script 标签（如果存在）
        const oldScript = document.getElementById(scriptId);
        if (oldScript) {
          oldScript.remove();
          console.log(`🗑️ 移除旧的 script 标签: ${scriptId}`);
        }

        const script = document.createElement('script');
        script.id = scriptId;
        script.type = 'text/javascript';

        // 监听加载成功
        script.onload = () => {
          console.log(`✅ Script 标签加载成功: ${scriptId}`);
          resolve();
        };

        // 监听加载失败
        script.onerror = (error) => {
          console.error(`❌ Script 标签加载失败: ${scriptId}`, error);
          reject(new Error(`Script 加载失败: ${agentId}`));
        };

        // 将代码转换为 Blob URL
        const blob = new Blob([bundleCode], { type: 'text/javascript' });
        const blobUrl = URL.createObjectURL(blob);

        // 设置 src 并添加到 DOM
        script.src = blobUrl;
        document.head.appendChild(script);

        console.log(`📦 已创建 script 标签并加载: ${scriptId}`);

        // 清理 Blob URL（在 script 加载后）
        script.addEventListener('load', () => {
          URL.revokeObjectURL(blobUrl);
        });

      } catch (error) {
        console.error('❌ 创建 script 标签失败:', error);
        reject(error);
      }
    });
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 防止重复卸载
    if (this.isDestroyed) {
      console.log('🔄 AgentDetail 已销毁，跳过重复卸载');
      return;
    }

    // 标记为已销毁
    this.isDestroyed = true;

    // 隐藏状态栏
    agentStatusBarManager.hide();

    // 隐藏智能体标题
    this.hideAgentTitle();

    // 恢复 footer 显示
    const footer = document.getElementById('app-footer');
    if (footer) {
      footer.classList.remove('hidden');
      console.log('🔍 已恢复 app-footer');
    }

    // 销毁智能体信息侧边栏
    if (this.agentInfoSidebar) {
      this.agentInfoSidebar.destroy();
      this.agentInfoSidebar = null;
    }

    // 清理事件监听器
    if (this.agentEvents) {
      this.agentEvents.clear();
    }

    // 清理全局注册的智能体 init 函数（如果还存在的话，作为兜底清理）
    if (this.agentId && window.__AGENT_INIT__ && window.__AGENT_INIT__[this.agentId]) {
      delete window.__AGENT_INIT__[this.agentId];
      console.log(`🗑️ 已清理全局注册的智能体 init 函数: ${this.agentId}（兜底清理）`);
    }

    // 移除动态加载的 script 标签
    if (this.agentId) {
      const scriptId = `agent-bundle-${this.agentId}`;
      const script = document.getElementById(scriptId);
      if (script) {
        script.remove();
        console.log(`🗑️ 已移除 script 标签: ${scriptId}`);
      }
    }

    // 旧的智能体实例清理代码已删除
    // 现在智能体实例由 bundle.js 管理

    this.container = null;
    this.agentData = null;
    this.isInitialized = false;

    console.log('✅ AgentDetail 组件卸载完成');
  }
}

export default AgentDetail;
