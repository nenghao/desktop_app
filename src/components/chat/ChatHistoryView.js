/**
 * 聊天历史记录视图组件
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { NotificationCenter } from '../common/NotificationCenter.js';
import { Dialog } from '../common/Dialog.js';
import { IconUtils } from '../../utils/IconUtils.js';
// 导入 Lit 组件
import '../lit/index.js';

export class ChatHistoryView extends BaseComponent {
    constructor(options = {}) {
        super(options);

        this.chatApiService = options.chatApiService;
        this.userManager = options.userManager;
        this.notificationCenter = options.notificationCenter || new NotificationCenter();

        this.isVisible = false;
        this.conversations = [];
        this.selectedConversationId = null;
        this.currentPage = 1;
        this.hasMore = true;
        this.isLoading = false;
    }

    /**
     * 渲染组件
     */
    async render(container) {
        this.setContainer(container);

        // 生成刷新图标的SVG字符串
        const refreshIcon = IconUtils.getIcon('refresh', { size: 16, strokeWidth: 2 });

        container.innerHTML = `
            <div class="chat-history-sidebar" style="display: none;">
                <div class="chat-history-sidebar-header">
                    <h3>聊天记录</h3>
                    <div class="chat-history-header-actions">
                        <button class="chat-history-refresh-btn" id="history-refresh-btn" title="刷新">
                            ${refreshIcon}
                        </button>
                        <power-close-button 
                            variant="default" 
                            size="medium" 
                            aria-label="关闭聊天记录"
                            id="history-close-btn">
                        </power-close-button>
                    </div>
                </div>
                <div class="chat-history-list" id="history-list">
                    <!-- 历史记录列表 -->
                </div>
                <div class="chat-history-footer" id="history-load-more" style="display: none;">
                    <button class="chat-history-load-more-btn" id="load-more-btn">
                        <span class="load-more-text">加载更多</span>
                        <div class="load-more-spinner" style="display: none;">
                            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="10" cy="10" r="8"></circle>
                                <path d="M10,2 A8,8 0 0,1 18,10"></path>
                            </svg>
                        </div>
                    </button>
                </div>
            </div>
        `;

        this.bindEvents();
        this.bindScrollEvents();

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
            this.addDOMListener(this.container.querySelector('#history-close-btn'), 'power-close', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔘 关闭按钮被点击');
                this.handleClose();
            });

            this.bindClick('#history-refresh-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🔄 刷新按钮被点击');
                this.handleRefresh();
            });

            this.bindClick('#load-more-btn', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('📄 加载更多按钮被点击');
                this.handleLoadMore();
            });
        }, 100);
    }

    /**
     * 处理关闭操作
     */
    handleClose() {
        this.hide();
        // 发送内部事件
        this.emit('close');
    }

    /**
     * 处理刷新操作
     */
    handleRefresh() {
        this.refreshHistory();
        // 发送内部事件
        this.emit('refresh');
    }

    /**
     * 处理加载更多操作
     */
    handleLoadMore() {
        this.loadMoreHistory();
        // 发送内部事件
        this.emit('loadMore');
    }

    /**
     * 显示历史记录
     */
    async show() {
        const historySidebar = this.container.querySelector('.chat-history-sidebar');
        if (historySidebar) {
            historySidebar.style.display = 'block';
            // 添加动画效果
            setTimeout(() => {
                historySidebar.classList.add('show');
            }, 10);
            this.isVisible = true;
            await this.loadHistory();
        }
    }

    /**
     * 隐藏历史记录
     */
    hide() {
        const historySidebar = this.container.querySelector('.chat-history-sidebar');
        if (historySidebar) {
            historySidebar.classList.remove('show');
            // 等待动画完成后隐藏
            setTimeout(() => {
                historySidebar.style.display = 'none';
            }, 300);
            this.isVisible = false;
        }
    }

    /**
     * 切换显示状态
     */
    async toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            await this.show();
        }
    }

    /**
     * 加载聊天历史
     */
    async loadHistory() {
        try {
            const user = this.userManager?.getCurrentUser();
            const token = user?.access_token;
            if (!token) {
                throw new Error('请先登录');
            }

            const response = await this.chatApiService.getChatHistory(token, 1, 20);
            if (response && response.data && response.data.conversations) {
                this.conversations = response.data.conversations;
                this.currentPage = 1;
                this.hasMore = response.data.conversations.length === 20;
                this.renderHistoryList();
                this.updateLoadMoreButton();
            }
        } catch (error) {
            console.error('加载聊天历史失败:', error);
            this.notificationCenter.error(`加载聊天历史失败: ${error.message}`);
            this.renderError(error.message);
        }
    }

    /**
     * 刷新历史记录（重新加载第一页）
     */
    async refreshHistory() {
        this.currentPage = 1;
        this.hasMore = true;
        this.conversations = [];
        await this.loadHistory();
    }

    /**
     * 加载更多历史记录
     */
    async loadMoreHistory() {
        if (this.isLoading || !this.hasMore) return;

        this.isLoading = true;
        this.updateLoadMoreButton();

        try {
            const user = this.userManager?.getCurrentUser();
            const token = user?.access_token;
            if (!token) {
                throw new Error('请先登录');
            }

            const nextPage = this.currentPage + 1;
            const response = await this.chatApiService.getChatHistory(token, nextPage, 20);

            if (response && response.data && response.data.conversations) {
                const newConversations = response.data.conversations;
                this.conversations = [...this.conversations, ...newConversations];
                this.currentPage = nextPage;
                this.hasMore = newConversations.length === 20;
                this.renderHistoryList();
            }
        } catch (error) {
            console.error('加载更多历史记录失败:', error);
            this.notificationCenter.error(`加载更多历史记录失败: ${error.message}`);
        } finally {
            this.isLoading = false;
            this.updateLoadMoreButton();
        }
    }

    /**
     * 绑定滚动事件
     */
    bindScrollEvents() {
        setTimeout(() => {
            // 使用统一的DOM事件绑定方法
            this.addDOMListener('#history-list', 'scroll', () => {
                this.checkScrollPosition();
            });
        }, 100);
    }

    /**
     * 发送全局事件的增强版本
     * 同时发送带命名空间和不带命名空间的事件，确保所有组件都能接收到
     */
    emitGlobalEnhanced(event, data) {
        // 发送不带命名空间的原始事件（兼容现有组件）
        if (this._globalEventBus) {
            this._globalEventBus.emit(event, data);
        }

        // 发送带命名空间的事件（保持命名空间的好处）
        this.emitGlobal(event, data);
    }

    /**
     * 检查滚动位置
     */
    checkScrollPosition() {
        const historyList = this.container.querySelector('#history-list');
        const loadMoreContainer = this.container.querySelector('#history-load-more');

        if (!historyList || !loadMoreContainer) return;

        if (!this.hasMore) {
            loadMoreContainer.style.display = 'none';
            return;
        }

        const { scrollTop, scrollHeight, clientHeight } = historyList;
        const isScrollable = scrollHeight > clientHeight;
        const isNearBottom = scrollTop + clientHeight >= scrollHeight - 50;

        // 如果不能滚动或者滚动到底部附近，显示加载更多按钮
        loadMoreContainer.style.display = (!isScrollable || isNearBottom) ? 'block' : 'none';
    }

    /**
     * 更新加载更多按钮状态
     */
    updateLoadMoreButton() {
        const loadMoreContainer = this.container.querySelector('#history-load-more');
        const loadMoreBtn = this.container.querySelector('#load-more-btn');
        const loadMoreText = this.container.querySelector('.load-more-text');
        const loadMoreSpinner = this.container.querySelector('.load-more-spinner');

        if (!loadMoreContainer || !loadMoreBtn) return;

        if (this.conversations.length === 0 || !this.hasMore) {
            loadMoreContainer.style.display = 'none';
            return;
        }

        loadMoreContainer.style.display = 'block';
        loadMoreBtn.disabled = this.isLoading;

        if (this.isLoading) {
            loadMoreText.style.display = 'none';
            loadMoreSpinner.style.display = 'block';
        } else {
            loadMoreText.style.display = 'block';
            loadMoreSpinner.style.display = 'none';
        }

        // 延迟检查滚动位置
        setTimeout(() => this.checkScrollPosition(), 100);
    }

    /**
     * 渲染历史记录列表
     */
    renderHistoryList() {
        const historyList = this.container.querySelector('#history-list');
        if (!historyList) return;

        if (this.conversations.length === 0) {
            historyList.innerHTML = `
                <div class="chat-history-empty">
                    <div class="empty-icon">${IconUtils.getIcon('message-circle')}</div>
                    <p>暂无聊天记录</p>
                    <p class="empty-tip">开始新的对话吧</p>
                </div>
            `;
            return;
        }

        // 按时间分组
        const groupedConversations = this.groupConversationsByTime(this.conversations);

        let html = '';
        Object.keys(groupedConversations).forEach(group => {
            html += `<div class="chat-history-group">
                <div class="chat-history-group-title">${group}</div>
                ${groupedConversations[group].map(conversation => `
                    <div class="chat-history-item ${conversation.conversation_id === this.selectedConversationId ? 'selected' : ''}" 
                         data-conversation-id="${conversation.conversation_id}">
                        <div class="chat-history-conversation-title">${conversation.title || '未命名对话'}</div>
                        <div class="chat-history-item-actions">
                            <div class="chat-history-actions-wrapper">
                                <button class="chat-history-action-btn chat-history-edit-btn" data-action="edit" data-conversation-id="${conversation.conversation_id}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                        <path d="m19,6v14a2,2 0 0,1 3,3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                </button>
                                <button class="chat-history-action-btn chat-history-delete-btn" data-action="delete" data-conversation-id="${conversation.conversation_id}">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="3,6 5,6 21,6"></polyline>
                                        <path d="m19,6v14a2,2 0 0,1 -2,2H7a2,2 0 0,1 -2,-2V6m3,0V4a2,2 0 0,1 2,-2h4a2,2 0 0,1 2,2v2"></path>
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>`;
        });

        historyList.innerHTML = html;

        // 绑定点击事件
        this.bindHistoryItemEvents();
    }

    /**
     * 选择会话
     */
    async selectConversation(conversationId) {
        try {
            console.log('🔍 选择会话:', conversationId);

            // 更新选中状态
            this.selectedConversationId = conversationId;
            this.updateSelectedState();

            // 加载会话详情
            const user = this.userManager?.getCurrentUser();
            const token = user?.access_token;
            if (!token) {
                throw new Error('请先登录');
            }

            console.log('📡 请求会话详情:', { conversationId, token: token ? '有token' : '无token' });
            const response = await this.chatApiService.getChatHistory(token, 1, 50, conversationId);
            console.log('📡 会话详情响应:', response);

            if (response && response.data && response.data.messages) {
                console.log('✅ 获取到消息:', response.data.messages.length, '条');

                // 需要为历史消息做字段映射，特别是 message_id
                const messages = response.data.messages.map(msg => {
                    // 去除 content 和 reasoningContent 首尾换行符
                    let content = msg.content || '';
                    let reasoningContent = msg.reasoning_content || '';

                    // 去除首尾换行符
                    if (content && (content.startsWith('\n') || content.endsWith('\n'))) {
                        content = content.replace(/^\n+|\n+$/g, '');
                    }
                    if (reasoningContent && (reasoningContent.startsWith('\n') || reasoningContent.endsWith('\n'))) {
                        reasoningContent = reasoningContent.replace(/^\n+|\n+$/g, '');
                    }

                    return {
                        id: msg.id,  // 使用后端返回的真实 message_id
                        conversationId: conversationId,  // 保存会话 ID
                        role: msg.role,
                        content: content,
                        reasoningContent: reasoningContent,  // 添加深思内容字段
                        created_at: msg.created_at,
                        type: msg.role === 'user' ? 'user' : 'assistant'
                    };
                });

                console.log('[ChatHistoryView] 消息映射完成（使用后端真实ID）:', messages.slice(0, 2).map(m => ({ id: m.id })));

                // 通知ChatApiService记录当前会话 ID
                if (this.chatApiService.setCurrentConversationId) {
                    this.chatApiService.setCurrentConversationId(conversationId);
                }

                // 发送内部事件
                this.emit('conversationSelected', {
                    conversationId,
                    messages
                });

                // 发送全局事件通知聊天界面更新
                this.emitGlobalEnhanced('chat:load-conversation', {
                    conversationId,
                    messages
                });

                // 隐藏历史记录界面
                this.hide();
            } else {
                console.warn('❌ 响应数据格式错误:', response);
            }
        } catch (error) {
            console.error('加载会话详情失败:', error);
            this.notificationCenter.error(`加载会话详情失败: ${error.message}`);
        }
    }

    /**
     * 更新选中状态
     */
    updateSelectedState() {
        const historyList = this.container.querySelector('#history-list');
        if (!historyList) return;

        historyList.querySelectorAll('.history-item').forEach(item => {
            const conversationId = item.dataset.conversationId;
            if (conversationId === this.selectedConversationId) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }

    /**
     * 渲染错误信息
     */
    renderError(message) {
        const historyList = this.container.querySelector('#history-list');
        if (historyList) {
            historyList.innerHTML = `
                <div class="chat-history-error-message">
                    <div class="error-icon">⚠️</div>
                    <p>${message}</p>
                </div>
            `;
        }
    }

    /**
     * 按时间分组会话
     */
    groupConversationsByTime(conversations) {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        const groups = {
            '今天': [],
            '更早': []
        };

        conversations.forEach(conversation => {
            const date = new Date(conversation.updated_at * 1000);
            const conversationDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

            if (conversationDate.getTime() === today.getTime()) {
                groups['今天'].push(conversation);
            } else {
                groups['更早'].push(conversation);
            }
        });

        // 移除空组
        Object.keys(groups).forEach(key => {
            if (groups[key].length === 0) {
                delete groups[key];
            }
        });

        return groups;
    }

    /**
     * 绑定历史记录项事件
     */
    bindHistoryItemEvents() {
        const historyList = this.container.querySelector('#history-list');
        if (!historyList) return;

        // 绑定item点击事件
        historyList.querySelectorAll('.chat-history-item').forEach(item => {
            this.addDOMListener(item, 'click', (e) => {
                // 如果点击的是按钮，不触发item选择
                if (e.target.closest('.chat-history-action-btn')) {
                    return;
                }

                const conversationId = item.dataset.conversationId;
                console.log('💆 点击历史记录项:', {
                    conversationId,
                    dataset: item.dataset,
                    element: item
                });
                this.selectConversation(conversationId);
            });
        });

        // 绑定操作按钮事件
        historyList.querySelectorAll('.chat-history-action-btn').forEach(btn => {
            this.addDOMListener(btn, 'click', async (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const conversationId = btn.dataset.conversationId;
                await this.handleItemAction(action, conversationId);
            });
        });
    }

    /**
     * 处理item操作
     */
    async handleItemAction(action, conversationId) {
        console.log(`🔧 ${action} 会话:`, conversationId);

        switch (action) {
            case 'edit':
                await this.editConversation(conversationId);
                break;
            case 'delete':
                await this.deleteConversation(conversationId);
                break;
        }
    }

    /**
     * 编辑会话标题
     */
    async editConversation(conversationId) {
        const conversation = this.conversations.find(c => c.conversation_id === conversationId);
        if (!conversation) return;

        const currentTitle = conversation.title || '未命名对话';
        const newTitle = prompt('请输入新的标题:', currentTitle);

        if (newTitle === null || newTitle.trim() === '' || newTitle === currentTitle) {
            return;
        }

        try {
            const user = this.userManager?.getCurrentUser();
            const token = user?.access_token;
            if (!token) {
                throw new Error('请先登录');
            }

            const response = await this.chatApiService.editConversationTitle(token, conversationId, newTitle.trim());

            if (response && response.success) {
                // 更新本地数据
                conversation.title = newTitle.trim();
                this.renderHistoryList();
                console.log('✅ 会话标题更新成功');
            } else {
                throw new Error(response?.message || '更新失败');
            }
        } catch (error) {
            console.error('编辑会话标题失败:', error);
            this.notificationCenter.error(`编辑会话标题失败: ${error.message}`);
        }
    }

    /**
     * 删除会话
     */
    async deleteConversation(conversationId) {
        const confirmed = await Dialog.deleteConfirm('确定要删除这个会话吗？此操作无法撤销。');
        if (!confirmed) {
            return;
        }

        try {
            const user = this.userManager?.getCurrentUser();
            const token = user?.access_token;
            if (!token) {
                throw new Error('请先登录');
            }

            const response = await this.chatApiService.deleteConversation(token, conversationId);

            if (response && response.success) {
                // 从本地数据中移除
                this.conversations = this.conversations.filter(c => c.conversation_id !== conversationId);
                this.renderHistoryList();

                // 如果删除的是当前选中的会话，清除选中状态
                if (this.selectedConversationId === conversationId) {
                    this.selectedConversationId = null;
                    // 发送内部事件
                    this.emit('conversationDeleted', { conversationId });

                    // 通知聊天界面清空消息
                    this.emitGlobalEnhanced('chat:clear-messages');
                }

                console.log('✅ 会话删除成功');
            } else {
                throw new Error(response?.message || '删除失败');
            }
        } catch (error) {
            console.error('删除会话失败:', error);
            this.notificationCenter.error(`删除会话失败: ${error.message}`);
        }
    }

    /**
     * 格式化时间（保留原方法以备用）
     */
    formatTime(timestamp) {
        if (!timestamp) return '';

        // timestamp是秒级时间戳，需要转换为毫秒
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;

        // 小于1分钟
        if (diff < 60000) {
            return '刚刚';
        }

        // 小于1小时
        if (diff < 3600000) {
            return `${Math.floor(diff / 60000)}分钟前`;
        }

        // 小于1天
        if (diff < 86400000) {
            return `${Math.floor(diff / 3600000)}小时前`;
        }

        // 小于7天
        if (diff < 604800000) {
            return `${Math.floor(diff / 86400000)}天前`;
        }

        // 超过7天显示具体日期
        return date.toLocaleDateString();
    }

    /**
     * 获取当前选中的会话ID
     */
    getSelectedConversationId() {
        return this.selectedConversationId;
    }

    /**
     * 清除选中状态
     */
    clearSelection() {
        this.selectedConversationId = null;
        this.updateSelectedState();
    }

    /**
     * 组件销毁前的清理工作
     */
    onBeforeUnmount() {
        // BaseComponent会自动清理所有事件监听器
        super.onBeforeUnmount();

        // 清理组件特定的状态
        this.conversations = [];
        this.selectedConversationId = null;
        this.isVisible = false;
        this.isLoading = false;
    }
}