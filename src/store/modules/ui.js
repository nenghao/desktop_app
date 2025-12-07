/**
 * UI状态模块
 */

export const uiModule = {
  namespaced: true,
  
  state: {
    // 布局状态
    sidebar: {
      collapsed: false,
      width: 280,
      activeSection: 'agents',
      pinned: true
    },
    
    // 模态框状态
    modal: {
      visible: false,
      type: null,
      title: '',
      content: null,
      data: null,
      closable: true,
      maskClosable: true
    },
    
    // 抽屉状态
    drawer: {
      visible: false,
      placement: 'right',
      title: '',
      content: null,
      width: 400
    },
    
    // 通知状态
    notifications: [],
    maxNotifications: 5,
    
    // 加载状态
    loading: {
      global: false,
      components: new Map()
    },
    
    // 页面状态
    page: {
      title: 'Questech',
      breadcrumb: [],
      actions: [],
      fullscreen: false
    },
    
    // 主题状态
    theme: {
      current: 'auto',
      customThemes: [],
      colorPrimary: '#1890ff'
    },
    
    // 响应式状态
    responsive: {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight
    },
    
    // 键盘快捷键状态
    shortcuts: {
      enabled: true,
      bindings: new Map()
    }
  },
  
  getters: {
    // 布局getter
    sidebarCollapsed: state => state.sidebar.collapsed,
    sidebarWidth: state => state.sidebar.width,
    sidebarActiveSection: state => state.sidebar.activeSection,
    
    // 模态框getter
    modalVisible: state => state.modal.visible,
    modalType: state => state.modal.type,
    modalData: state => state.modal.data,
    
    // 抽屉getter
    drawerVisible: state => state.drawer.visible,
    drawerContent: state => state.drawer.content,
    
    // 通知getter
    notifications: state => state.notifications,
    notificationCount: state => state.notifications.length,
    
    // 加载getter
    globalLoading: state => state.loading.global,
    componentLoading: state => componentId => state.loading.components.get(componentId) || false,
    
    // 页面getter
    pageTitle: state => state.page.title,
    pageBreadcrumb: state => state.page.breadcrumb,
    pageActions: state => state.page.actions,
    isFullscreen: state => state.page.fullscreen,
    
    // 主题getter
    currentTheme: state => state.theme.current,
    customThemes: state => state.theme.customThemes,
    primaryColor: state => state.theme.colorPrimary,
    
    // 响应式getter
    isMobile: state => state.responsive.isMobile,
    isTablet: state => state.responsive.isTablet,
    isDesktop: state => state.responsive.isDesktop,
    screenSize: state => ({
      width: state.responsive.screenWidth,
      height: state.responsive.screenHeight
    }),
    
    // 快捷键getter
    shortcutsEnabled: state => state.shortcuts.enabled,
    shortcutBindings: state => state.shortcuts.bindings
  },
  
  mutations: {
    // 侧边栏mutations
    TOGGLE_SIDEBAR(state) {
      state.sidebar.collapsed = !state.sidebar.collapsed;
    },
    
    SET_SIDEBAR_COLLAPSED(state, collapsed) {
      state.sidebar.collapsed = collapsed;
    },
    
    SET_SIDEBAR_WIDTH(state, width) {
      state.sidebar.width = width;
    },
    
    SET_SIDEBAR_ACTIVE_SECTION(state, section) {
      state.sidebar.activeSection = section;
    },
    
    SET_SIDEBAR_PINNED(state, pinned) {
      state.sidebar.pinned = pinned;
    },
    
    // 模态框mutations
    SHOW_MODAL(state, { type, title, content, data, options = {} }) {
      state.modal = {
        visible: true,
        type,
        title,
        content,
        data,
        closable: options.closable !== false,
        maskClosable: options.maskClosable !== false
      };
    },
    
    HIDE_MODAL(state) {
      state.modal = {
        visible: false,
        type: null,
        title: '',
        content: null,
        data: null,
        closable: true,
        maskClosable: true
      };
    },
    
    UPDATE_MODAL(state, updates) {
      Object.assign(state.modal, updates);
    },
    
    // 抽屉mutations
    SHOW_DRAWER(state, { title, content, placement = 'right', width = 400 }) {
      state.drawer = {
        visible: true,
        title,
        content,
        placement,
        width
      };
    },
    
    HIDE_DRAWER(state) {
      state.drawer = {
        visible: false,
        placement: 'right',
        title: '',
        content: null,
        width: 400
      };
    },
    
    // 通知mutations
    ADD_NOTIFICATION(state, notification) {
      const id = Date.now() + Math.random();
      const newNotification = {
        id,
        type: 'info',
        duration: 4500,
        closable: true,
        ...notification,
        timestamp: Date.now()
      };
      
      state.notifications.unshift(newNotification);
      
      // 限制通知数量
      if (state.notifications.length > state.maxNotifications) {
        state.notifications = state.notifications.slice(0, state.maxNotifications);
      }
    },
    
    REMOVE_NOTIFICATION(state, notificationId) {
      const index = state.notifications.findIndex(n => n.id === notificationId);
      if (index !== -1) {
        state.notifications.splice(index, 1);
      }
    },
    
    CLEAR_NOTIFICATIONS(state) {
      state.notifications = [];
    },
    
    // 加载mutations
    SET_GLOBAL_LOADING(state, loading) {
      state.loading.global = loading;
    },
    
    SET_COMPONENT_LOADING(state, { componentId, loading }) {
      if (loading) {
        state.loading.components.set(componentId, true);
      } else {
        state.loading.components.delete(componentId);
      }
    },
    
    // 页面mutations
    SET_PAGE_TITLE(state, title) {
      state.page.title = title;
      document.title = title;
    },
    
    SET_PAGE_BREADCRUMB(state, breadcrumb) {
      state.page.breadcrumb = breadcrumb;
    },
    
    SET_PAGE_ACTIONS(state, actions) {
      state.page.actions = actions;
    },
    
    SET_FULLSCREEN(state, fullscreen) {
      state.page.fullscreen = fullscreen;
    },
    
    // 主题mutations
    SET_THEME(state, theme) {
      state.theme.current = theme;
    },
    
    ADD_CUSTOM_THEME(state, theme) {
      const index = state.theme.customThemes.findIndex(t => t.id === theme.id);
      if (index !== -1) {
        state.theme.customThemes[index] = theme;
      } else {
        state.theme.customThemes.push(theme);
      }
    },
    
    REMOVE_CUSTOM_THEME(state, themeId) {
      const index = state.theme.customThemes.findIndex(t => t.id === themeId);
      if (index !== -1) {
        state.theme.customThemes.splice(index, 1);
      }
    },
    
    SET_PRIMARY_COLOR(state, color) {
      state.theme.colorPrimary = color;
    },
    
    // 响应式mutations
    UPDATE_RESPONSIVE(state, { width, height }) {
      state.responsive.screenWidth = width;
      state.responsive.screenHeight = height;
      state.responsive.isMobile = width < 768;
      state.responsive.isTablet = width >= 768 && width < 1024;
      state.responsive.isDesktop = width >= 1024;
    },
    
    // 快捷键mutations
    SET_SHORTCUTS_ENABLED(state, enabled) {
      state.shortcuts.enabled = enabled;
    },
    
    ADD_SHORTCUT_BINDING(state, { key, action }) {
      state.shortcuts.bindings.set(key, action);
    },
    
    REMOVE_SHORTCUT_BINDING(state, key) {
      state.shortcuts.bindings.delete(key);
    }
  },
  
  actions: {
    async initialize({ commit, dispatch }) {
      try {
        // 加载UI配置
        await dispatch('loadUIConfig');
        
        // 设置响应式监听
        dispatch('setupResponsiveListener');
        
        // 设置快捷键监听
        dispatch('setupShortcutListener');
        
        console.log('✅ UI状态模块初始化完成');
        
      } catch (error) {
        console.error('❌ UI状态模块初始化失败:', error);
        throw error;
      }
    },
    
    async loadUIConfig({ commit }) {
      // 从本地存储加载UI配置
      const uiConfig = await this.dispatch('storage/get', 'uiConfig', { root: true }) || {};
      
      if (uiConfig.sidebar) {
        Object.entries(uiConfig.sidebar).forEach(([key, value]) => {
          const mutation = `SET_SIDEBAR_${key.toUpperCase()}`;
          if (commit[mutation]) {
            commit(mutation, value);
          }
        });
      }
      
      if (uiConfig.theme) {
        commit('SET_THEME', uiConfig.theme.current);
        commit('SET_PRIMARY_COLOR', uiConfig.theme.colorPrimary);
      }
    },
    
    async saveUIConfig({ state }) {
      // 保存UI配置到本地存储
      const uiConfig = {
        sidebar: state.sidebar,
        theme: state.theme
      };
      
      await this.dispatch('storage/set', { 
        key: 'uiConfig', 
        value: uiConfig 
      }, { root: true });
    },
    
    setupResponsiveListener({ commit }) {
      const updateSize = () => {
        commit('UPDATE_RESPONSIVE', {
          width: window.innerWidth,
          height: window.innerHeight
        });
      };
      
      window.addEventListener('resize', updateSize);
      updateSize(); // 初始化
    },
    
    setupShortcutListener({ state, dispatch }) {
      const handleKeydown = (event) => {
        if (!state.shortcuts.enabled) return;
        
        const key = [
          event.ctrlKey && 'ctrl',
          event.altKey && 'alt',
          event.shiftKey && 'shift',
          event.metaKey && 'meta',
          event.key.toLowerCase()
        ].filter(Boolean).join('+');
        
        const action = state.shortcuts.bindings.get(key);
        if (action) {
          event.preventDefault();
          dispatch(action, null, { root: true });
        }
      };
      
      document.addEventListener('keydown', handleKeydown);
    },
    
    // 侧边栏操作
    toggleSidebar({ commit, dispatch }) {
      commit('TOGGLE_SIDEBAR');
      dispatch('saveUIConfig');
    },
    
    setSidebarCollapsed({ commit, dispatch }, collapsed) {
      commit('SET_SIDEBAR_COLLAPSED', collapsed);
      dispatch('saveUIConfig');
    },
    
    setSidebarActiveSection({ commit }, section) {
      commit('SET_SIDEBAR_ACTIVE_SECTION', section);
    },
    
    // 模态框操作
    showModal({ commit }, options) {
      commit('SHOW_MODAL', options);
    },
    
    hideModal({ commit }) {
      commit('HIDE_MODAL');
    },
    
    // 抽屉操作
    showDrawer({ commit }, options) {
      commit('SHOW_DRAWER', options);
    },
    
    hideDrawer({ commit }) {
      commit('HIDE_DRAWER');
    },
    
    // 通知操作
    notify({ commit }, notification) {
      commit('ADD_NOTIFICATION', notification);
      
      // 自动移除通知
      if (notification.duration !== 0) {
        setTimeout(() => {
          commit('REMOVE_NOTIFICATION', notification.id);
        }, notification.duration || 4500);
      }
    },
    
    removeNotification({ commit }, notificationId) {
      commit('REMOVE_NOTIFICATION', notificationId);
    },
    
    // 加载状态操作
    setGlobalLoading({ commit }, loading) {
      commit('SET_GLOBAL_LOADING', loading);
    },
    
    setComponentLoading({ commit }, { componentId, loading }) {
      commit('SET_COMPONENT_LOADING', { componentId, loading });
    },
    
    // 页面操作
    setPageTitle({ commit }, title) {
      commit('SET_PAGE_TITLE', title);
    },
    
    setPageBreadcrumb({ commit }, breadcrumb) {
      commit('SET_PAGE_BREADCRUMB', breadcrumb);
    },
    
    toggleFullscreen({ commit, state }) {
      const fullscreen = !state.page.fullscreen;
      commit('SET_FULLSCREEN', fullscreen);
      
      if (fullscreen) {
        document.documentElement.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
    }
  }
};
