/**
 * 聊天配置管理
 */

export class ChatConfig {
  constructor() {
    this.config = {
      // 基础参数
      store: true,
      stream: true,
      deep_search: true,
      
      // 生成参数
      temperature: 0.7,        // 0.0-2.0
      top_p: 1.0,             // 0.0-1.0
      max_completion_tokens: 2048, // 1-4096
      
      // 历史消息数量
      historyCount: 3          // 1-6
    };
    
    this.ranges = {
      temperature: { min: 0.0, max: 2.0, step: 0.01 },
      top_p: { min: 0.0, max: 1.0, step: 0.01 },
      max_completion_tokens: { min: 1, max: 4096, step: 1 },
      historyCount: { min: 1, max: 6, step: 1 }
    };
  }

  getConfig() {
    return { ...this.config };
  }

  updateConfig(key, value) {
    if (key in this.config) {
      this.config[key] = value;
    }
  }

  getRange(key) {
    return this.ranges[key] || null;
  }

  resetToDefaults() {
    this.config = {
      store: true,
      stream: true,
      deep_search: true,
      temperature: 0.7,
      top_p: 1.0,
      max_completion_tokens: 2048,
      historyCount: 3
    };
  }

  validateConfig() {
    for (const [key, range] of Object.entries(this.ranges)) {
      const value = this.config[key];
      if (value < range.min || value > range.max) {
        this.config[key] = Math.max(range.min, Math.min(range.max, value));
      }
    }
  }
}

export const chatConfig = new ChatConfig();