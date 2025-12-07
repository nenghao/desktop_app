/**
 * AgentSidebar 组件
 * 智能体分类侧边栏
 */

import { EventBus } from '../../core/EventBus.js';
import { IconUtils } from '../../utils/IconUtils.js';

export class AgentSidebar {
  constructor(container) {
    this.container = container;
    this.element = null;
    this.selectedCategory = 'all';
    this.categories = [
      {
        id: 'all',
        name: '全部智能体',
        icon: 'bot',
        count: 6,
        color: '#007bff'
      },
      {
        id: 'tools',
        name: '工具类',
        icon: 'wrench',
        count: 2,
        color: '#6c757d'
      },
      {
        id: 'data',
        name: '数据处理',
        icon: 'bar-chart-3',
        count: 1,
        color: '#28a745'
      },
      {
        id: 'image',
        name: '图像处理',
        icon: 'image',
        count: 1,
        color: '#fd7e14'
      },
      {
        id: 'network',
        name: '网络服务',
        icon: 'globe',
        count: 1,
        color: '#17a2b8'
      },
      {
        id: 'utility',
        name: '实用工具',
        icon: 'settings',
        count: 1,
        color: '#6f42c1'
      }
    ];
    
    this.init();
  }

  init() {
    this.render();
    this.bindEvents();
    this.loadCategoryCounts();
  }

  render() {
    this.element = document.createElement('div');
    this.element.className = 'agent-sidebar';
    
    this.element.innerHTML = `
      <div class="agent-sidebar-content">
        <div class="agent-categories">
          ${this.categories.map(category => this.renderCategory(category)).join('')}
        </div>
      </div>
    `;

    if (this.container) {
      this.container.appendChild(this.element);
    }

    return this.element;
  }

  renderCategory(category) {
    const isSelected = this.selectedCategory === category.id;
    const selectedClass = isSelected ? 'selected' : '';

    // 使用 IconUtils 生成 SVG 图标
    const iconSvg = IconUtils.getIcon(category.icon, {
      size: 20,
      strokeWidth: 2,
      color: 'currentColor',
      className: 'category-icon-svg'
    });

    return `
      <div class="category-item ${selectedClass}"
           data-category="${category.id}"
           style="--category-color: ${category.color}">
        <div class="category-content">
          <div class="category-icon">${iconSvg}</div>
          <div class="category-info">
            <div class="category-name">${category.name}</div>
          </div>
          <div class="category-count">${category.count}</div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    if (!this.element) return;

    // 分类选择事件
    this.element.addEventListener('click', (e) => {
      const categoryItem = e.target.closest('.category-item');
      if (categoryItem) {
        const categoryId = categoryItem.dataset.category;
        this.selectCategory(categoryId);
      }
    });

    // 监听智能体数量变化
    EventBus.on('agents:count-updated', (data) => {
      this.updateCategoryCounts(data);
    });
  }

  selectCategory(categoryId) {
    if (this.selectedCategory === categoryId) return;

    // 更新选中状态
    this.selectedCategory = categoryId;
    this.updateSelectedState();

    // 发送分类选择事件
    EventBus.emit('agent-category:selected', {
      categoryId,
      category: this.categories.find(c => c.id === categoryId)
    });
  }

  updateSelectedState() {
    if (!this.element) return;

    // 移除所有选中状态
    this.element.querySelectorAll('.category-item').forEach(item => {
      item.classList.remove('selected');
    });

    // 添加当前选中状态
    const selectedItem = this.element.querySelector(`[data-category="${this.selectedCategory}"]`);
    if (selectedItem) {
      selectedItem.classList.add('selected');
    }
  }

  updateCategoryCounts(counts) {
    this.categories.forEach(category => {
      if (counts[category.id] !== undefined) {
        category.count = counts[category.id];
      }
    });

    // 更新显示
    this.categories.forEach(category => {
      const countElement = this.element.querySelector(
        `[data-category="${category.id}"] .category-count`
      );
      if (countElement) {
        countElement.textContent = category.count;
      }
    });
  }

  async loadCategoryCounts() {
    try {
      // 这里可以从 API 或本地存储加载实际的智能体数量
      // 暂时使用模拟数据
      const counts = {
        all: 6,
        tools: 2,
        data: 1,
        image: 1,
        network: 1,
        utility: 1
      };
      
      this.updateCategoryCounts(counts);
    } catch (error) {
      console.error('Failed to load category counts:', error);
    }
  }

  getSelectedCategory() {
    return this.selectedCategory;
  }

  setSelectedCategory(categoryId) {
    this.selectCategory(categoryId);
  }

  destroy() {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    
    // 清理事件监听
    EventBus.off('agents:count-updated');
    
    this.element = null;
  }
}

export default AgentSidebar;
