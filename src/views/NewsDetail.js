/**
 * 新闻详情页
 * 支持两种类型：AI日报(daily)、AI资讯(news)
 */

import { getCommonApiService } from '../services/api/CommonApiService.js';
import { getChatApiService } from '../services/index.js';
import { configCacheService } from '../services/ConfigCacheService.js';
import { IconUtils } from '../utils/IconUtils.js';
import { TextUtils } from '../utils/TextUtils.js';
import { PerspectiveSelector } from '../components/common/PerspectiveSelector.js';

export class NewsDetail {
  constructor(options = {}) {
    this.container = null;
    this.eventBus = options.eventBus;
    this.router = options.router || window.app?.getService('router');
    this.apiService = getCommonApiService();

    // 数据
    this.oid = null;
    this.type = 'news'; // 'daily' or 'news'
    this.detailData = null;
    this.interpretResult = null;

    this.isLoading = false;
    this.isSidebarVisible = false;
    this.resizeHandler = null;

    // 拖动相关
    this.isDragging = false;
    this.startY = 0;
    this.startHeight = 0;
    this.currentHeight = 80; // vh单位
    this.minHeight = 20; // 最小高度 20vh
    this.maxHeight = 100; // 最大高度 100vh

    // AI解读相关
    this.thinking = false; // 是否开启深思
    this.autoScroll = true; // 是否自动滚动（外层interpret-content）
    this.isUserScrolling = false; // 用户是否正在滚动（外层interpret-content）
    this.scrollTimeout = null; // 滚动超时定时器（外层interpret-content）
    this.currentPerspective = 'ai_comprehensive'; // 当前分析视角
    this.perspectiveSelector = null; // 分析视角选择器
    this.currentItemIndex = null; // 当前选择的新闻条目索引
    
    // 深思内容区域独立的滚动控制
    this.thinkingAutoScroll = true; // 是否自动滚动（深思内容区域）
    this.isThinkingUserScrolling = false; // 用户是否正在滚动（深思内容区域）
    this.thinkingScrollTimeout = null; // 滚动超时定时器（深思内容区域）

    // 搜索相关
    this.searchKeyword = ''; // 当前搜索关键词
    this.searchMatches = []; // 所有匹配的元素
    this.currentMatchIndex = -1; // 当前高亮的匹配索引

    // 事件监听器引用（用于清理）
    this.searchHandler = null;
    this.searchNextHandler = null;
  }

