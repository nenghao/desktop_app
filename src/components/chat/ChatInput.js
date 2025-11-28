/**
 * 聊天输入组件
 * 独立的输入区域组件，包含新建聊天、输入框和功能按钮
 */

import { BaseComponent } from '../../core/BaseComponent.js';
import { COMPONENT_EVENTS, UI_EVENTS } from '../../core/EventConstants.js';
import { ModelSelector } from './ModelSelector.js';
import { RoleSelector } from './RoleSelector.js';
import { ContentTypeSelector } from './ContentTypeSelector.js';
import { configCacheService } from '../../services/ConfigCacheService.js';

export class ChatInput extends BaseComponent {
  constructor(options = {}) {
    super(options);
    
    this.modelSelector = null;
    this.roleSelector = null;
    this.contentTypeSelector = null;
    this.currentModel = 'GLM-4';
    this.currentRole = '通用协作';
    this.isTyping = false;
    this.userManager = options.userManager;
    this.configCacheService = options.configCacheService || configCacheService;

    // 功能模式状态
    this.thinking = false; // 深思模式，默认关闭
    this.reasoning = false; // 推理模式，默认关闭
    this.isExpanded = false; // 输入框展开状态

    // 事件回调
    this.onSendMessage = options.onSendMessage;
    this.onStopMessage = options.onStopMessage;
    this.onNewChat = options.onNewChat;
    this.onModelChange = options.onModelChange;
    this.onRoleChange = options.onRoleChange;
  }

  getDefaultOptions() {
    return {
      userManager: null,
      onSendMessage: null,
      onStopMessage: null,
      onNewChat: null,
      onModelChange: null,
      onRoleChange: null
    };
  }

  getEventNamespace() {
    return 'chatinput';
  }

  /**
   * 渲染输入组件
   */
  async render(container, props = {}) {

    container.className = 'chat-input-container';
    container.innerHTML = `
      <!-- 输入框区域 -->
      <div class="chat-input-wrapper ${this.isExpanded ? 'expanded' : 'collapsed'}">
        <!-- 展开按钮 -->
        <button class="expand-button" id="expand-button">
          <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 5v14M5 12h14"/>
          </svg>
        </button>
        <!-- 发送按钮 -->
        <button class="expand-button send-button" id="send-button">
          <svg class="expand-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 2L11 13"/>
            <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
          </svg>
        </button>
        <!-- 统一的输入框 -->
        <textarea
          class="chat-input ${this.isExpanded ? 'expanded' : 'collapsed'}"
          id="chat-input"
          placeholder="询问任何问题"
          spellcheck="false"
          rows="1"
          maxlength="4000"
        ></textarea>

        <!-- 主控制行 -->
        <div class="control-row">
          <!-- 展开时的功能按钮 -->
          <div class="chat-footer ${this.isExpanded ? 'expanded' : 'collapsed'}">
            <div class="chat-controls-left">
              <!-- 角色选择器 -->
              <button class="control-btn role-selector-btn" id="role-selector-btn">
                <span class="role-name">${this.currentRole}</span>
                <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              <!-- 模型选择器 -->
              <button class="control-btn model-selector-btn" id="model-selector-btn">
                <span class="model-name">${this.currentModel}</span>
                <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>

              <!-- 深思 -->
              <button class="control-btn thinking-btn active" id="thinking-btn">
                <svg class="thinking-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                  <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
                </svg>
                深思
              </button>

              <!-- 推理 -->
              <button class="control-btn reasoning-btn" id="reasoning-btn">
                <svg class="reasoning-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  <path d="M5 3v4"/>
                  <path d="M19 17v4"/>
                  <path d="M3 5h4"/>
                  <path d="M17 19h4"/>
                </svg>
                推理
              </button>

              <!-- 内容类型选择器（+号按钮） -->
              <button class="control-btn content-type-btn" id="content-type-btn">
                <span>+</span>
                <svg class="dropdown-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M6 9l6 6 6-6"/>
                </svg>
              </button>
            </div>
            <div class="chat-controls-right">
              <!-- 暂时空的 -->
            </div>
          </div>
        </div>
      </div>
    `;

    this.setContainer(container);
    await this.initializeComponents();
    this.setupUserEventListeners();
    this.bindEvents();
  }



