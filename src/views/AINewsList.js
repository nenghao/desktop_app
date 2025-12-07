/**
 * AI资讯列表页
 */

import { getCommonApiService } from '../services/api/CommonApiService.js';
import { TextUtils } from '../utils/TextUtils.js';
import { IconUtils } from '../utils/IconUtils.js';

export class AINewsList {
  constructor(options = {}) {
    this.container = null;
    this.eventBus = options.eventBus;
    this.router = options.router || window.app?.getService('router');
    this.apiService = getCommonApiService();
    
    // 数据
    this.items = [];
    this.pagination = {
      page: 1,
      limit: 15,
      total: 0
    };

    this.isLoading = false;
    this.hasMore = true;

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

    try {
      console.log('📦 开始渲染 AI资讯列表...');
      
      // 渲染骨架屏
      this.renderSkeleton();
      
      // 加载数据
      await this.loadData();
      
      // 渲染内容
      this.renderContent();
      
      // 绑定事件
      this.bindEvents();
      
      console.log('✅ AI资讯列表渲染完成');
    } catch (error) {
      console.error('❌ 渲染 AI资讯列表失败:', error);
      this.renderError(error);
    }
  }

  /**
   * 渲染骨架屏
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="news-list-container">
        <div class="news-timeline skeleton-timeline">
          ${Array(8).fill('').map(() => `
            <div class="skeleton-timeline-item">
              <div class="skeleton-number"></div>
              <div class="skeleton-content">
                <div class="skeleton-title"></div>
                <div class="skeleton-desc"></div>
                <div class="skeleton-meta"></div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * 加载数据
   */
  async loadData(page = 1) {
    if (this.isLoading) return;
    
    this.isLoading = true;
    
    try {
      const response = await this.apiService.get('content/aigc/news', {
        page,
        limit: this.pagination.limit
      });
      
      if (response && response.success) {
        const { items, pagination } = response.data;
        
        if (page === 1) {
          this.items = items;
        } else {
          this.items = [...this.items, ...items];
        }
        
        this.pagination = pagination;
        this.hasMore = items.length >= this.pagination.limit;
        
        console.log('✅ AI资讯数据加载成功', { page, items: items.length });
      } else {
        throw new Error(response?.message || '加载数据失败');
      }
    } catch (error) {
      console.error('❌ 加载 AI资讯数据失败:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * 渲染内容
   */
  renderContent() {
    if (!this.items || this.items.length === 0) {
      this.renderEmpty();
      return;
    }

    this.container.innerHTML = `
      <div class="news-list-container">
        <div class="news-timeline" id="news-timeline">
          ${this.items.map((item, index) => this.renderTimelineItem(item, index + 1)).join('')}
        </div>
        
        ${this.hasMore ? `
          <div class="load-more-container">
            <button class="load-more-btn" id="load-more-btn">
              加载更多
            </button>
          </div>
        ` : `
          <div class="no-more-hint">
            已加载全部内容
          </div>
        `}
      </div>
    `;
  }

  /**
   * 渲染时间线项
   */
  renderTimelineItem(item, number) {
    return `
      <div class="news-timeline-item" data-oid="${item.oid}">
        <div class="timeline-number">${number}</div>
        <div class="timeline-content">
          <h3 class="timeline-title">${TextUtils.cleanTitle(item.title)}</h3>
          <p class="timeline-desc">${item.description}</p>
          <div class="timeline-meta">
            <span class="meta-time">${IconUtils.getIcon("calendar", { size: 16, strokeWidth: 2 })} ${TextUtils.formatDate(item.publish_time || item.date)}</span>
            <span class="meta-source" style="display: none;">${item.source}</span>
            <span class="meta-pv">${IconUtils.getIcon("eye", { size: 16, strokeWidth: 2 })} ${TextUtils.formatNumber(item.pv)} 次浏览</span>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * 渲染空状态
   */
  renderEmpty() {
    this.container.innerHTML = `
      <div class="news-list-empty">
        <div class="empty-icon">📭</div>
        <h2 class="empty-title">暂无内容</h2>
        <p class="empty-desc">还没有AI资讯数据</p>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 时间线项点击
    const timelineItems = this.container.querySelectorAll('.news-timeline-item');
    timelineItems.forEach(item => {
      item.addEventListener('click', () => {
        const oid = item.dataset.oid;
        this.handleItemClick(oid);
      });
    });

    // 加载更多按钮
    const loadMoreBtn = this.container.querySelector('#load-more-btn');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        this.handleLoadMore();
      });
    }

    // 搜索事件
    if (this.eventBus) {
      this.searchHandler = (event) => {
        const data = event.data || event;
        const searchTerm = data.searchTerm || '';
        this.handleSearch(searchTerm);
      };

      this.searchNextHandler = (event) => {
        const data = event.data || event;
        const searchTerm = data.searchTerm || '';
        if (searchTerm === this.searchKeyword && this.searchMatches.length > 0) {
          this.navigateToNextMatch();
        }
      };

      this.eventBus.on('news:search', this.searchHandler);
      this.eventBus.on('news:search:next', this.searchNextHandler);
    }
  }

