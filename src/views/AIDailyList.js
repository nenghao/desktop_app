/**
 * AI日报列表页
 */

import { getCommonApiService } from "../services/api/CommonApiService.js";
import { TextUtils } from "../utils/TextUtils.js";
import { IconUtils } from "../utils/IconUtils.js";

export class AIDailyList {
  constructor(options = {}) {
    this.container = null;
    this.eventBus = options.eventBus;
    this.router = options.router || window.app?.getService("router");
    this.apiService = getCommonApiService();

    // 数据
    this.items = [];
    this.pagination = {
      page: 1,
      limit: 12,
      total: 0,
    };

    this.isLoading = false;
    this.hasMore = true;

    // 搜索相关
    this.searchKeyword = ""; // 当前搜索关键词
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
      console.log("📦 开始渲染 AI日报列表...");

      // 渲染骨架屏
      this.renderSkeleton();

      // 加载数据
      await this.loadData();

      // 渲染内容
      this.renderContent();

      // 绑定事件
      this.bindEvents();

      console.log("✅ AI日报列表渲染完成");
    } catch (error) {
      console.error("❌ 渲染 AI日报列表失败:", error);
      this.renderError(error);
    }
  }

  /**
   * 渲染骨架屏
   */
  renderSkeleton() {
    this.container.innerHTML = `
      <div class="news-list-container">
        <div class="news-timeline">
          ${Array(6)
            .fill("")
            .map(
              (_, index) => `
            <div class="skeleton-timeline-item">
              <div class="skeleton-number"></div>
              <div class="skeleton-timeline-content">
                <div class="skeleton-title"></div>
                <div class="skeleton-desc"></div>
                <div class="skeleton-meta"></div>
              </div>
            </div>
          `
            )
            .join("")}
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
      const response = await this.apiService.get("content/aigc/daily", {
        page,
        limit: this.pagination.limit,
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

        console.log("✅ AI日报数据加载成功", { page, items: items.length });
      } else {
        throw new Error(response?.message || "加载数据失败");
      }
    } catch (error) {
      console.error("❌ 加载 AI日报数据失败:", error);
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
          ${this.items.map((item, index) => this.renderTimelineItem(item, index + 1)).join("")}
        </div>
        
        ${
          this.hasMore
            ? `
          <div class="load-more-container">
            <button class="load-more-btn" id="load-more-btn">
              加载更多
            </button>
          </div>
        `
            : `
          <div class="no-more-hint">
            已加载全部内容
          </div>
        `
        }
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
          <p class="timeline-desc">${item.description || ""}</p>
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
        <p class="empty-desc">还没有AI日报数据</p>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    // 监听搜索事件
    if (this.eventBus) {
      // 保存事件监听器引用
      this.searchHandler = (event) => {
        console.log("🔍 [AIDailyList] 收到搜索事件:", event);
        // 从事件对象中提取 data
        const data = event.data || event;
        const searchTerm = data.searchTerm || "";
        console.log("🔍 [AIDailyList] 提取的搜索关键词:", searchTerm);
        this.handleSearch(searchTerm);
      };
      this.searchNextHandler = () => {
        console.log("➡️ [AIDailyList] 收到下一个匹配事件");
        this.navigateToNextMatch();
      };

      this.eventBus.on("news:search", this.searchHandler);
      this.eventBus.on("news:search:next", this.searchNextHandler);
      console.log("✅ [AIDailyList] 搜索事件监听器已绑定");
    }

    // 时间线项点击
    const timelineItems = this.container.querySelectorAll(
      ".news-timeline-item"
    );
    timelineItems.forEach((item) => {
      item.addEventListener("click", () => {
        const oid = item.dataset.oid;
        this.handleItemClick(oid);
      });
    });

    // 加载更多按钮
    const loadMoreBtn = this.container.querySelector("#load-more-btn");
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener("click", () => {
        this.handleLoadMore();
      });
    }
  }

  /**
   * 处理项点击
   */
  handleItemClick(oid) {
    console.log("📰 点击AI日报:", oid);

    if (!this.router) {
      console.warn("⚠️ Router 未初始化");
      return;
    }

    // 导航到详情页
    this.router.navigate(`/news/detail?oid=${oid}&type=daily`);
  }

  /**
   * 处理加载更多
   */
  async handleLoadMore() {
    if (this.isLoading || !this.hasMore) return;

    const nextPage = this.pagination.page + 1;

    try {
      // 显示加载状态
      const btn = this.container.querySelector("#load-more-btn");
      if (btn) {
        btn.textContent = "加载中...";
        btn.disabled = true;
      }

      // 加载下一页
      await this.loadData(nextPage);

      // 重新渲染
      this.renderContent();
      this.bindEvents();
    } catch (error) {
      console.error("❌ 加载更多失败:", error);
      alert("加载失败，请稍后重试");
    }
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
   * @param {string} keyword - 搜索关键词
   */
  handleSearch(keyword) {
    console.log("🔎 [AIDailyList] handleSearch 被调用，关键词:", keyword);

    // 检查容器是否存在
    if (!this.container) {
      console.warn("⚠️ AIDailyList 容器不存在，无法执行搜索");
      return;
    }
    console.log("✓ 容器存在");

    // 清除之前的高亮
    this.clearSearchHighlights();
    console.log("✓ 清除了之前的高亮");

    this.searchKeyword = keyword;

    if (!keyword) {
      // 空关键词，清除搜索状态
      console.log("ℹ️ 关键词为空，清除搜索状态");
      this.searchMatches = [];
      this.currentMatchIndex = -1;
      this.updateSearchResult(0, 0);
      return;
    }

    // 获取时间线容器
    const timeline = this.container.querySelector(".news-timeline");
    console.log("✓ 时间线容器:", timeline);
    if (!timeline) {
      console.warn("⚠️ 未找到时间线容器");
      return;
    }

    // 搜索并高亮所有匹配项
    console.log("🔍 开始搜索匹配项...");
    this.searchMatches = this.highlightMatches(timeline, keyword);
    console.log("✓ 找到匹配项数量:", this.searchMatches.length);

    // 如果有匹配项，自动定位到第一个
    if (this.searchMatches.length > 0) {
      this.currentMatchIndex = 0;
      this.highlightCurrentMatch();
      this.scrollToCurrentMatch();
      this.updateSearchResult(1, this.searchMatches.length);
      console.log("✅ 搜索完成，定位到第一个匹配项");
    } else {
      this.currentMatchIndex = -1;
      this.updateSearchResult(0, 0);
      console.log("ℹ️ 未找到匹配项");
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
    const regex = new RegExp(this.escapeRegExp(keyword), "gi");

    // 递归遍历所有文本节点
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        // 跳过script和style标签
        if (
          node.parentElement.tagName === "SCRIPT" ||
          node.parentElement.tagName === "STYLE"
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        // 只处理包含关键词的文本节点
        return regex.test(node.textContent)
          ? NodeFilter.FILTER_ACCEPT
          : NodeFilter.FILTER_SKIP;
      },
    });

    const nodesToProcess = [];
    let node;
    while ((node = walker.nextNode())) {
      nodesToProcess.push(node);
    }

    // 处理所有匹配的文本节点
    nodesToProcess.forEach((textNode) => {
      const parent = textNode.parentNode;
      const text = textNode.textContent;
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      // 重置正则表达式
      const searchRegex = new RegExp(this.escapeRegExp(keyword), "gi");

      while ((match = searchRegex.exec(text)) !== null) {
        // 添加匹配前的文本
        if (match.index > lastIndex) {
          fragment.appendChild(
            document.createTextNode(text.substring(lastIndex, match.index))
          );
        }

        // 创建高亮标签
        const mark = document.createElement("mark");
        mark.className = "search-highlight";
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
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  /**
   * 清除搜索高亮
   */
  clearSearchHighlights() {
    // 检查容器是否存在
    if (!this.container) {
      return;
    }

    const highlights = this.container.querySelectorAll(".search-highlight");
    highlights.forEach((mark) => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        // 合并相邻的文本节点
        parent.normalize();
      }
    });

    // 同时移除当前高亮类
    const currentHighlights = this.container.querySelectorAll(
      ".search-highlight-current"
    );
    currentHighlights.forEach((el) => {
      el.classList.remove("search-highlight-current");
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
    const prevCurrent = this.container.querySelector(
      ".search-highlight-current"
    );
    if (prevCurrent) {
      prevCurrent.classList.remove("search-highlight-current");
    }

    // 添加当前高亮
    if (
      this.currentMatchIndex >= 0 &&
      this.currentMatchIndex < this.searchMatches.length
    ) {
      const currentMatch = this.searchMatches[this.currentMatchIndex];
      if (currentMatch) {
        currentMatch.classList.add("search-highlight-current");
      }
    }
  }

  /**
   * 滚动到当前匹配项
   */
  scrollToCurrentMatch() {
    if (
      this.currentMatchIndex >= 0 &&
      this.currentMatchIndex < this.searchMatches.length
    ) {
      const currentMatch = this.searchMatches[this.currentMatchIndex];
      if (currentMatch && currentMatch.scrollIntoView) {
        currentMatch.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    }
  }

  /**
   * 导航到下一个匹配项
   */
  navigateToNextMatch() {
    if (this.searchMatches.length === 0) return;

    this.currentMatchIndex =
      (this.currentMatchIndex + 1) % this.searchMatches.length;
    this.highlightCurrentMatch();
    this.scrollToCurrentMatch();
    this.updateSearchResult(
      this.currentMatchIndex + 1,
      this.searchMatches.length
    );
  }

  /**
   * 更新搜索结果显示
   */
  updateSearchResult(current, total) {
    if (this.eventBus) {
      this.eventBus.emit("news:search:result", {
        current,
        total,
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
        this.eventBus.off("news:search", this.searchHandler);
        this.searchHandler = null;
      }
      if (this.searchNextHandler) {
        this.eventBus.off("news:search:next", this.searchNextHandler);
        this.searchNextHandler = null;
      }
    }

    // 清理搜索高亮
    if (this.container) {
      this.clearSearchHighlights();
    }

    this.items = [];
    this.container = null;
    console.log("✅ AIDailyList 已卸载");
  }
}

export default AIDailyList;
