/**
 * 模型选择器组件
 * 显示可用的AI模型列表供用户选择
 */

import { BaseSelector } from '../common/BaseSelector.js';

export class ModelSelector extends BaseSelector {
  constructor() {
    super({
      className: 'model-selector-popup',
      itemDataAttribute: 'model-id',
      itemType: '模型',
      apiMethod: null, // 将在初始化时设置
      parseApiResponse: (data) => {
        if (data.models) {
          return data.models.map((model) => ({
            id: model.identify,
            name: model.title,
            description: model.description,
            context: model.context,
            maxOutput: model.max_output,
            isSelected: data.recommended && model.identify === data.recommended.identify,
            // 模型能力标识（如果后端没返回，默认都支持）
            supportsThinking: model.supports_thinking !== undefined ? model.supports_thinking : true,
            supportsReasoning: model.supports_reasoning !== undefined ? model.supports_reasoning : true
          }));
        }
        return [];
      },
      defaultItems: [
        {
          id: 'glm-4',
          name: 'GLM-4',
          description: '适用多场景，速度快',
          context: 128,
          maxOutput: 4,
          isSelected: true,
          supportsThinking: true,
          supportsReasoning: false
        },
        {
          id: 'deepseek-r1',
          name: 'DeepSeek-R1',
          description: '全能处理，深度思考',
          context: 64,
          maxOutput: 8,
          isSelected: false,
          supportsThinking: false,
          supportsReasoning: true
        }
      ]
    });
  }

  /**
   * 初始化组件
   */
  async initialize() {
    // 获取 chatApiService 并设置 apiMethod
    const chatApiService = await window.app.getServiceAsync('chatApiService');
    this.config.apiMethod = (token) => chatApiService.getModels(token);
    
    // 调用父类初始化
    await super.initialize();
  }

  /**
   * 根据模型名称获取描述
   */
  getModelDescription(modelName) {
    const descriptions = {
      'DeepSeek': '全能处理，深度思考',
      'GLM-4': '适用多场景，速度快',
      'GPT-4': '强大的语言理解能力',
      'GPT-3.5': '快速响应，性价比高',
      'Claude': '安全可靠，逻辑清晰'
    };

    for (const [key, desc] of Object.entries(descriptions)) {
      if (modelName && modelName.toLowerCase().includes(key.toLowerCase())) {
        return desc;
      }
    }

    return '智能AI助手';
  }

  /**
   * 根据模型名称获取提供商
   */
  getModelProvider(modelName) {
    const providers = {
      'deepseek': 'DeepSeek',
      'glm': 'GLM',
      'gpt': 'OpenAI',
      'claude': 'Anthropic'
    };

    for (const [key, provider] of Object.entries(providers)) {
      if (modelName && modelName.toLowerCase().includes(key)) {
        return provider;
      }
    }

    return 'Unknown';
  }

  /**
   * 获取当前选中的模型
   */
  getSelectedModel() {
    return this.getSelectedItem();
  }

  /**
   * 根据模型名称获取模型能力信息
   * @param {string} modelName - 模型名称
   * @returns {Object} 包含 supportsThinking 和 supportsReasoning 的对象
   */
  getModelCapabilities(modelName) {
    const model = this.items.find(m => m.name === modelName);
    if (model) {
      return {
        supportsThinking: model.supportsThinking !== undefined ? model.supportsThinking : true,
        supportsReasoning: model.supportsReasoning !== undefined ? model.supportsReasoning : true
      };
    }
    // 如果找不到模型，默认都支持
    return {
      supportsThinking: true,
      supportsReasoning: true
    };
  }

  /**
   * 显示弹窗 - 兼容原有接口
   */
  show(triggerElement, onSelect) {
    return super.show(triggerElement, onSelect);
  }
}