  /**
   * 初始化组件
   */
  async initializeComponents() {
    // 如果没有通过构造函数注入，则使用统一的服务获取方式
    if (!this.userManager) {
      this.userManager = await window.app.getServiceAsync('userManager');
    }

    // 初始化模型选择器
    this.modelSelector = new ModelSelector();
    await this.modelSelector.initialize();

    // 初始化角色选择器
    this.roleSelector = new RoleSelector();
    await this.roleSelector.initialize();

    // 初始化内容类型选择器
    this.contentTypeSelector = new ContentTypeSelector();
    await this.contentTypeSelector.initialize();

    // 从缓存加载设置
    this.loadCachedSettings();

    // 更新UI显示
    this.updateUIWithCurrentSettings();

    // 根据当前模型更新按钮显示状态
    // 使用当前模型名称查找完整的模型对象
    const currentModel = this.modelSelector.items.find(m => m.name === this.currentModel) || this.modelSelector.getSelectedModel();
    if (currentModel) {
      this.updateButtonsVisibility(currentModel);
    }
  }

  /**
   * 从缓存加载设置
   */
  loadCachedSettings() {
    try {
      // 加载模型设置
      const cachedModel = this.configCacheService.getCachedSetting('chatModel', null);
      
      // 如果缓存的模型存在于可用模型列表中，使用缓存的模型
      // 否则使用服务器返回的默认模型
      if (cachedModel && this.modelSelector && this.modelSelector.items && this.modelSelector.items.some(model => model.name === cachedModel)) {
        this.currentModel = cachedModel;
        // 同步更新选择器中的选中状态
        this.modelSelector.items.forEach(model => {
          model.isSelected = model.name === cachedModel;
        });
        this.modelSelector.updatePopupContent();
      } else {
        const selectedModel = this.modelSelector.getSelectedModel();
        if (selectedModel) {
          this.currentModel = selectedModel.name;
        }
      }

      // 加载角色设置
      const cachedRole = this.configCacheService.getCachedSetting('chatRole', null);
      
      // 如果缓存的角色存在于可用角色列表中，使用缓存的角色
      // 否则使用服务器返回的默认角色
      if (cachedRole && this.roleSelector && this.roleSelector.items && this.roleSelector.items.some(role => role.name === cachedRole)) {
        this.currentRole = cachedRole;
        // 同步更新选择器中的选中状态
        this.roleSelector.items.forEach(role => {
          role.isSelected = role.name === cachedRole;
        });
        this.roleSelector.updatePopupContent();
      } else {
        const selectedRole = this.roleSelector.getSelectedRole();
        if (selectedRole) {
          this.currentRole = selectedRole.name;
        }
      }

      // 加载功能模式设置（默认都关闭）
      this.thinking = this.configCacheService.getCachedSetting('thinking', false);
      this.reasoning = this.configCacheService.getCachedSetting('reasoning', false);
    } catch (error) {
      this.error('加载缓存设置失败:', error);
    }
  }

  /**
   * 使用当前设置更新UI
   */
  updateUIWithCurrentSettings() {
    // 更新模型按钮显示
    const modelNameElement = this.$('.model-name');
    if (modelNameElement) {
      modelNameElement.textContent = this.currentModel;
    }

    // 更新角色按钮显示
    const roleNameElement = this.$('.role-name');
    if (roleNameElement) {
      roleNameElement.textContent = this.currentRole;
    }



    // 更新深思按钮状态
    const thinkingBtn = this.$('#thinking-btn');
    if (thinkingBtn) {
      if (this.thinking) {
        thinkingBtn.classList.add('active');
      } else {
        thinkingBtn.classList.remove('active');
      }
    }

    // 更新推理按钮状态
    const reasoningBtn = this.$('#reasoning-btn');
    if (reasoningBtn) {
      if (this.reasoning) {
        reasoningBtn.classList.add('active');
      } else {
        reasoningBtn.classList.remove('active');
      }
    }
  }

  /**
   * 设置用户事件监听
   */
  setupUserEventListeners() {
    if (this.userManager) {
      // 监听用户登录成功事件
      this.userManager.on('login:success', () => {
        this.log('用户登录成功，重新初始化选择器');
        this.reinitializeSelectors();
      });

      // 监听数据重新加载事件
      this.userManager.on('data:reload', () => {
        this.log('数据重新加载，重新初始化选择器');
        this.reinitializeSelectors();
      });
    }
  }