  /**
   * 渲染视图
   */
  async render(container, props = {}) {
    this.container = container;

    // 从 URL 参数获取 oid 和 type
    this.parseParams(props);

    try {
      console.log('📦 开始渲染新闻详情...', { oid: this.oid, type: this.type });

      // 渲染骨架屏
      this.renderSkeleton();

      // 加载数据
      await this.loadDetail();

      // 渲染内容
      this.renderContent();

      // 绑定事件
      this.bindEvents();

      console.log('✅ 新闻详情渲染完成');
    } catch (error) {
      console.error('❌ 渲染新闻详情失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 解析URL参数
   */
  parseParams(props) {
    const route = props.route || this.router?.currentRoute;
    if (route && route.query) {
      this.oid = route.query.oid;
      this.type = route.query.type || 'news';
    }
  }

  /**
   * 渲染骨架屏
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="news-detail-container">
        <div class="detail-main-content">
          <div class="detail-article-section">
            <div class="skeleton-article">
              <div class="skeleton-title"></div>
              <div class="skeleton-meta"></div>
              <div class="skeleton-content"></div>
              <div class="skeleton-content"></div>
              <div class="skeleton-content"></div>
            </div>
          </div>
          
          <div class="detail-sidebar">
            <div class="skeleton-sidebar">
              <div class="skeleton-header"></div>
              <div class="skeleton-item"></div>
              <div class="skeleton-item"></div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载详情数据
   */
  async loadDetail() {
    if (!this.oid) {
      throw new Error('缺少文章ID');
    }

    this.isLoading = true;

    try {
      const endpoint = this.type === 'daily'
        ? 'content/aigc/daily'
        : 'content/aigc/news';

      const response = await this.apiService.get(endpoint, { oid: this.oid });

      if (response && response.success) {
        this.detailData = response.data;
        console.log('✅ 新闻详情加载成功', this.detailData);
      } else {
        throw new Error(response?.message || '加载详情失败');
      }
    } catch (error) {
      console.error('❌ 加载新闻详情失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 渲染内容
   */
  renderContent() {
    if (!this.detailData) return;

    const isDaily = this.type === 'daily';

    this.container.innerHTML = `
      <div class="news-detail-container">
        <div class="detail-main-content">
          <!-- 文章主体 -->
          <div class="detail-article-section">
            ${this.renderArticle()}
          </div>

          <!-- 遮罩层 -->
          <div class="detail-sidebar-backdrop ${this.isSidebarVisible ? 'visible' : ''}" id="sidebar-backdrop"></div>

          <!-- 侧边栏 -->
          <div class="detail-sidebar ${this.isSidebarVisible ? 'visible' : 'hidden'}">
            ${this.renderSidebar()}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染文章内容
   */
  renderArticle() {
    const data = this.detailData;
    const isDaily = this.type === 'daily';

    return `
      <article class="article-content">
        <header class="article-header">
          <div class="article-title-row">
            <h1 class="article-title">${TextUtils.cleanTitle(data.title)}</h1>
            ${!isDaily ? '<button class="interpret-quick-btn interpret-news-btn" data-item-index="news">✨ AI解读</button>' : ''}
          </div>
          <div class="article-meta">
            <div class="article-meta-left">
              <span class="meta-item">${IconUtils.getIcon('calendar', { size: 16, strokeWidth: 2 })} ${this.formatDate(data.publish_time || data.date)}</span>
              <span class="badge" style="display: none;">${data.source}</span>
              <span class="meta-item">${IconUtils.getIcon('eye', { size: 16, strokeWidth: 2 })} ${this.formatNumber(data.pv)} 次浏览</span>
            </div>
          </div>
        </header>

        <div class="article-body">
          ${isDaily ? this.renderDailyContent(data) : this.renderNewsContent(data)}
        </div>
      </article>
    `;
  }

  /**
   * 渲染AI日报内容
   */
  renderDailyContent(data) {
    if (!data.content_items || data.content_items.length === 0) {
      return '<p class="no-content">暂无详细内容</p>';
    }

    return `
      <div class="daily-content-items">
        ${data.content_items.map((item, index) => `
          <div class="daily-item">
            <div class="daily-item-header">
              <h2 class="daily-item-title">${item.title}</h2>
              <button class="interpret-quick-btn" data-item-index="${index}">✨ AI解读</button>
            </div>
            
            ${item.description ? `
              <p class="daily-item-desc">${item.description}</p>
            ` : ''}
            
            ${item.summary ? `
              <div class="daily-item-summary">
                <div class="summary-label">📌 AI 提要</div>
                <div class="summary-content">${item.summary}</div>
              </div>
            ` : ''}
            
            ${item.image_urls && item.image_urls.length > 0 ? `
              <div class="daily-item-images">
                ${item.image_urls.map(url => `
                  <img 
                    src="${url}" 
                    alt="配图" 
                    loading="lazy" 
                    referrerpolicy="no-referrer"
                    onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23999%22 font-size=%2220%22%3E图片加载失败%3C/text%3E%3C/svg%3E';"
                  >
                `).join('')}
              </div>
            ` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * 渲染AI资讯内容
   */
  renderNewsContent(data) {
    if (!data.content) {
      return '<p class="no-content">暂无详细内容</p>';
    }

    // 将文本内容转换为段落
    const paragraphs = data.content.split('\n\n').filter(p => p.trim());
    
    return `
      <div class="news-content">
        ${paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('')}
      </div>
      
      ${data.image_urls && data.image_urls.length > 0 ? `
        <div class="news-images">
          ${data.image_urls.map(url => `
            <img 
              src="${url}" 
              alt="配图" 
              loading="lazy" 
              referrerpolicy="no-referrer"
              onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 400 300%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22300%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dominant-baseline=%22middle%22 fill=%22%23999%22 font-size=%2220%22%3E图片加载失败%3C/text%3E%3C/svg%3E';"
            >
          `).join('')}
        </div>
      ` : ''}
    `;
  }

  /**
   * 渲染侧边栏
   */
  renderSidebar() {
    // 获取当前选中的视角名称
    const currentPerspectiveName = this.getPerspectiveName(this.currentPerspective);

    return `
      <div class="sidebar-card">
        <div class="sidebar-drag-handle" id="sidebar-drag-handle">
          <div class="drag-handle-indicator"></div>
        </div>
        <div class="interpret-panel">
          <div class="interpret-header">
            <div class="interpret-header-left">
              <h3 class="interpret-title">✨ AI 解读</h3>
            </div>
            <div class="interpret-header-center">
              <button class="perspective-selector-btn" id="perspective-selector-btn">
                <span class="perspective-name">${currentPerspectiveName}</span>
                <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
              <button class="control-btn thinking-btn ${this.thinking ? 'active' : ''}" id="thinking-toggle-btn">
                <svg class="thinking-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                </svg>
                深思
              </button>
              <button class="analyze-btn" id="analyze-btn">解读</button>
            </div>
            <div class="interpret-header-right">
              <button class="copy-interpret-btn" id="copy-interpret-btn" title="复制解读内容">
                <span class="copy-interpret-icon">${IconUtils.getIcon('copy', { size: 16, strokeWidth: 2 })}</span>
              </button>
              <button class="close-interpret-btn" id="close-interpret-btn" title="隐藏解读">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>
            </div>
          </div>
          <div class="interpret-content" id="interpret-content">
            ${this.interpretResult ? this.renderInterpretResult() : '<div class="interpret-placeholder">请选择分析视角并点击"解读"按钮开始AI解读</div>'}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 根据视角ID获取视角名称
   */
  getPerspectiveName(perspectiveId) {
    // 从 PerspectiveSelector 的 items 中查找
    if (this.perspectiveSelector && this.perspectiveSelector.items && Array.isArray(this.perspectiveSelector.items)) {
      const perspective = this.perspectiveSelector.items.find(p => p.id === perspectiveId);
      if (perspective && perspective.name) {
        return perspective.name;
      }
    }

    // 降级方案：如果 perspectiveSelector 还未初始化
    return '基础综合分析';
  }

  /**
   * 复制解读内容
   */
  copyInterpretContent() {
    if (!this.interpretResult || !this.interpretResult.content) return;
    
    // 直接复制解读内容，不添加任何额外文字
    const copyText = this.interpretResult.content;
    
    // 复制到剪贴板
    navigator.clipboard.writeText(copyText).then(() => {
      console.log('解读内容已复制到剪贴板');
      
      // 更新按钮状态（可选的视觉反馈）
      const copyBtn = this.container.querySelector('#copy-interpret-btn');
      if (copyBtn) {
        const originalContent = copyBtn.innerHTML;
        copyBtn.innerHTML = `<span class="copy-interpret-icon">${IconUtils.getIcon('copy-check', { size: 16, strokeWidth: 2 })}</span>`;
        setTimeout(() => {
          copyBtn.innerHTML = originalContent;
        }, 2000);
      }
    }).catch(err => {
      console.error('复制失败:', err);
    });
  }

  /**
   * 绑定事件
   */
  async bindEvents() {
    // 初始化分析视角选择器
    if (!this.perspectiveSelector) {
      this.perspectiveSelector = new PerspectiveSelector();
      await this.perspectiveSelector.initialize();
    }

    // 监听搜索事件
    if (this.eventBus) {
      // 保存事件监听器引用
      this.searchHandler = (event) => {
        console.log('🔍 [NewsDetail] 收到搜索事件:', event);
        // 从事件对象中提取 data
        const data = event.data || event;
        const searchTerm = data.searchTerm || '';
        console.log('🔍 [NewsDetail] 提取的搜索关键词:', searchTerm);
        this.handleSearch(searchTerm);
      };
      this.searchNextHandler = () => {
        console.log('➡️ [NewsDetail] 收到下一个匹配事件');
        this.navigateToNextMatch();
      };

      this.eventBus.on('news:search', this.searchHandler);
      this.eventBus.on('news:search:next', this.searchNextHandler);
      console.log('✅ [NewsDetail] 搜索事件监听器已绑定');
    }

    // 绑定所有 AI 解读按钮
    const interpretBtns = this.container.querySelectorAll('.interpret-quick-btn');
    interpretBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const itemIndex = btn.dataset.itemIndex;
        this.toggleSidebar(itemIndex);
      });
    });

    // 点击遮罩层关闭侧边栏
    const backdrop = this.container.querySelector('#sidebar-backdrop');
    if (backdrop) {
      backdrop.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // 深思按钮
    const thinkingToggleBtn = this.container.querySelector('#thinking-toggle-btn');
    if (thinkingToggleBtn) {
      thinkingToggleBtn.addEventListener('click', () => {
        this.thinking = !this.thinking;
        thinkingToggleBtn.classList.toggle('active', this.thinking);
        console.log('实时深思:', this.thinking ? '开启' : '关闭');
      });
    }

    // 分析视角选择按钮
    const perspectiveSelectorBtn = this.container.querySelector('#perspective-selector-btn');
    if (perspectiveSelectorBtn) {
      perspectiveSelectorBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.showPerspectiveSelector(e);
      });
    }

    // 分析按钮
    const analyzeBtn = this.container.querySelector('#analyze-btn');
    if (analyzeBtn) {
      analyzeBtn.addEventListener('click', () => {
        this.loadInterpret();
      });
    }

    // 关闭解读按钮
    const closeBtn = this.container.querySelector('#close-interpret-btn');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this.toggleSidebar();
      });
    }

    // 复制解读按钮
    const copyBtn = this.container.querySelector('#copy-interpret-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', () => {
        this.copyInterpretContent();
      });
    }

    // 监听外层内容区域滚动（interpret-content）
    const interpretContent = this.container.querySelector('#interpret-content');
    if (interpretContent) {
      interpretContent.addEventListener('scroll', () => {
        this.handleUserScroll(interpretContent, 'outer');
      });
    }

    // 监听深思内容区域滚动（nd-thinking-content）
    const thinkingContent = this.container.querySelector('#thinking-content-scroll');
    if (thinkingContent) {
      thinkingContent.addEventListener('scroll', () => {
        this.handleUserScroll(thinkingContent, 'thinking');
      });
    }

    // 点击外部关闭选择器
    document.addEventListener('click', (e) => {
      if (this.perspectiveSelector &&
          !e.target.closest('#perspective-selector-btn') &&
          !e.target.closest('.selector-popup')) {
        this.perspectiveSelector.hide();
      }
    });

    // 窗口resize时更新sidebar位置
    this.resizeHandler = () => {
      if (this.isSidebarVisible) {
        this.updateSidebarPosition();
      }
    };
    window.addEventListener('resize', this.resizeHandler);

    // 绑定拖动事件
    this.bindDragEvents();
  }

