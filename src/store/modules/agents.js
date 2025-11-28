/**
 * 智能体状态模块
 */

import { AgentStatus } from '../../types/agent.js';

export const agentsModule = {
  namespaced: true,

  state: {
    // 智能体列表
    installed: new Map(),
    loaded: new Map(),
    running: new Map(),

    // 当前状态
    active: null,
    loading: false,
    error: null,

    // 商店数据
    available: [],
    categories: [],
    searchResults: [],
    searchQuery: '',

    // 下载状态
    downloading: new Map(),
    downloadQueue: [],

    // 统计信息
    stats: {
      totalInstalled: 0,
      totalRunning: 0,
      totalDownloads: 0,
      lastUpdate: null
    }
  },

  getters: {
    // 基础getter
    installedAgents: state => Array.from(state.installed.values()),
    loadedAgents: state => Array.from(state.loaded.values()),
    runningAgents: state => Array.from(state.running.values()),
    activeAgent: state => state.active,

    // 状态getter
    isLoading: state => state.loading,
    hasError: state => !!state.error,

    // 商店getter
    availableAgents: state => state.available,
    agentCategories: state => state.categories,
    searchResults: state => state.searchResults,

    // 下载getter
    downloadingAgents: state => Array.from(state.downloading.values()),
    downloadQueue: state => state.downloadQueue,

    // 统计getter
    agentStats: state => state.stats,

    // 复合getter
    getAgentById: state => id => {
      return state.installed.get(id) ||
        state.loaded.get(id) ||
        state.available.find(agent => agent.id === id);
    },

    getAgentsByCategory: state => category => {
      return state.available.filter(agent => agent.category === category);
    },

    getAgentsByStatus: state => status => {
      switch (status) {
        case AgentStatus.INSTALLED:
          return Array.from(state.installed.values());
        case AgentStatus.LOADED:
          return Array.from(state.loaded.values());
        case AgentStatus.RUNNING:
          return Array.from(state.running.values());
        default:
          return [];
      }
    },

    isAgentInstalled: state => id => state.installed.has(id),
    isAgentLoaded: state => id => state.loaded.has(id),
    isAgentRunning: state => id => state.running.has(id),
    isAgentDownloading: state => id => state.downloading.has(id)
  },

  mutations: {
    // 基础mutations
    SET_LOADING(state, loading) {
      state.loading = loading;
    },

    SET_ERROR(state, error) {
      state.error = error;
    },

    CLEAR_ERROR(state) {
      state.error = null;
    },

    // 智能体管理
    ADD_INSTALLED_AGENT(state, agent) {
      state.installed.set(agent.id, agent);
      state.stats.totalInstalled = state.installed.size;
    },

    REMOVE_INSTALLED_AGENT(state, agentId) {
      state.installed.delete(agentId);
      state.stats.totalInstalled = state.installed.size;
    },

    ADD_LOADED_AGENT(state, agent) {
      state.loaded.set(agent.id, agent);
    },

    REMOVE_LOADED_AGENT(state, agentId) {
      state.loaded.delete(agentId);
    },

    ADD_RUNNING_AGENT(state, agent) {
      state.running.set(agent.id, agent);
      state.stats.totalRunning = state.running.size;
    },

    REMOVE_RUNNING_AGENT(state, agentId) {
      state.running.delete(agentId);
      state.stats.totalRunning = state.running.size;
    },

    SET_ACTIVE_AGENT(state, agentId) {
      state.active = agentId;
    },

    UPDATE_AGENT_STATUS(state, { agentId, status, data }) {
      const collections = [state.installed, state.loaded, state.running];

      collections.forEach(collection => {
        if (collection.has(agentId)) {
          const agent = collection.get(agentId);
          agent.status = status;
          if (data) {
            Object.assign(agent, data);
          }
        }
      });
    },

    // 商店数据
    SET_AVAILABLE_AGENTS(state, agents) {
      state.available = agents;
    },

    SET_CATEGORIES(state, categories) {
      state.categories = categories;
    },

    SET_SEARCH_RESULTS(state, results) {
      state.searchResults = results;
    },

    SET_SEARCH_QUERY(state, query) {
      state.searchQuery = query;
    },

    // 下载管理
    ADD_DOWNLOADING_AGENT(state, { agentId, progress }) {
      state.downloading.set(agentId, {
        id: agentId,
        progress: progress || 0,
        startTime: Date.now()
      });
    },

    UPDATE_DOWNLOAD_PROGRESS(state, { agentId, progress }) {
      if (state.downloading.has(agentId)) {
        state.downloading.get(agentId).progress = progress;
      }
    },

    REMOVE_DOWNLOADING_AGENT(state, agentId) {
      state.downloading.delete(agentId);
    },

    ADD_TO_DOWNLOAD_QUEUE(state, agentId) {
      if (!state.downloadQueue.includes(agentId)) {
        state.downloadQueue.push(agentId);
      }
    },

    REMOVE_FROM_DOWNLOAD_QUEUE(state, agentId) {
      const index = state.downloadQueue.indexOf(agentId);
      if (index !== -1) {
        state.downloadQueue.splice(index, 1);
      }
    },

    // 统计信息
    UPDATE_STATS(state, stats) {
      state.stats = { ...state.stats, ...stats };
    },

    INCREMENT_DOWNLOAD_COUNT(state) {
      state.stats.totalDownloads++;
    },

    SET_LAST_UPDATE(state, timestamp) {
      state.stats.lastUpdate = timestamp;
    }
  },

  actions: {
    async initialize({ commit, dispatch }) {
      try {
        commit('SET_LOADING', true);
        commit('CLEAR_ERROR');

        // 加载已安装的智能体
        await dispatch('loadInstalledAgents');

        // 加载商店数据
        await dispatch('loadStoreData');

        // 更新统计信息
        await dispatch('updateStats');

        console.log('✅ 智能体状态模块初始化完成');

      } catch (error) {
        commit('SET_ERROR', error.message);
        console.error('❌ 智能体状态模块初始化失败:', error);
        throw error;
      } finally {
        commit('SET_LOADING', false);
      }
    },

    async loadInstalledAgents({ commit }) {
      // 从本地存储加载已安装的智能体
      const installedAgents = await this.dispatch('storage/get', 'installedAgents', { root: true }) || [];

      installedAgents.forEach(agent => {
        commit('ADD_INSTALLED_AGENT', agent);
      });
    },

    async saveInstalledAgents({ state }) {
      // 保存已安装的智能体到本地存储
      const installedAgents = Array.from(state.installed.values());
      await this.dispatch('storage/set', {
        key: 'installedAgents',
        value: installedAgents
      }, { root: true });
    },

    async loadStoreData({ commit }) {
      try {
        // 加载可用智能体列表
        const availableAgents = await this.dispatch('api/getAvailableAgents', null, { root: true });
        commit('SET_AVAILABLE_AGENTS', availableAgents);

        // 加载分类信息
        const categories = await this.dispatch('api/getAgentCategories', null, { root: true });
        commit('SET_CATEGORIES', categories);

      } catch (error) {
        console.error('加载商店数据失败:', error);
      }
    },

    async installAgent({ commit, dispatch }, agentId) {
      try {
        commit('ADD_TO_DOWNLOAD_QUEUE', agentId);
        commit('ADD_DOWNLOADING_AGENT', { agentId, progress: 0 });

        // 下载智能体
        const agent = await dispatch('downloadAgent', agentId);

        // 安装智能体
        await dispatch('performInstallation', agent);

        commit('ADD_INSTALLED_AGENT', agent);
        commit('REMOVE_DOWNLOADING_AGENT', agentId);
        commit('REMOVE_FROM_DOWNLOAD_QUEUE', agentId);
        commit('INCREMENT_DOWNLOAD_COUNT');

        await dispatch('saveInstalledAgents');

        console.log(`✅ 智能体安装成功: ${agentId}`);

      } catch (error) {
        commit('REMOVE_DOWNLOADING_AGENT', agentId);
        commit('REMOVE_FROM_DOWNLOAD_QUEUE', agentId);
        console.error(`❌ 智能体安装失败: ${agentId}`, error);
        throw error;
      }
    },

    async downloadAgent({ commit }, agentId) {
      // 模拟下载过程
      return new Promise((resolve, reject) => {
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 20;
          commit('UPDATE_DOWNLOAD_PROGRESS', { agentId, progress: Math.min(progress, 100) });

          if (progress >= 100) {
            clearInterval(interval);
            resolve({
              id: agentId,
              name: `Agent ${agentId}`,
              version: '1.0.0',
              status: AgentStatus.INSTALLED,
              downloadTime: Date.now()
            });
          }
        }, 200);

        // 模拟可能的下载失败
        setTimeout(() => {
          if (progress < 100) {
            clearInterval(interval);
            reject(new Error('下载超时'));
          }
        }, 10000);
      });
    },

    async performInstallation({ commit }, agent) {
      // 执行安装逻辑
      await new Promise(resolve => setTimeout(resolve, 1000));

      agent.installTime = Date.now();
      agent.status = AgentStatus.INSTALLED;
    },

    async uninstallAgent({ commit, dispatch }, agentId) {
      try {
        // 停止智能体（如果正在运行）
        if (this.getters['agents/isAgentRunning'](agentId)) {
          await dispatch('stopAgent', agentId);
        }

        // 卸载智能体
        await dispatch('performUninstallation', agentId);

        commit('REMOVE_INSTALLED_AGENT', agentId);
        commit('REMOVE_LOADED_AGENT', agentId);

        await dispatch('saveInstalledAgents');

        console.log(`✅ 智能体卸载成功: ${agentId}`);

      } catch (error) {
        console.error(`❌ 智能体卸载失败: ${agentId}`, error);
        throw error;
      }
    },

    async performUninstallation({ commit }, agentId) {
      // 执行卸载逻辑
      await new Promise(resolve => setTimeout(resolve, 500));
    },

    async loadAgent({ commit, state }, agentId) {
      if (!state.installed.has(agentId)) {
        throw new Error(`智能体未安装: ${agentId}`);
      }

      if (state.loaded.has(agentId)) {
        return state.loaded.get(agentId);
      }

      try {
        const agent = state.installed.get(agentId);

        // 加载智能体
        const loadedAgent = await this.dispatch('agentManager/loadAgent', agentId, { root: true });

        commit('ADD_LOADED_AGENT', loadedAgent);
        commit('UPDATE_AGENT_STATUS', {
          agentId,
          status: AgentStatus.LOADED,
          data: { loadTime: Date.now() }
        });

        console.log(`✅ 智能体加载成功: ${agentId}`);
        return loadedAgent;

      } catch (error) {
        console.error(`❌ 智能体加载失败: ${agentId}`, error);
        throw error;
      }
    },

    async startAgent({ commit, dispatch }, agentId) {
      try {
        // 确保智能体已加载
        if (!this.getters['agents/isAgentLoaded'](agentId)) {
          await dispatch('loadAgent', agentId);
        }

        // 启动智能体
        const agent = await this.dispatch('agentManager/startAgent', agentId, { root: true });

        commit('ADD_RUNNING_AGENT', agent);
        commit('UPDATE_AGENT_STATUS', {
          agentId,
          status: AgentStatus.RUNNING,
          data: { startTime: Date.now() }
        });

        console.log(`✅ 智能体启动成功: ${agentId}`);

      } catch (error) {
        console.error(`❌ 智能体启动失败: ${agentId}`, error);
        throw error;
      }
    },

    async stopAgent({ commit }, agentId) {
      try {
        // 停止智能体
        await this.dispatch('agentManager/stopAgent', agentId, { root: true });

        commit('REMOVE_RUNNING_AGENT', agentId);
        commit('UPDATE_AGENT_STATUS', {
          agentId,
          status: AgentStatus.STOPPED,
          data: { stopTime: Date.now() }
        });

        console.log(`✅ 智能体停止成功: ${agentId}`);

      } catch (error) {
        console.error(`❌ 智能体停止失败: ${agentId}`, error);
        throw error;
      }
    },

    async activateAgent({ commit }, agentId) {
      commit('SET_ACTIVE_AGENT', agentId);
    },

    async searchAgents({ commit }, query) {
      commit('SET_SEARCH_QUERY', query);

      if (!query.trim()) {
        commit('SET_SEARCH_RESULTS', []);
        return;
      }

      try {
        const results = await this.dispatch('api/searchAgents', query, { root: true });
        commit('SET_SEARCH_RESULTS', results);
      } catch (error) {
        console.error('搜索智能体失败:', error);
        commit('SET_SEARCH_RESULTS', []);
      }
    },

    async updateStats({ commit, state }) {
      const stats = {
        totalInstalled: state.installed.size,
        totalRunning: state.running.size,
        lastUpdate: Date.now()
      };

      commit('UPDATE_STATS', stats);
    }
  }
};
