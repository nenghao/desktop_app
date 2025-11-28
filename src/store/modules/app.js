/**
 * 应用状态模块
 */

export const appModule = {
  namespaced: true,
  
  state: {
    initialized: false,
    loading: false,
    error: null,
    theme: 'auto',
    language: 'zh-CN',
    online: navigator.onLine,
    visible: !document.hidden,
    version: '2.0.0',
    buildTime: null,
    lastUpdateCheck: null,
    updateAvailable: false,
    notifications: {
      enabled: true,
      sound: true,
      desktop: true
    },
    performance: {
      startTime: Date.now(),
      loadTime: null,
      memoryUsage: null
    }
  },
  
  getters: {
    isInitialized: state => state.initialized,
    isLoading: state => state.loading,
    hasError: state => !!state.error,
    currentTheme: state => state.theme,
    currentLanguage: state => state.language,
    isOnline: state => state.online,
    isVisible: state => state.visible,
    appVersion: state => state.version,
    uptime: state => Date.now() - state.performance.startTime,
    
    // 复合getter
    appStatus: state => ({
      initialized: state.initialized,
      loading: state.loading,
      online: state.online,
      visible: state.visible,
      error: state.error
    })
  },
  
  mutations: {
    SET_INITIALIZED(state, initialized) {
      state.initialized = initialized;
    },
    
    SET_LOADING(state, loading) {
      state.loading = loading;
    },
    
    SET_ERROR(state, error) {
      state.error = error;
    },
    
    CLEAR_ERROR(state) {
      state.error = null;
    },
    
    SET_THEME(state, theme) {
      state.theme = theme;
    },
    
    SET_LANGUAGE(state, language) {
      state.language = language;
    },
    
    SET_ONLINE_STATUS(state, online) {
      state.online = online;
    },
    
    SET_VISIBILITY(state, visible) {
      state.visible = visible;
    },
    
    SET_BUILD_TIME(state, buildTime) {
      state.buildTime = buildTime;
    },
    
    SET_LAST_UPDATE_CHECK(state, timestamp) {
      state.lastUpdateCheck = timestamp;
    },
    
    SET_UPDATE_AVAILABLE(state, available) {
      state.updateAvailable = available;
    },
    
    UPDATE_NOTIFICATIONS(state, notifications) {
      state.notifications = { ...state.notifications, ...notifications };
    },
    
    SET_LOAD_TIME(state, loadTime) {
      state.performance.loadTime = loadTime;
    },
    
    SET_MEMORY_USAGE(state, memoryUsage) {
      state.performance.memoryUsage = memoryUsage;
    }
  },
  
  actions: {
    async initialize({ commit, dispatch }) {
      try {
        commit('SET_LOADING', true);
        commit('CLEAR_ERROR');
        
        // 初始化应用
        await dispatch('loadConfiguration');
        await dispatch('checkSystemStatus');
        await dispatch('setupEventListeners');
        
        commit('SET_INITIALIZED', true);
        commit('SET_LOAD_TIME', Date.now());
        
        console.log('✅ 应用状态模块初始化完成');
        
      } catch (error) {
        commit('SET_ERROR', error.message);
        console.error('❌ 应用状态模块初始化失败:', error);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },
    
    async loadConfiguration({ commit }) {
      // 加载应用配置
      const config = await this.dispatch('storage/get', 'appConfig', { root: true });
      
      if (config) {
        if (config.theme) commit('SET_THEME', config.theme);
        if (config.language) commit('SET_LANGUAGE', config.language);
        if (config.notifications) commit('UPDATE_NOTIFICATIONS', config.notifications);
      }
    },
    
    async saveConfiguration({ state }) {
      // 保存应用配置
      const config = {
        theme: state.theme,
        language: state.language,
        notifications: state.notifications
      };
      
      await this.dispatch('storage/set', { key: 'appConfig', value: config }, { root: true });
    },
    
    async checkSystemStatus({ commit }) {
      // 检查系统状态
      commit('SET_ONLINE_STATUS', navigator.onLine);
      commit('SET_VISIBILITY', !document.hidden);
      
      // 检查内存使用情况
      if (performance.memory) {
        commit('SET_MEMORY_USAGE', {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
          limit: performance.memory.jsHeapSizeLimit
        });
      }
    },
    
    async setupEventListeners({ commit, dispatch }) {
      // 在线状态监听
      window.addEventListener('online', () => {
        commit('SET_ONLINE_STATUS', true);
      });
      
      window.addEventListener('offline', () => {
        commit('SET_ONLINE_STATUS', false);
      });
      
      // 页面可见性监听
      document.addEventListener('visibilitychange', () => {
        commit('SET_VISIBILITY', !document.hidden);
      });
      
      // 定期更新内存使用情况
      setInterval(() => {
        dispatch('checkSystemStatus');
      }, 30000); // 30秒更新一次
    },
    
    async changeTheme({ commit, dispatch }, theme) {
      commit('SET_THEME', theme);
      await dispatch('saveConfiguration');
      
      // 通知主题管理器
      this.dispatch('theme/switchTheme', theme, { root: true });
    },
    
    async changeLanguage({ commit, dispatch }, language) {
      commit('SET_LANGUAGE', language);
      await dispatch('saveConfiguration');
      
      // 通知国际化系统
      this.dispatch('i18n/setLanguage', language, { root: true });
    },
    
    async updateNotifications({ commit, dispatch }, notifications) {
      commit('UPDATE_NOTIFICATIONS', notifications);
      await dispatch('saveConfiguration');
    },
    
    async checkForUpdates({ commit }) {
      try {
        commit('SET_LAST_UPDATE_CHECK', Date.now());
        
        // 检查更新逻辑
        const updateAvailable = await this.dispatch('api/checkUpdates', null, { root: true });
        commit('SET_UPDATE_AVAILABLE', updateAvailable);
        
        return updateAvailable;
      } catch (error) {
        console.error('检查更新失败:', error);
        return false;
      }
    },
    
    async reportError({ commit }, error) {
      commit('SET_ERROR', error.message);
      
      // 上报错误
      this.dispatch('analytics/reportError', error, { root: true });
    },
    
    clearError({ commit }) {
      commit('CLEAR_ERROR');
    }
  }
};
