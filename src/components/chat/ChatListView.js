/**

* 聊天列表视图组件
 * 显示聊天消息列表，支持思考内容折叠、虚拟滚动等功能
 */

import { IconUtils } from '../../utils/IconUtils.js';

export class ChatListView {
    constructor(options = {}) {
        this.container = null;
        this.messages = [];
        this.shouldAutoScroll = true;
        this.scrollButton = null;
        this.eventBus = options.eventBus;
        this.chatApiService = options.chatApiService;
        this.userManager = options.userManager;
        this.settingsModal = options.settingsModal;

        // 虚拟滚动相关配置
        this.virtualScrollEnabled = true;
        this.estimatedMessageHeight = 80; // 估算的平均消息高度
        this.bufferSize = 5; // 缓冲区消息数量
        this.itemHeightMap = new Map(); // 存储实际消息高度
        this.isScrolling = false; // 滚动状态标志

        // 消息队列，防止并发添加导致顺序错乱
        this.messageQueue = [];
        this.isProcessingQueue = false;

        // 绑定事件监听
        this.setupEventListeners();
    }

    /**
     * 获取思考/推理标签文字
     * @param {string} mode - 'thinking' 或 'reasoning'
     * @param {boolean} isCompleted - 是否完成
     * @returns {string} 标签文字
     */
    getThinkingLabel(mode, isCompleted) {
        if (mode === 'reasoning') {
            return isCompleted ? '完成推理' : '推理中...';
        }
        return isCompleted ? '完成思考' : '思考中...';
    }

    /**
     * 渲染组件到指定容器
     */
    async render(container) {
        this.container = container;

        // 创建聊天列表容器
        container.innerHTML = `
            <div class="chat-list-view">
                <div class="chat-messages-container" id="chat-messages-container">
                    <!-- 消息列表将在这里渲染 -->
                    <div id="virtual-scroll-container"></div>
                </div>
            </div>
        `;

        // 选择渲染方法
        if (this.virtualScrollEnabled && this.messages.length > 20) {
            this.renderVisibleMessages();
        } else {
            this.renderMessages();
        }

        // 设置输入区域高度偏移
        this.setupInputAreaOffset();

        // 设置滚动控制
        this.setupScrollControl();
    }

    /**
     * 渲染所有消息（非虚拟滚动模式）
     */
    async renderMessages() {
        const container = this.container.querySelector('#chat-messages-container');
        if (!container) return;

        // 清空容器
        container.innerHTML = '';

        // 使用requestAnimationFrame优化渲染性能
        await this.batchRenderMessages(container, this.messages);

        // 绑定事件（使用事件委托）
        this.bindEventsWithDelegation();
    }
    
    /**
     * 虚拟滚动模式：只渲染可见区域的消息
     */
    renderVisibleMessages() {
        const container = this.container.querySelector('#chat-messages-container');
        const virtualContainer = this.container.querySelector('#virtual-scroll-container');
        
        if (!container || !virtualContainer) return;

        const containerHeight = container.clientHeight;
        const scrollTop = container.scrollTop;
        
        // 计算可见区域的起止索引
        const startIndex = Math.max(0, Math.floor(scrollTop / this.estimatedMessageHeight) - this.bufferSize);
        const visibleCount = Math.ceil(containerHeight / this.estimatedMessageHeight) + this.bufferSize * 2;
        const endIndex = Math.min(startIndex + visibleCount, this.messages.length);
        
        // 计算占位高度和偏移
        const totalHeight = this.calculateTotalHeight();
        const offsetY = this.calculateOffsetHeight(startIndex);
        
        // 设置占位元素和偏移
        virtualContainer.innerHTML = `
            <div style="height: ${offsetY}px;"></div>
            <div id="visible-messages"></div>
            <div style="height: ${totalHeight - offsetY - this.calculateVisibleHeight(startIndex, endIndex)}px;"></div>
        `;
        
        const visibleMessagesContainer = this.container.querySelector('#visible-messages');
        
        // 异步渲染可见消息
        this.batchRenderMessages(visibleMessagesContainer, this.messages.slice(startIndex, endIndex), startIndex);
        
        // 绑定事件（使用事件委托）
        this.bindEventsWithDelegation();
        
        // 记录滚动状态
        this.isScrolling = false;
    }
    
    /**
     * 计算总高度
     */
    calculateTotalHeight() {
        let totalHeight = 0;
        for (let i = 0; i < this.messages.length; i++) {
            totalHeight += this.itemHeightMap.get(i) || this.estimatedMessageHeight;
        }
        return totalHeight || this.messages.length * this.estimatedMessageHeight;
    }
    
    /**
     * 计算偏移高度
     */
    calculateOffsetHeight(startIndex) {
        let offsetHeight = 0;
        for (let i = 0; i < startIndex; i++) {
            offsetHeight += this.itemHeightMap.get(i) || this.estimatedMessageHeight;
        }
        return offsetHeight;
    }
    
    /**
     * 计算可见区域高度
     */
    calculateVisibleHeight(startIndex, endIndex) {
        let visibleHeight = 0;
        for (let i = startIndex; i < endIndex; i++) {
            visibleHeight += this.itemHeightMap.get(i) || this.estimatedMessageHeight;
        }
        return visibleHeight;
    }
    
