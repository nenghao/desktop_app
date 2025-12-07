/**
 * Header 组件
 * 负责显示应用顶部导航栏
 */

// 导入HoverElevation组件
import "../lit/HoverElevation.js";
import { Dialog } from "../common/Dialog.js";
import { NotificationCenter } from "../common/NotificationCenter.js";
import { IconUtils } from "../../utils/IconUtils.js";
import { appConfig } from "../../config/app-config.js";

export class Header {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.router = options.router;
    this.agentManager = options.agentManager; // 注入 AgentManager
    this.userManager = options.userManager;
    this.notificationCenter =
      options.notificationCenter ||
      new NotificationCenter({ eventBus: this.eventBus });
    this.container = null;
    this.isDetailPage = false; // 标记当前是否为详情页
    this.categoryCounts = null; // 缓存分类数量
    this.currentTitle = "智能体";
  }

  /**
   * 渲染组件
   */
  async render(container) {
    this.container = container;

    // 监听事件
    this.setupEventListeners();

    // 检查侧边栏当前状态并渲染对应的Header
    await this.renderInitialHeader();

    console.log("✅ Header 渲染完成");
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 监听路由变化（优先级最高）
    this.eventBus.on("route:change", async (event) => {
      if (event && event.data && event.data.to) {
        const path = event.data.to.path || "";
        console.log("📡 Header收到路由变化事件:", path);

        // 检查是否是智能体详情页，如果是则优先处理
        if (path.startsWith("/agent/")) {
          console.log("🔍 检测到智能体详情页，渲染详情页Header");
          this.isDetailPage = true;
          this.renderAgentDetailHeader();
          return; // 直接返回，不再处理侧边栏事件
        }

        // 其他路由变化正常处理
        await this.handleRouteChange(event.data.to);
      }
    });

    // 监听侧边栏选择变化（优先级较低）
    this.eventBus.on("sidebar:section-change", async (eventData) => {
      console.log("📡 收到侧边栏选择变化事件:", eventData);

      if (eventData && eventData.data && eventData.data.section) {
        const section = eventData.data.section;
        console.log("📡 Header收到侧边栏选择变化事件:", section);

        // 特殊处理智能体section：检查当前路由是否在详情页
        if (section === "power_agent") {
          // 延迟检查路由状态，等待可能的路由变化完成
          setTimeout(() => {
            const currentPath = this.router.currentRoute?.fullPath || "";
            console.log("🔍 检查当前路由:", currentPath);
            if (currentPath.startsWith("/agent/")) {
              console.log("🔍 检测到当前在智能体详情页，渲染详情页Header");
              this.isDetailPage = true;
              this.renderAgentDetailHeader();
            } else {
              console.log("🔍 当前不在详情页，渲染列表页Header");
              this.isDetailPage = false;
              this.handleSectionChange(section);
              this.updateTitleBySection(section);
            }
          }, 100);
          return;
        }

        // 如果当前是详情页但不是智能体section，重置详情页状态
        if (this.isDetailPage && section !== "power_agent") {
          this.isDetailPage = false;
        }

        // 根据侧边栏选择的section来切换Header
        await this.handleSectionChange(section);

        // 保持原有的标题更新逻辑
        this.updateTitleBySection(section);
      }
    });

    // 监听智能体数据更新事件，重新渲染分类选择器
    this.eventBus.on("data:update-available", (updateInfo) => {
      if (
        updateInfo.type === "agents" &&
        this.currentSection === "power_agent"
      ) {
        console.log("🔄 [Header] 智能体数据已更新，重新渲染分类选择器");
        // 延迟渲染，确保缓存已更新
        setTimeout(() => {
          this.renderAgentsHeader();
        }, 100);
      }
    });
  }

  /**
   * 渲染Header
   * @param {Object} options 渲染选项
   * @param {boolean} options.showTitle 是否显示标题
   * @param {boolean} options.showBackButton 是否显示返回按钮
   * @param {string} options.searchInputId 搜索框ID
   */
  renderHeader(options = {}) {
    if (!this.container) return;

    const {
      showTitle = true,
      showBackButton = false,
      searchInputId = "header-search",
    } = options;

    this.container.innerHTML = `
      <div class="dashboard-header">
        <div class="header-left">
          <!-- 返回按钮 -->
          <button class="header-back-btn ${showBackButton ? "" : "hidden"}" id="header-back-btn" aria-label="返回智能体列表">
            <span class="back-icon">⬅</span>
            <span class="back-text">智能体列表</span>
          </button>

          <!-- 动态标题显示 -->
          <div class="header-title ${showTitle ? "" : "hidden"}" id="header-title">${this.currentTitle}</div>
        </div>
        <div class="header-right">
          <div class="header-search">
            <input type="text" placeholder="搜索..." class="search-input" id="${searchInputId}">
            <button class="search-btn" tabindex="-1" aria-label="搜索">${IconUtils.getIcon("search")}</button>
          </div>
        </div>
      </div>
    `;

    // 添加事件监听
    this.addEventListeners();
  }

  /**
   * 渲染初始Header（根据侧边栏状态）
   */
  async renderInitialHeader() {
    // 从状态管理器获取当前侧边栏的activeSection
    const activeSection =
      this.stateManager.getState("ui.sidebar.activeSection") || "dashboard";
    console.log("🔍 Header初始化时检测到侧边栏activeSection:", activeSection);

    // 根据activeSection渲染对应的Header
    await this.handleSectionChange(activeSection);
  }

  /**
   * 渲染小纸条Header
   */
  renderDashboardHeader() {
    this.renderHeader({
      showTitle: true,
      showBackButton: false,
      searchInputId: "header-search",
    });
  }

  /**
   * 渲染聊天界面Header
   */
  renderChatHeader() {
    if (!this.container) return;

    // 检查是否为调试模式
    const isDebugMode = appConfig.settings.debug;

    // 初始化模拟数据开关状态
    this.mockDataEnabled = false;

    this.container.innerHTML = `
      <div class="chat-header">
        <div class="header-left">
          <hover-elevation>
            <button class="chat-header-action-btn" id="new-chat-btn" aria-label="新建聊天" title="新建聊天 (Ctrl+G)">
              <span class="chat-btn-icon">${IconUtils.getIcon("message-circle")}</span>
              <span class="chat-btn-text">新建聊天</span>
            </button>
          </hover-elevation>
          <!-- 仅在调试模式下显示模拟数据开关 -->
          ${isDebugMode
        ? `
          <hover-elevation>
            <button class="chat-header-action-btn debug-only" id="mock-data-toggle" aria-label="切换模拟数据">
              <span class="chat-btn-icon">${IconUtils.getIcon("code")}</span>
              <span class="chat-btn-text">模拟数据</span>
            </button>
          </hover-elevation>
          `
        : ""
      }
        </div>
        <div class="header-right">
          <hover-elevation>
            <button class="chat-header-action-btn" id="chat-history-btn" aria-label="聊天记录">
              <span class="chat-btn-icon">${IconUtils.getIcon("clock")}</span>
              <span class="chat-btn-text">聊天记录</span>
            </button>
          </hover-elevation>
          <div class="chat-header-more-menu">
            <button class="chat-header-action-btn chat-header-more-btn" id="more-btn" aria-label="更多">
              <span class="chat-btn-icon">${IconUtils.getIcon("more-horizontal")}</span>
            </button>
            <div class="chat-more-dropdown" id="chat-more-dropdown" style="display: none;">
              <button class="chat-dropdown-item" id="chat-settings-btn">
                <span class="chat-dropdown-icon">${IconUtils.getIcon("settings")}</span>
                <span class="chat-dropdown-text">聊天设置</span>
              </button>
              <button class="chat-dropdown-item" id="chat-export-btn">
                <span class="chat-dropdown-icon">${IconUtils.getIcon("image-down")}</span>
                <span class="chat-dropdown-text">导出</span>
              </button>
              <button class="chat-dropdown-item" id="chat-report-btn">
                <span class="chat-dropdown-icon">${IconUtils.getIcon("flag")}</span>
                <span class="chat-dropdown-text">报告</span>
              </button>
              <button class="chat-dropdown-item" id="chat-delete-btn">
                <span class="chat-dropdown-icon">${IconUtils.getIcon("trash-2")}</span>
                <span class="chat-dropdown-text">删除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;

    // 添加聊天界面特定的事件监听
    this.addChatEventListeners();
  }

  /**
   * 渲染智能体界面Header
   */
  async renderAgentsHeader() {
    if (!this.container) return;

    // 获取智能体分类数据
    const categories = this.getAgentCategories();

    // 如果没有分类，隐藏选择器
    const showCategorySelector = categories.length > 0;

    this.container.innerHTML = `
      <div class="agents-header">
        <div class="header-left">
          ${showCategorySelector
        ? `
            <hover-elevation>
              <div class="agent-category-selector">
                <button class="agent-category-button" id="agent-category-button">
                  <span class="agent-category-text">${this.getCurrentCategoryName(categories)}</span>
                  <svg class="agent-category-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M4 6l4 4 4-4H4z"/>
                  </svg>
                </button>
                <div class="agent-category-dropdown" id="category-dropdown">
                  ${categories
          .map(
            (cat) => `
                    <div class="agent-category-option ${cat.selected ? "active" : ""}" data-category="${cat.id}">
                      <div class="agent-category-name">
                        <span class="agent-category-icon">${cat.icon}</span>
                        <span class="agent-category-text">${cat.name}</span>
                      </div>
                      <span class="agent-category-count">${cat.count}</span>
                    </div>
                  `
          )
          .join("")}
                </div>
              </div>
            </hover-elevation>
          `
        : ""
      }
        </div>
        <div class="header-right">
          <div class="header-search">
            <input type="text" placeholder="搜索智能体..." class="search-input" id="agents-search">
            <button class="search-btn" tabindex="-1" aria-label="搜索智能体">${IconUtils.getIcon("search")}</button>
          </div>
        </div>
      </div>
    `;

    // 添加智能体界面特定的事件监听
    this.addAgentsEventListeners();
  }

  /**
   * 渲染智能体详情页Header
   */
  renderAgentDetailHeader() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="agent-detail-header">
        <div class="header-left">
          <!-- 返回按钮 -->
          <button class="header-back-btn" id="header-back-btn" aria-label="返回智能体列表">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 19l-7-7 7-7"/>
            </svg>
            <span class="header-back-text">智能体列表</span>
          </button>
        </div>
        <div class="header-right">
          <!-- Python状态指示器 -->
          <div class="python-status-header" id="python-status-header">
            <span class="status-indicator-dot uninitialized" id="python-status-dot"></span>
            <span id="python-status-text">未初始化</span>
          </div>
          <!-- 信息按钮 -->
          <button class="header-info-btn" id="header-info-btn" aria-label="智能体信息">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
          </button>
        </div>
      </div>
    `;

    // 添加事件监听
    this.addAgentDetailEventListeners();
  }

  /**
   * 渲染新闻页面Header（包括列表和详情）
   */
  renderNewsHeader() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="news-header">
        <div class="header-left">
          <button class="nav-back-btn" id="news-back-btn" aria-label="返回">
            <span class="back-icon">${IconUtils.getIcon("chevron-left")}</span>
            <span class="back-text">返回</span>
          </button>
        </div>
        <div class="header-right">
          <div class="header-search">
            <input type="text" placeholder="搜索页面内容..." class="search-input" id="news-search">
            <span class="search-match-count" id="search-match-count" style="display: none;"></span>
            <button class="search-btn" tabindex="-1" aria-label="搜索页面内容">${IconUtils.getIcon("search")}</button>
          </div>
        </div>
      </div>
    `;

    // 添加新闻页面特定的事件监听
    this.addNewsEventListeners();

    // 监听搜索结果更新事件
    this.setupSearchResultListener();
  }

  /**
   * 获取智能体分类数据（从缓存读取）
   */
  getAgentCategories() {
    // 从URL参数获取当前选中的分类
    const urlParams = new URLSearchParams(
      window.location.hash.split("?")[1] || ""
    );
    const urlCategory = urlParams.get("category");

    // 如果URL没有指定分类，尝试从 AgentStore 的会话缓存读取
    let currentCategory = "all";
    if (urlCategory) {
      currentCategory = urlCategory;
    } else if (window.AgentStore?.sessionCache?.selectedCategory) {
      currentCategory = window.AgentStore.sessionCache.selectedCategory;
      console.log('🔍 [Header] 使用 AgentStore 缓存的分类:', currentCategory);
    }

    // 从AgentDataService获取缓存的分类数据
    let categoryData = { categories: [], totalCount: 0 };
    try {
      if (window.agentDataService) {
        categoryData = window.agentDataService.getCachedCategoryData();
      }
    } catch (error) {
      console.warn("⚠️ [Header] 获取分类数据失败:", error);
    }

    // 如果没有分类，返回空数组（隐藏选择器）
    if (!categoryData.categories || categoryData.categories.length === 0) {
      console.log("ℹ️ [Header] 无分类数据，隐藏选择器");
      return [];
    }

    // 构建分类选项（添加"全部"选项）
    const categories = [
      {
        id: "all",
        name: "全部智能体",
        icon: "", // IconUtils.getIcon('bot')
        count: categoryData.totalCount, // 使用 API 返回的 items 总数
        selected: currentCategory === "all",
      },
    ];

    // 添加动态分类
    categoryData.categories.forEach((cat) => {
      categories.push({
        id: cat.id,
        name: cat.name,
        icon: "", //  this.getCategoryIcon(cat.name)
        count: cat.count,
        selected: currentCategory === cat.id,
      });
    });

    return categories;
  }

  /**
   * 根据分类名称获取图标
   */
  getCategoryIcon(categoryName) {
    const iconMap = {
      工具: IconUtils.getIcon("wrench"),
      数据: IconUtils.getIcon("bar-chart-3"),
      图像: IconUtils.getIcon("image"),
      网络: IconUtils.getIcon("globe"),
      实用: IconUtils.getIcon("settings"),
      办公: IconUtils.getIcon("file-text"),
      开发: IconUtils.getIcon("code"),
      娱乐: IconUtils.getIcon("music"),
    };

    return iconMap[categoryName] || IconUtils.getIcon("box");
  }

  /**
   * 获取当前选中分类的显示名称
   */
  getCurrentCategoryName(categories) {
    if (!categories || categories.length === 0) {
      return "";
    }

    const selectedCategory = categories.find((cat) => cat.selected);
    if (selectedCategory) {
      return `<span class="agent-category-icon">${selectedCategory.icon}</span><span class="agent-category-text">${selectedCategory.name}</span>`;
    }
    return `<span class="agent-category-icon">${IconUtils.getIcon("bot")}</span><span class="agent-category-text">全部智能体</span>`;
  }

  /**
   * 添加聊天界面事件监听
   */
  addChatEventListeners() {
    // 新建聊天按钮
    const newChatBtn = this.container.querySelector("#new-chat-btn");
    if (newChatBtn) {
      newChatBtn.addEventListener("click", () => {
        this.handleNewChat();
      });
    }

    // 导出按钮
    const exportBtn = this.container.querySelector("#chat-export-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", () => {
        this.handleExport();
      });
    }

    // 聊天记录按钮
    const chatHistoryBtn = this.container.querySelector("#chat-history-btn");
    if (chatHistoryBtn) {
      chatHistoryBtn.addEventListener("click", () => {
        this.handleChatHistory();
      });
    }

    // 更多按钮和下拉菜单
    const moreBtn = this.container.querySelector("#more-btn");
    const moreDropdown = this.container.querySelector("#chat-more-dropdown");
    if (moreBtn && moreDropdown) {
      moreBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        const isVisible = moreDropdown.style.display !== "none";
        moreDropdown.style.display = isVisible ? "none" : "block";
      });

      // 点击其他地方关闭下拉菜单
      document.addEventListener("click", () => {
        moreDropdown.style.display = "none";
      });
    }

    // 报告按钮
    const reportBtn = this.container.querySelector("#chat-report-btn");
    if (reportBtn) {
      reportBtn.addEventListener("click", () => {
        this.handleReport();
      });
    }

    // 设置按钮
    const settingsBtn = this.container.querySelector("#chat-settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", () => {
        this.handleSettings();
      });
    }

    // 删除按钮
    const deleteBtn = this.container.querySelector("#chat-delete-btn");
    if (deleteBtn) {
      deleteBtn.addEventListener("click", () => {
        this.handleDelete();
      });
    }

    // 模拟数据开关（仅在调试模式下有效）
    const mockDataToggle = this.container.querySelector("#mock-data-toggle");
    if (mockDataToggle) {
      mockDataToggle.addEventListener("click", () => {
        this.handleMockDataToggle();
      });
    }

    // 先移除旧的键盘监听器（如果存在）
    if (this.chatKeyboardHandler) {
      document.removeEventListener("keydown", this.chatKeyboardHandler);
    }

    // Ctrl+G 快捷键新建聊天
    const handleNewChatShortcut = (e) => {
      // Ctrl+G (Windows/Linux) 或 Cmd+G (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === "g") {
        e.preventDefault();
        this.handleNewChat();
      }
    };

    // 添加全局键盘监听
    document.addEventListener("keydown", handleNewChatShortcut);

    // 保存引用以便后续清理
    this.chatKeyboardHandler = handleNewChatShortcut;
  }

  /**
   * 添加智能体界面事件监听
   */
  addAgentsEventListeners() {
    // 分类下拉按钮和选项
    const categoryButton = this.container.querySelector(
      "#agent-category-button"
    );
    const categoryDropdown = this.container.querySelector("#category-dropdown");

    if (categoryButton && categoryDropdown) {
      categoryButton.addEventListener("click", (e) => {
        e.stopPropagation();
        categoryDropdown.classList.toggle("show");
        categoryButton.setAttribute(
          "aria-expanded",
          categoryDropdown.classList.contains("show")
        );
      });

      // 点击外部关闭下拉框
      document.addEventListener("click", () => {
        categoryDropdown.classList.remove("show");
        categoryButton.setAttribute("aria-expanded", "false");
      });

      // 分类选项点击事件
      categoryDropdown.addEventListener("click", (e) => {
        e.stopPropagation();
        const option = e.target.closest(".agent-category-option");
        if (option) {
          const category = option.dataset.category;
          this.handleCategoryChange(category);
          categoryDropdown.classList.remove("show");
          categoryButton.setAttribute("aria-expanded", "false");

          // 更新按钮显示文本
          const categoryText = categoryButton.querySelector(
            ".agent-category-text"
          );
          const categoryIcon = categoryButton.querySelector(
            ".agent-category-icon"
          );
          const optionIcon = option.querySelector(".agent-category-icon");
          const optionText = option.querySelector(".agent-category-text");

          if (categoryText && optionText) {
            categoryText.textContent = optionText.textContent;
          }
          if (categoryIcon && optionIcon) {
            categoryIcon.innerHTML = optionIcon.innerHTML;
          }
        }
      });
    }

    // 搜索框事件
    const searchInput = this.container.querySelector("#agents-search");
    const searchBtn = this.container.querySelector(".search-btn");

    if (searchInput && searchBtn) {
      // 搜索输入事件
      searchInput.addEventListener("input", (e) => {
        const value = e.target.value;

        // 切换图标：有文字显示X，无文字显示搜索图标
        if (value.trim()) {
          searchBtn.innerHTML = IconUtils.getIcon("x");
          searchBtn.setAttribute("aria-label", "清除搜索");
          searchBtn.classList.add("clear-mode");
        } else {
          searchBtn.innerHTML = IconUtils.getIcon("search");
          searchBtn.setAttribute("aria-label", "搜索智能体");
          searchBtn.classList.remove("clear-mode");
        }

        // 触发搜索
        this.handleAgentSearch(value);
      });

      // 回车搜索 & ESC 键处理
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          this.handleAgentSearch(e.target.value);
        }
        // ESC键处理：如果有内容则清空，否则失焦
        if (e.key === "Escape") {
          e.preventDefault();
          if (searchInput.value.trim()) {
            // 有内容：清空搜索
            searchInput.value = "";
            searchBtn.innerHTML = IconUtils.getIcon("search");
            searchBtn.setAttribute("aria-label", "搜索智能体");
            searchBtn.classList.remove("clear-mode");
            this.handleAgentSearch("");
          } else {
            // 无内容：失焦
            searchInput.blur();
          }
        }
      });

      // 搜索按钮点击
      searchBtn.addEventListener("click", (e) => {
        e.currentTarget.blur(); // 点击后立刻取消按钮焦点

        if (searchBtn.classList.contains("clear-mode")) {
          // 清除模式：清空输入框
          searchInput.value = "";
          searchBtn.innerHTML = IconUtils.getIcon("search");
          searchBtn.setAttribute("aria-label", "搜索智能体");
          searchBtn.classList.remove("clear-mode");
          this.handleAgentSearch("");
          searchInput.focus(); // 清空后保持焦点
        } else {
          // 搜索模式：聚焦到输入框
          searchInput.focus();
        }
      });

      // Ctrl+F / Cmd+F 快捷键聚焦搜索框
      const handleKeyboardShortcut = (e) => {
        // Ctrl+F (Windows/Linux) 或 Cmd+F (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
          e.preventDefault();
          searchInput.focus();
          searchInput.select(); // 选中所有文本，方便直接输入新内容
        }
      };

      // 添加全局键盘监听
      document.addEventListener("keydown", handleKeyboardShortcut);

      // 保存引用以便后续清理
      this.agentsKeyboardHandler = handleKeyboardShortcut;
    }
  }

  /**
   * 添加新闻页面事件监听
   */
  addNewsEventListeners() {
    // 返回按钮
    const backBtn = this.container.querySelector("#news-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.handleNewsBack();
      });
    }

    // 搜索框事件
    const searchInput = this.container.querySelector("#news-search");
    const searchBtn = this.container.querySelector(".search-btn");

    if (searchInput && searchBtn) {
      // 输入框输入事件
      searchInput.addEventListener("input", (e) => {
        const value = e.target.value.trim();

        // 根据输入内容切换按钮图标
        if (value) {
          searchBtn.innerHTML = IconUtils.getIcon("x");
          searchBtn.setAttribute("aria-label", "清除搜索");
          searchBtn.classList.add("clear-mode");
        } else {
          searchBtn.innerHTML = IconUtils.getIcon("search");
          searchBtn.setAttribute("aria-label", "搜索页面内容");
          searchBtn.classList.remove("clear-mode");
        }

        // 触发页面内搜索
        this.handleNewsSearch(value);
      });

      // 回车键处理 - 导航到下一个匹配
      searchInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const value = e.target.value.trim();
          if (value) {
            // 发送导航到下一个匹配的事件
            if (this.eventBus) {
              this.eventBus.emit("news:search:next", { searchTerm: value });
            }
          }
        }
        // ESC键处理：如果有内容则清空，否则失焦
        if (e.key === "Escape") {
          e.preventDefault();
          if (searchInput.value.trim()) {
            // 有内容：清空搜索
            searchInput.value = "";
            searchBtn.innerHTML = IconUtils.getIcon("search");
            searchBtn.setAttribute("aria-label", "搜索页面内容");
            searchBtn.classList.remove("clear-mode");
            this.handleNewsSearch("");
          } else {
            // 无内容：失焦
            searchInput.blur();
          }
        }
      });

      // 搜索按钮点击
      searchBtn.addEventListener("click", (e) => {
        e.currentTarget.blur(); // 点击后立刻取消按钮焦点

        if (searchBtn.classList.contains("clear-mode")) {
          // 清除模式：清空输入框
          searchInput.value = "";
          searchBtn.innerHTML = IconUtils.getIcon("search");
          searchBtn.setAttribute("aria-label", "搜索页面内容");
          searchBtn.classList.remove("clear-mode");
          this.handleNewsSearch("");
          searchInput.focus(); // 清空后保持焦点
        } else {
          // 搜索模式：聚焦到输入框
          searchInput.focus();
        }
      });

      // Ctrl+F / Cmd+F 快捷键聚焦搜索框
      const handleKeyboardShortcut = (e) => {
        // Ctrl+F (Windows/Linux) 或 Cmd+F (Mac)
        if ((e.ctrlKey || e.metaKey) && e.key === "f") {
          e.preventDefault();
          searchInput.focus();
          searchInput.select(); // 选中所有文本，方便直接输入新内容
        }
      };

      // 添加全局键盘监听
      document.addEventListener("keydown", handleKeyboardShortcut);

      // 保存引用以便后续清理
      this.newsKeyboardHandler = handleKeyboardShortcut;
    }
  }

  /**
   * 添加智能体详情页事件监听
   */
  addAgentDetailEventListeners() {
    // 返回按钮
    const backBtn = this.container.querySelector("#header-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.handleBackToAgentList();
      });
    }

    // 信息按钮
    const infoBtn = this.container.querySelector("#header-info-btn");
    if (infoBtn) {
      infoBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.handleAgentInfoClick();
      });
    }
  }

  /**
   * 添加DOM事件监听
   */
  addEventListeners() {
    // 搜索按钮事件
    const searchBtn = this.container.querySelector(".search-btn");
    if (searchBtn) {
      searchBtn.addEventListener("click", (e) => {
        e.currentTarget.blur(); // 点击后立刻取消按钮焦点
      });
    }

    // 返回按钮事件
    const backBtn = this.container.querySelector("#header-back-btn");
    if (backBtn) {
      backBtn.addEventListener("click", () => {
        this.handleBackToAgentList();
      });
    }
  }

  /**
   * 检测当前页面类型
   * @param {string} path 路由路径
   * @returns {string} 页面类型：'chat', 'agents', 'dashboard', 'agent-detail', 'news-list', 'news-detail'
   */
  detectPageType(path) {
    if (!path) return "dashboard";

    if (path === "/chat" || path.startsWith("/chat/")) {
      return "chat";
    } else if (path === "/agents" || path.startsWith("/agents?")) {
      return "agents";
    } else if (path.startsWith("/agent/")) {
      return "agent-detail";
    } else if (path.startsWith("/news/detail")) {
      return "news-detail";
    } else if (
      path.startsWith("/news/list") ||
      path.startsWith("/news/daily") ||
      path.startsWith("/daily/list")
    ) {
      return "news-list";
    } else if (path === "/" || path === "/dashboard") {
      return "dashboard";
    } else {
      return "dashboard"; // 默认为小纸条
    }
  }

  /**
   * 处理侧边栏section变化
   */
  async handleSectionChange(section) {
    console.log("🔍 Header处理侧边栏section变化:", section);

    switch (section) {
      case "chat":
        this.renderChatHeader();
        break;
      case "power_agent":
        await this.renderAgentsHeader();
        break;
      case "dashboard":
      default:
        this.isDetailPage = false;
        this.renderDashboardHeader();
        break;
    }
  }

  /**
   * 处理路由变化
   */
  async handleRouteChange(route) {
    const path = route.path || "";
    const pageType = this.detectPageType(path);

    console.log("🔍 Header检测到页面类型:", pageType, "路径:", path);

    switch (pageType) {
      case "chat":
        this.renderChatHeader();
        break;
      case "agents":
        await this.renderAgentsHeader();
        break;
      case "agent-detail":
        this.isDetailPage = true;
        this.renderAgentDetailHeader();
        break;
      case "news-list":
      case "news-detail":
        this.renderNewsHeader();
        break;
      case "dashboard":
      default:
        this.isDetailPage = false;
        this.renderDashboardHeader();
        break;
    }
  }

  /**
   * 根据侧边栏section更新标题
   */
  updateTitleBySection(section) {
    const sectionTitles = {
      dashboard: "小纸条",
      chat: "聊天",
      power_agent: "智能体",
      settings: "设置",
      help: "帮助",
    };

    const title = sectionTitles[section] || "智能体";
    this.updateTitle(title);
  }

  /**
   * 根据路由更新标题
   */
  updateTitleByRoute(path) {
    const routeTitles = {
      "/": "小纸条",
      "/chat": "聊天",
      "/agents": "智能体",
      "/help": "帮助",
    };

    const title = routeTitles[path] || "智能体";
    this.updateTitle(title);
  }

  /**
   * 更新标题文本
   */
  updateTitle(title) {
    this.currentTitle = title;
    const headerTitle = this.container.querySelector("#header-title");
    if (headerTitle) {
      headerTitle.textContent = title;
      console.log("✅ Header标题已更新为:", title);
    }
  }

  /**
   * 处理新建聊天
   */
  handleNewChat() {
    console.log("🆕 新建聊天");

    // 清除聊天记录按钮的选中状态
    const chatHistoryBtn = this.container.querySelector("#chat-history-btn");
    if (chatHistoryBtn) {
      chatHistoryBtn.classList.remove("selected");
    }

    // 直接发送新建聊天事件，ChatInterface.handleNewChat() 内部会处理停止逻辑
    if (this.eventBus) {
      this.eventBus.emit("chat:new");
    }
  }

  /**
   * 处理导出
   */
  handleExport() {
    console.log("📤 导出聊天");

    // 导出当前聊天记录为JPG图片
    this.exportChatAsImage();
  }

  /**
   * 导出聊天记录为JPG图片
   */
  async exportChatAsImage() {
    try {
      // 获取聊天消息区域
      const chatMessagesContainer = document.querySelector(
        "#chat-list-container .chat-messages-container"
      );
      if (!chatMessagesContainer) {
        this.notificationCenter.error("未找到聊天记录");
        return;
      }

      // 获取所有消息项
      const messageItems =
        chatMessagesContainer.querySelectorAll(".message-item");
      if (messageItems.length === 0) {
        this.notificationCenter.error("没有可导出的聊天记录");
        return;
      }

      // 获取第一条用户消息作为文件名
      let fileName = "chat-export";
      const firstUserMessage = chatMessagesContainer.querySelector(
        ".user-message .message-text"
      );
      if (firstUserMessage) {
        // 提取纯文本内容
        let textContent =
          firstUserMessage.textContent || firstUserMessage.innerText || "";
        if (textContent) {
          // 清理文件名中的非法字符
          textContent = textContent.replace(/[<>:"/\\|?*\x00-\x1F]/g, "");
          // 限制长度（Windows文件名限制为255个字符，但我们需要为.jpg后缀留出空间）
          if (textContent.length > 100) {
            textContent = textContent.substring(0, 100) + "...";
          }
          // 移除首尾空格
          textContent = textContent.trim();
          if (textContent) {
            fileName = textContent;
          }
        }
      }

      // 动态加载html2canvas
      let html2canvas;
      try {
        const html2canvasModule = await import("html2canvas");
        html2canvas = html2canvasModule.default;
      } catch (importError) {
        console.error("加载html2canvas失败:", importError);
        this.notificationCenter.error("导出功能初始化失败");
        return;
      }

      // 创建一个临时容器来放置所有消息
      const tempContainer = document.createElement("div");
      tempContainer.style.position = "absolute";
      tempContainer.style.left = "-9999px";
      tempContainer.style.top = "-9999px";
      tempContainer.style.width = "800px";
      tempContainer.style.backgroundColor = "var(--color-background)";
      tempContainer.style.padding = "20px";
      tempContainer.style.borderRadius = "8px";
      tempContainer.style.boxShadow = "0 4px 12px rgba(0, 0, 0, 0.15)";

      // 复制所有消息到临时容器
      messageItems.forEach((item) => {
        const clonedItem = item.cloneNode(true);
        // 确保克隆的元素样式正确
        clonedItem.style.marginBottom = "12px";
        clonedItem.style.maxWidth = "100%";
        tempContainer.appendChild(clonedItem);
      });

      // 添加到DOM中
      document.body.appendChild(tempContainer);

      // 使用html2canvas截图
      const canvas = await html2canvas(tempContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: getComputedStyle(document.documentElement)
          .getPropertyValue("--color-background")
          .trim(),
        scale: 2, // 提高图片质量
        logging: false,
      });

      // 清理临时容器
      document.body.removeChild(tempContainer);

      // 将canvas转换为JPG格式的Blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            this.notificationCenter.error("图片生成失败");
            return;
          }

          // 创建下载链接
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          // 使用第一条消息内容作为文件名，如果为空则使用默认名称
          a.download = `${fileName}-${new Date().toISOString().split("T")[0]}.jpg`;
          document.body.appendChild(a);
          a.click();

          // 清理
          setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }, 100);

          this.notificationCenter.success("聊天记录导出成功");
        },
        "image/jpeg",
        0.9
      ); // JPG格式，质量90%
    } catch (error) {
      console.error("导出聊天记录失败:", error);
      this.notificationCenter.error(`导出聊天记录失败: ${error.message}`);
    }
  }

  /**
   * 处理聊天记录
   */
  handleChatHistory() {
    console.log("📋 查看聊天记录");

    // 切换按钮选中状态
    const chatHistoryBtn = this.container.querySelector("#chat-history-btn");
    if (chatHistoryBtn) {
      const isSelected = chatHistoryBtn.classList.contains("selected");
      if (isSelected) {
        // 如果已选中，则关闭并移除选中状态
        chatHistoryBtn.classList.remove("selected");
        // 发送关闭事件
        if (this.eventBus) {
          this.eventBus.emit("chat:history:close");
        }
      } else {
        // 如果未选中，则打开并添加选中状态
        chatHistoryBtn.classList.add("selected");
        // 发送打开事件
        if (this.eventBus) {
          this.eventBus.emit("chat:history:open");
        }
      }
    }

    // 发送切换事件（保持向后兼容）
    if (this.eventBus) {
      this.eventBus.emit("chat:history:toggle");
    }
  }

  /**
   * 处理报告
   */
  handleReport() {
    console.log("📊 生成报告");

    try {
      // 获取当前会话ID
      const currentConversationId =
        this.stateManager?.getState("chat.currentConversation");
      if (!currentConversationId) {
        console.warn("没有当前会话可生成报告");
        if (this.notificationCenter) {
          this.notificationCenter.error("需要选中会话才能生成报告");
        }
        return;
      }

      // 导入ReportModal组件
      import("../common/ReportModal.js")
        .then(({ showReportModal }) => {
          // 使用ReportModal组件显示报告模态框
          showReportModal({
            eventBus: this.eventBus,
            notificationCenter: this.notificationCenter,
            conversationId: currentConversationId,
            userManager: this.userManager,
          });
        })
        .catch((error) => {
          console.error("加载ReportModal组件失败:", error);
          if (this.notificationCenter) {
            this.notificationCenter.error("报告功能加载失败");
          }
        });
    } catch (error) {
      console.error("获取当前会话ID失败:", error);
      if (this.notificationCenter) {
        this.notificationCenter.error("获取当前会话信息失败");
      }
    }
  }

  /**
   * 处理打开设置
   */
  handleSettings() {
    // 导入ChatSettingsModal组件
    import("../../components/chat/ChatSettingsModal.js")
      .then(({ ChatSettingsModal }) => {
        const chatSettingsModal = new ChatSettingsModal({
          userManager: this.userManager,
          eventBus: this.eventBus,
        });
        chatSettingsModal.show();
      })
      .catch((error) => {
        console.error("加载ChatSettingsModal组件失败:", error);
      });

    // 关闭下拉菜单
    const moreDropdown = this.container.querySelector("#chat-more-dropdown");
    if (moreDropdown) {
      moreDropdown.style.display = "none";
    }
  }

  /**
   * 处理删除当前会话
   */
  async handleDelete() {
    console.log("🗑️ 删除当前聊天会话");

    try {
      // 获取当前会话ID
      const currentConversationId =
        this.stateManager?.getState("chat.currentConversation");
      if (!currentConversationId) {
        console.warn("没有当前会话可删除");
        return;
      }

      // 显示确认对话框
      const confirmed = await Dialog.deleteConfirm(
        "确定要删除这个会话吗？此操作无法撤销。"
      );
      if (!confirmed) {
        return;
      }

      // 发送删除事件给聊天历史组件处理
      if (this.eventBus) {
        this.eventBus.emit("chat:delete-conversation", {
          conversationId: currentConversationId,
        });
      }

      console.log("✅ 删除会话请求已发送:", currentConversationId);
    } catch (error) {
      console.error("❌ 删除会话失败:", error);
      this.notificationCenter.error(`删除会话失败: ${error.message}`);
    }
  }

  /**
   * 处理模拟数据开关切换
   */
  handleMockDataToggle() {
    // 切换模拟数据状态
    this.mockDataEnabled = !this.mockDataEnabled;

    const mockDataToggle = this.container.querySelector("#mock-data-toggle");
    if (mockDataToggle) {
      // 更新按钮样式以反映当前状态
      if (this.mockDataEnabled) {
        mockDataToggle.classList.add("active");
        mockDataToggle.setAttribute("aria-pressed", "true");
        // 通过事件总线发送加载模拟数据事件给ChatInterface
        if (this.eventBus) {
          this.eventBus.emit("chat:load-mock-data");
        }
      } else {
        mockDataToggle.classList.remove("active");
        mockDataToggle.setAttribute("aria-pressed", "false");
        // 通过事件总线发送清除模拟数据事件给ChatInterface
        if (this.eventBus) {
          this.eventBus.emit("chat:clear-mock-data");
        }
      }
    }
  }

  /**
   * 处理分类变化
   */
  handleCategoryChange(categoryId) {
    console.log("🔄 智能体分类变化:", categoryId);

    // 导航到对应分类的智能体页面
    const route =
      categoryId === "all" ? "/agents" : `/agents?category=${categoryId}`;
    if (this.router) {
      this.router.navigate(route);
    }

    // 发送分类选择事件，与侧边栏保持一致
    if (this.eventBus) {
      this.eventBus.emit("agent-category:selected", {
        categoryId,
        category: this.getAgentCategories().find((c) => c.id === categoryId),
      });
    }
  }

  /**
   * 处理智能体搜索
   */
  handleAgentSearch(searchTerm) {
    console.log("🔍 搜索智能体:", searchTerm);

    // 仅发送搜索事件，不触发路由导航（纯前端搜索）
    if (this.eventBus) {
      this.eventBus.emit("agents:search", {
        searchTerm: searchTerm.trim(),
        timestamp: Date.now(),
      });
    }
  }

  /**
   * 处理返回智能体列表
   */
  handleBackToAgentList() {
    // 通知 Sidebar 清除智能体状态记忆
    if (this.eventBus) {
      this.eventBus.emit("sidebar:clear-agent-memory");
      console.log("🧹 已通知清除智能体状态记忆");
    }

    // 导航到智能体列表
    if (this.router) {
      this.router.navigate("/agents");
    } else if (window.app && window.app.getService) {
      window.app.getService("router").navigate("/agents");
    } else {
      window.location.hash = "#/agents";
    }
  }

  /**
   * 处理智能体信息按钮点击
   */
  handleAgentInfoClick() {
    console.log("📋 显示智能体信息");
    console.log("  - eventBus:", this.eventBus ? "存在" : "不存在");

    // 通过事件总线发送显示信息侧边栏事件
    if (this.eventBus) {
      console.log("  - 发送事件: agent-detail:show-info-sidebar");
      this.eventBus.emit("agent-detail:show-info-sidebar");
      console.log("  - 事件已发送");
    } else {
      console.error("  - ❌ eventBus 不存在，无法发送事件");
    }
  }

  /**
   * 处理新闻页面返回
   */
  handleNewsBack() {
    console.log("📰 新闻页面返回");

    // 优先使用路由的back方法（支持历史返回）
    if (this.router && this.router.back) {
      this.router.back();
    } else if (
      this.router &&
      this.router.canGoBack &&
      this.router.canGoBack()
    ) {
      this.router.back();
    } else {
      // 默认返回dashboard
      if (this.router) {
        this.router.navigate("/dashboard");
      } else {
        window.history.back();
      }
    }
  }

  /**
   * 处理新闻页面内搜索
   * @param {string} searchTerm - 搜索关键词
   */
  handleNewsSearch(searchTerm = "") {
    console.log("🔍 新闻页面搜索:", searchTerm);

    // 通过事件总线发送搜索事件给NewsDetail或AIDailyList组件
    if (this.eventBus) {
      this.eventBus.emit("news:search", {
        searchTerm: searchTerm.trim(),
      });
    }
  }

  /**
   * 设置搜索结果监听器
   */
  setupSearchResultListener() {
    if (!this.eventBus) return;

    // 监听搜索结果更新事件
    this.eventBus.on("news:search:result", (data) => {
      const matchCount = this.container.querySelector("#search-match-count");
      if (matchCount) {
        const { total, current } = data;
        if (total > 0) {
          matchCount.textContent = `${current}/${total}`;
          matchCount.style.display = "inline";
        } else {
          matchCount.style.display = "none";
        }
      }
    });
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 清理新闻页面的键盘事件监听器
    if (this.newsKeyboardHandler) {
      document.removeEventListener("keydown", this.newsKeyboardHandler);
      this.newsKeyboardHandler = null;
    }

    // 清理智能体页面的键盘事件监听器
    if (this.agentsKeyboardHandler) {
      document.removeEventListener("keydown", this.agentsKeyboardHandler);
      this.agentsKeyboardHandler = null;
    }

    // 清理聊天页面的键盘事件监听器
    if (this.chatKeyboardHandler) {
      document.removeEventListener("keydown", this.chatKeyboardHandler);
      this.chatKeyboardHandler = null;
    }

    if (this.container) {
      this.container.innerHTML = "";
    }
    console.log("✅ Header 卸载完成");
  }

  // ==================== 固定按钮功能 ====================

  /**
   * 添加固定按钮到 agent-header
   */
  addPinButtonToAgentHeader() {
    // 等待 DOM 渲染完成
    setTimeout(() => {
      const agentHeader = document.querySelector(".agent-header");
      if (!agentHeader || !this.agentManager) {
        return;
      }

      const currentAgentId = this.getCurrentAgentId();
      if (!currentAgentId) {
        return;
      }

      const isPinned = this.agentManager.isPinned(currentAgentId);

      // 创建固定按钮
      const pinButton = document.createElement("button");
      pinButton.id = "pin-agent-btn";
      pinButton.className = `pin-agent-button ${isPinned ? "pinned" : ""}`;
      pinButton.title = isPinned ? "取消固定" : "固定到侧边栏";
      pinButton.innerHTML = `<span class="pin-icon">${isPinned ? IconUtils.getIcon("pin") : IconUtils.getIcon("pin")}</span>`;

      // 添加到 agent-header
      agentHeader.appendChild(pinButton);

      // 绑定事件
      this.setupPinButton();
    }, 100);
  }

  /**
   * 设置固定按钮事件
   */
  setupPinButton() {
    const pinBtn = document.querySelector("#pin-agent-btn");
    if (pinBtn) {
      pinBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await this.handlePinToggle();
      });
    }
  }

  /**
   * 处理固定状态切换
   */
  async handlePinToggle() {
    if (!this.agentManager) {
      console.warn("⚠️ AgentManager 未注入");
      return;
    }

    const agentId = this.getCurrentAgentId();
    if (!agentId) {
      console.warn("⚠️ 无法获取当前智能体ID");
      return;
    }

    const isPinned = this.agentManager.isPinned(agentId);

    if (isPinned) {
      await this.agentManager.unpinAgent(agentId);
    } else {
      const agentData = await this.getAgentData(agentId);
      if (agentData) {
        await this.agentManager.pinAgent(agentId, agentData);
      }
    }

    // 更新按钮状态
    this.updatePinButtonState();
  }

  /**
   * 更新固定按钮状态
   */
  updatePinButtonState() {
    const pinBtn = document.querySelector("#pin-agent-btn");
    if (!pinBtn || !this.agentManager) {
      return;
    }

    const agentId = this.getCurrentAgentId();
    if (!agentId) {
      return;
    }

    const isPinned = this.agentManager.isPinned(agentId);
    const pinIcon = pinBtn.querySelector(".pin-icon");

    if (isPinned) {
      pinBtn.classList.add("pinned");
      pinBtn.title = "取消固定";
      if (pinIcon) pinIcon.innerHTML = IconUtils.getIcon("pin");
    } else {
      pinBtn.classList.remove("pinned");
      pinBtn.title = "固定到侧边栏";
      if (pinIcon) pinIcon.innerHTML = IconUtils.getIcon("pin");
    }
  }

  /**
   * 获取当前智能体ID
   */
  getCurrentAgentId() {
    const currentPath =
      this.router?.currentRoute?.fullPath || window.location.hash;
    const match = currentPath.match(/\/agent\/([^/?]+)/);
    return match ? match[1] : null;
  }

  /**
   * 获取智能体数据
   */
  async getAgentData(agentId) {
    try {
      // 从 AgentManager 获取智能体信息
      const agentList = this.agentManager.getAgentList();
      const agent = agentList.find((a) => a.id === agentId);

      if (agent) {
        return {
          id: agentId,
          name: agent.name,
          icon: agent.icon || IconUtils.getIcon("bot"),
        };
      }

      // 如果找不到，使用默认数据
      return {
        id: agentId,
        name: `智能体 ${agentId}`,
        icon: IconUtils.getIcon("bot"),
      };
    } catch (error) {
      console.error("❌ 获取智能体数据失败:", error);
      return null;
    }
  }
}
