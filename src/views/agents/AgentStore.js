/**
 * 智能体商店视图
 */

import { agentDataService } from '../../services/agent/AgentDataService.js';
import { NotificationCenter } from '../../components/common/NotificationCenter.js';
import { IconUtils } from '../../utils/IconUtils.js';

export class AgentStore {
  // 静态属性：会话级缓存（仅在应用运行期间有效，刷新页面后重置）
  static sessionCache = {
    selectedCategory: 'all' // 缓存选中的分类
  };

  constructor(options = {}) {
    this.container = null;
    this.isRendering = false;
    this.lastCategory = null;
    this.eventBus = options.eventBus || (window.app && window.app.getService ? window.app.getService('eventBus') : null);

    // 智能体更新状态
    this.agentsWithUpdates = new Set(); // 存储有更新的智能体ID
    this.currentAgentsData = null; // 当前显示的智能体数据

    // 监听 EventBus 事件
    this.setupEventBusListeners();
  }

  /**
   * 设置 EventBus 事件监听器
   */
  setupEventBusListeners() {
    if (this.eventBus) {
      console.log('✅ [AgentStore] EventBus 已初始化，开始监听 agents:data-updated 事件');

      // 监听智能体数据更新事件（由 AgentDataService 发送）
      this.eventBus.on('agents:data-updated', async (data) => {
        console.log('📢 [AgentStore] 收到数据更新通知:', data);
        await this.handleDataUpdate(data);
      });

      // 监听分类选择事件（由 Header 发送）
      this.eventBus.on('agent-category:selected', (data) => {
        if (data && data.categoryId) {
          // 更新会话缓存
          AgentStore.sessionCache.selectedCategory = data.categoryId;
          console.log('💾 [AgentStore] 已缓存选中的分类:', data.categoryId);
        }
      });
    } else {
      console.warn('⚠️ [AgentStore] EventBus 未初始化，无法监听数据更新事件');
    }
  }

  /**
   * 渲染智能体商店
   */
  async render(container, props = {}) {
    // 防止重复渲染
    if (this.isRendering) {
      return;
    }

    this.isRendering = true;
    this.container = container;

    // 从路由参数或URL参数获取分类
    let category = 'all';

    // 优先使用路由传递的query参数
    if (props.query && props.query.category) {
      category = props.query.category;
      // console.log('🔍 AgentStore 从路由props获取分类:', category);
    } else {
      // 回退到直接解析URL
      const urlParams = new URLSearchParams(window.location.search);
      const urlCategory = urlParams.get('category');

      // 如果URL没有指定分类，使用会话缓存的分类
      if (urlCategory) {
        category = urlCategory;
      } else {
        category = AgentStore.sessionCache.selectedCategory || 'all';
        console.log('🔍 AgentStore 使用缓存的分类:', category);
      }
    }

    console.log('🔍 AgentStore 当前分类:', category, '上次分类:', this.lastCategory);
    console.log('🔍 AgentStore 容器状态:', this.container.innerHTML.trim() !== '');

    // 保存当前分类到会话缓存（无论从哪里获取的分类）
    AgentStore.sessionCache.selectedCategory = category;

    // 强制检查分类变化，确保正确响应
    const categoryChanged = this.lastCategory !== category;
    const containerEmpty = this.container.innerHTML.trim() === '';

    // console.log('🔍 AgentStore 分类是否变化:', categoryChanged, '容器是否为空:', containerEmpty);

    // 如果分类发生变化，强制更新
    if (categoryChanged) {
      // console.log('🔄 AgentStore 分类变化，强制更新:', this.lastCategory, '→', category);
      this.lastCategory = category;

      // 如果容器为空，先初始化
      if (containerEmpty) {
        // console.log('🏗️ AgentStore 初始化容器');
        this.initializeContainer();
      }

      // 加载并渲染数据
      await this.loadAndRenderAgents(category);
      this.isRendering = false;
      return;
    }

    // 如果分类没有变化但容器为空，需要初始化
    if (containerEmpty) {
      // console.log('🏗️ AgentStore 容器为空，初始化并加载数据');
      this.lastCategory = category;
      this.initializeContainer();
      await this.loadAndRenderAgents(category);
      this.isRendering = false;
      return;
    }

    // 分类没有变化且容器不为空，跳过渲染
    // console.log('🚫 AgentStore 无需重新渲染:', category);
    this.isRendering = false;

    // 这个分支不应该被执行到，因为上面的逻辑已经处理了所有情况
    console.warn('⚠️ AgentStore 意外的渲染路径');
    this.isRendering = false;
  }

