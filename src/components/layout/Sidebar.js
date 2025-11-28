/**
 * 侧边栏组件
 */

import { LoginModal } from "../auth/LoginModal.js";
import { UserProfileModal } from "../auth/UserProfileModal.js";
import { SettingsModal } from "../settings/SettingsModal.js";
import { UserManager } from "../../services/UserManager.js";
import { IconUtils } from "../../utils/IconUtils.js";
import { appConfig } from "../../config/app-config.js";
import { DataCacheService } from "../../services/DataCacheService.js";
import { AppConfigApiService } from "../../services/api/AppConfigApiService.js";

export class Sidebar {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.stateManager = options.stateManager;
    this.router = options.router;
    this.agentManager = options.agentManager; // 注入 AgentManager
    this.agentDataService = options.agentDataService; // 注入 AgentDataService

    this.container = null;
    this.activeSection = "dashboard";
    this.selectedSubCategory = null; // 记录选中的子分类
    this.lastAgentRoute = null; // 记录上次访问的智能体路由
    this.agentClickCount = 0; // 记录智能体栏的点击次数

    // 用户管理
    this.userManager =
      options.userManager ||
      new UserManager({
        eventBus: this.eventBus,
        stateManager: this.stateManager,
      });
    this.loginModal = null;
    this.userProfileModal = null;
    this.settingsModal = null;

    // 新增：缓存和API服务
    this.dataCacheService = new DataCacheService();
    this.appConfigApiService = new AppConfigApiService();