  /**
   * 显示分析视角选择器
   */
  showPerspectiveSelector(e) {
    if (this.perspectiveSelector) {
      this.perspectiveSelector.show(e.target, (perspective) => {
        this.currentPerspective = perspective.id;

        // 更新按钮显示的视角名称
        const perspectiveNameElement = this.container.querySelector('.perspective-name');
        if (perspectiveNameElement) {
          perspectiveNameElement.textContent = perspective.name;
        }

        console.log('切换分析视角:', perspective.name);
        // 不再自动重新加载，等待用户点击分析按钮
      });
    }
  }

  /**
   * 处理用户滚动
   * @param {HTMLElement} contentElement - 滚动的元素
   * @param {string} type - 滚动区域类型：'outer'（外层interpret-content）或 'thinking'（深思内容区域）
   */
  handleUserScroll(contentElement, type = 'outer') {
    const { scrollTop, scrollHeight, clientHeight } = contentElement;
    const distanceFromBottom = scrollHeight - clientHeight - scrollTop;
    
    if (type === 'thinking') {
      // 深思内容区域的滚动处理
      // 如果距离底部大于50px，禁用自动滚动
      if (distanceFromBottom > 50) {
        this.isThinkingUserScrolling = true;
        this.thinkingAutoScroll = false;
      } else {
        // 距离底部小于50px，重新启用自动滚动
        this.thinkingAutoScroll = true;
        this.isThinkingUserScrolling = false;
      }
    } else {
      // 外层interpret-content的滚动处理
      // 如果距离底部大于50px，禁用自动滚动
      if (distanceFromBottom > 50) {
        this.isUserScrolling = true;
        this.autoScroll = false;
      } else {
        // 距离底部小于50px，重新启用自动滚动
        this.autoScroll = true;
        this.isUserScrolling = false;
      }
    }
  }

