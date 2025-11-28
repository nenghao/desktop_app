/**
 * 内容类型选择器组件
 * 提供图片和文件选项供用户选择
 */

import { BaseSelector } from '../common/BaseSelector.js';

export class ContentTypeSelector extends BaseSelector {
  constructor() {
    super({
      className: 'content-type-selector-popup',
      itemDataAttribute: 'content-type',
      itemType: '内容类型',
      apiMethod: null,
      defaultItems: [
        {
          id: 'image',
          name: '图片',
          description: '上传图片文件',
          isSelected: false
        },
        {
          id: 'file',
          name: '文件',
          description: '上传普通文件',
          isSelected: false
        }
      ]
    });
  }

  /**
   * 初始化组件
   */
  async initialize() {
    await super.initialize();
    // 确保所有项目都没有选中状态
    this.items.forEach(item => item.isSelected = false);
  }

  /**
   * 自定义渲染项，不显示选中状态
   */
  renderItem(item) {
    return `
      <div class="selector-item" data-${this.config.itemDataAttribute}="${item.id}">
        <div class="selector-info">
          <div class="selector-header">
            <span class="selector-name">${item.name}</span>
          </div>
          <div class="selector-description">${item.description || ''}</div>
        </div>
      </div>
    `;
  }

  /**
   * 重写选择项方法，不更新选中状态
   */
  selectItem(itemId) {
    const selectedItem = this.items.find(item => item.id === itemId);
    if (!selectedItem) return;

    // 不更新选中状态，直接执行回调并隐藏弹窗
    if (this.onItemSelect) {
      this.onItemSelect(selectedItem);
    }
    this.hide();
  }

  /**
   * 显示弹窗
   */
  show(triggerElement, onSelect) {
    return super.show(triggerElement, onSelect);
  }
}