    /**
     * 分批渲染消息
     */
    async batchRenderMessages(container, messages, startIndex = 0) {
        // 确保容器存在且正确初始化
        if (!container) {
            console.error('渲染容器未找到');
            return;
        }

        const batchSize = 10; // 每批渲染的消息数量
        let currentIndex = 0;

        // 使用数组收集HTML字符串，确保顺序
        const htmlParts = [];

        while (currentIndex < messages.length) {
            const batch = messages.slice(currentIndex, currentIndex + batchSize);

            // 串行渲染每个消息，确保顺序
            for (let i = 0; i < batch.length; i++) {
                const message = batch[i];
                const messageHtml = await this.renderMessage(message, startIndex + currentIndex + i);
                htmlParts.push(messageHtml);
            }

            currentIndex += batchSize;

            // 让出主线程，避免阻塞
            if (currentIndex < messages.length) {
                await new Promise(resolve => requestAnimationFrame(resolve));
            }
        }

        // 一次性添加所有消息HTML，确保顺序正确
        container.insertAdjacentHTML('beforeend', htmlParts.join(''));

        // 测量并更新实际消息高度
        this.updateMessageHeights(startIndex, startIndex + messages.length - 1);
    }
    
    /**
     * 更新消息实际高度
     */
    updateMessageHeights(startIndex, endIndex) {
        if (!this.virtualScrollEnabled) return;
        
        for (let i = startIndex; i <= endIndex; i++) {
            const messageElement = this.container.querySelector(`[data-message-index="${i}"]`);
            if (messageElement) {
                this.itemHeightMap.set(i, messageElement.offsetHeight);
            }
        }
    }

    /**
     * 渲染单个消息
     */
    async renderMessage(message, index = null) {
        // console.log('渲染消息渲染单个消息:', message);
        if (message.type === 'user') {
            return await this.renderUserMessage(message, index);
        } else {
            return await this.renderAssistantMessage(message, index);
        }
    }

    /**
     * 渲染用户消息
     */
    async renderUserMessage(message, index = null) {
        // console.log('渲染用户消息:', message);
        const markdownContent = await this.renderMarkdown(message.content);
        
        return `
            <div class="message-item user-message" data-message-id="${message.id}" data-message-index="${index}">
                <div class="message-content">
                    <div class="message-text">${markdownContent}</div>
                </div>
                ${this.renderUserActions(message)}
            </div>
        `;
    }

    /**
     * 渲染用户操作按钮
     */
    renderUserActions(message) {
        return `
            <div class="message-actions">
                <button class="action-btn" data-action="copy" data-message-id="${message.id}">
                    <span class="chat-btn-icon">${IconUtils.getIcon('copy', { size: 16, strokeWidth: 2 })}</span>
                </button>
                <button class="action-btn" data-action="quote" data-message-id="${message.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
                        <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
                    </svg>
                </button>
            </div>
        `;
    }

    /**
     * 渲染助手消息
     */
    async renderAssistantMessage(message, index = null) {
        // 使用新格式：reasoningContent和content是独立字段
        const thinkingContent = message.reasoningContent || null;
        const mainContent = message.content || '';

        const showActions = !message.isResponding;
        const isCompleted = !message.isResponding;
        const errorClass = message.isError ? 'error-message' : '';

        // 响应中的消息thinking section默认展开，已完成的消息默认折叠
        const thinkingExpanded = message.isResponding ? true : false;

        // 获取模式类型（thinking 或 reasoning），默认为 thinking
        const mode = message.mode || 'thinking';

        const markdownContent = await this.renderMarkdown(mainContent);

        // 如果是响应中且没有内容，显示加载动画
        const showLoading = message.isResponding && !mainContent && !thinkingContent;

        return `
            <div class="message-item assistant-message ${errorClass}" data-message-id="${message.id}" data-message-index="${index}" ${message.isResponding ? 'data-responding="true"' : ''}>
                <div class="message-content">
                    ${showLoading ? this.renderLoadingSpinner() : ''}
                    ${thinkingContent ? this.renderThinkingSection(thinkingContent, message.id, thinkingExpanded, isCompleted, mode) : ''}
                    <div class="message-text">${markdownContent}</div>
                    ${message.isError ? this.renderErrorContent(message.errorMessage || message.content) : ''}
                </div>
                ${showActions ? this.renderMessageActions(message) : ''}
            </div>
        `;
    }

    /**
     * 渲染消息操作按钮
     */
    renderMessageActions(message) {
        const isError = message.isError;

        // 添加调试日志
        if (isError) {
            console.log('🔄 渲染错误消息的操作按钮:', {
                messageId: message.id,
                content: message.content || message.errorMessage,
                isError
            });
        }

        return `
            <div class="message-actions">
                <button class="action-btn" data-action="satisfied" data-message-id="${message.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
                    </svg>
                </button>
                <button class="action-btn" data-action="unsatisfied" data-message-id="${message.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm7-13h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/>
                    </svg>
                </button>
                <button class="action-btn" data-action="copy" data-message-id="${message.id}">
                    <span class="chat-btn-icon">${IconUtils.getIcon('copy', { size: 16, strokeWidth: 2 })}</span>
                </button>
                ${isError ? `<button class="action-btn" data-action="retry" data-message-id="${message.id}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="23 4 23 10 17 10"/>
                        <polyline points="1 20 1 14 7 14"/>
                        <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
                    </svg>
                </button>` : ''}
            </div>
        `;
    }

