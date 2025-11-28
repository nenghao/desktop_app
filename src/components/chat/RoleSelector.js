/**
 * 角色选择器组件
 * 显示可用的AI角色列表供用户选择
 */

import { BaseSelector } from '../common/BaseSelector.js';

export class RoleSelector extends BaseSelector {
  constructor() {
    super({
      className: 'role-selector-popup',
      itemDataAttribute: 'role-id',
      itemType: '角色',
      apiMethod: null, // 将在初始化时设置
      parseApiResponse: (data) => {
        if (data.roles) {
          return data.roles.map((role) => ({
            id: role.identify,
            name: role.title,
            description: role.description,
            image: role.image,
            prompt: role.prompt,
            isSelected: data.recommended && role.identify === data.recommended.identify
          }));
        }
        return [];
      },
      defaultItems: [
        {
          id: 'general',
          name: '通用协作',
          description: '综合处理能力',
          image: 'https://www.baizesz.com/images/intelligent_role.JPG',
          prompt: '',
          isSelected: true
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
    this.config.apiMethod = (token) => chatApiService.getRoles(token);
    
    // 调用父类初始化
    await super.initialize();
  }

  /**
   * 获取当前选中的角色
   */
  getSelectedRole() {
    return this.getSelectedItem();
  }

  /**
   * 显示弹窗 - 兼容原有接口
   */
  show(triggerElement, onSelect) {
    return super.show(triggerElement, onSelect);
  }
}
