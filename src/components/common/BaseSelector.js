/**
 * 基础选择器组件
 * 提供通用的选择器功能，可被其他选择器组件继承或组合使用
 */

export class BaseSelector {
    constructor(config = {}) {
        this.config = {
            className: 'selector-popup',
            itemDataAttribute: 'item-id',
            apiMethod: null,
            defaultItems: [],
            itemRenderer: null,
            ...config
        };

        this.popup = null;
        this.items = [];
        this.onItemSelect = null;
        this.isVisible = false;
        this.triggerElement = null; // 存储触发元素引用
    }

    /**
     * 初始化组件
     */
    async initialize() {
        await this.loadItems();
        this.createPopup();
    }

    /**
     * 获取 userManager 服务
     */
    async getUserManager() {
        return await window.app.getServiceAsync('userManager');
    }

    /**
     * 加载数据项
     */
    async loadItems() {
        try {
            // 尝试从API获取数据
            if (this.config.apiMethod) {
                try {
                    // 使用统一的服务获取方式
                    const userManager = await this.getUserManager();
                    
                    // 检查用户管理器是否存在
                    if (!userManager) {
                        console.warn('UserManager 服务未找到，使用默认数据');
                        throw new Error('UserManager 服务未找到');
                    }

                    // 检查用户是否登录
                    const currentUser = userManager.getCurrentUser();
                    
                    console.log('登录状态检查:', { currentUser, hasIsLoggedInMethod: typeof userManager.isLoggedIn === 'function' });
                    
                    // 检查登录状态 - 使用UserManager的标准方法
                    let isLoggedIn = false;
                    if (typeof userManager.isUserAuthenticated === 'function') {
                        isLoggedIn = userManager.isUserAuthenticated();
                    } else if (typeof userManager.isLoggedIn === 'function') {
                        isLoggedIn = userManager.isLoggedIn();
                    } else {
                        // 如果没有标准方法，通过currentUser和token判断
                        isLoggedIn = !!(currentUser && (currentUser.token || currentUser.access_token));
                    }
                    
                    // 获取token - 兼容不同的token字段名
                    const token = currentUser?.token || currentUser?.access_token;
                    
                    if (!isLoggedIn || !token) {
                        console.warn('用户未登录或token无效，使用默认数据');
                        throw new Error('未登录');
                    }

                    const response = await this.config.apiMethod(token);

                    if (response && response.success && response.data) {
                        this.items = this.config.parseApiResponse(response.data);

                        // 如果没有选中项，默认选择第一个
                        if (!this.items.some(item => item.isSelected) && this.items.length > 0) {
                            this.items[0].isSelected = true;
                        }

                        if (this.items.length > 0) {
                            return;
                        }
                    }
                } catch (apiError) {
                    console.warn(`API获取${this.config.itemType || '数据'}列表失败，使用默认数据:`, apiError);
                }
            }

            // 使用默认数据
            this.items = [...this.config.defaultItems];
            if (this.items.length > 0 && !this.items.some(item => item.isSelected)) {
                this.items[0].isSelected = true;
            }
        } catch (error) {
            console.error(`加载${this.config.itemType || '数据'}列表失败:`, error);
            this.items = [...this.config.defaultItems];
            if (this.items.length > 0 && !this.items.some(item => item.isSelected)) {
                this.items[0].isSelected = true;
            }
        }
    }

    /**
     * 创建弹窗
     */
    createPopup() {
        this.popup = document.createElement('div');
        this.popup.className = `selector-popup ${this.config.className}`;
        this.popup.innerHTML = `
      <div class="selector-content">
        <div class="selector-list">
          ${this.items.map(item => this.renderItem(item)).join('')}
        </div>
      </div>
    `;

        document.body.appendChild(this.popup);
        this.bindEvents();
    }