  /**
   * 处理项点击
   */
  handleItemClick(oid) {
    console.log('📰 点击AI资讯:', oid);
    
    if (!this.router) {
      console.warn('⚠️ Router 未初始化');
      return;
    }

    // 导航到详情页
    this.router.navigate(`/news/detail?oid=${oid}&type=news`);
  }

  /**
   * 处理加载更多
   */
  async handleLoadMore() {
    if (this.isLoading || !this.hasMore) return;

    const nextPage = this.pagination.page + 1;
    
    try {
      // 显示加载状态
      const btn = this.container.querySelector('#load-more-btn');
      if (btn) {
        btn.textContent = '加载中...';
        btn.disabled = true;
      }

      // 加载下一页
      await this.loadData(nextPage);
      
      // 重新渲染
      this.renderContent();
      this.bindEvents();
      
    } catch (error) {
      console.error('❌ 加载更多失败:', error);
      alert('加载失败，请稍后重试');
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
   * 渲染错误状态
   */
  renderError(error) {
    this.container.innerHTML = `
      <div class="news-list-error">
        <div class="error-content">
          <div class="error-icon">⚠️</div>
          <h2 class="error-title">加载失败</h2>
          <p class="error-message">${error.message}</p>
          <button class="error-retry-btn" onclick="window.location.reload()">
            重新加载
          </button>
        </div>
      </div>
    `;
  }

  /**
   * 处理搜索
   */
  handleSearch(keyword) {
    if (!this.container) {
      console.warn('⚠️ AINewsList 容器不存在，无法执行搜索');
      return;
    }

    this.clearSearchHighlights();
    this.searchKeyword = keyword;

    if (!keyword) {
      this.searchMatches = [];
      this.currentMatchIndex = -1;
      this.updateSearchResult(0, 0);
      return;
    }

    const timeline = this.container.querySelector('.news-timeline');
    if (!timeline) {
      console.warn('⚠️ 未找到时间线容器');
      return;
    }

    this.searchMatches = this.highlightMatches(timeline, keyword);

    if (this.searchMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightCurrentMatch();
      this.scrollToCurrentMatch();
      this.updateSearchResult(1, this.searchMatches.length);
    } else {
      this.updateSearchResult(0, 0);
    }
  }

  /**
   * 高亮匹配的文本
   */
  highlightMatches(container, keyword) {
    const matches = [];
    const escapedKeyword = this.escapeRegExp(keyword);
    const regex = new RegExp(escapedKeyword, 'gi');

    const walker = document.createTreeWalker(
      container,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );

    const nodesToReplace = [];
    let node;

    while (node = walker.nextNode()) {
      if (node.nodeValue.trim() && regex.test(node.nodeValue)) {
        nodesToReplace.push(node);
      }
      regex.lastIndex = 0;
    }

    nodesToReplace.forEach(node => {
      const text = node.nodeValue;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      regex.lastIndex = 0;

      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          );
        }

        const mark = document.createElement('mark');
        mark.className = 'search-highlight';
        mark.textContent = match[0];
        fragment.appendChild(mark);
        matches.push(mark);

        lastIndex = match.index + match[0].length;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(
          document.createTextNode(text.substring(lastIndex))
        );
      }

      node.parentNode.replaceChild(fragment, node);
    });

    return matches;
  }

  /**
   * 清除搜索高亮
   */
  clearSearchHighlights() {
    if (!this.container) return;

    const highlights = this.container.querySelectorAll('.search-highlight');
    if (!highlights || highlights.length === 0) return;

    highlights.forEach(mark => {
      const text = mark.textContent;
      const textNode = document.createTextNode(text);
      mark.parentNode.replaceChild(textNode, mark);
    });

    this.searchMatches = [];
    this.currentMatchIndex = -1;
  }

  /**
   * 高亮当前匹配项
   */
  highlightCurrentMatch() {
    if (!this.container) return;
    if (!this.searchMatches || this.searchMatches.length === 0) return;

    this.searchMatches.forEach((mark, index) => {
      if (index === this.currentMatchIndex) {
        mark.classList.add('search-highlight-current');
      } else {
        mark.classList.remove('search-highlight-current');
      }
    });
  }

  /**
   * 滚动到当前匹配项
   */
  scrollToCurrentMatch() {
    if (!this.searchMatches || this.currentMatchIndex < 0 ||
        this.currentMatchIndex >= this.searchMatches.length) return;

    const currentMatch = this.searchMatches[this.currentMatchIndex];
    if (!currentMatch || !currentMatch.scrollIntoView) return;

    currentMatch.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });
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
   * 更新搜索结果
   */
  updateSearchResult(current, total) {
    if (this.eventBus) {
      this.eventBus.emit('news:search:result', { current, total });
    }
  }

  /**
   * 转义正则表达式特殊字符
   */
  escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 清理搜索高亮
    this.clearSearchHighlights();

    // 移除事件监听器
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

    this.items = [];
    this.container = null;
    console.log('✅ AINewsList 已卸载');
  }
}

export default AINewsList;