    // 更新状态
    this.configUpdateAvailable = false;
    this.newConfigVersion = null;
  }

  /**
   * 获取Lucide图标SVG
   */
  getIcon(iconName, attributes = {}) {
    return IconUtils.getIcon(iconName, attributes);
  }

  /**
   * 加载侧边栏配置
   */
  async loadSidebarConfig() {
    try {
      // 1. 检查缓存
      if (this.dataCacheService.hasSidebarCache()) {
        // 2. 使用缓存
        const cachedConfig = this.dataCacheService.getSidebarConfig();
        if (cachedConfig && cachedConfig.data) {
          this.sidebarConfig = cachedConfig.data;
          console.log(
            "✅ [Sidebar] 使用缓存的侧边栏配置，版本:",
            cachedConfig.version
          );

          // 3. 后台检查更新(不阻塞)
          this.checkConfigUpdate().catch((err) => {
            console.warn("⚠️ 后台配置更新检查失败:", err);
          });
          return; // 有缓存就直接返回
        }
      }

      // 4. 无缓存或缓存无效，请求API(带超时)
      console.log("📡 [Sidebar] 无缓存，从API获取侧边栏配置");
      await Promise.race([
        this.fetchAndCacheConfig(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("配置加载超时")), 3000)
        ),
      ]);
    } catch (error) {
      console.error("❌ [Sidebar] 加载侧边栏配置失败:", error);
      // 使用默认配置作为降级方案
      this.sidebarConfig = this.getDefaultConfig();
      console.log("⚠️ [Sidebar] 使用默认配置");
    }
  }

  /**
   * 获取并缓存配置
   */
  async fetchAndCacheConfig() {
    try {
      // 请求API（无需认证）
      console.log("📡 [Sidebar] 从API获取侧边栏配置...");
      const response = await this.appConfigApiService.fetchSidebarConfig();

      if (response && response.success && response.data) {
        // 保存到缓存
        if (response.data.version) {
          this.dataCacheService.saveSidebarConfig(
            response.data,
            response.data.version
          );
          console.log(
            "✅ [Sidebar] 侧边栏配置已缓存，版本:",
            response.data.version
          );
        }

        // 更新内存数据
        this.sidebarConfig = response.data;
      } else {
        throw new Error("API响应格式错误");
      }
    } catch (error) {
      console.error("❌ [Sidebar] 获取侧边栏配置失败:", error);

      // 降级处理
      if (this.dataCacheService.hasSidebarCache()) {
        const cachedConfig = this.dataCacheService.getSidebarConfig();
        if (cachedConfig && cachedConfig.data) {
          this.sidebarConfig = cachedConfig.data;
          console.log("⚠️ [Sidebar] API失败，使用缓存配置");
          return;
        }
      }

      // 使用默认配置
      this.sidebarConfig = this.getDefaultConfig();
      console.log("⚠️ [Sidebar] API失败且无缓存，使用默认配置");
    }
  }

  /**
   * 检查配置更新（后台静默）
   * 通过时间间隔控制更新检查频率
   */
  async checkConfigUpdate() {
    try {
      console.log("🔍 [Sidebar] 后台检查配置更新...");

      // 检查上次检查时间，避免频繁请求
      const metadata = this.dataCacheService.getCacheMetadata(
        this.dataCacheService.CACHE_KEYS.SIDEBAR_CONFIG
      );
      const lastChecked = metadata?.last_checked;
      const CHECK_INTERVAL = 10 * 60 * 1000; // 10分钟检查间隔

      if (lastChecked) {
        const timeSinceLastCheck = Date.now() - new Date(lastChecked).getTime();
        if (timeSinceLastCheck < CHECK_INTERVAL) {
          console.log("⏰ [Sidebar] 距离上次检查时间不足10分钟，跳过检查");
          return;
        }
      }

      // 请求最新配置（无需认证）
      const response = await this.appConfigApiService.fetchSidebarConfig();

      if (response && response.success && response.data) {
        // 获取本地版本
        const localVersion = this.dataCacheService.getSidebarConfigVersion();
        const remoteVersion = response.data.version;

        console.log("🔍 [Sidebar] 配置版本对比:", {
          local: localVersion,
          remote: remoteVersion,
        });

        // 简单的版本号字符串对比（不同即有更新）
        if (localVersion !== remoteVersion) {
          console.log("🆕 [Sidebar] 发现新配置版本:", remoteVersion);

          // 保存新配置到缓存
          this.dataCacheService.saveSidebarConfig(response.data, remoteVersion);

          // 标记更新可用
          this.dataCacheService.markUpdateAvailable(
            "sidebar_config",
            remoteVersion
          );
          this.configUpdateAvailable = true;
          this.newConfigVersion = remoteVersion;

          // 发送更新通知
          this.notifyConfigUpdate(remoteVersion);
        } else {
          console.log("✅ [Sidebar] 配置已是最新版本");
          // 更新检查时间
          this.dataCacheService.updateCacheMetadata(
            this.dataCacheService.CACHE_KEYS.SIDEBAR_CONFIG,
            { last_checked: new Date().toISOString() }
          );
        }
      }
    } catch (error) {
      console.warn("⚠️ [Sidebar] 配置静默更新检查失败:", error);
    }
  }

  /**
   * 获取认证Token
   */
  getAuthToken() {
    try {
      // 从UserManager获取
      if (
        this.userManager &&
        typeof this.userManager.getAccessToken === "function"
      ) {
        return this.userManager.getAccessToken();
      }

      // 尝试从localStorage获取
      const token = localStorage.getItem("Questech_access_token");
      return token;
    } catch (error) {
      console.warn("⚠️ [Sidebar] 获取Token失败:", error);
      return null;
    }
  }

  /**
   * 发送配置更新通知
   */
  notifyConfigUpdate(newVersion) {
    console.log("📢 [Sidebar] 发送配置更新通知，新版本:", newVersion);

    // 发送事件通知（不构建 message，由 App.js 统一处理显示格式）
    if (this.eventBus) {
      this.eventBus.emit("data:update-available", {
        type: "sidebar_config",
        version: newVersion,
        action: "reload",
      });
    }
  }

  /**
   * 获取默认配置
   */
  getDefaultConfig() {
    return {
      version: "1.0.0",
      categories: [
        {
          id: "dashboard",
          name: "小纸条",
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-rss-icon lucide-rss"><path d="M4 11a9 9 0 0 1 9 9"/><path d="M4 4a16 16 0 0 1 16 16"/><circle cx="5" cy="19" r="1"/></svg>',
          route: "/dashboard",
          type: "page",
          order: 1,
        },
        {
          id: "chat",
          name: "聊天",
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-message-circle-icon lucide-message-circle"><path d="M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719"/></svg>',
          route: "/chat",
          type: "page",
          order: 2,
        },
        {
          id: "power_agent",
          name: "智能体",
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bot-icon lucide-bot"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
          route: "/agents",
          type: "group",
          order: 3,
          subcategories: [
            {
              id: "power_agent_tools",
              name: "工具类",
              icon: "wrench",
              route: "/agents?category=power_agent_tools",
              count: 0,
            },
            {
              id: "power_agent_data",
              name: "数据处理",
              icon: "bar-chart-3",
              route: "/agents?category=power_agent_data",
              count: 0,
            },
            {
              id: "power_agent_image",
              name: "图像处理",
              icon: "image",
              route: "/agents?category=power_agent_image",
              count: 0,
            },
            {
              id: "power_agent_utility",
              name: "实用工具",
              icon: "zap",
              route: "/agents?category=power_agent_utility",
              count: 0,
            },
            {
              id: "power_agent_document",
              name: "文档处理",
              icon: "file-text",
              route: "/agents?category=power_agent_document",
              count: 0,
            },
          ],
        },
      ],
    };
  }

  /**
   * 初始化
   */
  async initialize() {
    // 加载侧边栏配置
    await this.loadSidebarConfig();

    // 渲染侧边栏
    await this.render();

    // 设置事件监听
    this.setupEventListeners();

    // 等待用户管理器初始化完成
    await this.userManager.ready();

    // 加载并渲染固定智能体
    await this.loadPinnedAgents();

    // 设置拖拽排序
    this.setupDragAndDrop();

    // 更新分类数量
    await this.updateCategoryCounts();

    console.log("✅ Sidebar 初始化完成");
  }

  /**
   * 渲染侧边栏
   */
  async render(container) {
    this.container = container;

    // 🔥 关键改进: 先显示骨架屏,立即渲染基础UI
    this.renderSkeleton();

    // 然后异步加载配置和内容(不阻塞UI)
    this.loadAndRenderContent().catch((error) => {
      console.error("❌ 侧边栏内容加载失败:", error);
      // 即使加载失败,也使用默认配置渲染
      this.renderWithDefaultConfig();
    });

    console.log("✅ Sidebar 基础框架已渲染");
  }

  /**
   * 渲染骨架屏 - 立即显示基础结构
   */
  renderSkeleton() {
    // 🔥 第一步: 先显示骨架屏（无论是否有缓存）
    console.log("🎨 [Sidebar] 显示骨架屏");
    this.container.innerHTML = `
      <!-- 顶部组 -->
      <div class="sidebar-group sidebar-header-group">
        <div class="sidebar-logo">${appConfig.name}</div>
        <button class="sidebar-toggle-floating" id="sidebar-toggle" aria-label="切换侧边栏">${this.getIcon("menu")}</button>
      </div>

      <!-- 中间导航组 -->
      <div class="sidebar-group sidebar-nav-group">
        <nav class="sidebar-nav">
          <div class="nav-section">
            <!-- 骨架屏占位 -->
            <div class="skeleton-nav-item"></div>
            <div class="skeleton-nav-item"></div>
            <div class="skeleton-nav-item"></div>
          </div>
          <div class="nav-pinned-section" id="pinned-agents-container"></div>
        </nav>
      </div>

      <!-- 底部组 -->
      <div class="sidebar-group sidebar-footer-group">
        <div class="user-info" id="user-info">
          <div class="user-avatar" id="user-avatar">${this.getIcon("circle-user-round")}</div>
          <div class="user-name" id="user-name">未登录</div>
        </div>
        <button class="settings-btn" data-section="settings" title="设置">
          <span class="nav-icon">${this.getIcon("settings")}</span>
        </button>
      </div>
    `;

    // 立即绑定基础事件(切换按钮等)
    this.setupBasicEventListeners();
  }

  /**
   * 异步加载并渲染完整内容
   */
  async loadAndRenderContent() {
    try {
      // 🔥 第二步: 立即检查缓存并渲染（同步，快速替换骨架屏）
      const hasCache = this.dataCacheService.hasSidebarCache();
      if (hasCache) {
        const cachedConfig = this.dataCacheService.getSidebarConfig();
        if (cachedConfig && cachedConfig.data) {
          this.sidebarConfig = cachedConfig.data;
          console.log(
            "✅ [Sidebar] 使用缓存立即替换骨架屏，版本:",
            cachedConfig.version
          );

          // 立即渲染缓存内容
          this.container.innerHTML = this.generateSidebarHTML();
          this.setupEventListeners();
          this.setupRouteListener();
          this.setupTooltips();

          // 🔥 第三步: 后台异步请求最新数据（不阻塞UI）
          console.log("🔄 [Sidebar] 后台异步请求最新配置...");
          this.fetchAndCacheConfig()
            .then(() => {
              console.log("✅ [Sidebar] 后台配置更新成功");
              // 如果获取到新配置，静默更新（可选：是否要自动刷新UI）
              const newConfig = this.dataCacheService.getSidebarConfig();
              if (newConfig && newConfig.version !== cachedConfig.version) {
                console.log("🆕 [Sidebar] 发现新版本配置，可考虑更新UI");
                // 可以选择不自动更新，让用户刷新后看到新配置
              }
            })
            .catch((err) => {
              console.warn("⚠️ [Sidebar] 后台配置请求失败，继续使用缓存:", err);
            });

          // 后台任务（不阻塞）
          this.initializeUserState().catch((err) =>
            console.warn("用户状态初始化失败:", err)
          );
          this.loadPinnedAgents().catch((err) =>
            console.warn("固定智能体加载失败:", err)
          );
          this.setupDragAndDrop();
          this.updateCategoryCounts().catch((err) =>
            console.warn("分类数量更新失败:", err)
          );

          return;
        }
      }

      // 🔥 无缓存: 必须等待API请求（带超时）
      console.log("📡 [Sidebar] 无缓存，请求API配置...");
      await Promise.race([
        this.loadSidebarConfig(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("配置加载超时")), 3000)
        ),
      ]);

      // 渲染完整HTML
      this.container.innerHTML = this.generateSidebarHTML();
      this.setupEventListeners();
      this.setupRouteListener();
      this.setupTooltips();

      // 后台任务（不阻塞）
      this.initializeUserState().catch((err) =>
        console.warn("用户状态初始化失败:", err)
      );
      this.loadPinnedAgents().catch((err) =>
        console.warn("固定智能体加载失败:", err)
      );
      this.setupDragAndDrop();
      this.updateCategoryCounts().catch((err) =>
        console.warn("分类数量更新失败:", err)
      );

      console.log("✅ Sidebar 完整内容渲染完成");
    } catch (error) {
      console.error("❌ Sidebar 内容加载失败:", error);
      throw error;
    }
  }

  /**
   * 使用默认配置渲染(降级方案)
   */
  renderWithDefaultConfig() {
    this.sidebarConfig = this.getDefaultConfig();
    this.container.innerHTML = this.generateSidebarHTML();
    this.setupEventListeners();
    this.setupRouteListener();
    this.setupTooltips();
    console.log("⚠️ 使用默认配置渲染侧边栏");
  }

  /**
   * 设置基础事件监听(只包含必要的交互)
   */
  setupBasicEventListeners() {
    // 侧边栏切换按钮
    const toggleBtn = this.container.querySelector("#sidebar-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.eventBus.emit("layout:toggle-sidebar");
      });
    }

    // 设置按钮
    const settingsBtn = this.container.querySelector(".settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleSettingsClick();
      });
    }

    // 用户信息点击
    const userInfo = this.container.querySelector("#user-info");
    if (userInfo) {
      userInfo.addEventListener("click", () => this.handleUserInfoClick());
    }
  }

  /**
   * 生成侧边栏HTML结构
   */
  generateSidebarHTML() {
    const categories = this.sidebarConfig?.categories || [];

    return `
      <!-- 顶部组 -->
      <div class="sidebar-group sidebar-header-group">
        <div class="sidebar-logo">
          ${appConfig.name}
        </div>
          <button class="sidebar-toggle-floating" id="sidebar-toggle" aria-label="切换侧边栏">${this.getIcon("menu")}</button>
      </div>

      <!-- 中间导航组 -->
      <div class="sidebar-group sidebar-nav-group">
        <nav class="sidebar-nav">
          <div class="nav-section">
            ${this.generateNavHTML(categories)}
          </div>
          <div class="nav-pinned-section" id="pinned-agents-container">
            <!-- 固定智能体将在这里渲染 -->
          </div>
        </nav>
      </div>

      <!-- 底部组 -->
      <div class="sidebar-group sidebar-footer-group">
        <div class="user-info" id="user-info">
          <div class="user-avatar" id="user-avatar">${this.getIcon("circle-user-round")}</div>
          <div class="user-name" id="user-name">未登录</div>
        </div>
        <button class="settings-btn" data-section="settings" title="设置">
          <span class="nav-icon">${this.getIcon("settings")}</span>
        </button>
      </div>
    `;
  }

  /**
   * 生成导航HTML
   */
  generateNavHTML(categories) {
    return categories
      .map((category) => {
        if (category.type === "group") {
          return this.generateGroupHTML(category);
        } else {
          return this.generatePageHTML(category);
        }
      })
      .join("");
  }

  /**
   * 生成页面类型导航HTML
   */
  generatePageHTML(category) {
    const isActive = this.activeSection === category.id;
    const iconHTML = category.icon
      ? `<span class="nav-icon">${this.renderIcon(category.icon)}</span>`
      : "";
    return `
      <button class="nav-item ${isActive ? "active" : ""}"
              data-route="${category.route}"
              data-section="${category.id}">
        ${iconHTML}
        <span class="nav-text">${category.name}</span>
      </button>
    `;
  }

  /**
   * 生成分组类型导航 HTML
   */
  generateGroupHTML(category) {
    const isActive = this.activeSection === category.id;
    const hasSubcategories =
      category.subcategories && category.subcategories.length > 0;
    const isExpanded = false; // 默认不展开子分类

    // 生成子分类
    const subcategoriesHTML = hasSubcategories
      ? category.subcategories
          .map(
            (sub) => `
      <button class="nav-subitem"
              data-route="${sub.route}"
              data-category="${sub.id}">
        <span class="nav-icon">${this.renderIcon(sub.icon)}</span>
        <span class="nav-text">${sub.name}</span>
        <span class="nav-count" data-category-count="${sub.id}">${sub.count || 0}</span>
      </button>
    `
          )
          .join("")
      : "";

    // 只有存在子分类时才显示箭头
    const arrowHTML = hasSubcategories
      ? `
      <span class="nav-arrow ${isExpanded ? "expanded" : ""}">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6 4l4 4-4 4V4z"/>
        </svg>
      </span>
    `
      : "";

    return `
      <div class="nav-group">
        <button class="nav-item nav-group-toggle ${isActive ? "active" : ""}"
                data-route="${category.route}"
                data-section="${category.id}"
                data-has-subcategories="${hasSubcategories}"
                id="${category.id}-toggle">
          <span class="nav-icon">${this.renderIcon(category.icon)}</span>
          <span class="nav-text">${category.name}</span>
          ${arrowHTML}
        </button>

        <!-- 子分类 -->
        <div class="nav-submenu" id="${category.id}-submenu" style="display: ${isExpanded ? "block" : "none"};">
          ${subcategoriesHTML}
        </div>
      </div>
    `;
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    // 导航项点击（排除分组切换按钮）
    const navItems = this.container.querySelectorAll(
      ".nav-item:not(.nav-group-toggle)"
    );
    navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const route = e.currentTarget.getAttribute("data-route");
        const section = e.currentTarget.getAttribute("data-section");

        if (route) {
          this.setActiveSection(section);
          this.router.navigate(route);
        }
      });
    });

    // 分组切换按钮点击
    const groupToggles = this.container.querySelectorAll(".nav-group-toggle");
    groupToggles.forEach((toggle) => {
      let clickTimer = null;
      let clickCount = 0;

      // 处理箭头点击
      const arrow = toggle.querySelector(".nav-arrow");
      if (arrow) {
        arrow.addEventListener("click", (e) => {
          e.stopPropagation(); // 阻止冒泡到父元素
          e.preventDefault();

          const section = toggle.getAttribute("data-section");
          this.handleToggleExpansion(section, toggle);
        });
      }

      // 处理主按钮点击
      toggle.addEventListener("click", (e) => {
        e.preventDefault();

        const section = e.currentTarget.getAttribute("data-section");
        const hasSubcategories =
          e.currentTarget.getAttribute("data-has-subcategories") === "true";

        // 智能体栏的特殊处理
        if (section === "power_agent") {
          if (hasSubcategories) {
            // 有子分类时的双击逻辑
            clickCount++;

            // 清除之前的定时器
            if (clickTimer) {
              clearTimeout(clickTimer);
            }

            // 设置新的定时器来区分单击和双击
            clickTimer = setTimeout(() => {
              if (clickCount === 1) {
                // 单击：只选中，不展开/收起
                this.handleAgentSelection(toggle);
              } else if (clickCount >= 2) {
                // 双击：展开/收起
                this.handleToggleExpansion(section, toggle);
              }
              clickCount = 0;
            }, 300); // 300ms 内的点击视为双击
          } else {
            // 没有子分类时直接选中并导航
            this.handleAgentSelection(toggle);
          }
        } else {
          // 其他分组：根据是否有子分类决定行为
          if (hasSubcategories) {
            // 有子分类：展开/收起
            this.handleToggleExpansion(section, toggle);
          } else {
            // 没有子分类：直接选中并导航
            this.setActiveSection(section);
            const route = e.currentTarget.getAttribute("data-route");
            if (route) {
              this.router.navigate(route);
            }
          }
        }
      });
    });

    // 子菜单项点击
    const subItems = this.container.querySelectorAll(".nav-subitem");
    subItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        const route = e.currentTarget.getAttribute("data-route");
        const category = e.currentTarget.getAttribute("data-category");

        // 检查是否点击的是已选中的分类
        if (this.selectedSubCategory === category) {
          // 检查当前是否在智能体相关页面
          const currentRoute = this.router.currentRoute?.fullPath || "";
          const isOnAgentRelatedPage =
            currentRoute === "/agents" ||
            currentRoute.startsWith("/agents?") ||
            currentRoute.startsWith("/agent/");

          // 只有在当前就在智能体相关页面时才允许取消选中
          // 如果是从其他页面（如小纸条、聊天）回来的，不取消选中
          if (isOnAgentRelatedPage) {
            console.log("🔄 在智能体页面内取消选中分类:", category);
            // 取消选中，显示所有智能体
            this.clearSubCategorySelection();
            this.router.navigate("/agents");
          } else {
            console.log(
              "🔄 从其他页面回到智能体分类:",
              category,
              "当前路由:",
              currentRoute
            );
            // 从其他页面回来，重新选中并导航到该分类
            this.setActiveSubItem(e.currentTarget);
            if (route) {
              this.router.navigate(route);
            }
          }
        } else {
          // 选中新分类
          console.log("🔍 选中新分类:", category);
          this.selectedSubCategory = category;
          this.setActiveSubItem(e.currentTarget);

          if (route) {
            // 导航到智能体页面（route已经包含分类参数）
            console.log("🔍 导航到分类:", category, "路由:", route);
            this.router.navigate(route);
          }
        }
      });
    });

    // 侧边栏切换按钮
    const toggleBtn = this.container.querySelector("#sidebar-toggle");
    if (toggleBtn) {
      toggleBtn.addEventListener("click", () => {
        this.eventBus.emit("layout:toggle-sidebar");
      });
    }

    // 设置按钮
    const settingsBtn = this.container.querySelector(".settings-btn");
    if (settingsBtn) {
      settingsBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.handleSettingsClick();
      });
    }

    // 用户信息点击事件
    const userInfo = this.container.querySelector("#user-info");
    const userAvatar = this.container.querySelector("#user-avatar");
    const userName = this.container.querySelector("#user-name");

    if (userInfo) {
      userInfo.addEventListener("click", () => this.handleUserInfoClick());
    }
    if (userAvatar) {
      userAvatar.addEventListener("click", () => this.handleUserInfoClick());
    }
    if (userName) {
      userName.addEventListener("click", () => this.handleUserInfoClick());
    }

    // 监听路由变化
    this.eventBus.on("route:change", (event) => {
      if (event && event.data && event.data.to && event.data.to.path) {
        this.updateActiveNavItem(event.data.to.path);
      }
    });

    // 监听全局设置模态框打开事件
    this.eventBus.on("settings:modal:open", () => {
      this.handleSettingsClick();
    });
  }

  /**
   * 设置活跃区域
   */
  setActiveSection(section) {
    this.activeSection = section;

    // 更新导航项状态
    const navItems = this.container.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      const itemSection = item.getAttribute("data-section");
      if (itemSection === section) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // 更新状态
    this.stateManager.setState("ui.sidebar.activeSection", section);

    // 通知Header更新标题
    this.eventBus.emit("sidebar:section-change", { section });
    console.log("📤 发送侧边栏选择变化事件:", section);
  }

  /**
   * 更新活跃导航项
   */
  updateActiveNavItem(currentPath) {
    const navItems = this.container.querySelectorAll(".nav-item");

    navItems.forEach((item) => {
      const route = item.getAttribute("data-route");

      if (
        route === currentPath ||
        (currentPath.startsWith(route) && route !== "/")
      ) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });
  }

  /**
   * 切换智能体子菜单
   */
  toggleAgentsSubmenu() {
    const submenu = this.container.querySelector("#agents-submenu");
    const arrow = this.container.querySelector("#agents-toggle .nav-arrow");

    if (submenu && arrow) {
      const isExpanded = submenu.style.display !== "none";

      if (isExpanded) {
        submenu.style.display = "none";
        arrow.classList.add("expanded");
      } else {
        arrow.classList.remove("expanded");
        submenu.style.display = "block";
      }
    }
  }

  /**
   * 设置活跃的子菜单项
   */
  setActiveSubItem(activeItem) {
    // 移除所有子菜单项的活跃状态
    const subItems = this.container.querySelectorAll(".nav-subitem");
    subItems.forEach((item) => {
      item.classList.remove("active");
    });

    // 设置当前项为活跃状态
    activeItem.classList.add("active");

    // 确保智能体子菜单是展开的
    const submenu = this.container.querySelector("#agents-submenu");
    const arrow = this.container.querySelector("#agents-toggle .nav-arrow");
    if (submenu && arrow) {
      submenu.style.display = "block";
    }
  }

  /**
   * 清除所有导航项的选中状态
   */
  clearAllActiveStates() {
    const allNavItems = this.container.querySelectorAll(
      ".nav-item, .nav-subitem"
    );
    allNavItems.forEach((item) => {
      item.classList.remove("active");
    });
  }

  /**
   * 清除子分类选中状态
   */
  clearSubCategorySelection() {
    this.selectedSubCategory = null;

    // 移除所有子菜单项的活跃状态
    const subItems = this.container.querySelectorAll(".nav-subitem");
    subItems.forEach((item) => {
      item.classList.remove("active");
    });
  }

  /**
   * 切换侧边栏折叠状态
   */
  toggleCollapse() {
    if (this.container) {
      this.container.classList.toggle("collapsed");
    }
  }

  /**
   * 更新分类数量显示
   */
  async updateCategoryCounts() {
    try {
      // 从AgentDataService获取实际数据
      const { agentDataService } = await import(
        "../../services/agent/AgentDataService.js"
      );
      await agentDataService.initialize();

      // 计算每个分类的数量
      const categoryCounts = {};

      // 遍历配置中的子分类
      const categories = this.sidebarConfig?.categories || [];
      const agentGroup = categories.find((cat) => cat.type === "group");

      if (agentGroup && agentGroup.subcategories) {
        for (const subcat of agentGroup.subcategories) {
          const categoryData = await agentDataService.getAgentsByCategory(
            subcat.id
          );
          categoryCounts[subcat.id] = categoryData.agents.length;
        }
      }

      // 更新显示
      Object.entries(categoryCounts).forEach(([categoryId, count]) => {
        const countElement = this.container.querySelector(
          `[data-category-count="${categoryId}"]`
        );
        if (countElement) {
          countElement.textContent = count;
        }
      });

      console.log("✅ 分类数量更新完成");
    } catch (error) {
      console.error("❌ 更新分类数量失败:", error);
      // 使用默认数量
      const defaultCounts = {
        power_agent_tools: 2,
        power_agent_data: 2,
        power_agent_image: 2,
        power_agent_network: 2,
        power_agent_utility: 2,
      };

      Object.entries(defaultCounts).forEach(([categoryId, count]) => {
        const countElement = this.container.querySelector(
          `[data-category-count="${categoryId}"]`
        );
        if (countElement) {
          countElement.textContent = count;
        }
      });
    }
  }

  /**
   * 设置路由监听
   */
  setupRouteListener() {
    if (this.eventBus) {
      // 监听路由变化
      this.eventBus.on("route:change", (event) => {
        if (event && event.data && event.data.to) {
          const newRoute = event.data.to.fullPath;
          const oldRoute = event.data.from?.fullPath;

          // 记录智能体详情路由
          if (newRoute && newRoute.startsWith("/agent/")) {
            this.recordAgentRoute(newRoute);
            // 确保智能体项保持选中状态
            this.ensureAgentSectionActive();
          }

          // 如果从智能体相关页面切换到其他页面，重置状态
          if (
            oldRoute &&
            oldRoute.startsWith("/agent") &&
            newRoute &&
            !newRoute.startsWith("/agent")
          ) {
            this.resetAgentState();
          }
        }
      });

      // 监听清除智能体状态记忆的事件
      this.eventBus.on("sidebar:clear-agent-memory", () => {
        this.clearAgentMemory();
      });
    }
  }

  /**
   * 处理智能体选中（单击）
   */
  handleAgentSelection(toggle) {
    // 清除子分类选中状态
    this.clearSubCategorySelection();

    // 清除所有导航项的选中状态
    this.clearAllActiveStates();

    // 设置当前按钮为选中状态
    toggle.classList.add("active");

    // 检查智能体数据更新（异步，不阻塞导航）
    this.checkAgentDataUpdate();

    // 执行智能体栏的导航逻辑（先导航，再发送事件）
    this.handleAgentSectionClick();

    // 在导航后延迟发送事件，让路由变化事件先处理
    setTimeout(() => {
      this.setActiveSection("power_agent");
    }, 50);
  }

  /**
   * 处理展开/收起切换
   */
  handleToggleExpansion(section, toggle) {
    const submenuId = `${section}-submenu`;
    const submenu = this.container.querySelector(`#${submenuId}`);

    // 切换子菜单显示状态
    if (submenu) {
      const isVisible = submenu.style.display !== "none";
      submenu.style.display = isVisible ? "none" : "block";

      // 更新箭头方向
      const arrow = toggle.querySelector(".nav-arrow");
      if (arrow) {
        arrow.classList.toggle("expanded");
      }
    }
  }

  /**
   * 处理智能体栏点击
   */
  handleAgentSectionClick() {
    const currentRoute = this.router.currentRoute?.fullPath;

    // 如果当前就在智能体相关页面，增加点击计数
    if (currentRoute && currentRoute.startsWith("/agent")) {
      this.agentClickCount++;
    } else {
      // 从其他页面切换过来，重置点击计数
      this.agentClickCount = 1;
    }

    console.log(
      "🤖 智能体栏点击，计数:",
      this.agentClickCount,
      "上次路由:",
      this.lastAgentRoute
    );

    // 根据点击次数和状态决定导航目标
    if (
      this.agentClickCount === 1 &&
      this.lastAgentRoute &&
      this.lastAgentRoute !== "/agents"
    ) {
      // 第一次点击且有记忆的详情页路由，返回到详情页
      console.log("🔄 返回到上次访问的智能体详情:", this.lastAgentRoute);
      this.router.navigate(this.lastAgentRoute);
    } else {
      // 第二次点击或没有记忆路由，显示列表
      console.log("📋 显示智能体列表");
      this.agentClickCount = 0; // 重置计数
      this.router.navigate("/agents");
    }
  }

  /**
   * 记录智能体路由
   */
  recordAgentRoute(route) {
    if (route && route.startsWith("/agent/")) {
      this.lastAgentRoute = route;
      console.log("💾 记录智能体路由:", route);
    }
  }

  /**
   * 重置智能体状态
   */
  resetAgentState() {
    this.agentClickCount = 0;
    console.log("🔄 重置智能体状态");
  }

  /**
   * 清除智能体状态记忆（由Header返回按钮触发）
   */
  clearAgentMemory() {
    this.lastAgentRoute = null;
    this.agentClickCount = 0;
    console.log("🧹 已清除智能体状态记忆");
  }

  /**
   * 确保智能体项保持选中状态（在详情页时）
   */
  ensureAgentSectionActive() {
    // 检查当前是否在智能体相关页面
    const currentRoute = this.router.currentRoute?.fullPath || "";
    if (currentRoute.startsWith("/agent")) {
      // 确保智能体项处于选中状态
      const agentToggle = this.container.querySelector("#power_agent-toggle");
      if (agentToggle && !agentToggle.classList.contains("active")) {
        // 清除所有导航项的选中状态
        this.clearAllActiveStates();
        // 设置智能体项为选中状态
        agentToggle.classList.add("active");
        // 更新activeSection状态，但不发送事件避免影响Header
        this.activeSection = "power_agent";
        this.stateManager.setState("ui.sidebar.activeSection", "power_agent");
        console.log("🎯 已确保智能体项保持选中状态");
      }
    }
  }

  /**
   * 处理用户信息点击
   */
  handleUserInfoClick() {
    // 检查登录状态
    if (!this.userManager.isUserAuthenticated()) {
      this.showLoginModal();
    } else {
      // 已登录，显示用户菜单或其他操作
      this.showUserProfileModal();
    }
  }

  /**
   * 显示登录模态框
   */
  showLoginModal() {
    if (!this.loginModal) {
      this.loginModal = new LoginModal({
        userManager: this.userManager,
      });

      // 设置登录成功回调
      this.loginModal.onLoginSuccess = (userInfo) => {
        this.updateUserDisplay();
      };

      // 设置关闭回调
      this.loginModal.onClose = () => {};
    }

    this.loginModal.show();
  }
  /**
   * 显示用户信息模态框
   */
  showUserProfileModal() {
    if (!this.userProfileModal) {
      this.userProfileModal = new UserProfileModal({
        userManager: this.userManager,
      });

      // 设置关闭回调
      this.userProfileModal.onClose = () => {
        // 可以在这里添加关闭后的逻辑
      };

      // 设置退出登录回调
      this.userProfileModal.onLogout = () => {
        this.updateUserDisplay();
        console.log("✅ 用户已退出登录");
      };
    }

    this.userProfileModal.show();
  }

  /**
   * 处理设置按钮点击
   */
  handleSettingsClick() {
    if (!this.settingsModal) {
      this.settingsModal = new SettingsModal({
        eventBus: this.eventBus,
      });

      // 监听设置变化事件
      this.settingsModal.on("themeChange", (theme) => {
        console.log("主题变更:", theme);
        // TODO: 实现主题切换逻辑
      });

      this.settingsModal.on("settingChange", (setting) => {
        console.log("设置变更:", setting);
        // TODO: 保存设置到本地存储或服务器
      });
    }

    this.settingsModal.show();
  }

  /**
   * 更新用户显示
   */
  updateUserDisplay() {
    const userAvatar = this.container.querySelector("#user-avatar");
    const userName = this.container.querySelector("#user-name");

    const currentUser = this.userManager.getCurrentUser();

    if (currentUser) {
      // 更新头像
      if (userAvatar) {
        const avatarName = this.userManager.getAvatar();

        // 清空现有内容
        userAvatar.innerHTML = "";

        // 创建头像图片
        const img = document.createElement("img");
        const avatarPath = this.userManager.getAvatarPath(avatarName);
        img.src = avatarPath;
        img.style.width = "100%";
        img.style.height = "100%";
        img.style.borderRadius = "50%";
        img.alt = avatarName || "user avatar";

        img.onerror = () => {
          // 加载失败时显示默认图标
          console.warn("加载用户头像失败，使用默认图标");
          userAvatar.innerHTML = this.getIcon("circle-user-round");
        };

        userAvatar.appendChild(img);
      }

      // 更新用户名
      if (userName) {
        userName.textContent = this.userManager.getDisplayName();
      }
    } else {
      // 未登录状态
      if (userAvatar) {
        userAvatar.innerHTML = this.getIcon("circle-user-round");
      }
      if (userName) {
        userName.textContent = "未登录";
      }
    }
  }

  /**
   * 初始化用户状态
   */
  async initializeUserState() {
    try {
      // 等待 UserManager 初始化完成
      await this.userManager.ready();

      // 监听用户状态变化
      this.userManager.on("user:updated", () => {
        this.updateUserDisplay();
      });

      this.userManager.on("logout", () => {
        this.updateUserDisplay();
      });

      // 监听头像更新事件
      if (window.eventBus) {
        window.eventBus.on("user:avatar-updated", () => {
          this.updateUserDisplay();
        });
      }

      // 初始更新显示
      this.updateUserDisplay();
    } catch (error) {
      console.error("初始化用户状态失败:", error);
      this.updateUserDisplay();
    }
  }

  /**
   * 卸载组件
   */
  async unmount() {
    // 清理tooltip事件监听器
    this.cleanupTooltips();

    if (this.container) {
      this.container.innerHTML = "";
    }

    if (this.loginModal) {
      this.loginModal.destroy();
      this.loginModal = null;
    }

    if (this.userProfileModal) {
      this.userProfileModal.destroy();
      this.userProfileModal = null;
    }

    console.log("✅ Sidebar 卸载完成");
  }

  /**
   * 清理tooltip相关资源
   */
  cleanupTooltips() {
    if (!this.container) return;

    // 清理所有元素的tooltip事件监听器
    const elementsWithTooltips = this.container.querySelectorAll(
      ".nav-item, .pinned-agent"
    );
    elementsWithTooltips.forEach((element) => {
      if (element._tooltipCleanup) {
        element._tooltipCleanup();
        delete element._tooltipCleanup;
      }
    });

    // 移除可能残留的tooltip元素
    const tooltips = document.querySelectorAll(".sidebar-tooltip");
    tooltips.forEach((tooltip) => {
      if (tooltip.parentNode) {
        tooltip.parentNode.removeChild(tooltip);
      }
    });
  }

  // ==================== 固定智能体功能 ====================

  /**
   * 加载固定智能体
   */
  async loadPinnedAgents() {
    if (!this.agentManager) {
      console.warn("⚠️ AgentManager 未注入，无法加载固定智能体");
      return;
    }

    // 监听固定智能体相关事件
    this.eventBus.on("agent:pinned", () => {
      this.renderPinnedAgents();
    });

    this.eventBus.on("agent:unpinned", () => {
      this.renderPinnedAgents();
    });

    this.eventBus.on("agents:reordered", () => {
      this.renderPinnedAgents();
    });

    // 初始渲染
    this.renderPinnedAgents();
  }

  /**
   * 渲染图标（支持 SVG 字符串、URL、Lucide 名称和 Emoji）
   * @param {string} icon - 图标数据
   *   - SVG 字符串：直接内联渲染，支持 CSS currentColor 继承主题颜色
   *   - URL：渲染为 <img> 标签（兼容旧数据）
   *   - Lucide 图标名称：通过 IconUtils 转换为 SVG（向后兼容）
   *   - Emoji/文字：直接返回
   * @returns {string} 渲染后的 HTML
   */
  renderIcon(icon) {
    if (!icon) {
      return this.getIcon("bot"); // 默认图标
    }

    // 1. 检查是否是 SVG 字符串（直接内联，支持 CSS 颜色继承）
    // 后台配置推荐使用此格式，SVG 中使用 currentColor 可自动适配主题
    if (typeof icon === "string" && icon.trim().startsWith("<svg")) {
      return icon;
    }

    // 2. 检查是否是 URL（兼容旧数据）
    if (
      icon.startsWith("http://") ||
      icon.startsWith("https://") ||
      icon.startsWith("/")
    ) {
      return `<img src="${icon}" alt="icon" class="icon-img" />`;
    }

    // 3. 检查是否是 Lucide 图标名称（向后兼容）
    if (
      typeof icon === "string" &&
      this.getIcon &&
      IconUtils.iconMap &&
      IconUtils.iconMap[icon]
    ) {
      return this.getIcon(icon);
    }

    // 4. 否则当作 Emoji 或文字直接返回
    return icon;
  }

  /**
   * 渲染固定智能体
   */
  async renderPinnedAgents() {
    const container = this.container.querySelector("#pinned-agents-container");
    if (!container || !this.agentManager) {
      return;
    }

    const pinnedAgents = this.agentManager.getPinnedAgents();

    if (pinnedAgents.length === 0) {
      container.innerHTML = "";
      return;
    }

    // 尝试从缓存/API获取最新的icon数据
    const updatedAgents = await Promise.all(
      pinnedAgents.map(async (agent) => {
        if (this.agentDataService) {
          try {
            // 尝试从缓存获取最新数据（不强制API请求，避免性能问题）
            const latestData = await this.agentDataService.getAgentById(
              agent.id,
              false
            );
            if (latestData && latestData.icon) {
              // 使用最新的icon，但保留其他localStorage中的数据（order、pinnedAt等）
              return {
                ...agent,
                icon: latestData.icon,
                name: latestData.name, // 顺便更新名称
              };
            }
          } catch (error) {
            console.warn(
              `无法获取智能体 ${agent.id} 的最新数据，使用缓存数据`,
              error
            );
          }
        }
        // 如果获取失败，返回原始数据
        return agent;
      })
    );

    const pinnedHTML = updatedAgents
      .map((agent) => {
        return `
        <div class="nav-item pinned-agent"
             draggable="true"
             data-agent-id="${agent.id}"
             data-order="${agent.order}"
             data-route="${agent.route}">
          <span class="nav-icon pinned-agent-icon">${this.renderIcon(agent.icon)}</span>
          <span class="nav-text pinned-agent-name">${agent.name}</span>
          <span class="unpin-btn pinned" title="已固定">
            <span class="pin-icon rotated">${this.getIcon("pin")}</span>
          </span>
        </div>
      `;
      })
      .join("");

    container.innerHTML = pinnedHTML;

    // 绑定事件
    this.bindPinnedAgentEvents();

    // 为新渲染的固定智能体添加tooltip
    this.addTooltipToPinnedAgents();
  }

  /**
   * 绑定固定智能体事件
   */
  bindPinnedAgentEvents() {
    const pinnedAgents = this.container.querySelectorAll(".pinned-agent");

    pinnedAgents.forEach((item) => {
      // 点击导航
      item.addEventListener("click", (e) => {
        if (e.target.classList.contains("unpin-btn")) {
          return; // 取消固定按钮单独处理
        }

        const agentId = item.dataset.agentId;
        const route = item.dataset.route;
        this.handlePinnedAgentClick(agentId, route);
      });

      // 取消固定按钮
      const unpinBtn = item.querySelector(".unpin-btn");
      if (unpinBtn) {
        unpinBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const agentId = item.dataset.agentId;
          this.handleUnpinClick(agentId);
        });
      }
    });
  }

  /**
   * 处理固定智能体点击
   */
  handlePinnedAgentClick(agentId, route) {
    // 清除所有选中状态
    this.clearAllActiveStates();

    // 设置当前项为选中
    const item = this.container.querySelector(`[data-agent-id="${agentId}"]`);
    if (item) {
      item.classList.add("active");
    }

    // 导航到智能体详情页
    if (route) {
      this.router.navigate(route);
    }

    console.log("🔗 导航到固定智能体:", agentId);
  }

  /**
   * 处理取消固定点击
   */
  async handleUnpinClick(agentId) {
    if (this.agentManager) {
      await this.agentManager.unpinAgent(agentId);
      console.log("📌 已取消固定智能体:", agentId);
    }
  }

  /**
   * 设置拖拽排序
   */
  setupDragAndDrop() {
    const container = this.container.querySelector("#pinned-agents-container");
    if (!container) {
      return;
    }

    let draggedElement = null;

    // 拖拽开始
    container.addEventListener("dragstart", (e) => {
      if (e.target.classList.contains("pinned-agent")) {
        draggedElement = e.target;
        e.target.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/html", e.target.outerHTML);
      }
    });

    // 拖拽结束
    container.addEventListener("dragend", (e) => {
      if (e.target.classList.contains("pinned-agent")) {
        e.target.classList.remove("dragging");
        draggedElement = null;
        this.handleReorder();
      }
    });

    // 拖拽经过
    container.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";

      const afterElement = this.getDragAfterElement(container, e.clientY);
      if (afterElement == null) {
        container.appendChild(draggedElement);
      } else {
        container.insertBefore(draggedElement, afterElement);
      }
    });
  }

  /**
   * 获取拖拽后的元素位置
   */
  getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".pinned-agent:not(.dragging)"),
    ];

    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;

        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  /**
   * 处理重新排序
   */
  async handleReorder() {
    const container = this.container.querySelector("#pinned-agents-container");
    if (!container || !this.agentManager) {
      return;
    }

    const pinnedItems = container.querySelectorAll(".pinned-agent");
    const newOrder = Array.from(pinnedItems).map(
      (item) => item.dataset.agentId
    );

    await this.agentManager.reorderPinnedAgents(newOrder);
    console.log("🔄 固定智能体已重新排序:", newOrder);
  }

  // ==================== Tooltip功能 ====================

  /**
   * 设置tooltip功能
   */
  setupTooltips() {
    // 为navigation items和pinned agents添加tooltip事件
    this.addTooltipListeners();
  }

  /**
   * 添加tooltip事件监听
   */
  addTooltipListeners() {
    // 导航项tooltip
    const navItems = this.container.querySelectorAll(".nav-item");
    navItems.forEach((item) => {
      this.addTooltipToElement(item, () => {
        const textElement = item.querySelector(".nav-text");
        return textElement ? textElement.textContent : "";
      });
    });

    // 固定智能体tooltip（初始化时可能还没有，在renderPinnedAgents中也会调用）
    this.addTooltipToPinnedAgents();
  }

  /**
   * 为固定智能体添加tooltip
   */
  addTooltipToPinnedAgents() {
    const pinnedAgents = this.container.querySelectorAll(".pinned-agent");
    pinnedAgents.forEach((item) => {
      this.addTooltipToElement(item, () => {
        const textElement = item.querySelector(".nav-text");
        return textElement ? textElement.textContent : "";
      });
    });
  }

  /**
   * 为元素添加tooltip
   */
  addTooltipToElement(element, getTextCallback) {
    let tooltipElement = null;
    let showTimeout = null;
    let hideTimeout = null;
    let isHovering = false;

    const showTooltip = (e) => {
      // 只在侧边栏折叠时显示
      if (
        !this.container.closest(".app-sidebar").classList.contains("collapsed")
      ) {
        return;
      }

      const text = getTextCallback();
      if (!text) return;

      isHovering = true;

      // 清除隐藏定时器
      if (hideTimeout) {
        clearTimeout(hideTimeout);
        hideTimeout = null;
      }

      // 延迟显示
      showTimeout = setTimeout(() => {
        // 再次检查是否仍在hover状态
        if (!isHovering) return;

        // 创建 tooltip 元素
        tooltipElement = document.createElement("div");
        tooltipElement.className = "sidebar-tooltip";
        tooltipElement.textContent = text;
        document.body.appendChild(tooltipElement);

        // 计算位置
        const rect = element.getBoundingClientRect();
        const tooltipRect = tooltipElement.getBoundingClientRect();

        // 在元素右侧显示，垂直居中
        const left = rect.right + 10;
        const top = rect.top + (rect.height - tooltipRect.height) / 2;

        // 确保不超出屏幕边界
        const maxLeft = window.innerWidth - tooltipRect.width - 10;
        const maxTop = window.innerHeight - tooltipRect.height - 10;

        tooltipElement.style.left = Math.min(left, maxLeft) + "px";
        tooltipElement.style.top = Math.max(10, Math.min(top, maxTop)) + "px";

        // 显示动画
        requestAnimationFrame(() => {
          if (tooltipElement && isHovering) {
            tooltipElement.classList.add("show");
          }
        });
      }, 500); // 500ms延迟
    };

    const hideTooltip = () => {
      isHovering = false;

      // 清除显示定时器
      if (showTimeout) {
        clearTimeout(showTimeout);
        showTimeout = null;
      }

      if (tooltipElement) {
        // 立即隐藏动画
        tooltipElement.classList.remove("show");

        // 延迟移除DOM元素
        hideTimeout = setTimeout(() => {
          if (tooltipElement && tooltipElement.parentNode) {
            document.body.removeChild(tooltipElement);
          }
          tooltipElement = null;
          hideTimeout = null;
        }, 200); // 等待动画完成
      }
    };

    // 处理点击事件 - 强制隐藏tooltip
    const handleClick = () => {
      hideTooltip();
    };

    // 处理路由变化 - 强制隐藏tooltip
    const handleRouteChange = () => {
      hideTooltip();
    };

    // 绑定事件
    element.addEventListener("mouseenter", showTooltip);
    element.addEventListener("mouseleave", hideTooltip);
    element.addEventListener("focus", showTooltip);
    element.addEventListener("blur", hideTooltip);
    element.addEventListener("click", handleClick);

    // 监听路由变化
    if (this.eventBus) {
      this.eventBus.on("route:change", handleRouteChange);
    }

    // 保存清理函数以便后续移除
    element._tooltipCleanup = () => {
      if (showTimeout) clearTimeout(showTimeout);
      if (hideTimeout) clearTimeout(hideTimeout);
      if (tooltipElement && tooltipElement.parentNode) {
        document.body.removeChild(tooltipElement);
      }
      element.removeEventListener("mouseenter", showTooltip);
      element.removeEventListener("mouseleave", hideTooltip);
      element.removeEventListener("focus", showTooltip);
      element.removeEventListener("blur", hideTooltip);
      element.removeEventListener("click", handleClick);

      if (this.eventBus) {
        this.eventBus.off("route:change", handleRouteChange);
      }
    };
  }

  /**
   * 检查智能体数据更新（切换到智能体栏时调用）
   * 基于时间间隔，10分钟内不重复请求
   * 所有逻辑由 AgentDataService 处理
   */
  async checkAgentDataUpdate() {
    if (this.agentDataService) {
      await this.agentDataService.checkAndUpdateAgents();
    }
  }
}