    /**
     * 渲染数据项
     */
    renderItem(item) {
        if (this.config.itemRenderer) {
            return this.config.itemRenderer(item);
        }

        // 默认渲染器
        return `
      <div class="selector-item ${item.isSelected ? 'selected' : ''}" data-${this.config.itemDataAttribute}="${item.id}">
        <div class="selector-info">
          <span class="selector-name">${item.name}</span>
          <div class="selector-description">${item.description || ''}</div>
        </div>
        ${item.isSelected ? '<div class="check-icon-container"><svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg></div>' : ''}
      </div>
    `;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        if (!this.popup) return;

        // 项目选择事件
        this.popup.addEventListener('click', (e) => {
            const itemElement = e.target.closest('.selector-item');
            if (itemElement) {
                const itemId = itemElement.dataset[this.config.itemDataAttribute.replace(/-([a-z])/g, (g) => g[1].toUpperCase())];
                this.selectItem(itemId);
            }
        });

        // 阻止点击弹窗内部时关闭
        this.popup.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    /**
     * 选择项目
     */
    selectItem(itemId) {
        const selectedItem = this.items.find(item => item.id === itemId);
        if (!selectedItem) return;

        // 更新选中状态
        this.items.forEach(item => item.isSelected = false);
        selectedItem.isSelected = true;

        // 更新UI
        this.updatePopupContent();

        // 回调
        if (this.onItemSelect) {
            this.onItemSelect(selectedItem);
        }

        // 隐藏弹窗
        this.hide();
    }

    /**
     * 更新弹窗内容
     */
    updatePopupContent() {
        if (!this.popup) return;

        const itemList = this.popup.querySelector('.selector-list');
        if (itemList) {
            itemList.innerHTML = this.items.map(item => this.renderItem(item)).join('');
        }
    }

    /**
     * 显示弹窗
     */
    show(triggerElement, onSelect) {
        if (!this.popup) return;

        // 如果弹窗已经显示，则隐藏它
        if (this.isVisible) {
            this.hide();
            return;
        }

        this.onItemSelect = onSelect;
        this.isVisible = true;

        // 找到实际的按钮元素（可能点击的是按钮内的子元素）
        const buttonElement = triggerElement.closest('.control-btn') ||
                             triggerElement.closest('.perspective-selector-btn') ||
                             triggerElement;
        
        // 存储触发元素引用，用于后续位置更新
        this.triggerElement = buttonElement;

        // 移除 visible 类，禁用过渡效果
        this.popup.classList.remove('visible');
        this.popup.style.transition = 'none';
        this.popup.style.display = 'block';
        
        // 计算并设置弹窗位置
        this.updatePosition();

        // 强制重排，然后恢复过渡和显示
        this.popup.offsetHeight; // 触发重排
        this.popup.style.transition = '';
        
        requestAnimationFrame(() => {
            this.popup.classList.add('visible');
        });
    }

    /**
     * 更新弹窗位置
     * 根据当前触发元素的位置和尺寸重新计算弹窗位置
     */
    updatePosition() {
        if (!this.popup || !this.triggerElement) return;

        // 获取按钮当前的位置信息
        const rect = this.triggerElement.getBoundingClientRect();

        // 获取弹窗实际尺寸（此时弹窗已经是display:block但opacity:0）
        const popupRect = this.popup.getBoundingClientRect();

        // 判断是否为perspective-selector-btn，如果是则显示在下方
        const isPerspectiveSelector = this.triggerElement.classList.contains('perspective-selector-btn');

        let top, left;
        if (isPerspectiveSelector) {
            // 显示在按钮下方，与按钮垂直居中对齐
            top = rect.bottom + 8;
            left = rect.left + (rect.width / 2) - (popupRect.width / 2);
        } else {
            // 显示在按钮上方，与按钮垂直居中对齐
            top = rect.top - popupRect.height - 8;
            left = rect.left + (rect.width / 2) - (popupRect.width / 2);
        }

        // 边界检查
        const maxLeft = window.innerWidth - popupRect.width - 8;
        if (left > maxLeft) left = maxLeft;
        if (left < 8) left = 8;
        if (top < 8) top = 8;

        this.popup.style.top = `${top}px`;
        this.popup.style.left = `${left}px`;
    }

    /**
     * 隐藏弹窗
     */
    hide() {
        if (!this.popup || !this.isVisible) return;

        this.isVisible = false;
        this.popup.classList.remove('visible');

        setTimeout(() => {
            if (!this.isVisible) {
                this.popup.style.display = 'none';
            }
        }, 200);
    }

    /**
     * 获取当前选中的项目
     */
    getSelectedItem() {
        return this.items.find(item => item.isSelected);
    }

    /**
     * 销毁组件
     */
    destroy() {
        if (this.popup) {
            this.popup.remove();
            this.popup = null;
        }
        this.isVisible = false;
        this.onItemSelect = null;
        this.triggerElement = null;
    }
}