  /**
   * 重新初始化选择器
   */
  async reinitializeSelectors() {
    try {
      // 重新初始化模型选择器
      if (this.modelSelector) {
        await this.modelSelector.loadItems();
        const cachedModel = this.configCacheService.getCachedSetting('chatModel', null);
        
        // 优先使用缓存的模型，但确保它仍然在可用列表中
        if (cachedModel && this.modelSelector.items && this.modelSelector.items.some(model => model.name === cachedModel)) {
          this.currentModel = cachedModel;
          // 同步更新选择器中的选中状态
          this.modelSelector.items.forEach(model => {
            model.isSelected = model.name === cachedModel;
          });
          this.modelSelector.updatePopupContent();
        } else {
          const selectedModel = this.modelSelector.getSelectedModel();
          if (selectedModel) {
            this.currentModel = selectedModel.name;
            // 缓存新的模型选择
            this.configCacheService.saveSettings({ chatModel: this.currentModel });
          }
        }
      }

      // 重新初始化角色选择器
      if (this.roleSelector) {
        await this.roleSelector.loadItems();
        const cachedRole = this.configCacheService.getCachedSetting('chatRole', null);
        
        // 优先使用缓存的角色，但确保它仍然在可用列表中
        if (cachedRole && this.roleSelector.items && this.roleSelector.items.some(role => role.name === cachedRole)) {
          this.currentRole = cachedRole;
          // 同步更新选择器中的选中状态
          this.roleSelector.items.forEach(role => {
            role.isSelected = role.name === cachedRole;
          });
          this.roleSelector.updatePopupContent();
        } else {
          const selectedRole = this.roleSelector.getSelectedRole();
          if (selectedRole) {
            this.currentRole = selectedRole.name;
            // 缓存新的角色选择
            this.configCacheService.saveSettings({ chatRole: this.currentRole });
          }
        }
      }

      // 更新UI显示
      this.updateUIWithCurrentSettings();
      
      // 根据当前模型更新按钮显示状态
      const currentModel = this.modelSelector.items.find(m => m.name === this.currentModel) || this.modelSelector.getSelectedModel();
      if (currentModel) {
        this.updateButtonsVisibility(currentModel);
      }
    } catch (error) {
      this.error('重新初始化选择器失败:', error);
    }
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const chatInput = this.$('#chat-input');

    // 输入框事件
    if (chatInput) {
      this.addDOMListener(chatInput, 'input', (e) => this.handleInputChange(e));
      this.addDOMListener(chatInput, 'keydown', (e) => this.handleKeyDown(e));

      // 自动调整高度（仅在展开状态）
      const adjustHeight = () => {
        if (this.isExpanded) {
          chatInput.style.height = 'auto';
          const newHeight = Math.max(60, Math.min(chatInput.scrollHeight, 180));
          chatInput.style.height = newHeight + 'px';
        } else {
          // 折叠状态：移除内联样式，使用 CSS 控制
          chatInput.style.height = '';
        }
      };

      this.addDOMListener(chatInput, 'input', adjustHeight);

      // 初始化高度 - 延迟执行确保 DOM 完全渲染
      requestAnimationFrame(() => {
        adjustHeight();
      });
    }

    // 展开按钮
    this.bindClick('#expand-button', () => this.toggleExpanded());

    // 发送按钮
    this.bindClick('#send-button', () => {
      if (this.isTyping) {
        this.stopMessage();
      } else {
        this.sendMessage();
      }
    });

    // 内容类型选择器
    this.bindClick('#content-type-btn', (e) => {
      e.stopPropagation();
      // 如果模型选择器当前正在显示，则先隐藏它
      if (this.modelSelector) {
        this.modelSelector.hide();
      }
      if (this.contentTypeSelector) {
        this.contentTypeSelector.show(e.target, (contentType) => {
          // 处理内容类型选择
          if (contentType.id === 'image') {
            // 处理图片选择逻辑
            this.openImageUpload();
          } else if (contentType.id === 'file') {
            // 处理文件选择逻辑
            // 创建隐藏的input元素用于文件选择
            const input = document.createElement('input');
            input.type = 'file';
            input.style.display = 'none';
            
            input.onchange = (e) => {
              if (e.target.files && e.target.files[0]) {
                const file = e.target.files[0];
                // 发布文件选择事件
                this.emit('file-select', file);
                this.emitGlobal(UI_EVENTS.FILE_SELECT, file);
              }
            };
            
            document.body.appendChild(input);
            input.click();
            // 移除临时input
            setTimeout(() => {
              document.body.removeChild(input);
            }, 100);
          }
        });
      }
    });

    // 模型选择器
    this.bindClick('#model-selector-btn', (e) => this.showModelSelector(e));

    // 角色选择器
    this.bindClick('#role-selector-btn', (e) => this.showRoleSelector(e));

    // 功能按钮
    this.bindClick('#thinking-btn', () => this.toggleThinking());
    this.bindClick('#reasoning-btn', () => this.toggleReasoning());

    // 点击外部关闭选择器
    this.addDOMListener(document, 'click', (e) => {
      if (this.contentTypeSelector && !e.target.closest('.content-type-btn') && !e.target.closest('.selector-popup')) {
        this.contentTypeSelector.hide();
      }
      if (this.modelSelector && !e.target.closest('.model-selector-btn') && !e.target.closest('.selector-popup')) {
        this.modelSelector.hide();
      }
      if (this.roleSelector && !e.target.closest('.role-selector-btn') && !e.target.closest('.selector-popup')) {
        this.roleSelector.hide();
      }
    });

    // 初始化展开状态
    this.updateExpandedState();
  }

