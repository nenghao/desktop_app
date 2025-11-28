/**
 * 分析视角选择器组件
 * 用于新闻详情页AI解读的视角选择
 */

import { BaseSelector } from './BaseSelector.js';
import { getCommonApiService } from '../../services/api/CommonApiService.js';

export class PerspectiveSelector extends BaseSelector {
  constructor() {
    super({
      className: 'perspective-selector-popup',
      itemDataAttribute: 'perspective-id',
      itemType: '分析视角',
      apiMethod: async (token) => {
        // token 参数由 BaseSelector 传入，但 getPerspectives 不需要它
        const apiService = getCommonApiService();
        return await apiService.getPerspectives();
      },
      parseApiResponse: (data) => {
        // API返回格式: { perspectives: [{id, title, description}] }
        if (data && data.perspectives && Array.isArray(data.perspectives)) {
          return data.perspectives.map((item, index) => ({
            id: item.id,
            name: item.title,
            description: item.description || '',
            isSelected: index === 0 // 默认选中第一个
          }));
        }
        return [];
      },
      defaultItems: [
        {
          id: 'ai_comprehensive',
          name: '基础综合分析',
          description: '快速梳理全局，建立认知基线',
          isSelected: true
        },
        {
          id: 'ai_macro_economy',
          name: '宏观经济与产业链',
          description: '解读经济涟漪，洞察链条效应',
          isSelected: false
        },
        {
          id: 'ai_investment_risk',
          name: '投资与风险观察',
          description: '分析市场波动，洞察风险机遇',
          isSelected: false
        }
      ]
    });
  }

  /**
   * 初始化组件
   */
  async initialize() {
    // 尝试从API加载，失败则使用默认数据
    await this.loadItems();
    this.createPopup();
  }

  /**
   * 获取选中的分析视角
   */
  getSelectedPerspective() {
    return this.items.find(item => item.isSelected);
  }
}
