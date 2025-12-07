/**
 * 聊天状态模块
 */

export const chatModule = {
  namespaced: true,
  
  state: {
    // 对话管理
    conversations: [],
    currentConversation: null,
    
    // 消息管理
    messages: [],
    messageHistory: new Map(),
    
    // 输入状态
    inputText: '',
    isTyping: false,
    typingUsers: [],
    
    // AI状态
    aiThinking: false,
    aiModel: 'gpt-3.5-turbo',
    aiSettings: {
      temperature: 0.7,
      maxTokens: 2048,
      systemPrompt: '你是Questech的AI助手，请帮助用户使用各种智能体功能。'
    },
    
    // 连接状态
    connected: false,
    connecting: false,
    error: null,
    
    // 统计信息
    stats: {
      totalMessages: 0,
      totalConversations: 0,
      totalTokensUsed: 0,
      lastActivity: null
    }
  },
  
  getters: {
    // 基础getter
    allConversations: state => state.conversations,
    currentConversation: state => state.currentConversation,
    currentMessages: state => state.messages,
    inputText: state => state.inputText,
    
    // 状态getter
    isTyping: state => state.isTyping,
    isAiThinking: state => state.aiThinking,
    isConnected: state => state.connected,
    isConnecting: state => state.connecting,
    hasError: state => !!state.error,
    
    // AI设置getter
    aiModel: state => state.aiModel,
    aiSettings: state => state.aiSettings,
    
    // 统计getter
    chatStats: state => state.stats,
    
    // 复合getter
    getConversationById: state => id => {
      return state.conversations.find(conv => conv.id === id);
    },
    
    getMessagesByConversation: state => conversationId => {
      return state.messageHistory.get(conversationId) || [];
    },
    
    lastMessage: state => {
      return state.messages.length > 0 ? state.messages[state.messages.length - 1] : null;
    },
    
    unreadCount: state => {
      return state.conversations.reduce((count, conv) => count + (conv.unreadCount || 0), 0);
    }
  },
  
  mutations: {
    // 对话管理
    SET_CONVERSATIONS(state, conversations) {
      state.conversations = conversations;
    },
    
    ADD_CONVERSATION(state, conversation) {
      state.conversations.unshift(conversation);
      state.stats.totalConversations = state.conversations.length;
    },
    
    UPDATE_CONVERSATION(state, { id, data }) {
      const conversation = state.conversations.find(conv => conv.id === id);
      if (conversation) {
        Object.assign(conversation, data);
      }
    },
    
    REMOVE_CONVERSATION(state, conversationId) {
      const index = state.conversations.findIndex(conv => conv.id === conversationId);
      if (index !== -1) {
        state.conversations.splice(index, 1);
        state.messageHistory.delete(conversationId);
        state.stats.totalConversations = state.conversations.length;
      }
    },
    
    SET_CURRENT_CONVERSATION(state, conversationId) {
      state.currentConversation = conversationId;
      
      // 加载对话消息
      if (conversationId && state.messageHistory.has(conversationId)) {
        state.messages = state.messageHistory.get(conversationId);
      } else {
        state.messages = [];
      }
      
      // 标记为已读
      const conversation = state.conversations.find(conv => conv.id === conversationId);
      if (conversation) {
        conversation.unreadCount = 0;
        conversation.lastRead = Date.now();
      }
    },
    
    // 消息管理
    ADD_MESSAGE(state, message) {
      state.messages.push(message);
      
      // 保存到历史记录
      const conversationId = state.currentConversation;
      if (conversationId) {
        if (!state.messageHistory.has(conversationId)) {
          state.messageHistory.set(conversationId, []);
        }
        state.messageHistory.get(conversationId).push(message);
      }
      
      // 更新统计
      state.stats.totalMessages++;
      state.stats.lastActivity = Date.now();
      
      // 更新对话信息
      if (conversationId) {
        const conversation = state.conversations.find(conv => conv.id === conversationId);
        if (conversation) {
          conversation.lastMessage = message;
          conversation.lastActivity = Date.now();
          
          // 如果不是当前对话，增加未读计数
          if (conversationId !== state.currentConversation) {
            conversation.unreadCount = (conversation.unreadCount || 0) + 1;
          }
        }
      }
    },
    
    UPDATE_MESSAGE(state, { messageId, data }) {
      const message = state.messages.find(msg => msg.id === messageId);
      if (message) {
        Object.assign(message, data);
      }
      
      // 同时更新历史记录中的消息
      state.messageHistory.forEach(messages => {
        const historyMessage = messages.find(msg => msg.id === messageId);
        if (historyMessage) {
          Object.assign(historyMessage, data);
        }
      });
    },
    
    REMOVE_MESSAGE(state, messageId) {
      const index = state.messages.findIndex(msg => msg.id === messageId);
      if (index !== -1) {
        state.messages.splice(index, 1);
      }
      
      // 同时从历史记录中删除
      state.messageHistory.forEach(messages => {
        const historyIndex = messages.findIndex(msg => msg.id === messageId);
        if (historyIndex !== -1) {
          messages.splice(historyIndex, 1);
        }
      });
    },
    
    CLEAR_MESSAGES(state) {
      state.messages = [];
      if (state.currentConversation) {
        state.messageHistory.set(state.currentConversation, []);
      }
    },
    
    // 输入状态
    SET_INPUT_TEXT(state, text) {
      state.inputText = text;
    },
    
    SET_TYPING(state, typing) {
      state.isTyping = typing;
    },
    
    ADD_TYPING_USER(state, user) {
      if (!state.typingUsers.includes(user)) {
        state.typingUsers.push(user);
      }
    },
    
    REMOVE_TYPING_USER(state, user) {
      const index = state.typingUsers.indexOf(user);
      if (index !== -1) {
        state.typingUsers.splice(index, 1);
      }
    },
    
    // AI状态
    SET_AI_THINKING(state, thinking) {
      state.aiThinking = thinking;
    },
    
    SET_AI_MODEL(state, model) {
      state.aiModel = model;
    },
    
    UPDATE_AI_SETTINGS(state, settings) {
      state.aiSettings = { ...state.aiSettings, ...settings };
    },
    
    // 连接状态
    SET_CONNECTED(state, connected) {
      state.connected = connected;
    },
    
    SET_CONNECTING(state, connecting) {
      state.connecting = connecting;
    },
    
    SET_ERROR(state, error) {
      state.error = error;
    },
    
    CLEAR_ERROR(state) {
      state.error = null;
    },
    
    // 统计信息
    UPDATE_STATS(state, stats) {
      state.stats = { ...state.stats, ...stats };
    },
    
    ADD_TOKEN_USAGE(state, tokens) {
      state.stats.totalTokensUsed += tokens;
    }
  },
  
  actions: {
    async initialize({ commit, dispatch }) {
      try {
        // 加载对话历史
        await dispatch('loadConversations');
        
        // 连接聊天服务
        await dispatch('connect');
        
        console.log('✅ 聊天状态模块初始化完成');
        
      } catch (error) {
        commit('SET_ERROR', error.message);
        console.error('❌ 聊天状态模块初始化失败:', error);
        throw error;
      }
    },
    
    async loadConversations({ commit }) {
      // 从本地存储加载对话历史
      const conversations = await this.dispatch('storage/get', 'conversations', { root: true }) || [];
      const messageHistory = await this.dispatch('storage/get', 'messageHistory', { root: true }) || {};
      
      commit('SET_CONVERSATIONS', conversations);
      
      // 恢复消息历史
      Object.entries(messageHistory).forEach(([conversationId, messages]) => {
        commit('messageHistory', new Map(Object.entries(messageHistory)));
      });
    },
    
    async saveConversations({ state }) {
      // 保存对话到本地存储
      await this.dispatch('storage/set', { 
        key: 'conversations', 
        value: state.conversations 
      }, { root: true });
      
      // 保存消息历史
      const messageHistoryObj = Object.fromEntries(state.messageHistory);
      await this.dispatch('storage/set', { 
        key: 'messageHistory', 
        value: messageHistoryObj 
      }, { root: true });
    },
    
    async connect({ commit }) {
      commit('SET_CONNECTING', true);
      commit('CLEAR_ERROR');
      
      try {
        // 连接聊天服务
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟连接
        
        commit('SET_CONNECTED', true);
        console.log('✅ 聊天服务连接成功');
        
      } catch (error) {
        commit('SET_ERROR', error.message);
        console.error('❌ 聊天服务连接失败:', error);
        throw error;
      } finally {
        commit('SET_CONNECTING', false);
      }
    },
    
    async disconnect({ commit }) {
      commit('SET_CONNECTED', false);
      console.log('✅ 聊天服务已断开');
    },
    
    async createConversation({ commit, dispatch }, { title, type = 'chat' }) {
      const conversation = {
        id: this.dispatch('utils/generateId', null, { root: true }),
        title: title || '新对话',
        type,
        createdAt: Date.now(),
        lastActivity: Date.now(),
        unreadCount: 0,
        participants: ['user', 'ai']
      };
      
      commit('ADD_CONVERSATION', conversation);
      await dispatch('saveConversations');
      
      return conversation;
    },
    
    async switchConversation({ commit }, conversationId) {
      commit('SET_CURRENT_CONVERSATION', conversationId);
    },
    
    async sendMessage({ commit, dispatch, state }, { content, type = 'text' }) {
      if (!state.connected) {
        throw new Error('聊天服务未连接');
      }
      
      // 创建用户消息
      const userMessage = {
        id: await this.dispatch('utils/generateId', null, { root: true }),
        content,
        type,
        sender: 'user',
        timestamp: Date.now(),
        status: 'sent'
      };
      
      commit('ADD_MESSAGE', userMessage);
      
      // 显示AI思考状态
      commit('SET_AI_THINKING', true);
      
      try {
        // 发送到AI服务
        const aiResponse = await dispatch('sendToAI', { content, type });
        
        // 创建AI回复消息
        const aiMessage = {
          id: await this.dispatch('utils/generateId', null, { root: true }),
          content: aiResponse.content,
          type: 'text',
          sender: 'ai',
          timestamp: Date.now(),
          status: 'received',
          model: state.aiModel,
          tokens: aiResponse.tokens
        };
        
        commit('ADD_MESSAGE', aiMessage);
        commit('ADD_TOKEN_USAGE', aiResponse.tokens || 0);
        
        await dispatch('saveConversations');
        
      } catch (error) {
        // 创建错误消息
        const errorMessage = {
          id: await this.dispatch('utils/generateId', null, { root: true }),
          content: '抱歉，我遇到了一些问题，请稍后再试。',
          type: 'error',
          sender: 'system',
          timestamp: Date.now(),
          status: 'error',
          error: error.message
        };
        
        commit('ADD_MESSAGE', errorMessage);
        console.error('发送消息失败:', error);
        
      } finally {
        commit('SET_AI_THINKING', false);
      }
    },
    
    async sendToAI({ state }, { content, type }) {
      // 模拟AI响应
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      return {
        content: `这是AI的回复：${content}`,
        tokens: Math.floor(Math.random() * 100) + 50
      };
    },
    
    async updateInputText({ commit }, text) {
      commit('SET_INPUT_TEXT', text);
      
      // 触发打字状态
      commit('SET_TYPING', text.length > 0);
    },
    
    async clearInput({ commit }) {
      commit('SET_INPUT_TEXT', '');
      commit('SET_TYPING', false);
    }
  }
};