  /**
   * 将焦点设置到输入框
   */
  focusInput() {
    const chatInput = this.$('#chat-input');
    if (chatInput) {
      chatInput.focus();
    }
  }

  /**
   * 处理输入变化
   */
  handleInputChange(e) {
    const input = e.target;
    const hasContent = input.value.trim().length > 0;

    // 检查是否需要自动展开（当内容超过一行时）
    if (!this.isExpanded) {
      // 检查是否有换行符（用户主动换行）
      const hasNewline = input.value.includes('\n');

      // 检查是否因为内容过长而自动换行
      const hasAutoWrap = input.scrollHeight > input.clientHeight;

      if (hasNewline || hasAutoWrap) {
        this.isExpanded = true;
        this.updateExpandedState();
      }
    }

    // 更新发送按钮状态
    this.updateSendButtonState(hasContent);
  }

  /**
   * 更新发送按钮状态
   */
  updateSendButtonState(hasContent) {
    const sendButton = this.$('#send-button');
    if (!sendButton) return;

    const sendIcon = sendButton.querySelector('.expand-icon');

    if (this.isTyping) {
      // 显示停止图标并添加呼吸动效
      sendIcon.innerHTML = '<rect x="6" y="6" width="12" height="12" rx="2"/>';
      sendButton.disabled = false;
      sendButton.title = '停止生成';
      sendButton.classList.add('breathing');
    } else {
      // 显示发送图标
      sendIcon.innerHTML = '<path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>';
      sendButton.disabled = !hasContent;
      sendButton.title = '发送消息';
      sendButton.classList.remove('breathing');
    }
  }