  /**
   * 初始化容器
   */
  initializeContainer() {
    this.container.innerHTML = `
      <div class="agent-store-agent-store">
        <div class="agent-store-content">
          <div class="agent-store-grid" id="agent-grid">
            <!-- 智能体卡片将在这里动态生成 -->
          </div>
        </div>
      </div>
    `;
    this.setupEventListeners();
    // console.log('🏗️ AgentStore 容器初始化完成');
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 智能体卡片点击事件
    this.container.addEventListener('click', (e) => {
      const agentCard = e.target.closest('.agent-store-card');

      if (agentCard && !agentCard.classList.contains('disabled')) {
        const agentId = agentCard.getAttribute('data-agent-id');
        if (!agentId) return;

        // 检查是否点击了安装/更新按钮
        const installBtn = e.target.closest('.agent-store-install-status.agent-store-installable');

        if (installBtn) {
          // 检查是否是更新按钮
          if (installBtn.classList.contains('agent-store-update')) {
            // 点击更新按钮：触发更新流程
            console.log('🔄 [AgentStore] 用户点击更新按钮:', agentId);
            this.triggerAgentUpdate(agentId);
          } else {
            // 点击安装按钮：导航到详情页并自动开始安装
            console.log('🔘 点击安装按钮:', agentId);
            this.startAgentInstallation(agentId);
          }
        } else {
          // 点击卡片其他区域：仅打开详情页
          console.log('🔘 点击卡片:', agentId);
          this.openAgentDetail(agentId);
        }
      }
    });

    // 搜索切换功能
    const searchToggle = this.container.querySelector('#search-toggle');
    const searchBox = this.container.querySelector('#search-box');
    const searchInput = this.container.querySelector('#search-input');

    if (searchToggle && searchBox) {
      searchToggle.addEventListener('click', () => {
        this.toggleSearch();
      });
    }

    // 搜索功能
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchAgents(e.target.value);
      });

      // ESC键处理：如果有内容则清空，否则失焦并收起搜索框
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          if (searchInput.value.trim()) {
            // 有内容：清空搜索
            searchInput.value = '';
            this.searchAgents('');
          } else {
            // 无内容：失焦并收起搜索框
            searchInput.blur();
            this.hideSearch();
          }
        }
      });

      // 点击搜索框外部时收起
      this.documentClickHandler = (e) => {
        if (!e.target.closest('.agent-store-search-container')) {
          this.hideSearch();
        }
      };
      document.addEventListener('click', this.documentClickHandler);
    }

    // 监听Header发送的搜索事件
    if (this.eventBus) {
      this.eventBus.on('agents:search', (eventData) => {
        console.log('📡 AgentStore 收到搜索事件:', eventData);
        // EventBus 包装了数据，实际数据在 data 字段中
        const searchData = eventData.data || eventData;
        if (searchData && searchData.searchTerm !== undefined) {
          this.searchAgents(searchData.searchTerm);
        } else {
          console.warn('⚠️ [AgentStore] 搜索数据格式不正确:', eventData);
        }
      });
    }
  }


  /**
   * 按分类筛选智能体
   */
  filterAgents(category) {
    const agentCards = this.container.querySelectorAll('.agent-store-card');

    agentCards.forEach(card => {
      if (category === 'all') {
        card.style.display = 'block';
      } else {
        const cardCategory = card.querySelector('.agent-store-category')?.textContent;
        const categoryMap = {
          'power_agent_tools': '工具类',
          'power_agent_data': '数据处理',
          'power_agent_image': '图像处理',
          'power_agent_network': '网络服务',
          'power_agent_utility': '实用工具'
        };

        if (cardCategory === categoryMap[category]) {
          card.style.display = 'block';
        } else {
          card.style.display = 'none';
        }
      }
    });
  }

  /**
   * 搜索智能体（纯前端搜索，过滤已渲染的卡片）
   */
  searchAgents(query) {
    if (!this.container) {
      console.warn('⚠️ [AgentStore] container 不存在');
      return;
    }

    const agentCards = this.container.querySelectorAll('.agent-store-card');
    const searchTerm = query.toLowerCase().trim();

    let visibleCount = 0;
    agentCards.forEach(card => {
      const title = card.querySelector('h3')?.textContent.toLowerCase() || '';
      const description = card.querySelector('p')?.textContent.toLowerCase() || '';

      const isMatch = searchTerm === '' || title.includes(searchTerm) || description.includes(searchTerm);

      if (isMatch) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });
  }

  /**
   * 加载并渲染智能体
   */
  async loadAndRenderAgents(category) {
    try {
      console.log('📥 AgentStore 开始加载数据，分类:', category);

      // 显示骨架屏
      this.showLoadingState();

      let agents = [];

      if (category === 'all') {
        // 显示所有智能体
        const categoryData = await agentDataService.getAgentsByCategory('all');
        agents = categoryData.agents;
        // console.log('📊 AgentStore 获取所有智能体，数量:', agents.length);
      } else {
        // 从缓存的分类-智能体映射中获取
        agents = agentDataService.getAgentsByCategoryId(category);
        // console.log('📊 AgentStore 从缓存获取分类智能体:', category, '数量:', agents.length);
      }

      // console.log('📋 AgentStore 智能体列表:', agents.map(a => a.name));

      // 检查数据是否为空
      if (!agents || agents.length === 0) {
        const emptyError = new Error('暂无智能体');
        emptyError.isEmpty = true;
        throw emptyError;
      }

      // 渲染智能体卡片
      this.renderAgentCards(agents);

      // console.log('🎨 AgentStore 渲染完成，分类:', category);

    } catch (error) {
      console.error('❌ 加载智能体数据失败:', error);

      // 判断是否是服务器错误（500+）
      if (error.response?.status >= 500 || error.statusCode >= 500) {
        error.isServerError = true;
      }

      if (window.notificationCenter && !error.isEmpty) {
        window.notificationCenter.error('加载智能体数据失败: ' + error.message);
      }

      this.showErrorState(error);
    }
  }

  /**
   * 显示加载状态 - 网格样式骨架屏
   */
  showLoadingState() {
    const agentGrid = this.container.querySelector('#agent-grid');
    if (agentGrid) {
      // 生成 12 个骨架卡片（3行 x 4列）
      const skeletonCards = Array(12).fill(0).map(() => `
        <div class="agent-store-card agent-store-skeleton-card">
          <!-- 标题骨架 -->
          <div class="agent-store-title">
            <div class="skeleton-line skeleton-title"></div>
          </div>

          <!-- 描述骨架 -->
          <div class="agent-store-description">
            <div class="skeleton-line skeleton-text"></div>
            <div class="skeleton-line skeleton-text"></div>
            <div class="skeleton-line skeleton-text-short"></div>
          </div>

          <!-- 标签骨架 -->
          <div class="agent-store-tags">
            <div class="agent-store-tags-left">
              <div class="skeleton-line skeleton-tag"></div>
              <div class="skeleton-line skeleton-tag"></div>
            </div>
            <div class="agent-store-tags-right">
              <div class="skeleton-line skeleton-tag"></div>
            </div>
          </div>

          <!-- 统计信息骨架 -->
          <div class="agent-store-stats">
            <div class="agent-store-stat-item">
              <div class="skeleton-line skeleton-icon"></div>
              <div class="skeleton-line skeleton-stat"></div>
            </div>
            <div class="agent-store-stat-item">
              <div class="skeleton-line skeleton-icon"></div>
              <div class="skeleton-line skeleton-stat"></div>
            </div>
            <div class="agent-store-stats-right">
              <div class="skeleton-line skeleton-button"></div>
            </div>
          </div>
        </div>
      `).join('');

      agentGrid.innerHTML = skeletonCards;
    }
  }

  /**
   * 隐藏加载状态
   * 注意：当前已禁用加载状态显示
   */
  hideLoadingState() {
    // 加载状态会被新内容替换，无需特殊处理
  }

  /**
   * 显示错误状态
   */
  showErrorState(error) {
    const agentGrid = this.container.querySelector('#agent-grid');
    if (!agentGrid) return;

    // 判断错误类型
    let iconName = 'globe';
    let title = '加载失败了！';
    let message = '网络可能不通畅';

    if (error && error.isEmpty) {
      // 空数据状态
      iconName = 'search';
      title = '智能体正在开发中...';
      message = '你希望有哪方面的智能体，可以提反馈噢！';
    } else if (error && error.isServerError) {
      // 服务器错误
      iconName = 'wrench';
      title = '服务器崩溃了';
      message = '您休息会吧，喝杯咖啡/水，等下再来。';
    } else if (typeof error === 'string') {
      // 如果传入的是字符串消息，使用默认网络错误状态
      message = error;
    }

    const iconSvg = IconUtils.getIcon(iconName, {
      size: 64,
      strokeWidth: 2,
      color: 'var(--error-icon-color, #9CA3AF)',
      className: 'error-state-icon'
    });

    agentGrid.innerHTML = `
      <div class="agent-store-error-state">
        <div class="error-content">
          <div class="error-icon-wrapper">${iconSvg}</div>
          <div class="error-text-group">
            <div class="error-title">${title}</div>
            <div class="error-message">${message}</div>
          </div>
          <button class="error-retry-btn" onclick="location.reload()">
            重试
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 渲染智能体卡片
   */
  renderAgentCards(agents) {
    const agentGrid = this.container.querySelector('#agent-grid');
    if (!agentGrid) return;

    // 清空现有内容
    agentGrid.innerHTML = '';

    // 渲染新内容
    const cardsHtml = agents.map(agent => this.createAgentCard(agent)).join('');
    agentGrid.innerHTML = cardsHtml;
  }

  /**
   * 创建智能体卡片HTML
   */
  createAgentCard(agent) {
    const featuredClass = agent.featured ? 'featured' : '';
    const disabledClass = agent.status !== 'available' ? 'disabled' : '';
    const isRecommended = agent.recommended === true; // 推荐的智能体显示火爆标识

    // 检查是否有更新
    const hasUpdate = this.agentsWithUpdates.has(agent.id);
    const isForceUpdate = hasUpdate && agent.force_update;

    // 决定安装按钮的显示文本和样式
    let installButtonHtml = '';
    if (hasUpdate) {
      // 有更新：显示"更新"按钮
      installButtonHtml = '<span class="agent-store-install-status agent-store-installable agent-store-update">更新</span>';
    } else if (agent.status === 'available') {
      installButtonHtml = '<span class="agent-store-install-status agent-store-installable">安装</span>';
    } else if (agent.status === 'installed') {
      installButtonHtml = '<span class="agent-store-install-status agent-store-available">使用</span>';
    } else {
      installButtonHtml = '<span class="agent-store-install-status agent-store-disabled">开发中</span>';
    }

    return `
      <div class="agent-store-card ${featuredClass} ${disabledClass}" data-agent-id="${agent.id}">
        ${isRecommended ? '<div class="agent-store-hot-badge">🔥</div>' : ''}
        ${hasUpdate && !isForceUpdate ? '<div class="agent-store-update-badge">🆕</div>' : ''}
        <!-- 卡片标题 -->
        <div class="agent-store-title">
          <h3>${agent.name}</h3>
        </div>

        <!-- 卡片描述 -->
        <div class="agent-store-description">
          <p>${agent.description}</p>
        </div>

        <!-- 标签区域 -->
        <div class="agent-store-tags">
          <div class="agent-store-tags-left">
            ${agent.tags && agent.tags.length > 0 ? agent.tags.map(tag => `<span class="agent-store-tag agent-store-tag-subject">${tag}</span>`).join('') : ''}
          </div>
          ${agent.version ? `<div class="agent-store-tags-right"><span class="agent-store-tag agent-store-tag-version">${agent.version}</span></div>` : ''}
        </div>

        <!-- 统计信息区域 -->
        <div class="agent-store-stats">
          <div class="agent-store-stat-item">
            <span class="agent-store-stat-icon">${IconUtils.getIcon('star', { size: 16, strokeWidth: 2 })}</span>
            <span class="agent-store-stat-value">${agent.rating || '4.5'}</span>
          </div>
          <div class="agent-store-stat-item">
            <span class="agent-store-stat-icon agent-store-stat-download">${IconUtils.getIcon('download', { size: 16, strokeWidth: 2 })}</span>
            <span class="agent-store-stat-value">${this.formatNumber(agent.downloads || '1200')}</span>
          </div>
          <div class="agent-store-stats-right">
            ${installButtonHtml}
          </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 格式化数字显示
   */
  formatNumber(num) {
    const number = parseInt(num);
    if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'k';
    }
    return number.toString();
  }

  /**
   * 获取分类显示名称
   */
  getCategoryDisplayName(category) {
    const categoryNames = {
      'tools': '工具类',
      'data': '数据处理',
      'image': '图像处理',
      'network': '网络服务',
      'utility': '实用工具'
    };
    return categoryNames[category] || '其他';
  }

  /**
   * 获取分类信息
   */
  getCategoryInfo(category) {
    const categoryMap = {
      'all': {
        title: '所有智能体',
        description: '浏览和管理所有可用的智能体工具'
      },
      'power_agent_tools': {
        title: '工具类智能体',
        description: '提供各种实用工具功能的智能体'
      },
      'power_agent_data': {
        title: '数据处理智能体',
        description: '专门处理数据分析、转换和可视化的智能体'
      },
      'power_agent_image': {
        title: '图像处理智能体',
        description: '提供图像编辑、转换和分析功能的智能体'
      },
      'power_agent_network': {
        title: '网络服务智能体',
        description: '提供网络请求、API调用和数据获取功能的智能体'
      },
      'power_agent_utility': {
        title: '实用工具智能体',
        description: '提供各种日常实用功能的智能体'
      }
    };

    // 如果没有分类参数，默认显示所有智能体
    if (!category || category === '') {
      return categoryMap['all'];
    }

    return categoryMap[category] || categoryMap['all'];
  }

  /**
   * 切换搜索框显示
   */
  toggleSearch() {
    const searchBox = this.container.querySelector('#search-box');

    if (searchBox.classList.contains('active')) {
      this.hideSearch();
    } else {
      this.showSearch();
    }
  }

  /**
   * 显示搜索框
   */
  showSearch() {
    if (!this.container) return; // 安全检查

    const searchBox = this.container.querySelector('#search-box');
    const searchInput = this.container.querySelector('#search-input');

    if (searchBox) {
      searchBox.classList.add('active');
    }
    if (searchInput) {
      setTimeout(() => {
        searchInput.focus();
      }, 300);
    }
  }

  /**
   * 隐藏搜索框
   */
  hideSearch() {
    if (!this.container) return; // 安全检查

    const searchBox = this.container.querySelector('#search-box');
    const searchInput = this.container.querySelector('#search-input');

    if (searchBox) {
      searchBox.classList.remove('active');
    }
    if (searchInput) {
      searchInput.value = '';
      this.searchAgents(''); // 清空搜索结果
    }
  }


  /**
   * 打开智能体详情
   */
  openAgentDetail(agentId) {
    // 导航到智能体详情页面
    if (window.app && window.app.getService) {
      window.app.getService('router').navigate(`/agent/${agentId}`);
    } else {
      // 降级处理
      window.location.hash = `#/agent/${agentId}`;
    }
  }

  /**
   * 触发智能体更新（用户点击更新按钮）
   * 只是触发点，具体更新逻辑由 AgentManager 处理
   * @param {string} agentId - 智能体ID
   */
  async triggerAgentUpdate(agentId) {
    try {
      // 获取 AgentManager
      const agentManager = window.app?.getService('agentManager');
      if (!agentManager) {
        console.error('❌ [AgentStore] AgentManager 未找到');
        return;
      }

      // 调用 AgentManager 的更新方法
      await agentManager.updateAgent(agentId);

      // 更新完成后，从更新列表中移除并重新渲染
      this.agentsWithUpdates.delete(agentId);

      const agentDataService = window.agentDataService || window.app?.getService('agentDataService');
      if (agentDataService) {
        const category = this.lastCategory || 'all';
        const result = await agentDataService.getAgentsByCategory(category);
        if (result && result.agents) {
          this.renderAgentCards(result.agents);
        }
      }

    } catch (error) {
      console.error('❌ [AgentStore] 触发更新失败:', agentId, error);
    }
  }

  /**
   * 开始智能体安装
   * 导航到详情页并自动开始安装
   */
  startAgentInstallation(agentId) {
    console.log('🚀 开始安装智能体:', agentId);

    // 导航到智能体详情页面，并添加 action=install 参数
    if (window.app && window.app.getService) {
      window.app.getService('router').navigate(`/agent/${agentId}?action=install`);
    } else {
      // 降级处理
      window.location.hash = `#/agent/${agentId}?action=install`;
    }
  }

  /**
   * 处理数据更新（由 AgentDataService 触发）
   * @param {Object} data - 更新数据 { timestamp, version }
   */
  async handleDataUpdate(data) {
    try {
      console.log('🔄 [AgentStore] 处理数据更新...', data);

      // 重新加载智能体数据（从缓存读取，AgentDataService 已经更新了缓存）
      const category = this.lastCategory || 'all';
      const result = await agentDataService.getAgentsByCategory(category);

      if (!result || !result.agents) {
        console.warn('⚠️ [AgentStore] 重新加载数据失败');
        return;
      }

      // 对比新旧数据，找出有更新的智能体（非强制更新的）
      this.detectAgentUpdates(result.agents);

      // 重新渲染卡片
      this.renderAgentCards(result.agents);

      console.log('✅ [AgentStore] 数据更新处理完成');
    } catch (error) {
      console.error('❌ [AgentStore] 处理数据更新失败:', error);
    }
  }

  /**
   * 检测智能体更新
   * @param {Array} newAgents - 新的智能体列表
   */
  detectAgentUpdates(newAgents) {
    if (!this.currentAgentsData || this.currentAgentsData.length === 0) {
      // 首次加载，保存当前数据
      this.currentAgentsData = newAgents;
      return;
    }

    // 创建旧数据的映射
    const oldAgentsMap = new Map();
    this.currentAgentsData.forEach(agent => {
      oldAgentsMap.set(agent.id, agent);
    });

    // 对比版本，找出有更新的智能体
    this.agentsWithUpdates.clear();
    newAgents.forEach(newAgent => {
      const oldAgent = oldAgentsMap.get(newAgent.id);

      if (oldAgent) {
        // 对比 version_hash 或 version
        const versionChanged =
          (newAgent.version_hash && oldAgent.version_hash && newAgent.version_hash !== oldAgent.version_hash) ||
          (newAgent.version && oldAgent.version && newAgent.version !== oldAgent.version);

        if (versionChanged) {
          console.log(`🆕 [AgentStore] 检测到智能体更新: ${newAgent.id}`, {
            old: oldAgent.version || oldAgent.version_hash,
            new: newAgent.version || newAgent.version_hash,
            forceUpdate: newAgent.force_update
          });

          this.agentsWithUpdates.add(newAgent.id);
        }
      }
    });

    // 更新当前数据
    this.currentAgentsData = newAgents;

    console.log(`📊 [AgentStore] 检测到 ${this.agentsWithUpdates.size} 个智能体有更新`);
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 清理事件监听器
    if (this.documentClickHandler) {
      document.removeEventListener('click', this.documentClickHandler);
      this.documentClickHandler = null;
    }

    // 清理eventBus监听器
    if (this.eventBus) {
      this.eventBus.off('agents:search');
      this.eventBus.off('agents:data-updated');
    }

    // 清理容器引用
    this.container = null;
    this.isRendering = false;
    this.lastCategory = null;
    this.agentsWithUpdates.clear();
    this.currentAgentsData = null;

    console.log('✅ AgentStore 卸载完成');
  }
}

// 将 AgentStore 类挂载到全局，以便其他组件访问静态属性
if (typeof window !== 'undefined') {
  window.AgentStore = AgentStore;
}

export default AgentStore;