  /**
   * 自动滚动到底部
   */
  scrollToBottom(contentElement) {
    if (!contentElement || this.isUserScrolling) {
      return;
    }

    // 直接设置 scrollTop，不需要 requestAnimationFrame
    contentElement.scrollTop = contentElement.scrollHeight;
  }

  /**
   * 绑定拖动事件
   */
  bindDragEvents() {
    const sidebar = this.container.querySelector('.detail-sidebar');
    const dragHandle = this.container.querySelector('#sidebar-drag-handle');

    if (!sidebar || !dragHandle) return;

    // 鼠标事件
    dragHandle.addEventListener('mousedown', (e) => this.handleDragStart(e));
    document.addEventListener('mousemove', (e) => this.handleDragMove(e));
    document.addEventListener('mouseup', (e) => this.handleDragEnd(e));

    // 触摸事件
    dragHandle.addEventListener('touchstart', (e) => this.handleDragStart(e), { passive: false });
    document.addEventListener('touchmove', (e) => this.handleDragMove(e), { passive: false });
    document.addEventListener('touchend', (e) => this.handleDragEnd(e));
  }

  /**
   * 开始拖动
   */
  handleDragStart(e) {
    this.isDragging = true;
    this.startY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    this.startHeight = this.currentHeight;

    // 添加拖动样式
    const sidebar = this.container.querySelector('.detail-sidebar');
    const dragHandle = this.container.querySelector('#sidebar-drag-handle');
    sidebar.style.transition = 'none';
    if (dragHandle) {
      dragHandle.style.cursor = 'grabbing';
    }

    e.preventDefault();
  }

  /**
   * 拖动中
   */
  handleDragMove(e) {
    if (!this.isDragging) return;

    const currentY = e.type.includes('touch') ? e.touches[0].clientY : e.clientY;
    const deltaY = this.startY - currentY;
    const viewportHeight = window.innerHeight;
    const deltaVh = (deltaY / viewportHeight) * 100;

    this.currentHeight = Math.max(
      this.minHeight,
      Math.min(this.maxHeight, this.startHeight + deltaVh)
    );

    const sidebar = this.container.querySelector('.detail-sidebar');
    sidebar.style.height = `${this.currentHeight}vh`;

    e.preventDefault();
  }

  /**
   * 结束拖动
   */
  handleDragEnd(e) {
    if (!this.isDragging) return;

    this.isDragging = false;

    const sidebar = this.container.querySelector('.detail-sidebar');
    const dragHandle = this.container.querySelector('#sidebar-drag-handle');

    // 恢复过渡动画
    sidebar.style.transition = 'transform 0.4s cubic-bezier(0.32, 0.72, 0, 1)';
    if (dragHandle) {
      dragHandle.style.cursor = 'grab';
    }

    // 如果高度太小，关闭侧边栏
    if (this.currentHeight < 30) {
      this.toggleSidebar();
      this.currentHeight = 80; // 重置高度
    }

    e.preventDefault();
  }

  /**
   * 更新侧边栏位置
   */
  updateSidebarPosition() {
    const sidebar = this.container.querySelector('.detail-sidebar');
    const backdrop = this.container.querySelector('#sidebar-backdrop');
    const mainContent = this.container.querySelector('.detail-main-content');

    if (sidebar && mainContent) {
      const rect = mainContent.getBoundingClientRect();
      sidebar.style.width = `${rect.width}px`;
      sidebar.style.left = `${rect.left}px`;

      // 同步更新backdrop的宽度和位置
      if (backdrop) {
        backdrop.style.width = `${rect.width}px`;
        backdrop.style.left = `${rect.left}px`;
        backdrop.style.right = 'auto';
      }
    }
  }

  /**
   * 切换侧边栏显示
   */
  toggleSidebar(itemIndex) {
    // 保存当前选择的新闻条目索引
    if (itemIndex !== undefined) {
      this.currentItemIndex = itemIndex;
    }

    this.isSidebarVisible = !this.isSidebarVisible;

    const sidebar = this.container.querySelector('.detail-sidebar');
    const backdrop = this.container.querySelector('#sidebar-backdrop');

    if (this.isSidebarVisible) {
      // 动态设置sidebar的宽度和位置，匹配父容器
      this.updateSidebarPosition();
      sidebar.style.height = `${this.currentHeight}vh`;
      sidebar.style.transform = 'translateY(0)';

      sidebar.classList.add('visible');
      sidebar.classList.remove('hidden');
      backdrop.classList.add('visible');
      // 不再自动加载解读，等待用户点击分析按钮
    } else {
      sidebar.classList.remove('visible');
      sidebar.classList.add('hidden');
      backdrop.classList.remove('visible');
      // 恢复默认transform
      sidebar.style.transform = 'translateY(100%)';
    }
  }

