/**
 * 配置缓存服务
 * 负责管理应用配置的缓存，包括从配置文件读取默认值和从缓存加载用户设置
 */

import { StorageService } from './storage.js';
import { appConfig } from '../config/app-config.js';
import { chatConfig } from '../config/chat-config.js';

export class ConfigCacheService {
  constructor(storageService) {
    this.storageService = storageService || new StorageService();
    this.settingsCacheKey = 'app_settings';
    this.chatParamsCacheKey = 'chat_parameters';
  }

  /**
   * 初始化设置
   * 从配置文件读取默认值，从缓存加载用户设置（如果有）
   */
  initializeSettings() {
    const defaultChatConfig = chatConfig.getConfig();
    const chatParams = this.loadChatParameters();

    return {
      theme: this.getCachedSetting('theme', appConfig.settings.defaultTheme),
      saveConversation: this.getCachedSetting('saveConversation', defaultChatConfig.store),
      networkMode: this.getCachedSetting('networkMode', defaultChatConfig.deep_search),
      streamResponse: this.getCachedSetting('streamResponse', defaultChatConfig.stream),
      contextMessages: chatParams.historyCount,
      samplingTemperature: chatParams.temperature,
      topK: chatParams.top_p,
      maxTokens: chatParams.max_completion_tokens
    };
  }

  /**
   * 获取缓存的设置
   * @param {string} key 设置键名
   * @param {*} defaultValue 默认值
   */
  getCachedSetting(key, defaultValue = null) {
    try {
      const cachedSettings = this.storageService.get(this.settingsCacheKey, {});
      return key in cachedSettings ? cachedSettings[key] : defaultValue;
    } catch (error) {
      console.error('[ConfigCacheService] 获取缓存设置失败:', error);
      return defaultValue;
    }
  }

  /**
   * 保存设置到缓存
   * @param {string} key 设置键名
   * @param {*} value 设置值
   */
  saveSetting(key, value) {
    try {
      const cachedSettings = this.storageService.get(this.settingsCacheKey, {});
      cachedSettings[key] = value;
      this.storageService.set(this.settingsCacheKey, cachedSettings);
      return true;
    } catch (error) {
      console.error('[ConfigCacheService] 保存设置失败:', error);
      return false;
    }
  }

  /**
   * 加载聊天参数
   * 从缓存加载用户设置，或使用 chat-config.js 的默认值
   */
  loadChatParameters() {
    try {
      const cachedParams = this.storageService.get(this.chatParamsCacheKey, {});
      const defaultParams = chatConfig.getConfig();

      // 合并缓存的参数和默认参数（缓存的参数优先）
      const mergedParams = { ...defaultParams, ...cachedParams };

      // 验证参数是否在有效范围内
      Object.keys(mergedParams).forEach(key => {
        if (key in chatConfig.ranges) {
          const range = chatConfig.ranges[key];
          mergedParams[key] = Math.max(range.min, Math.min(range.max, mergedParams[key]));
        }
      });

      return mergedParams;
    } catch (error) {
      console.error('[ConfigCacheService] 加载聊天参数失败:', error);
      return chatConfig.getConfig();
    }
  }

  /**
   * 保存聊天参数
   * @param {Object} params 聊天参数对象
   */
  saveChatParameters(params) {
    try {
      // 验证参数范围
      const validatedParams = { ...params };
      Object.keys(validatedParams).forEach(key => {
        if (key in chatConfig.ranges) {
          const range = chatConfig.ranges[key];
          validatedParams[key] = Math.max(range.min, Math.min(range.max, validatedParams[key]));
        }
      });

      this.storageService.set(this.chatParamsCacheKey, validatedParams);
      return true;
    } catch (error) {
      console.error('[ConfigCacheService] 保存聊天参数失败:', error);
      return false;
    }
  }

  /**
   * 获取聊天参数范围
   * @param {string} key 参数名
   */
  getParameterRange(key) {
    return chatConfig.getRange(key);
  }

  /**
   * 重置设置到默认值
   */
  resetToDefaults() {
    try {
      this.storageService.remove(this.settingsCacheKey);
      this.storageService.remove(this.chatParamsCacheKey);
      return true;
    } catch (error) {
      console.error('[ConfigCacheService] 重置设置失败:', error);
      return false;
    }
  }

  /**
   * 获取所有支持的主题
   */
  getSupportedThemes() {
    return appConfig.settings.supportedThemes;
  }

  /**
   * 获取默认主题
   */
  getDefaultTheme() {
    return appConfig.settings.defaultTheme;
  }

  /**
   * 获取默认设置（所有默认值都从配置文件读取）
   */
  getDefaultSettings() {
    const defaultChatConfig = chatConfig.getConfig();
    return {
      theme: appConfig.settings.defaultTheme,
      saveConversation: defaultChatConfig.store,
      networkMode: defaultChatConfig.deep_search,
      streamResponse: defaultChatConfig.stream,
      contextMessages: defaultChatConfig.historyCount,
      samplingTemperature: defaultChatConfig.temperature,
      topK: defaultChatConfig.top_p,
      maxTokens: defaultChatConfig.max_completion_tokens
    };
  }

  /**
   * 保存所有设置
   * @param {Object} settings 设置对象
   */
  saveSettings(settings) {
    try {
      // 分离普通设置和聊天参数
      const normalSettings = {};
      const chatParams = {};

      // 普通设置
      if ('theme' in settings) normalSettings.theme = settings.theme;
      if ('saveConversation' in settings) normalSettings.saveConversation = settings.saveConversation;
      if ('networkMode' in settings) normalSettings.networkMode = settings.networkMode;
      if ('streamResponse' in settings) normalSettings.streamResponse = settings.streamResponse;
      if ('chatModel' in settings) normalSettings.chatModel = settings.chatModel;
      if ('chatRole' in settings) normalSettings.chatRole = settings.chatRole;
      if ('thinkingMode' in settings) normalSettings.thinkingMode = settings.thinkingMode;

      // 聊天参数（需要转换字段名）
      if ('contextMessages' in settings) chatParams.historyCount = settings.contextMessages;
      if ('samplingTemperature' in settings) chatParams.temperature = settings.samplingTemperature;
      if ('topK' in settings) chatParams.top_p = settings.topK;
      if ('maxTokens' in settings) chatParams.max_completion_tokens = settings.maxTokens;

      // 保存普通设置
      if (Object.keys(normalSettings).length > 0) {
        const cachedSettings = this.storageService.get(this.settingsCacheKey, {});
        this.storageService.set(this.settingsCacheKey, { ...cachedSettings, ...normalSettings });
      }

      // 保存聊天参数
      if (Object.keys(chatParams).length > 0) {
        this.saveChatParameters(chatParams);
      }

      return true;
    } catch (error) {
      console.error('[ConfigCacheService] 保存设置失败:', error);
      return false;
    }
  }
}

export const configCacheService = new ConfigCacheService();