  /**
   * 处理键盘事件
   */
  handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      this.sendMessage();
    }
  }

  /**
   * 发送消息
   */
  sendMessage() {
    const chatInput = this.$('#chat-input');
    const message = chatInput ? chatInput.value.trim() : '';

    if (!message || this.isTyping) return;

    const messageData = {
      model: this.currentModel,
      role: this.currentRole,
      networkMode: this.configCacheService.getCachedSetting('networkMode', false),
      thinking: this.thinking,
      reasoning: this.reasoning
    };

    // 发布内部事件
    this.emit('message-send', { message, options: messageData });
    
    // 发布全局事件
    this.emitGlobal(UI_EVENTS.CHAT_MESSAGE_SEND, { message, options: messageData });

    // 调用回调函数（向后兼容）
    if (this.onSendMessage) {
      this.onSendMessage(message, messageData);
    }

    // 清空输入框
    if (chatInput) {
      chatInput.value = '';
      // 展开状态下保持合适的高度，折叠状态移除内联样式
      if (this.isExpanded) {
        chatInput.style.height = '60px';
      } else {
        chatInput.style.height = '';
      }
      this.handleInputChange({ target: chatInput });
    }
  }

  /**
   * 停止消息生成
   */
  stopMessage() {
    // 发布内部事件
    this.emit('message-stop');
    
    // 发布全局事件
    this.emitGlobal(UI_EVENTS.CHAT_MESSAGE_STOP);

    // 调用回调函数（向后兼容）
    if (this.onStopMessage) {
      this.onStopMessage();
    }
    
    this.setTypingState(false);
  }

  /**
   * 新建聊天
   */
  newChat() {
    // 发布内部事件
    this.emit('new-chat');
    
    // 发布全局事件
    this.emitGlobal(UI_EVENTS.CHAT_NEW);

    // 调用回调函数（向后兼容）
    if (this.onNewChat) {
      this.onNewChat();
    }
  }

  /**
   * 清空历史
   */
  clearHistory() {
    this.emitGlobal(UI_EVENTS.CHAT_CLEAR_HISTORY);
    this.log('清空历史功能');
  }

  /**
   * 导出对话
   */
  exportChat() {
    this.emitGlobal(UI_EVENTS.CHAT_EXPORT);
    this.log('导出对话功能');
  }

  /**
   * 打开设置
   */
  openSettings() {
    this.emitGlobal(UI_EVENTS.SETTINGS_OPEN);
    this.log('打开设置功能');
  }

  /**
   * 显示模型选择器
   */
  showModelSelector(e) {
    if (this.modelSelector) {
      this.modelSelector.show(e.target, (model) => {
        this.currentModel = model.name;
        const modelNameElement = this.$('.model-name');
        if (modelNameElement) {
          modelNameElement.textContent = model.name;
        }

        // 缓存模型选择
        this.configCacheService.saveSetting('chatModel', this.currentModel);

        // 根据模型能力更新按钮显示状态
        this.updateButtonsVisibility(model);

        // 发布内部事件
        this.emit('model-change', model);

        // 发布全局事件
        this.emitGlobal(UI_EVENTS.MODEL_CHANGE, model);

        // 调用回调函数（向后兼容）
        if (this.onModelChange) {
          this.onModelChange(model);
        }
      });
    }
  }

  /**
   * 显示角色选择器
   */
  showRoleSelector(e) {
    if (this.roleSelector) {
      this.roleSelector.show(e.target, (role) => {
        this.currentRole = role.name;
        const roleNameElement = this.$('.role-name');
        if (roleNameElement) {
          roleNameElement.textContent = role.name;
        }

        // 缓存角色选择
        this.configCacheService.saveSettings({ chatRole: this.currentRole });

        // 发布内部事件
        this.emit('role-change', role);
        
        // 发布全局事件
        this.emitGlobal(UI_EVENTS.ROLE_CHANGE, role);

        // 调用回调函数（向后兼容）
        if (this.onRoleChange) {
          this.onRoleChange(role);
        }
      });
    }
  }



  /**
   * 根据模型能力更新按钮显示状态
   * @param {Object} model - 模型对象
   */
  updateButtonsVisibility(model) {
    const thinkingBtn = this.$('#thinking-btn');
    const reasoningBtn = this.$('#reasoning-btn');

    if (!thinkingBtn || !reasoningBtn) {
      return;
    }

    // 获取模型能力信息
    const capabilities = this.modelSelector.getModelCapabilities(model.name);
    const supportsThinking = capabilities.supportsThinking;
    const supportsReasoning = capabilities.supportsReasoning;

    console.log(`[ChatInput] 模型 ${model.name} 能力:`, capabilities);

    // 保存当前状态
    const previousThinking = this.thinking;
    const previousReasoning = this.reasoning;

    // 根据模型能力调整按钮显示
    if (supportsThinking) {
      thinkingBtn.style.display = '';
      // 保持之前的深思状态
      this.thinking = previousThinking;
    } else {
      thinkingBtn.style.display = 'none';
      // 不支持深思，强制关闭
      this.thinking = false;
    }

    if (supportsReasoning) {
      reasoningBtn.style.display = '';
      // 保持之前的推理状态
      this.reasoning = previousReasoning;
    } else {
      reasoningBtn.style.display = 'none';
      // 不支持推理，强制关闭
      this.reasoning = false;
    }

    // 更新UI状态
    if (this.thinking) {
      thinkingBtn.classList.add('active');
    } else {
      thinkingBtn.classList.remove('active');
    }

    if (this.reasoning) {
      reasoningBtn.classList.add('active');
    } else {
      reasoningBtn.classList.remove('active');
    }

    // 保存状态到缓存
    this.configCacheService.saveSettings({ thinking: this.thinking, reasoning: this.reasoning });
  }

  /**
   * 切换深思模式
   */
  toggleThinking() {
    const thinkingBtn = this.$('#thinking-btn');

    // 切换深思状态
    this.thinking = !this.thinking;

    if (this.thinking) {
      thinkingBtn.classList.add('active');
    } else {
      thinkingBtn.classList.remove('active');
    }

    // 缓存深思模式设置
    this.configCacheService.saveSettings({ thinking: this.thinking });

    // 发布内部事件
    this.emit('thinking-change', this.thinking);

    // 发布全局事件
    this.emitGlobal(UI_EVENTS.THINKING_MODE_CHANGE, this.thinking);
  }

  /**
   * 切换推理模式
   */
  toggleReasoning() {
    const reasoningBtn = this.$('#reasoning-btn');

    // 切换推理状态
    this.reasoning = !this.reasoning;

    if (this.reasoning) {
      reasoningBtn.classList.add('active');
    } else {
      reasoningBtn.classList.remove('active');
    }

    // 缓存推理模式设置
    this.configCacheService.saveSettings({ reasoning: this.reasoning });

    // 发布内部事件
    this.emit('reasoning-change', this.reasoning);

    // 发布全局事件
    this.emitGlobal(UI_EVENTS.REASONING_MODE_CHANGE, this.reasoning);
  }

  /**
   * 切换展开状态
   */
  toggleExpanded() {
    this.isExpanded = !this.isExpanded;
    this.updateExpandedState();
  }

  /**
   * 更新展开状态的UI
   */
  updateExpandedState() {
    const area = this.$('.chat-input-wrapper');
    const chatInput = this.$('#chat-input');
    const chatFooter = this.$('.chat-footer');
    const expandIcon = this.$('.expand-icon');

    if (this.isExpanded) {
      area.classList.add('expanded');
      area.classList.remove('collapsed');
      chatInput.classList.add('expanded');
      chatInput.classList.remove('collapsed');
      chatFooter.classList.add('expanded');
      chatFooter.classList.remove('collapsed');
      // 展开时显示X图标
      expandIcon.innerHTML = '<path d="M18 6L6 18M6 6l12 12"/>';
      // 调整输入框高度限制
      this.updateInputHeight();
    } else {
      area.classList.add('collapsed');
      area.classList.remove('expanded');
      chatInput.classList.add('collapsed');
      chatInput.classList.remove('expanded');
      chatFooter.classList.add('collapsed');
      chatFooter.classList.remove('expanded');
      // 折叠时显示+图标
      expandIcon.innerHTML = '<path d="M12 5v14M5 12h14"/>';
      // 重置高度 - 移除内联样式，让 CSS 控制
      chatInput.style.height = '';
    }
  }

  /**
   * 打开图片上传
   */
  openImageUpload() {
    // 创建一个隐藏的文件输入元素
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        // 发布图片选择事件
        this.emit('image-select', file);
        this.emitGlobal(UI_EVENTS.IMAGE_SELECT, file);
      }
    };
    document.body.appendChild(input);
    input.click();
    // 移除临时input
    setTimeout(() => {
      document.body.removeChild(input);
    }, 100);
  }

  /**
   * 更新输入框高度
   */
  updateInputHeight() {
    const chatInput = this.$('#chat-input');
    if (chatInput && this.isExpanded) {
      const adjustHeight = () => {
        chatInput.style.height = 'auto';
        const newHeight = Math.max(60, Math.min(chatInput.scrollHeight, 180));
        chatInput.style.height = newHeight + 'px';
      };
      adjustHeight();
      // 添加输入事件监听
      chatInput.addEventListener('input', adjustHeight);
    }
  }

  /**
   * 设置输入状态
   */
  setTypingState(isTyping) {
    this.isTyping = isTyping;
    const chatInput = this.$('#chat-input');
    const hasContent = chatInput ? chatInput.value.trim().length > 0 : false;
    this.updateSendButtonState(hasContent);
    
    // 发布状态变化事件
    this.emit('typing-state-change', isTyping);
  }

  /**
   * 获取当前输入内容
   */
  getInputValue() {
    const chatInput = this.$('#chat-input');
    return chatInput ? chatInput.value : '';
  }

  /**
   * 清空输入内容
   */
  clearInput() {
    const chatInput = this.$('#chat-input');
    if (chatInput) {
      chatInput.value = '';
      chatInput.style.height = 'auto';
      this.handleInputChange({ target: chatInput });
    }
  }

  /**
   * 设置输入内容
   */
  setInputValue(value) {
    const chatInput = this.$('#chat-input');
    if (chatInput) {
      chatInput.value = value;
      this.handleInputChange({ target: chatInput });
      chatInput.focus();
    }
  }




  /**
   * 组件卸载前清理
   */
  onBeforeUnmount() {
    if (this.modelSelector) {
      this.modelSelector.destroy();
    }
    if (this.roleSelector) {
      this.roleSelector.destroy();
    }
  }
}
