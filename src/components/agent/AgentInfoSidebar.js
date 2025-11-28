/**
 * 智能体信息侧边栏组件
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { IconUtils } from '../../utils/IconUtils.js';
import { getGlobalEventBus, createNamespace } from '../../core/GlobalEventManager.js';
// 导入 Lit 组件
import '../lit/index.js';

export class AgentInfoSidebar extends BaseComponent {
    constructor(options = {}) {
        super(options);

        this.isVisible = false;
        this.agentData = null;
        this.clickOutsideHandler = null; // 存储点击外部处理函数的引用

        // 创建事件命名空间
        this.eventBus = getGlobalEventBus();
        this.sidebarEvents = createNamespace('agent-info-sidebar');
    }

    /**
     * 渲染组件
     */
    async render(container) {
        this.setContainer(container);

        container.innerHTML = `
            <div class="agent-info-sidebar" style="display: none;">
                <div class="agent-info-sidebar-header">
                    <h3>智能体信息</h3>
                    <div class="agent-info-header-actions">
                        <power-close-button 
                            variant="default" 
                            size="medium" 
                            aria-label="关闭智能体信息"
                            id="agent-info-close-btn">
                        </power-close-button>
                    </div>
                </div>
                <div class="agent-info-content" id="agent-info-content">
                    <!-- 智能体信息内容 -->
                </div>
            </div>
        `;

        this.bindEvents();
        
        // 调用生命周期钩子
        this.onMounted();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 延迟绑定事件，确保DOM已渲染
        setTimeout(() => {
            // 使用统一的事件绑定方法 - Lit 组件关闭按钮
            this.addDOMListener(this.container.querySelector('#agent-info-close-btn'), 'power-close', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 智能体信息关闭按钮被点击');
                this.handleClose();
            });

            // 点击外部关闭事件将在显示时动态绑定

            // ESC键关闭
            this.addDOMListener(document, 'keydown', (e) => {
                if (e.key === 'Escape' && this.isVisible) {
                    this.hide();
                }
            });
        }, 10);
    }

    /**
     * 处理关闭操作
     */
    handleClose() {
        // 发布关闭事件
        this.sidebarEvents.emit('sidebar-closed', {
            agentId: this.agentData?.id,
            agentName: this.agentData?.name,
            timestamp: Date.now()
        });

        this.hide();
        // 发送内部事件
        this.emit('close');
    }

    /**
     * 显示智能体信息
     */
    async show(agentData) {
        this.agentData = agentData;

        // 发布显示事件
        this.sidebarEvents.emit('sidebar-showing', {
            agentId: agentData?.id,
            agentName: agentData?.name,
            timestamp: Date.now()
        });

        const sidebar = this.container.querySelector('.agent-info-sidebar');
        if (sidebar) {
            // 先渲染内容
            this.renderAgentInfo();

            sidebar.style.display = 'block';
            // 添加动画效果
            setTimeout(() => {
                sidebar.classList.add('show');
                // 在动画完成后绑定点击外部关闭事件
                this.bindClickOutsideToClose();

                // 发布显示完成事件
                this.sidebarEvents.emit('sidebar-shown', {
                    agentId: agentData?.id,
                    agentName: agentData?.name,
                    timestamp: Date.now()
                });
            }, 10);
            this.isVisible = true;
        }
    }

    /**
     * 隐藏智能体信息
     */
    hide() {
        // 发布隐藏事件
        this.sidebarEvents.emit('sidebar-hiding', {
            agentId: this.agentData?.id,
            agentName: this.agentData?.name,
            timestamp: Date.now()
        });

        const sidebar = this.container.querySelector('.agent-info-sidebar');
        if (sidebar) {
            sidebar.classList.remove('show');
            // 移除点击外部关闭事件
            this.unbindClickOutsideToClose();
            // 等待动画完成后隐藏
            setTimeout(() => {
                sidebar.style.display = 'none';

                // 发布隐藏完成事件
                this.sidebarEvents.emit('sidebar-hidden', {
                    agentId: this.agentData?.id,
                    agentName: this.agentData?.name,
                    timestamp: Date.now()
                });
            }, 300);
            this.isVisible = false;
        }
    }

    /**
     * 切换显示状态
     */
    async toggle(agentData) {
        if (this.isVisible) {
            this.hide();
        } else {
            await this.show(agentData);
        }
    }

    /**
     * 渲染图标（支持 URL、Lucide 名称和 Emoji）
     * @param {string} icon - 图标数据（URL、Lucide 名称或 Emoji）
     * @returns {string} 渲染后的 HTML
     */
    renderIcon(icon) {
        if (!icon) {
            console.log('  ➡️ icon 为空，使用默认图标');
            return '🤖'; // 默认 emoji
        }

        // 检查是否是 SVG 字符串（直接内联，支持 CSS 颜色继承）
        if (typeof icon === 'string' && icon.trim().startsWith('<svg')) {
            return icon;
        }

        // 检查是否是 URL（兼容旧数据）
        if (icon.startsWith('http://') || icon.startsWith('https://') || icon.startsWith('/')) {
            return `<img src="${icon}" alt="icon" class="icon-img" />`;
        }

        // 检查是否是 Lucide 图标名称
        if (typeof icon === 'string' && IconUtils.iconMap && IconUtils.iconMap[icon]) {
            return IconUtils.getIcon(icon, { size: 48 });
        }
        return icon;
    }

    /**
     * 渲染智能体信息内容
     */
    renderAgentInfo() {
        const contentContainer = this.container.querySelector('#agent-info-content');
        if (!contentContainer || !this.agentData) return;

        const agent = this.agentData;

        contentContainer.innerHTML = `
            <!-- 固定智能体按钮 - 悬浮在右上角 -->
            <button class="pin-agent-button" id="pin-agent-btn" title="固定到侧边栏">
                <span class="pin-icon">${IconUtils.getIcon('pin', { size: 16 })}</span>
            </button>

            <div class="agent-info-main">
                <!-- 智能体基本信息 -->
                <div class="agent-basic-info">
                    <div class="agent-icon-section">
                        <div class="agent-icon-large">${this.renderIcon(agent.icon)}</div>
                    </div>
                    <div class="agent-details-section">
                        <h2 class="agent-name">${agent.name || '未知智能体'}</h2>
                        <p class="agent-description">${agent.description || '暂无描述'}</p>
                        <div class="agent-meta">
                            ${agent.rating ? `<span class="agent-rating">⭐ ${agent.rating}</span>` : ''}
                            <span class="agent-version">${agent.version || '1.0'}</span>
                        </div>
                    </div>
                </div>

                <!-- 功能特性 -->
                ${agent.detail.features ? `
                    <div class="agent-section">
                        <h4 class="section-title">功能特性</h4>
                        <ul class="feature-list">
                            ${agent.detail.features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}

                <!-- 使用示例 -->
                ${agent.detail.examples ? `
                    <div class="agent-section">
                        <h4 class="section-title">使用示例</h4>
                        <div class="examples-list">
                            ${agent.detail.examples.map(example => `
                                <div class="example-item">
                                    <code class="example-code">${example}</code>
                                    <button class="example-try-btn" data-example="${example}">试试看</button>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // 绑定示例按钮事件
        this.bindExampleButtons();

        // 绑定固定按钮事件
        this.bindPinButton();
    }

    /**
     * 获取类型标签
     */
    getTypeLabel(type) {
        switch (type) {
            case 'python':
                return 'Python智能体';
            case 'web':
                return 'Web智能体';
            case 'api':
                return 'API智能体';
            default:
                return '通用智能体';
        }
    }

    /**
     * 绑定示例按钮事件
     */
    bindExampleButtons() {
        const exampleButtons = this.container.querySelectorAll('.example-try-btn');
        exampleButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const example = e.target.dataset.example;
                console.log('🔍 示例按钮被点击:', example);
                
                // 发送示例点击事件
                this.emit('example-click', { example, agentData: this.agentData });
                
                // 关闭侧边栏
                this.hide();
            });
        });
    }

    /**
     * 绑定固定按钮事件
     */
    bindPinButton() {
        const pinButton = this.container.querySelector('#pin-agent-btn');
        if (!pinButton || !this.agentData) return;

        // 从 AgentManager 获取当前的 pin 状态
        const agentManager = window.app?.getService('agentManager');
        let isPinned = false;

        if (agentManager) {
            isPinned = agentManager.isPinned(this.agentData.id);
            console.log('📌 当前智能体固定状态:', this.agentData.name, isPinned ? '已固定' : '未固定');
        }

        // 初始化按钮显示状态
        this.updatePinButtonUI(pinButton, isPinned);

        // 绑定点击事件
        pinButton.addEventListener('click', async (e) => {
            e.preventDefault();
            e.stopPropagation();

            // 切换状态
            isPinned = !isPinned;
            console.log('📌 固定按钮被点击:', this.agentData?.name, '新状态:', isPinned ? '固定' : '取消固定');

            // 更新按钮 UI
            this.updatePinButtonUI(pinButton, isPinned);

            // 发送固定/取消固定事件
            this.emit('pin-agent', {
                agentData: this.agentData,
                isPinned: isPinned
            });
        });
    }

    /**
     * 更新 Pin 按钮的 UI 状态
     * @param {HTMLElement} pinButton - Pin 按钮元素
     * @param {boolean} isPinned - 是否已固定
     */
    updatePinButtonUI(pinButton, isPinned) {
        if (!pinButton) return;

        if (isPinned) {
            pinButton.classList.add('pinned');
            pinButton.title = '取消固定';
            pinButton.innerHTML = `
                <span class="pin-icon rotated">${IconUtils.getIcon('pin', { size: 16 })}</span>
            `;
        } else {
            pinButton.classList.remove('pinned');
            pinButton.title = '固定到侧边栏';
            pinButton.innerHTML = `
                <span class="pin-icon">${IconUtils.getIcon('pin', { size: 16 })}</span>
            `;
        }
    }

    /**
     * 绑定点击外部关闭事件
     */
    bindClickOutsideToClose() {
        // 延迟绑定，确保当前点击事件已经处理完毕
        setTimeout(() => {
            this.clickOutsideHandler = (e) => {
                const sidebar = this.container.querySelector('.agent-info-sidebar');
                const infoButton = document.querySelector('.footer-info-btn');

                // 如果点击的是信息按钮或其子元素，不关闭侧边栏
                if (infoButton && (infoButton.contains(e.target) || infoButton === e.target)) {
                    return;
                }

                // 如果点击的是侧边栏外部，关闭侧边栏
                if (this.isVisible && sidebar && !sidebar.contains(e.target)) {
                    this.hide();
                }
            };

            document.addEventListener('click', this.clickOutsideHandler);
        }, 100);
    }

    /**
     * 移除点击外部关闭事件
     */
    unbindClickOutsideToClose() {
        if (this.clickOutsideHandler) {
            document.removeEventListener('click', this.clickOutsideHandler);
            this.clickOutsideHandler = null;
        }
    }

    /**
     * 销毁组件
     */
    destroy() {
        this.unbindClickOutsideToClose();
        this.hide();
        super.destroy();
    }
}
