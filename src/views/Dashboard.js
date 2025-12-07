/**
 * Dashboard 视图 - 本地化组件实现
 * 包含三个板块: 今日要闻、AI日报、AI资讯
 * 同时作为新闻相关子页面的容器
 */

import { getCommonApiService } from '../services/api/CommonApiService.js';
import { IconUtils } from '../utils/IconUtils.js';

export class Dashboard {
  constructor(options = {}) {
    this.container = null;
    this.eventBus = options.eventBus;
    this.router = options.router || window.app?.getService('router');
    this.apiService = getCommonApiService();

    // 数据缓存
    this.dashboardData = null;
    this.isLoading = false;

    // 当前视图状态
    this.currentView = 'dashboard'; // 'dashboard', 'daily-list', 'news-list', 'detail'
    this.currentComponent = null;
  }

  /**
   * 渲染视图
   */
  async render(container, props = {}) {
    this.container = container;

    try {
      // 检查路由，决定渲染哪个视图
      const route = props.route || this.router?.currentRoute;

      if (route) {
        if (route.path === '/news/daily') {
          await this.renderDailyList();
          return;
        } else if (route.path === '/news/list') {
          await this.renderNewsList();
          return;
        } else if (route.path === '/news/detail') {
          await this.renderDetail(route);
          return;
        }
      }

      // 默认渲染 Dashboard 小纸条
      await this.renderDashboard();

    } catch (error) {
      console.error('❌ 渲染 Dashboard 失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 渲染 Dashboard 小纸条
   */
  async renderDashboard(options = {}) {
    const { forceRefresh = false, isRetry = false } = options;
    this.currentView = 'dashboard';

    // 渲染骨架屏
    this.renderSkeleton();

    try {
      // 加载数据
      await this.loadDashboardData({ forceRefresh });

      // 渲染内容
      this.renderContent();

      // 绑定事件
      this.bindEvents();
    } catch (error) {
      console.error('❌ renderDashboard 失败:', error);

      // 如果是重试失败，显示3秒骨架屏后再显示错误
      if (isRetry) {
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      this.renderError(error);
    }
  }

  /**
   * 渲染AI日报列表页
   */
  async renderDailyList() {
    this.currentView = 'daily-list';

    try {
      const { AIDailyList } = await import('./AIDailyList.js');

      // 清理旧组件
      await this.cleanupCurrentComponent();

      const dailyList = new AIDailyList({
        eventBus: this.eventBus,
        router: this.router
      });

      this.currentComponent = dailyList;
      await dailyList.render(this.container);

    } catch (error) {
      console.error('❌ 加载 AIDailyList 失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 渲染AI资讯列表页
   */
  async renderNewsList() {
    this.currentView = 'news-list';

    try {
      const { AINewsList } = await import('./AINewsList.js');

      // 清理旧组件
      await this.cleanupCurrentComponent();

      const newsList = new AINewsList({
        eventBus: this.eventBus,
        router: this.router
      });

      this.currentComponent = newsList;
      await newsList.render(this.container);

    } catch (error) {
      console.error('❌ 加载 AINewsList 失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 渲染新闻详情页
   */
  async renderDetail(route) {
    this.currentView = 'detail';

    try {
      const { NewsDetail } = await import('./NewsDetail.js');

      // 清理旧组件
      await this.cleanupCurrentComponent();

      const newsDetail = new NewsDetail({
        eventBus: this.eventBus,
        router: this.router
      });

      this.currentComponent = newsDetail;
      await newsDetail.render(this.container, { route });

    } catch (error) {
      console.error('❌ 加载 NewsDetail 失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 渲染骨架屏
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="dashboard-container">
        <div class="dashboard-skeleton">
          <div class="skeleton-section">
            <div class="skeleton-header"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
          <div class="skeleton-section">
            <div class="skeleton-header"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
          <div class="skeleton-section">
            <div class="skeleton-header"></div>
            <div class="skeleton-item"></div>
            <div class="skeleton-item"></div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 加载 Dashboard 数据
   * @param {Object} options - 选项
   * @param {boolean} options.forceRefresh - 是否强制刷新（跳过缓存检查）
   */
  async loadDashboardData(options = {}) {
    const { forceRefresh = false } = options;

    if (this.isLoading) return;

    this.isLoading = true;

    try {
      // 使用 getDashboardData() 方法，它内置了缓存控制
      const response = await this.apiService.getDashboardData({ forceRefresh });

      if (response && response.success) {
        this.dashboardData = response.data;

        // 检查数据是否为空
        const hasData = this.dashboardData && (
          (this.dashboardData.todayNews?.items?.length > 0) ||
          (this.dashboardData.aiDailyReport?.items?.length > 0) ||
          (this.dashboardData.aiNews?.items?.length > 0)
        );

        if (!hasData) {
          const emptyError = new Error('暂无数据');
          emptyError.isEmpty = true;
          throw emptyError;
        }
      } else {
        throw new Error(response?.message || '加载数据失败');
      }
    } catch (error) {
      console.error('❌ 加载 Dashboard 数据失败:', error);

      // 判断是否是服务器错误（500+）
      if (error.response?.status >= 500 || error.statusCode >= 500) {
        error.isServerError = true;
      }

      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 渲染内容
   */
  renderContent() {
    if (!this.dashboardData) return;

    const { todayNews, aiDailyReport, aiNews } = this.dashboardData;

    this.container.innerHTML = `
      <div class="dashboard-container">
        <!-- 今日要闻 -->
        ${this.renderTodayNews(todayNews)}
        
        <!-- AI 日报 -->
        ${this.renderAIDailyReport(aiDailyReport)}
        
        <!-- AI 资讯 -->
        ${this.renderAINews(aiNews)}
      </div>
    `;
  }

  /**
   * 渲染今日要闻板块
   */
  renderTodayNews(data) {
    if (!data || !data.items) return '';

    const { title, icon, items, meta } = data;
    const isEmpty = !items || items.length === 0;

    return `
      <div class="dashboard-section today-news-section">
        <div class="dashboard-news-list ${isEmpty ? 'dashboard-news-list-empty' : ''}">
          <div class="news-date-header">
            <div class="news-date-badge">今日<br/>要闻</div>
            <div class="news-date-text">${meta.dayOfWeek}</div>
          </div>
          ${isEmpty ? '' : `
            <ul class="news-items-list">
              ${items.map((item, index) => `
                <li class="news-list-item" data-url="${item.url || ''}" data-id="${item.id}" data-type="today-news">
                  <span>${item.title}</span>
                </li>
              `).join('')}
            </ul>
          `}
        </div>
      </div>
    `;
  }

  /**
   * 渲染 AI 日报板块
   */
  renderAIDailyReport(data) {
    if (!data || !data.items) return '';

    const { title, icon, items, meta } = data;

    return `
      <div class="dashboard-section ai-daily-section">
        <div class="dashboard-section-header">
          <div class="dashboard-section-title">
            <span class="dashboard-section-icon">${icon}</span>
            <h2>${title}</h2>
          </div>
          <button class="view-more-btn" data-section="daily">
            查看更多
          </button>
        </div>
        
        <div class="news-list vertical-list">
          ${items.map((item, index) => `
            <div class="news-item daily-item" data-url="${item.url || ''}" data-oid="${item.id}" data-type="daily">
              <div class="item-number">${item.number}</div>
              <div class="dashboard-news-content">
                <p class="dashboard-news-title">${this.removeNumberPrefix(item.title)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 渲染 AI 资讯板块
   */
  renderAINews(data) {
    if (!data || !data.items) return '';

    const { title, icon, items, meta } = data;

    return `
      <div class="dashboard-section ai-news-section">
        <div class="dashboard-section-header">
          <div class="dashboard-section-title">
            <span class="dashboard-section-icon">${icon}</span>
            <h2>${title}</h2>
          </div>
          <button class="view-more-btn" data-section="news">
            查看更多
          </button>
        </div>
        
        <div class="news-list vertical-list">
          ${items.map((item, index) => `
            <div class="news-item news-item-card" data-url="${item.url || ''}" data-oid="${item.id}" data-type="news">
              <div class="item-number">${item.number}</div>
              <div class="dashboard-news-content">
                <p class="dashboard-news-title">${this.removeNumberPrefix(item.title)}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 今日要闻项点击
    const newsListItems = this.container.querySelectorAll('.news-list-item');
    newsListItems.forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        const type = item.dataset.type;
        const oid = url ? url.split('/').pop() : item.dataset.id;
        this.handleNewsClick(oid, type);
      });
    });

    // AI日报/资讯项点击
    const newsItems = this.container.querySelectorAll('.news-item');
    newsItems.forEach(item => {
      item.addEventListener('click', () => {
        const url = item.dataset.url;
        const type = item.dataset.type;
        const oid = url ? url.split('/').pop() : (item.dataset.oid || item.dataset.id);
        this.handleNewsClick(oid, type);
      });
    });

    // 查看更多按钮
    const viewMoreBtns = this.container.querySelectorAll('.view-more-btn');
    viewMoreBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const section = btn.dataset.section;
        this.handleViewMore(section);
      });
    });
  }

  /**
   * 处理新闻项点击
   */
  handleNewsClick(oid, type) {
    if (!this.router) {
      console.warn('⚠️ Router 未初始化');
      return;
    }

    // 导航到详情页,传递 oid 参数
    this.router.navigate(`/news/detail?oid=${oid}&type=${type}`);
  }

  /**
   * 处理查看更多
   */
  handleViewMore(section) {
    if (!this.router) {
      console.warn('⚠️ Router 未初始化');
      return;
    }

    // 导航到列表页
    if (section === 'daily') {
      this.router.navigate('/news/daily');
    } else if (section === 'news') {
      this.router.navigate('/news/list');
    }
  }

  /**
   * 格式化时间
   */
  formatTime(timeStr) {
    if (!timeStr) return '';

    try {
      const date = new Date(timeStr);
      const now = new Date();
      const diff = now - date;

      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return '刚刚';
      if (minutes < 60) return `${minutes}分钟前`;
      if (hours < 24) return `${hours}小时前`;
      if (days < 7) return `${days}天前`;

      // 超过7天显示具体日期
      return `${date.getMonth() + 1}-${date.getDate()}`;
    } catch (error) {
      return timeStr;
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
   * 移除标题开头的序号（如1、、、等）
   */
  removeNumberPrefix(title) {
    if (!title) return '';
    // 匹配开头的数字 + 、或、或.或、或）等常见分隔符
    return title.replace(/^\d+[、、.\)）]\s*/, '');
  }


  /**
   * 渲染错误状态
   */
  renderError(error) {
    // 判断错误类型
    let iconName = 'globe';
    let title = '内容加载失败啦🥱';
    let message = '网络可能不通畅';

    if (error.isEmpty) {
      // 空数据状态
      iconName = 'search';
      title = '主编正在写小作文，内容准备中...😁';
      message = '你想看哪方面的内容，可以提反馈噢！';
    } else if (error.isServerError) {
      // 服务器错误
      iconName = 'wrench';
      title = '太刺激了，服务都器崩溃啦😂';
      message = '您休息会吧，喝杯咖啡/水，等下再来。';
    }

    const iconSvg = IconUtils.getIcon(iconName, {
      size: 64,
      strokeWidth: 2,
      color: 'var(--error-icon-color, #9CA3AF)',
      className: 'error-state-icon'
    });

    this.container.innerHTML = `
      <div class="dashboard-error">
        <div class="error-content">
          <div class="error-icon-wrapper">${iconSvg}</div>
          <div class="error-text-group">
            <div class="error-title">${title}</div>
            <div class="error-message">${message}</div>
          </div>
          <button class="error-retry-btn" id="dashboard-retry-btn">
            重试
          </button>
        </div>
      </div>
    `;

    // 绑定重试按钮事件
    const retryBtn = this.container.querySelector('#dashboard-retry-btn');
    if (retryBtn) {
      retryBtn.addEventListener('click', async (e) => {
        try {
          // 重试时强制刷新，跳过缓存检查
          await this.renderDashboard({ forceRefresh: true, isRetry: true });
        } catch (error) {
          console.error('❌ [Dashboard] 重试按钮事件处理失败:', error);
        }
      });
    } else {
      console.error('❌ [Dashboard] 未找到重试按钮');
    }
  }

  /**
   * 清理当前组件
   */
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

  /**
   * 卸载组件
   */
  async unmount() {
    try {
      // 清理子组件
      await this.cleanupCurrentComponent();

      // 清理数据
      this.dashboardData = null;
      this.container = null;

      console.log('✅ Dashboard 已卸载');
    } catch (error) {
      console.error('❌ Dashboard 卸载失败:', error);
    }
  }
}

export default Dashboard;