    /**
     * 渲染思考部分
     * @param {string} thinkingContent - 思考内容
     * @param {string} messageId - 消息ID
     * @param {boolean} expanded - 是否展开
     * @param {boolean} isCompleted - 是否完成
     * @param {string} mode - 模式类型：'thinking' 或 'reasoning'
     */
    renderThinkingSection(thinkingContent, messageId, expanded = false, isCompleted = true, mode = 'thinking') {
        const contentClass = expanded ? '' : 'collapsed';
        const iconRotation = expanded ? 'rotate(90deg)' : 'rotate(0deg)';

        // 使用统一的方法获取标签文字
        const labelText = this.getThinkingLabel(mode, isCompleted);

        // 根据模式选择图标
        const iconSvg = mode === 'reasoning'
            ? IconUtils.getIcon('sparkles', { size: 18, strokeWidth: 2 })
            : IconUtils.getIcon('brain', { size: 18, strokeWidth: 2 });

        return `
            <div class="thinking-section" data-mode="${mode}">
                <div class="thinking-header" data-message-id="${messageId}">
                    <div class="thinking-icon">${iconSvg}</div>
                    <span class="thinking-label">${labelText}</span>
                    <div class="toggle-icon" style="transform: ${iconRotation}">
                        ${IconUtils.getIcon('chevron-right', { size: 16, strokeWidth: 2 })}
                    </div>
                </div>
                <div class="thinking-content ${contentClass}" id="thinking-${messageId}">
                    <div class="thinking-text">${this.escapeHtml(thinkingContent)}</div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染加载动画
     */
    renderLoadingSpinner() {
        return `
            <div class="message-loading-spinner">
                <div class="spinner"></div>
                <span class="loading-text">正在思考...</span>
            </div>
        `;
    }

    /**
     * 解析助手消息内容，分离思考和主要内容
     */
    parseAssistantContent(content) {
        // 检查是否有开始标签
        const hasThinkStart = content.includes('<think>');
        const hasThinkEnd = content.includes('</think>');

        let thinkingContent = null;
        let isThinking = false;

        if (hasThinkStart) {
            if (hasThinkEnd) {
                // 完整的思考内容
                const thinkMatch = content.match(/<think>([\s\S]*?)<\/think>/);
                thinkingContent = thinkMatch ? thinkMatch[1].replace(/^\n+|\n+$/g, '') : '';
            } else {
                // 正在思考中
                const thinkMatch = content.match(/<think>([\s\S]*)$/);
                thinkingContent = thinkMatch ? thinkMatch[1].replace(/^\n+|\n+$/g, '') : '';
                isThinking = true;
            }
        }

        const mainContent = content.replace(/<think>[\s\S]*?(<\/think>|$)/, '').trim();

        return { thinkingContent, mainContent, isThinking };
    }

    /**
     * 渲染Markdown内容
     */
    async renderMarkdown(content) {
        try {
            // 懒加载markdown工具
            const { parseMarkdown } = await import('../../utils/markdown.js');
            
            // 解析markdown，不覆盖默认设置
            const html = await parseMarkdown(content, {
                gfm: true,
                sanitize: false
            });
            
            return html;
            
        } catch (err) {
            console.warn('Markdown渲染失败，使用fallback:', err);
            return this.renderMarkdownFallback(content);
        }
    }

    /**
     * Markdown fallback 渲染
     */
    renderMarkdownFallback(content) {
        // 先保护代码块，避免被后续处理影响
        const codeBlocks = [];
        let processedContent = content.replace(/```(\w+)?\n?([\s\S]*?)```/g, (_, lang, code) => {
            const langClass = lang ? ` class="language-${lang}"` : '';
            const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`;
            // 为代码块添加header
            const languageName = lang || 'text';
            const codeId = `code-${Date.now()}-${codeBlocks.length}`;
            codeBlocks.push(`
                <div class="code-block-wrapper">
                    <div class="code-block-header">
                        <span class="code-language">${languageName}</span>
                        <button class="copy-code-btn" data-code-id="${codeId}" title="复制代码">
                            <span class="chat-btn-icon">${IconUtils.getIcon('copy', { size: 16, strokeWidth: 2 })}</span>
                        </button>
                    </div>
                    <pre${langClass} id="${codeId}"><code>${this.escapeHtml(code.trim())}</code></pre>
                </div>
            `);
            return placeholder;
        });

        // 处理其他markdown元素
        processedContent = processedContent
            // 行内代码
            .replace(/`([^`\n]+)`/g, '<code>$1</code>')
            // 粗体
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            // 斜体
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            // 链接
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
            // 标题
            .replace(/^### (.*$)/gm, '<h3>$1</h3>')
            .replace(/^## (.*$)/gm, '<h2>$1</h2>')
            .replace(/^# (.*$)/gm, '<h1>$1</h1>')
            // 无序列表
            .replace(/^\s*[-*+]\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
            // 有序列表
            .replace(/^\s*\d+\.\s+(.+)$/gm, '<li>$1</li>')
            .replace(/(<li>.*<\/li>)/gs, '<ol>$1</ol>')
            // 段落处理：只有双换行符才会创建新段落
            .replace(/\n\n/g, '</p><p>')
            .replace(/^(.+)$/gm, '<p>$1</p>');

        // 恢复代码块
        codeBlocks.forEach((codeBlock, index) => {
            processedContent = processedContent.replace(`__CODE_BLOCK_${index}__`, codeBlock);
        });

        return processedContent;
    }

    /**
     * 使用事件委托绑定所有事件
     */
    bindEventsWithDelegation() {
        const container = this.container.querySelector('#chat-messages-container');
        if (!container) return;
        
        // 移除旧的事件监听器
        container.removeEventListener('click', this.handleContainerClick);
        
        // 绑定新的事件监听器（使用箭头函数保留this上下文）
        this.handleContainerClick = (e) => {
            // 思考折叠事件
            if (e.target.closest('.thinking-header')) {
                const header = e.target.closest('.thinking-header');
                const messageId = header.dataset.messageId;
                const content = this.container.querySelector(`[id="thinking-${messageId}"]`);
                const icon = header.querySelector('.toggle-icon');

                if (content.classList.contains('collapsed')) {
                    content.classList.remove('collapsed');
                    icon.style.transform = 'rotate(90deg)';
                } else {
                    content.classList.add('collapsed');
                    icon.style.transform = 'rotate(0deg)';
                }
                
                // 更新消息高度
                if (this.virtualScrollEnabled) {
                    const messageElement = this.container.querySelector(`[data-message-id="${messageId}"]`);
                    const index = messageElement?.dataset?.messageIndex;
                    if (index !== undefined) {
                        this.itemHeightMap.set(parseInt(index), messageElement.offsetHeight);
                    }
                }
            }
            
            // 消息操作按钮事件
            if (e.target.closest('.action-btn')) {
                const btn = e.target.closest('.action-btn');
                const action = btn.dataset.action;
                const messageId = btn.dataset.messageId;
                this.handleMessageAction(action, messageId);
            }
            
            // 代码块复制按钮事件
            if (e.target.closest('.copy-code-btn')) {
                const btn = e.target.closest('.copy-code-btn');
                const codeId = btn.dataset.codeId;
                this.copyCodeBlock(codeId);
            }
        };
        
        container.addEventListener('click', this.handleContainerClick);
    }

    /**
     * 渲染错误内容
     */
    renderErrorContent(errorMessage) {
        return `
            <div class="message-error-content">
                ${this.escapeHtml(errorMessage)}
            </div>
        `;
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 设置输入区域高度偏移
     */
    setupInputAreaOffset() {
        // 等待DOM渲染完成
        setTimeout(() => {
            this.updateInputAreaOffset();

            // 监听窗口大小变化
            window.addEventListener('resize', () => {
                this.updateInputAreaOffset();
            });

            // 定期检查高度变化（防止动态内容导致高度变化）
            setInterval(() => {
                this.updateInputAreaOffset();
            }, 1000);
        }, 500); // 增加等待时间，确保所有组件都渲染完成
    }

    /**
     * 更新输入区域高度偏移
     */
    updateInputAreaOffset() {
        // 查找整个输入容器，包括按钮和输入框
        const inputContainer = document.querySelector('.chat-input-container');
        const messagesContainer = this.container.querySelector('.chat-messages-container');

        if (inputContainer && messagesContainer) {
            // 获取整个输入容器的完整高度（包括按钮区域和输入框）
            const inputContainerHeight = inputContainer.offsetHeight;
            // console.log('输入容器总高度:', inputContainerHeight);

            // 设置底部偏移，确保最后的消息不被遮挡
            messagesContainer.style.paddingBottom = `${inputContainerHeight + 20}px`; // 额外20px间距

            // 更新滚动按钮位置
            this.updateScrollButtonPosition(inputContainerHeight);
        }
    }

    /**
     * 处理消息队列
     */
    async processMessageQueue() {
        if (this.isProcessingQueue || this.messageQueue.length === 0) {
            return;
        }

        this.isProcessingQueue = true;

        while (this.messageQueue.length > 0) {
            const queueItem = this.messageQueue.shift();
            const { message, resolve, isStream } = queueItem;

            if (isStream) {
                // 流式消息的特殊处理
                await this._addStreamMessageInternal(message);
            } else {
                // 普通消息
                await this._addMessageInternal(message);
            }

            resolve();
        }

        this.isProcessingQueue = false;
    }

    /**
     * 添加新消息（增量渲染） - 使用队列确保顺序
     */
    async addMessage(message) {
        return new Promise((resolve) => {
            this.messageQueue.push({ message, resolve });
            this.processMessageQueue();
        });
    }

    /**
     * 内部消息添加实现
     */
    async _addMessageInternal(message) {
        // 确保容器存在且正确初始化
        const container = this.container.querySelector('#chat-messages-container');
        if (!container) {
            console.error('消息容器未找到');
            return;
        }

        // 确保消息ID唯一
        const existingMessage = this.messages.find(m => m.id === message.id);
        if (existingMessage) {
            console.warn('尝试添加重复的消息ID:', message.id);
            return;
        }

        if (this.messages.length === 0) {
            // 清空容器 - 解决缓存问题
            container.innerHTML = '';
        }

        this.messages.push(message);

        // 用户发送新消息时，重置自动滚动并滚动到底部
        if (message.type === 'user') {
            this.shouldAutoScroll = true;
        }

        // 根据模式选择渲染方法
        if (this.virtualScrollEnabled && this.messages.length > 20) {
            // 虚拟滚动模式下重新渲染并滚动到底部
            this.renderVisibleMessages();
            this.scrollToBottom();
        } else {
            // 非虚拟滚动模式下增量渲染
            const messageHtml = await this.renderMessage(message);

            // 使用标准DOM操作确保顺序正确
            container.insertAdjacentHTML('beforeend', messageHtml);

            // 重新绑定事件委托
            this.bindEventsWithDelegation();

            this.scrollToBottom();
        }

        this.updateInputAreaOffset();
    }

    /**
     * 内部流式消息添加实现
     */
    async _addStreamMessageInternal(message) {
        // 确保容器存在且正确初始化
        const container = this.container.querySelector('#chat-messages-container');
        if (!container) {
            console.error('消息容器未找到');
            return;
        }

        // 确保消息ID唯一
        const existingMessage = this.messages.find(m => m.id === message.id);
        if (existingMessage) {
            console.warn('尝试添加重复的消息ID:', message.id);
            return;
        }

        this.messages.push(message);

        // 直接添加单个消息元素，避免重新渲染所有消息
        const messageHtml = await this.renderMessage(message);
        container.insertAdjacentHTML('beforeend', messageHtml);
        this.bindEventsWithDelegation();

        this.scrollToBottom();
    }

    /**
     * 添加模拟消息（增量渲染）
     * 这个方法专门用于处理来自Header.js的模拟数据
     */
    async addMockMessage(message) {
        // 直接添加消息到消息数组
        this.messages.push(message);
        
        // 根据模式选择渲染方法
        if (this.virtualScrollEnabled && this.messages.length > 20) {
            // 虚拟滚动模式下直接滚动到底部
            this.scrollToBottom();
        } else {
            // 非虚拟滚动模式下增量渲染
            const container = this.container.querySelector('#chat-messages-container');
            if (container) {
                const messageHtml = await this.renderMessage(message);
                container.insertAdjacentHTML('beforeend', messageHtml);
                
                // 重新绑定事件委托
                this.bindEventsWithDelegation();
            }
        }
        
        // 如果是用户类型的消息，重置自动滚动
        if (message.type === 'user') {
            this.shouldAutoScroll = true;
        }
        
        // 滚动到底部
        this.scrollToBottom();
        
        // 更新输入区域高度偏移
        this.updateInputAreaOffset();
    }

    /**
     * 开始响应消息 - 使用队列确保顺序
     * @param {string} type - 消息类型，默认为'assistant'
     * @param {string} mode - 模式类型：'thinking' 或 'reasoning'
     */
    async startStreamMessage(type = 'assistant', mode) {
        // 创建临时消息ID，后续会被服务器ID替换
        const tempId = `temp_${Date.now()}_${Math.floor(Math.random() * 1000000)}`;

        const message = {
            id: tempId,
            type: type,
            content: '',
            reasoningContent: '',  // 初始化深思内容字段
            timestamp: new Date().toISOString(),
            isResponding: true,  // 标记为响应中
            mode: mode  // 模式类型：'thinking' 或 'reasoning'
        };

        // 使用队列机制添加消息，确保顺序
        await new Promise((resolve) => {
            this.messageQueue.push({
                message,
                resolve,
                isStream: true // 标记为流式消息
            });
            this.processMessageQueue();
        });

        return message;
    }

    /**
     * 更新响应中消息的内容
     * @param {string|null} content - 正常内容
     * @param {string|null} reasoningContent - 深思内容
     * @param {string|null} serverMessageId - 服务器返回的消息ID（首次接收时）
     * @param {string|null} conversationId - 会话ID
     */
    updateStreamMessage(content = null, reasoningContent = null, serverMessageId = null, conversationId = null) {
        // 查找正在响应的消息
        const message = this.messages.find(m => m.isResponding === true);
        if (!message) {
            console.error('[updateStreamMessage] 找不到正在响应的消息');
            return;
        }

        // 如果首次接收到服务器消息ID，更新消息ID
        if (serverMessageId && message.id !== serverMessageId) {
            console.log('[updateStreamMessage] 更新消息ID:', { oldId: message.id, newId: serverMessageId });
            message.id = serverMessageId;
        }

        // 如果有conversationId，保存它
        if (conversationId) {
            message.conversationId = conversationId;
        }

        // 分别累积content和reasoningContent（包括空字符串）
        if (content !== null) {
            message.content = (message.content || '') + content;
        }
        if (reasoningContent !== null) {
            message.reasoningContent = (message.reasoningContent || '') + reasoningContent;
        }

        // 剔除首尾换行符用于显示
        const trimmedContent = message.content.trim();
        const trimmedReasoningContent = message.reasoningContent.trim();

        // 直接通过data-responding属性查找DOM元素
        const messageElement = this.container.querySelector('[data-responding="true"]');
        if (messageElement) {
            // 如果消息ID更新了，同步更新DOM的data-message-id属性
            if (serverMessageId && messageElement.getAttribute('data-message-id') !== serverMessageId) {
                messageElement.setAttribute('data-message-id', serverMessageId);
            }

            // 更新DOM元素（传入剔除首尾空白后的内容）
            this.updateMessageElement(trimmedContent, trimmedReasoningContent);
            
            // 更新后重新绑定代码块事件
            this.bindCodeBlockEvents();
        } else {
            console.warn('找不到正在响应的消息元素，重新渲染');
            this.renderMessages();
        }

        this.autoScrollToBottom();
    }

    /**
     * 完成响应消息
     */
    finishStreamMessage() {
        const message = this.messages.find(m => m.isResponding === true);
        if (!message) {
            console.warn('[finishStreamMessage] 找不到正在响应的消息');
            return;
        }

        // 标记响应完成，并剔除内容首尾换行符
        message.isResponding = false;
        message.content = message.content.trim();
        message.reasoningContent = message.reasoningContent.trim();

        // 查找DOM元素并移除响应中标记
        const messageElement = this.container.querySelector('[data-responding="true"]');
        if (messageElement) {
            messageElement.removeAttribute('data-responding');

            // 隐藏加载动画（如果存在）
            const loadingSpinner = messageElement.querySelector('.message-loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.remove(); // 直接移除而不是隐藏
            }

            const thinkingLabel = messageElement.querySelector('.thinking-label');
            const mode = messageElement.getAttribute('data-mode') || 'thinking';

            // 如果有reasoningContent，根据模式更新状态为完成
            if (thinkingLabel && message.reasoningContent) {
                thinkingLabel.textContent = this.getThinkingLabel(mode, true);
            }

            // 添加消息操作按钮（如果还不存在）
            if (!messageElement.querySelector('.message-actions')) {
                const actionsHtml = this.renderMessageActions(message);
                messageElement.insertAdjacentHTML('beforeend', actionsHtml);
                // 事件委托会自动处理新添加的按钮，无需重新绑定
            }
        }

        this.scrollToBottom();
    }

    /**
     * 更新响应中消息的DOM元素
     * @param {string} content - 正常内容
     * @param {string|null} reasoningContent - 深思内容（可选）
     */
    updateMessageElement(content, reasoningContent = null) {
        // 直接查找响应中的消息元素
        const messageElement = this.container.querySelector('[data-responding="true"]');
        if (!messageElement) {
            console.warn('[updateMessageElement] 找不到响应中的消息元素');
            return;
        }

        // 隐藏加载动画（当有内容或深思内容时）
        if (content || reasoningContent) {
            const loadingSpinner = messageElement.querySelector('.message-loading-spinner');
            if (loadingSpinner) {
                loadingSpinner.style.display = 'none';
            }
        }

        const messageId = messageElement.getAttribute('data-message-id');
        const mode = messageElement.getAttribute('data-mode') || 'thinking';

        // 检查是否有思考内容
        let thinkingSection = messageElement.querySelector('.thinking-section');

        // 如果有reasoningContent但还没有thinking section，创建它
        if (reasoningContent && !thinkingSection) {
            const messageContent = messageElement.querySelector('.message-content');
            const thinkingHtml = this.renderThinkingSection(reasoningContent, messageId, true, false, mode);
            messageContent.insertAdjacentHTML('afterbegin', thinkingHtml);
            this.bindEventsWithDelegation();
            thinkingSection = messageElement.querySelector('.thinking-section');
        }

        // 更新思考内容（如果thinking section已经存在）
        if (thinkingSection && reasoningContent !== null && reasoningContent !== undefined) {
            const thinkingText = thinkingSection.querySelector('.thinking-text');
            const thinkingLabel = thinkingSection.querySelector('.thinking-label');

            if (thinkingText) {
                thinkingText.textContent = reasoningContent;  // 使用textContent而不是innerHTML，避免转义问题
            }

            // 根据模式更新标签文字 - 正在响应时显示"正在思考..."或"正在推理..."
            if (thinkingLabel) {
                thinkingLabel.textContent = this.getThinkingLabel(mode, false);
            }
        }

        // 更新主要内容
        const messageText = messageElement.querySelector('.message-text');
        if (messageText && content) {
            // 如果有thinking section且开始输出content，说明深思/推理已完成
            if (thinkingSection && content) {
                const thinkingLabel = thinkingSection.querySelector('.thinking-label');
                if (thinkingLabel) {
                    const inProgressText = this.getThinkingLabel(mode, false);
                    if (thinkingLabel.textContent === inProgressText) {
                        thinkingLabel.textContent = this.getThinkingLabel(mode, true);
                    }
                }
            }

            // 异步渲染markdown内容
            this.renderMarkdown(content).then(html => {
                messageText.innerHTML = html;
            }).catch(err => {
                console.warn('Markdown渲染失败:', err);
                messageText.innerHTML = this.renderMarkdownFallback(content);
            });
        }
    }

    /**
     * 滚动到底部
     */
    scrollToBottom() {
        const container = this.container.querySelector('.chat-messages-container');
        if (container) {
            container.scrollTop = container.scrollHeight;
            this.updateScrollButton();
        }
    }

    /**
     * 自动滚动到底部（智能滚动）
     */
    autoScrollToBottom() {
        if (this.shouldAutoScroll) {
            this.scrollToBottom();
        }
    }

    /**
     * 设置滚动控制
     */
    setupScrollControl() {
        const container = this.container.querySelector('.chat-messages-container');
        if (!container) return;

        // 创建滚动到底部按钮
        this.createScrollButton();

        // 监听滚动事件
        container.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

            // 如果距离底部超过50px，停止自动滚动
            this.shouldAutoScroll = distanceFromBottom <= 50;

            // 更新滚动按钮显示状态
            this.updateScrollButton();
            
            // 虚拟滚动模式下，当滚动时重新渲染可见区域
            if (this.virtualScrollEnabled && this.messages.length > 20 && !this.isScrolling) {
                this.isScrolling = true;
                requestAnimationFrame(() => {
                    this.renderVisibleMessages();
                });
            }
        });
    }

    /**
     * 创建滚动到底部按钮
     */
    createScrollButton() {
        this.scrollButton = document.createElement('button');
        this.scrollButton.className = 'scroll-to-bottom-btn';
        this.scrollButton.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M7 13l3 3 3-3"/>
                <path d="M7 6l3 3 3-3"/>
            </svg>
        `;
        this.scrollButton.style.display = 'none';

        this.scrollButton.addEventListener('click', () => {
            this.shouldAutoScroll = true;
            this.scrollToBottom();
        });

        // 添加到聊天区域
        const chatMessagesArea = document.querySelector('.chat-messages-area');
        if (chatMessagesArea) {
            chatMessagesArea.appendChild(this.scrollButton);
        }
    }

    /**
     * 更新滚动按钮显示状态
     */
    updateScrollButton() {
        if (!this.scrollButton) return;

        // 检查是否在聊天界面且历史记录侧边栏未显示
        const isChatView = window.location.hash.includes('/chat');
        const historyVisible = document.querySelector('.chat-history-sidebar[style*="block"]') ||
            document.querySelector('.chat-history-sidebar.show');

        if (!isChatView || historyVisible) {
            this.scrollButton.style.display = 'none';
            return;
        }

        const container = this.container.querySelector('.chat-messages-container');
        if (!container) return;

        const { scrollTop, scrollHeight, clientHeight } = container;
        const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

        // 距离底部超过50px时显示按钮
        if (distanceFromBottom > 50) {
            this.scrollButton.style.display = 'flex';
        } else {
            this.scrollButton.style.display = 'none';
        }
    }

    /**
     * 更新滚动按钮位置
     */
    updateScrollButtonPosition(inputHeight) {
        if (this.scrollButton) {
            // 按钮位于输入区域上方20px
            this.scrollButton.style.bottom = `${inputHeight + 20}px`;
        }
    }


    /**
     * 处理消息操作
     */
    async handleMessageAction(action, messageId) {
        const message = this.messages.find(m => m.id == messageId);
        if (!message) return;

        switch (action) {
            case 'satisfied':
            case 'unsatisfied':
                await this.submitFeedback(action, messageId);
                break;
            case 'copy':
                this.copyMessage(message);
                break;
            case 'quote':
                this.quoteMessage(message);
                break;
            case 'retry':
                this.retryMessage(message);
                break;
        }
    }

    /**
     * 提交反馈
     */
    async submitFeedback(rating, messageId) {
        try {
            if (this.onFeedback) {
                await this.onFeedback(rating, messageId);
            }
        } catch (error) {
            console.error('提交反馈失败:', error);
        }
    }

    /**
     * 复制消息
     */
    copyMessage(message) {
        let content = message.content;
        if (message.type === 'assistant') {
            const { mainContent } = this.parseAssistantContent(message.content);
            content = mainContent;
        }
        
        // 获取对应的复制按钮
        const copyButton = this.container.querySelector(`[data-action="copy"][data-message-id="${message.id}"]`);
        if (copyButton) {
            // 保存原始图标内容
            const originalIcon = copyButton.innerHTML;
            
            // 切换为copy-check图标
            copyButton.innerHTML = `<span class="chat-btn-icon">${IconUtils.getIcon('copy-check', { size: 16, strokeWidth: 2 })}</span>`;
            
            // 3秒后恢复原始图标
            setTimeout(() => {
                copyButton.innerHTML = originalIcon;
            }, 3000);
        }
        
        navigator.clipboard.writeText(content).then(() => {
            // this.showToast('内容已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            this.showToast('复制失败', 'error');
        });
    }

    /**
     * 引用消息
     */
    quoteMessage(message) {
        if (this.onQuote) {
            this.onQuote(message.content);
        }
    }

    /**
     * 重试消息
     */
    retryMessage(message) {
        if (this.onRetry) {
            this.onRetry(message);
        }
    }

    /**
     * 删除指定消息
     * @param {string} messageId - 要删除的消息ID
     * @param {boolean} skipRender - 是否跳过重新渲染（用于批量删除）
     */
    removeMessage(messageId, skipRender = false) {
        const messageIndex = this.messages.findIndex(m => m.id === messageId);
        if (messageIndex === -1) {
            console.warn('未找到要删除的消息:', messageId);
            return;
        }

        // 从消息数组中删除
        this.messages.splice(messageIndex, 1);

        // 清除对应的高度缓存
        if (this.virtualScrollEnabled) {
            this.itemHeightMap.delete(messageIndex);
        }

        console.log('已删除消息:', messageId);

        // 如果不跳过渲染，则重新渲染消息列表
        if (!skipRender) {
            if (this.virtualScrollEnabled && this.messages.length > 20) {
                this.renderVisibleMessages();
            } else {
                this.renderMessages();
            }
        }
    }

    /**
     * 批量删除消息
     * @param {string[]} messageIds - 要删除的消息ID数组
     */
    removeMessages(messageIds) {
        if (!messageIds || messageIds.length === 0) {
            return;
        }

        // 批量删除，不立即渲染
        messageIds.forEach(id => this.removeMessage(id, true));

        // 所有删除完成后，统一渲染一次
        if (this.virtualScrollEnabled && this.messages.length > 20) {
            this.renderVisibleMessages();
        } else {
            this.renderMessages();
        }

        console.log('已批量删除消息:', messageIds);
    }

    /**
     * 清空消息
     */
    clearMessages() {
        this.messages = [];
        this.renderMessages();

        // 清除ChatApiService中的当前会话ID
        if (this.chatApiService && this.chatApiService.clearCurrentConversationId) {
            this.chatApiService.clearCurrentConversationId();
        }
    }

    /**
     * 设置事件监听
     */
    setupEventListeners() {
        if (this.eventBus) {
            // 监听加载会话事件
            this.eventBus.on('chat:load-conversation', (event) => {
                console.log('📡 收到 chat:load-conversation 事件:', event);
                const data = event.data || event;
                this.loadConversation(data.conversationId, data.messages);
            });
        }
    }

    /**
     * 加载历史会话
     */
    loadConversation(conversationId, messages) {
        console.log('📯 ChatListView.loadConversation 被调用:', { conversationId, messages, messagesLength: messages?.length });

        // 清空当前消息和高度缓存
        this.messages = [];
        this.itemHeightMap.clear();

        // 转换消息格式并加载
        if (messages && messages.length > 0) {
            this.messages = messages.map((msg) => {
                // 去除 content 和 reasoningContent 首尾换行符
                let content = msg.content || '';
                let reasoningContent = msg.reasoningContent || '';

                // 去除首尾换行符
                if (content && (content.startsWith('\n') || content.endsWith('\n'))) {
                    content = content.replace(/^\n+|\n+$/g, '');
                }
                if (reasoningContent && (reasoningContent.startsWith('\n') || reasoningContent.endsWith('\n'))) {
                    reasoningContent = reasoningContent.replace(/^\n+|\n+$/g, '');
                }

                const convertedMsg = {
                    id: msg.id,  // 使用后端提供的ID
                    conversationId: msg.conversationId || conversationId,  // 保留会话ID
                    type: msg.role === 'user' ? 'user' : 'assistant',
                    content: content,
                    reasoningContent: reasoningContent,  // 添加深思内容字段
                    timestamp: msg.created_at ? new Date(msg.created_at * 1000).toISOString() : new Date().toISOString()
                };
                // console.log('🔄 转换消息[' + index + ']:', msg, '->', convertedMsg);
                return convertedMsg;
            });
        }

        // 选择渲染方法
        if (this.virtualScrollEnabled && this.messages.length > 20) {
            this.renderVisibleMessages();
        } else {
            this.renderMessages();
        }
        
        this.scrollToBottom();

        console.log(`✅ 已加载会话 ${conversationId}，包含 ${this.messages.length} 条消息`);
    }

    /**
     * 获取上下文消息（用于发送新消息时）
     */
    getContextMessages(contextCount) {
        if (!this.chatApiService || !this.chatApiService.getContextMessages) {
            return this.messages.slice(-contextCount * 2);
        }

        return this.chatApiService.getContextMessages(this.messages, contextCount);
    }

    /**
     * 发送消息时获取历史上下文
     */
    prepareMessagesForSending(newMessage) {
        const contextCount = this.settingsModal?.settings?.contextMessages || 1;
        const contextMessages = this.getContextMessages(contextCount);

        // 转换为API格式
        const apiMessages = contextMessages.map(msg => ({
            role: msg.type === 'user' ? 'user' : 'assistant',
            content: msg.content
        }));

        // 添加新消息
        apiMessages.push({
            role: 'user',
            content: newMessage
        });

        return apiMessages;
    }

    /**
     * 根据编程语言获取文件扩展名
     */
    getFileExtension(lang) {
        const extensions = {
            'javascript': 'js',
            'typescript': 'ts',
            'python': 'py',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'csharp': 'cs',
            'php': 'php',
            'ruby': 'rb',
            'go': 'go',
            'rust': 'rs',
            'swift': 'swift',
            'kotlin': 'kt',
            'scala': 'scala',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yml',
            'yml': 'yml',
            'sql': 'sql',
            'bash': 'sh',
            'shell': 'sh',
            'powershell': 'ps1',
            'dockerfile': 'dockerfile',
            '``': 'md',
            'text': 'txt'
        };
        return extensions[lang?.toLowerCase()] || 'txt';
    }

    /**
     * 绑定代码块按钮事件
     * 注意：现在使用事件委托处理，此方法保留用于兼容性但实际不执行任何操作
     */
    bindCodeBlockEvents() {
        // 代码块复制按钮已通过 bindEventsWithDelegation 中的事件委托处理
        // 无需单独绑定事件
    }

    /**
     * 复制代码块内容
     */
    async copyCodeBlock(codeId) {
        const codeElement = this.container.querySelector(`#${codeId} code`);
        if (!codeElement) return;
        
        // 获取对应的复制按钮
        const copyButton = this.container.querySelector(`[data-code-id="${codeId}"]`);

        // 去除首尾空白字符（包括多余的换行）
        const codeText = codeElement.textContent.trim();
        try {
            await navigator.clipboard.writeText(codeText);
            // this.showToast('代码已复制到剪贴板', 'success');
            
            if (copyButton) {
                // 保存原始图标内容
                const originalIcon = copyButton.innerHTML;
                
                // 切换为copy-check图标
                copyButton.innerHTML = `<span class="chat-btn-icon">${IconUtils.getIcon('copy-check', { size: 16, strokeWidth: 2 })}</span>`;
                
                // 3秒后恢复原始图标
                setTimeout(() => {
                    copyButton.innerHTML = originalIcon;
                }, 3000);
            }
        } catch (err) {
            console.error('复制失败:', err);
            this.showToast('复制失败', 'error');
        }
    }

    /**
     * 更新消息的服务器信息（id和conversationId）
     */
    updateMessageServerInfo(localMessageId, serverMessageId, conversationId) {
        const message = this.messages.find(m => m.id === localMessageId);
        if (message) {
            if (serverMessageId) {
                message.id = serverMessageId;
            }
            if (conversationId) {
                message.conversationId = conversationId;
            }
            console.log('[ChatListView.updateMessageServerInfo] 更新消息信息:', { localMessageId, serverMessageId, conversationId });
        }
    }

    /**
     * 更新消息的serverId
     */
    updateMessageServerID(localMessageId, serverMessageId) {
        const message = this.messages.find(m => m.id === localMessageId);
        if (message) {
            message.id = serverMessageId;
            console.log('[ChatListView.updateMessageServerID] 更新消息与API ID:', { localMessageId, serverMessageId });
        }
    }

    /**
     * 显示提示消息
     */
    showToast(message, type = 'success') {
        // 如果有通知管理器，使用它显示消息
        if (this.eventBus) {
            this.eventBus.emit('notification:show', {
                message: message,
                type: type,
                duration: 3000
            });
        } else {
            // 否则使用简单的控制台日志
            console.log(`[${type}] ${message}`);
        }
    }

}