  /**
   * 加载AI解读
   */
  async loadInterpret() {
    const content = this.container.querySelector('#interpret-content');
    const analyzeBtn = this.container.querySelector('#analyze-btn');

    try {
      // 禁用解读按钮
      if (analyzeBtn) {
        analyzeBtn.disabled = true;
        analyzeBtn.classList.add('disabled');
      }

      // 重置所有自动滚动状态
      this.autoScroll = true;
      this.isUserScrolling = false;
      this.thinkingAutoScroll = true;
      this.isThinkingUserScrolling = false;

      // 显示加载状态（参考ChatListView的样式）
      content.innerHTML = `
        <div class="nd-interpret-loading">
          <div class="nd-loading-spinner"></div>
          <span class="nd-loading-text">正在分析...</span>
        </div>
      `;

      // 获取用户token
      const currentUser = window.app?.userManager?.getCurrentUser();
      const token = currentUser?.access_token;
      if (!token) {
        throw new Error('请先登录');
      }

      // 获取ChatApiService
      const chatApiService = getChatApiService();

      // 获取缓存的聊天参数
      const cachedParams = configCacheService.loadChatParameters();
      const cachedSettings = configCacheService.getCachedSetting('chatModel') || 'deepseek-r1';
      const thinkingMode = this.thinking;

      // 根据当前选中的条目索引获取标题和内容
      let newsTitle = '';
      let newsContent = '';

      if (this.type === 'daily' && this.currentItemIndex !== null && this.currentItemIndex !== 'news' && this.detailData.content_items) {
        // AI日报类型：获取对应索引的条目
        const item = this.detailData.content_items[this.currentItemIndex];
        if (item) {
          newsTitle = item.title || '';
          newsContent = item.description || '';
        }
      } else {
        // AI资讯类型或日报整体：使用整体数据
        newsTitle = this.detailData.title || '';
        newsContent = this.type === 'news' ? (this.detailData.content || '') : this.getNewsContentText();
      }

      const user_content = `标题：${newsTitle} 内容：${newsContent}`;

      // 准备请求参数
      const requestParams = {
        model: cachedSettings,
        messages: [
          {
            role: 'user',
            content: user_content
          }
        ],
        stream: true,
        store: true,
        thinking: thinkingMode,
        reasoning: thinkingMode,
        webSearch: true,
        prompt: this.currentPerspective // 使用当前选中的视角代号
      };

      // 用于累积响应内容
      let thinkingContent = '';
      let mainContent = '';

      // 发送流式请求
      await chatApiService.sendChatMessage(token, requestParams, (event) => {
        if (event.type === 'chunk') {
          // 累积thinking内容
          if (event.reasoningContent) {
            thinkingContent += event.reasoningContent;
          }
          // 累积主要内容
          if (event.content) {
            mainContent += event.content;
          }
          // 实时更新显示
          this.updateInterpretDisplay(content, thinkingContent, mainContent, false);
        } else if (event.type === 'done') {
          // 完成时最后更新一次
          this.interpretResult = {
            thinking: thinkingContent,
            content: mainContent
          };
          this.updateInterpretDisplay(content, thinkingContent, mainContent, true);
          console.log('✅ AI解读完成', this.interpretResult);
          
          // 恢复解读按钮
          if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('disabled');
          }
        } else if (event.type === 'error') {
          console.error('❌ AI解读错误:', event.error);
          content.innerHTML = `<div class="interpret-error">❌ 解读失败: ${event.error || '未知错误'}</div>`;
          
          // 恢复解读按钮
          if (analyzeBtn) {
            analyzeBtn.disabled = false;
            analyzeBtn.classList.remove('disabled');
          }
        }
      });

    } catch (error) {
      console.error('❌ 加载AI解读失败:', error);
      content.innerHTML = `<div class="interpret-error">❌ 解读失败: ${error.message || '请稍后重试'}</div>`;
      
      // 恢复解读按钮
      if (analyzeBtn) {
        analyzeBtn.disabled = false;
        analyzeBtn.classList.remove('disabled');
      }
    }
  }

  /**
   * 获取新闻内容文本（处理不同类型的内容）
   */
  getNewsContentText() {
    if (!this.detailData) return '';

    const isDaily = this.type === 'daily';

    if (isDaily && this.detailData.content_items) {
      // AI日报：提取所有内容项
      return this.detailData.content_items.map(item => {
        let text = `${item.title || ''}\n`;
        if (item.description) text += `${item.description}\n`;
        if (item.summary) text += `摘要：${item.summary}\n`;
        return text;
      }).join('\n');
    } else {
      // AI资讯：直接使用content字段
      return this.detailData.content || '';
    }
  }

  /**
   * 渲染深思区域HTML
   * @param {string} thinkText - 深思内容
   * @param {boolean} isComplete - 是否完成
   * @returns {string} HTML字符串
   */
  renderThinkingSection(thinkText, isComplete) {
    const thinkingHtml = this.escapeHtml(thinkText);
    const expanded = !isComplete;
    const mode = 'reasoning';
    const iconRotation = expanded ? 'rotate(90deg)' : 'rotate(0deg)';
    const contentClass = expanded ? '' : 'collapsed';
    const labelText = isComplete ? '完成推理' : '推理中...';
    
    return `
      <div class="nd-thinking-section" data-mode="${mode}">
        <div class="nd-thinking-header" data-thinking-id="interpret-thinking">
          <div class="nd-thinking-icon">${IconUtils.getIcon('sparkles', { size: 18, strokeWidth: 2 })}</div>
          <span class="nd-thinking-label">${labelText}</span>
          <div class="nd-toggle-icon" style="transform: ${iconRotation}">
            ${IconUtils.getIcon('chevron-right', { size: 16, strokeWidth: 2 })}
          </div>
        </div>
        <div class="nd-thinking-content ${contentClass}" id="thinking-content-scroll">
          <div class="nd-thinking-text">${thinkingHtml}</div>
        </div>
      </div>
    `;
  }

  /**
   * 更新AI解读显示（使用异步Markdown渲染）
   */
  async updateInterpretDisplay(contentElement, thinkText, interpretText, isComplete) {
    // 检查是否是首次渲染
    const existingResult = contentElement.querySelector('.interpret-result');
    const isFirstRender = !existingResult;
    
    // 隐藏加载状态（只要有内容就隐藏）
    const loadingDiv = contentElement.querySelector('.nd-interpret-loading');
    if (loadingDiv && (thinkText || interpretText)) {
      loadingDiv.remove();
    }
    
    // 如果不是首次渲染，尝试增量更新
    if (!isFirstRender) {
      // 处理深思内容
      if (thinkText && this.thinking) {
        let thinkingSection = contentElement.querySelector('.nd-thinking-section');
        
        // 如果深思区域不存在，创建它
        if (!thinkingSection) {
          const thinkingSectionHtml = this.renderThinkingSection(thinkText, isComplete);
          existingResult.insertAdjacentHTML('afterbegin', thinkingSectionHtml);
          
          // 绑定折叠事件
          this.bindThinkingToggleEvent();
          
          // 绑定滚动监听
          const thinkingContentDiv = contentElement.querySelector('#thinking-content-scroll');
          if (thinkingContentDiv) {
            thinkingContentDiv.addEventListener('scroll', () => {
              this.handleUserScroll(thinkingContentDiv, 'thinking');
            });
          }
          
          thinkingSection = contentElement.querySelector('.nd-thinking-section');
        } else {
          // 增量更新现有深思区域
          const thinkingTextDiv = thinkingSection.querySelector('.nd-thinking-text');
          const thinkingContent = thinkingSection.querySelector('.nd-thinking-content');
          const thinkingLabel = thinkingSection.querySelector('.nd-thinking-label');
          const toggleIcon = thinkingSection.querySelector('.nd-toggle-icon');
          
          if (thinkingTextDiv) {
            const thinkingHtml = this.escapeHtml(thinkText);
            thinkingTextDiv.innerHTML = thinkingHtml;
          }
          
          if (thinkingLabel) {
            thinkingLabel.textContent = isComplete ? '完成推理' : '推理中...';
          }
          
          if (thinkingContent && toggleIcon) {
            const expanded = !isComplete;
            if (expanded) {
              thinkingContent.classList.remove('collapsed');
              toggleIcon.style.transform = 'rotate(90deg)';
            } else {
              thinkingContent.classList.add('collapsed');
              toggleIcon.style.transform = 'rotate(0deg)';
            }
          }
          
          // 深思区域的自动滚动
          if (!isComplete && thinkingContent) {
            const shouldThinkingAutoScroll = this.thinkingAutoScroll && !this.isThinkingUserScrolling;
            if (shouldThinkingAutoScroll) {
              thinkingContent.scrollTop = thinkingContent.scrollHeight;
            }
          }
        }
      }
      
      // 更新主要内容
      if (interpretText) {
        let mainContentDiv = contentElement.querySelector('.interpret-main-content');
        if (!mainContentDiv) {
          mainContentDiv = document.createElement('div');
          mainContentDiv.className = 'interpret-main-content';
          existingResult.appendChild(mainContentDiv);
        }
        const contentHtml = await this.renderMarkdown(interpretText);
        mainContentDiv.innerHTML = contentHtml;
      }
      
      // 外层区域自动滚动逻辑
      const wasAtBottom = this.isScrolledToBottom(contentElement);
      const shouldAutoScroll = this.autoScroll && !this.isUserScrolling;
      if (shouldAutoScroll || wasAtBottom) {
        contentElement.scrollTop = contentElement.scrollHeight;
      }
      
      return; // 增量更新完成
    }
    
    // === 首次渲染或完全重新渲染 ===
    const wasAtBottom = this.isScrolledToBottom(contentElement);
    const shouldAutoScroll = this.autoScroll && !this.isUserScrolling;

    let html = '<div class="interpret-result">';

    // 如果有思考过程且开启实时显示
    if (thinkText && this.thinking) {
      html += this.renderThinkingSection(thinkText, isComplete);
    }

    // 显示Markdown解读内容
    if (interpretText) {
      const contentHtml = await this.renderMarkdown(interpretText);
      html += `<div class="interpret-main-content">${contentHtml}</div>`;
    } else if (!thinkText) {
      html += `
        <div class="nd-interpret-loading">
          <div class="nd-loading-spinner"></div>
          <span class="nd-loading-text">正在思考...</span>
        </div>
      `;
    }

    html += '</div>';
    contentElement.innerHTML = html;

    // 绑定思考区域折叠事件
    this.bindThinkingToggleEvent();
    
    // 绑定深思内容区域的滚动监听（仅首次渲染）
    const thinkingContentDiv = contentElement.querySelector('#thinking-content-scroll');
    if (thinkingContentDiv) {
      thinkingContentDiv.addEventListener('scroll', () => {
        this.handleUserScroll(thinkingContentDiv, 'thinking');
      });
    }

    // 等待DOM完全更新后再处理滚动
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        requestAnimationFrame(resolve);
      });
    });

    // 外层区域自动滚动逻辑：如果之前在底部或自动滚动开启，则滚动到底部
    if (shouldAutoScroll || wasAtBottom) {
      contentElement.scrollTop = contentElement.scrollHeight;
    }

    // 深思内容区域的自动滚动逻辑（仅首次渲染）
    if (!isComplete && thinkText && this.thinking && thinkingContentDiv) {
      const shouldThinkingAutoScroll = this.thinkingAutoScroll && !this.isThinkingUserScrolling;
      if (shouldThinkingAutoScroll) {
        thinkingContentDiv.scrollTop = thinkingContentDiv.scrollHeight;
      }
    }
  }

  /**
   * 绑定思考区域折叠事件
   */
  bindThinkingToggleEvent() {
    const thinkingHeader = this.container.querySelector('.nd-thinking-header');
    if (!thinkingHeader) return;

    // 移除旧的事件监听器
    const oldHandler = thinkingHeader._toggleHandler;
    if (oldHandler) {
      thinkingHeader.removeEventListener('click', oldHandler);
    }

    // 创建新的事件处理器
    const toggleHandler = () => {
      const thinkingSection = thinkingHeader.closest('.nd-thinking-section');
      const content = thinkingSection?.querySelector('.nd-thinking-content');
      const icon = thinkingHeader.querySelector('.nd-toggle-icon');
      const label = thinkingHeader.querySelector('.nd-thinking-label');

      if (content && icon) {
        if (content.classList.contains('collapsed')) {
          content.classList.remove('collapsed');
          icon.style.transform = 'rotate(90deg)';
          // 更新标签文字
          if (label && label.textContent.includes('完成')) {
            label.textContent = '完成推理';
          }
        } else {
          content.classList.add('collapsed');
          icon.style.transform = 'rotate(0deg)';
        }
      }
    };

    // 保存事件处理器引用
    thinkingHeader._toggleHandler = toggleHandler;
    thinkingHeader.addEventListener('click', toggleHandler);
  }

  /**
   * 判断是否滚动到底部
   */
  isScrolledToBottom(element) {
    if (!element) return false;
    const { scrollTop, scrollHeight, clientHeight } = element;
    // 允许10px的误差
    return Math.abs(scrollHeight - clientHeight - scrollTop) < 10;
  }

  /**
   * HTML转义（防止XSS）
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * 渲染Markdown内容（参考ChatListView的实现）
   */
  async renderMarkdown(content) {
    try {
      // 懒加载markdown工具
      const { parseMarkdown } = await import('../utils/markdown.js');

      // 解析markdown
      const html = await parseMarkdown(content, {
        gfm: true,
        sanitize: false
      });

      return html;

    } catch (err) {
      console.warn('Markdown渲染失败，使用fallback:', err);
      return this.renderMarkdownFallback(content);
    }
  }

  /**
   * Markdown fallback 渲染（简化版）
   */
  renderMarkdownFallback(content) {
    if (!content) return '';

    // 处理其他markdown元素（不包含代码块）
    let processedContent = content
      // 行内代码
      .replace(/`([^`\n]+)`/g, '<code>$1</code>')
      // 粗体
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      // 斜体
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      // 链接
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
      // 标题
      .replace(/^### (.*$)/gm, '<h3>$1</h3>')
      .replace(/^## (.*$)/gm, '<h2>$1</h2>')
      .replace(/^# (.*$)/gm, '<h1>$1</h1>')
      // 无序列表
      .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
      // 有序列表
      .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>')
      // 段落处理：只有双换行符才会创建新段落
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(.+)$/gm, '<p>$1</p>');

    return processedContent;
  }

  /**
   * 格式化日期
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    
    try {
      const date = new Date(dateStr);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    } catch (error) {
      return dateStr;
    }
  }

  /**
   * 格式化数字
   */
  formatNumber(num) {
    if (!num) return '0';
    if (num >= 10000) return `${(num / 10000).toFixed(1)}w`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
    return num.toString();
  }

  /**
   * 渲染错误状态
   */
  renderError(error) {
    this.container.innerHTML = `
      <div class="news-detail-error">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">加载失败</h2>
          <p class="error-message">${error.message}</p>
          <button class="error-retry-btn" onclick="window.history.back()">
            返回上一页
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 处理搜索
   * @param {string} keyword - 搜索关键词
   */
  handleSearch(keyword) {
    // 检查容器是否存在
    if (!this.container) {
      console.warn('⚠️ NewsDetail 容器不存在，无法执行搜索');
      return;
    }

    // 清除之前的高亮
    this.clearSearchHighlights();

    this.searchKeyword = keyword;

    if (!keyword) {
      // 空关键词，清除搜索状态
      this.searchMatches = [];
      this.currentMatchIndex = -1;
      this.updateSearchResult(0, 0);
      return;
    }

    // 获取文章主体内容区域
    const articleBody = this.container.querySelector('.article-body');
    if (!articleBody) return;

    // 搜索并高亮所有匹配项
    this.searchMatches = this.highlightMatches(articleBody, keyword);

    // 如果有匹配项，自动定位到第一个
    if (this.searchMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightCurrentMatch();
      this.scrollToCurrentMatch();
      this.updateSearchResult(1, this.searchMatches.length);
    } else {
      this.currentMatchIndex = -1;
      this.updateSearchResult(0, 0);
    }
  }

  /**
   * 高亮匹配的文本
   * @param {HTMLElement} element - 要搜索的元素
   * @param {string} keyword - 搜索关键词
   * @returns {Array} 匹配的元素数组
   */
  highlightMatches(element, keyword) {
    const matches = [];
    const regex = new RegExp(this.escapeRegExp(keyword), 'gi');

    // 递归遍历所有文本节点
    const walker = document.createTreeWalker(
      element,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // 跳过script和style标签
          if (node.parentElement.tagName === 'SCRIPT' ||
              node.parentElement.tagName === 'STYLE') {
            return NodeFilter.FILTER_REJECT;
          }
          // 只处理包含关键词的文本节点
          return regex.test(node.textContent) ?
            NodeFilter.FILTER_ACCEPT :
            NodeFilter.FILTER_SKIP;
        }
      }
    );

    const nodesToProcess = [];
    let node;
    while (node = walker.nextNode()) {
      nodesToProcess.push(node);
    }

    // 处理所有匹配的文本节点
    nodesToProcess.forEach(textNode => {
      const parent = textNode.parentNode;
      const text = textNode.textContent;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      // 重置正则表达式
      const searchRegex = new RegExp(this.escapeRegExp(keyword), 'gi');

      while ((match = searchRegex.exec(text)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          );
        }

        // 创建高亮标签
        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        fragment.appendChild(mark);
        matches.push(mark);

        lastIndex = match.index + match[0].length;
      }

      // 添加剩余文本
      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex))
        );
      }

      // 替换原文本节点
      parent.replaceChild(fragment, textNode);
    });

    return matches;
  }

  /**
   * 转义正则表达式特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 清除搜索高亮
   */
  clearSearchHighlights() {
    // 检查容器是否存在
    if (!this.container) {
      return;
    }

    const highlights = this.container.querySelectorAll('.search-highlight');
    highlights.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        // 合并相邻的文本节点
        parent.normalize();
      }
    });

    // 同时移除当前高亮类
    const currentHighlights = this.container.querySelectorAll('.search-highlight-current');
    currentHighlights.forEach(el => {
      el.classList.remove('search-highlight-current');
    });
  }

  /**
   * 高亮当前匹配项
   */
  highlightCurrentMatch() {
    // 检查容器是否存在
    if (!this.container) {
      return;
    }

    // 移除之前的当前高亮
    const prevCurrent = this.container.querySelector('.search-highlight-current');
    if (prevCurrent) {
      prevCurrent.classList.remove('search-highlight-current');
    }

    // 添加当前高亮
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchMatches.length) {
      const currentMatch = this.searchMatches[this.currentMatchIndex];
      if (currentMatch) {
        currentMatch.classList.add('search-highlight-current');
      }
    }
  }

  /**
   * 滚动到当前匹配项
   */
  scrollToCurrentMatch() {
    if (this.currentMatchIndex >= 0 && this.currentMatchIndex < this.searchMatches.length) {
      const currentMatch = this.searchMatches[this.currentMatchIndex];
      if (currentMatch && currentMatch.scrollIntoView) {
        currentMatch.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }
  }

  /**
   * 导航到下一个匹配项
   */
  navigateToNextMatch() {
    if (this.searchMatches.length === 0) return;

    this.currentMatchIndex = (this.currentMatchIndex + 1) % this.searchMatches.length;
    this.highlightCurrentMatch();
    this.scrollToCurrentMatch();
    this.updateSearchResult(this.currentMatchIndex + 1, this.searchMatches.length);
  }

  /**
   * 更新搜索结果显示
   */
  updateSearchResult(current, total) {
    if (this.eventBus) {
      this.eventBus.emit('news:search:result', {
        current,
        total
      });
    }
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 清理事件监听器
    if (this.eventBus) {
      if (this.searchHandler) {
        this.eventBus.off('news:search', this.searchHandler);
        this.searchHandler = null;
      }
      if (this.searchNextHandler) {
        this.eventBus.off('news:search:next', this.searchNextHandler);
        this.searchNextHandler = null;
      }
    }

    // 清理滚动超时定时器
    if (this.scrollTimeout) {
      clearTimeout(this.scrollTimeout);
      this.scrollTimeout = null;
    }
    if (this.thinkingScrollTimeout) {
      clearTimeout(this.thinkingScrollTimeout);
      this.thinkingScrollTimeout = null;
    }

    // 清理resize事件监听
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }

    // 清理perspective selector
    if (this.perspectiveSelector) {
      this.perspectiveSelector.destroy();
      this.perspectiveSelector = null;
    }

    // 清理搜索高亮
    this.clearSearchHighlights();

    this.detailData = null;
    this.interpretResult = null;
    this.container = null;
    console.log('✅ NewsDetail 已卸载');
  }
}

export default NewsDetail;
