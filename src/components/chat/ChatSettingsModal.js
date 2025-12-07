import { BaseComponent } from '../../core/BaseComponent.js';
import { Modal } from '../common/Modal.js';
import { IconUtils } from '../../utils/IconUtils.js';
import { getConfigCacheService } from '../../services/index.js';
import '../lit/index.js';
import '../../styles/components/chat-settings-modal.css';

/**
 * 聊天设置模态框组件
 * 提供聊天界面专用的参数设置功能
 */
export class ChatSettingsModal extends BaseComponent {
  constructor(options = {}) {
    super(options);

    // 获取配置缓存服务实例
    this.configCacheService = getConfigCacheService();

    // 初始化设置 - 从缓存加载或使用默认值
    this.settings = this.configCacheService.initializeSettings();
    this.collapsedSections = new Set(['contextMessages', 'samplingTemperature', 'topK', 'maxTokens']);

    // 创建模态框实例
    this.modal = new Modal({
      title: '聊天设置',
      height: 'auto',
      className: 'chat-settings-modal',
      content: this.createSettingsContent(),
      closable: false, // 禁用默认关闭按钮，使用自定义的 Lit 组件
      maskClosable: true,
      showFooter: false,
      onClose: () => {
        this.handleModalClose();
      }
    });
  }

  /**
   * 处理模态框关闭
   */
  handleModalClose() {
    // 发送内部事件
    this.emit('hide');
    // 发送全局事件
    this.emitGlobal('chat:settings:modal:hide');
  }

  /**
   * 显示模态框
   */
  show() {
    // 更新内容后显示
    this.updateSettingsContent();
    this.modal.show();
    // 发送内部事件
    this.emit('show');
    // 发送全局事件
    this.emitGlobal('chat:settings:modal:show');
    
    // 调用生命周期钩子
    this.onMounted();
  }

  /**
   * 隐藏模态框
   */
  hide() {
    this.modal.hide();
  }

  /**
   * 创建设置内容
   */
  createSettingsContent() {
    const contentDiv = document.createElement('div');
    contentDiv.className = 'chat-settings-container';
    this.updateSettingsContentHTML(contentDiv);
    return contentDiv;
  }

  /**
   * 更新设置内容
   */
  updateSettingsContent() {
    const modalBody = this.modal.getBody();
    const settingsContainer = modalBody.querySelector('.chat-settings-container');
    if (settingsContainer) {
      this.updateSettingsContentHTML(settingsContainer);
      // 重新绑定事件
      this.bindEvents();
    }
  }

  /**
   * 更新设置HTML内容
   */
  updateSettingsContentHTML(container) {
    // 获取聊天参数范围
    const contextMsgRange = this.configCacheService.getParameterRange('historyCount');
    const tempRange = this.configCacheService.getParameterRange('temperature');
    const topKRange = this.configCacheService.getParameterRange('top_p');
    const maxTokensRange = this.configCacheService.getParameterRange('max_completion_tokens');
    
    container.innerHTML = `
      <!-- 使用 Lit Elements 关闭按钮 -->
      <power-close-button 
        variant="modal" 
        size="medium" 
        aria-label="关闭聊天设置窗口"
        id="chat-settings-close-btn">
      </power-close-button>
      
      <!-- 基础设置组 -->
      <div class="settings-section">
        <div class="chat-params-container">
          <!-- 联网模式 -->
          <div class="setting-item">
            <label class="setting-label">联网模式</label>
            <div class="toggle-switch ${this.settings.networkMode ? 'active' : ''}" data-setting="networkMode">
              <div class="toggle-slider"></div>
            </div>
          </div>

          <!-- 保存会话 -->
          <div class="setting-item">
            <label class="setting-label">保存会话</label>
            <div class="toggle-switch ${this.settings.saveConversation ? 'active' : ''}" data-setting="saveConversation">
              <div class="toggle-slider"></div>
            </div>
          </div>

          <!-- 流式响应 -->
          <div class="setting-item">
            <label class="setting-label">流式响应</label>
            <div class="toggle-switch ${this.settings.streamResponse ? 'active' : ''}" data-setting="streamResponse">
              <div class="toggle-slider"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 高级参数设置组 -->
      <div class="settings-section">
        <div class="chat-params-container">
          <!-- 附带消息 (可折叠) -->
          <div class="collapsible ${this.collapsedSections.has('contextMessages') ? 'collapsed' : 'expanded'}">
            <div class="setting-item collapsible-header" data-section="contextMessages">
              <label class="setting-label">附带消息</label>
              <div class="value-stepper">
                <button class="stepper-btn decrease" data-target="contextMessages" data-min="${contextMsgRange?.min || 1}" data-max="${contextMsgRange?.max || 6}" data-step="${contextMsgRange?.step || 1}">−</button>
                <input type="number" class="stepper-input" value="${this.settings.contextMessages}" 
                       min="${contextMsgRange?.min || 1}" max="${contextMsgRange?.max || 6}" step="${contextMsgRange?.step || 1}" data-target="contextMessages">
                <button class="stepper-btn increase" data-target="contextMessages" data-min="${contextMsgRange?.min || 1}" data-max="${contextMsgRange?.max || 6}" data-step="${contextMsgRange?.step || 1}">+</button>
              </div>
              ${IconUtils.getIcon('chevron-down', { className: 'collapse-arrow' })}
            </div>
            <div class="collapsible-body">
              <p class="setting-description">
                设置 AI 能记住多少条之前的对话（最多6条），一定量的保持上下文连贯
              </p>
            </div>
          </div>

          <!-- 采样温度 (可折叠) -->
          <div class="collapsible ${this.collapsedSections.has('samplingTemperature') ? 'collapsed' : 'expanded'}">
            <div class="setting-item collapsible-header" data-section="samplingTemperature">
              <label class="setting-label">采样温度</label>
              <div class="value-stepper">
                <button class="stepper-btn decrease" data-target="samplingTemperature" data-min="${tempRange?.min || 0.1}" data-max="${tempRange?.max || 1.0}" data-step="${tempRange?.step || 0.01}">−</button>
                <input type="number" class="stepper-input" value="${this.settings.samplingTemperature}" 
                       min="${tempRange?.min || 0.1}" max="${tempRange?.max || 1.0}" step="${tempRange?.step || 0.01}" data-target="samplingTemperature">
                <button class="stepper-btn increase" data-target="samplingTemperature" data-min="${tempRange?.min || 0.1}" data-max="${tempRange?.max || 1.0}" data-step="${tempRange?.step || 0.01}">+</button>
              </div>
              ${IconUtils.getIcon('chevron-down', { className: 'collapse-arrow' })}
            </div>
            <div class="collapsible-body">
              <p class="setting-description">
                控制 AI 回答的创意程度（0.1-1.0）：<br>
                🔥 0.8-1.0：回答更有创意，适合写故事、诗歌<br>
                ⚖️ 0.5-0.7：平衡模式，日常聊天推荐<br>
                🧊 0.1-0.4：回答最保守，适合事实类问题
              </p>
            </div>
          </div>

          <!-- 核采样 (可折叠) -->
          <div class="collapsible ${this.collapsedSections.has('topK') ? 'collapsed' : 'expanded'}">
            <div class="setting-item collapsible-header" data-section="topK">
              <label class="setting-label">核采样</label>
              <div class="value-stepper">
                <button class="stepper-btn decrease" data-target="topK" data-min="${topKRange?.min || 0.1}" data-max="${topKRange?.max || 1.0}" data-step="${topKRange?.step || 0.01}">−</button>
                <input type="number" class="stepper-input" value="${this.settings.topK}" 
                       min="${topKRange?.min || 0.1}" max="${topKRange?.max || 1.0}" step="${topKRange?.step || 0.01}" data-target="topK">
                <button class="stepper-btn increase" data-target="topK" data-min="${topKRange?.min || 0.1}" data-max="${topKRange?.max || 1.0}" data-step="${topKRange?.step || 0.01}">+</button>
              </div>
              ${IconUtils.getIcon('chevron-down', { className: 'collapse-arrow' })}
            </div>
            <div class="collapsible-body">
              <p class="setting-description">
                控制 AI 选择词汇的范围（0.1-1.0）：<br>
                ■ 0.1：只用最相关的10%词汇，回答很精准<br>
                ■ 0.9：使用90%的相关词汇，回答更丰富
              </p>
            </div>
          </div>

          <!-- 最大Tokens (可折叠) -->
          <div class="collapsible ${this.collapsedSections.has('maxTokens') ? 'collapsed' : 'expanded'}">
            <div class="setting-item collapsible-header" data-section="maxTokens">
              <label class="setting-label">最大Tokens</label>
              <div class="value-stepper">
                <button class="stepper-btn decrease" data-target="maxTokens" data-min="${maxTokensRange?.min || 512}" data-max="${maxTokensRange?.max || 4095}" data-step="${maxTokensRange?.step || 10}">−</button>
                <input type="number" class="stepper-input" value="${this.settings.maxTokens}" 
                       min="${maxTokensRange?.min || 512}" max="${maxTokensRange?.max || 4095}" step="${maxTokensRange?.step || 10}" data-target="maxTokens">
                <button class="stepper-btn increase" data-target="maxTokens" data-min="${maxTokensRange?.min || 512}" data-max="${maxTokensRange?.max || 4095}" data-step="${maxTokensRange?.step || 10}">+</button>
              </div>
              ${IconUtils.getIcon('chevron-down', { className: 'collapse-arrow' })}
            </div>
            <div class="collapsible-body">
              <p class="setting-description">
                控制AI每次回答的最大长度，单位为Token。
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- 重置按钮 -->
      <div class="settings-section settings-section-actions">
        <button class="reset-btn" id="reset-chat-settings">
          重置聊天参数
        </button>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  bindEvents() {
    const modalBody = this.modal.getBody();
    if (!modalBody) {
      console.warn('ChatSettingsModal: 无法找到 modal-body 元素');
      return;
    }

    // Lit 组件关闭按钮事件
    const closeBtn = modalBody.querySelector('#chat-settings-close-btn');
    if (closeBtn) {
      this.addDOMListener(closeBtn, 'power-close', () => this.hide());
    }

    // 使用统一的事件绑定方法
    // 开关切换
    const toggles = modalBody.querySelectorAll('.toggle-switch');
    toggles.forEach(toggle => {
      this.addDOMListener(toggle, 'click', (e) => this.handleToggleChange(e.currentTarget));
    });

    // 可折叠区域
    const collapsibleHeaders = modalBody.querySelectorAll('.collapsible-header');
    collapsibleHeaders.forEach(header => {
      this.addDOMListener(header, 'click', (e) => {
        // 防止步进器控件触发折叠
        if (e.target.closest('.value-stepper')) {
          return;
        }
        this.handleCollapsibleToggle(e.currentTarget);
      });
    });

    // 步进器按钮
    const stepperBtns = modalBody.querySelectorAll('.stepper-btn');
    stepperBtns.forEach(btn => {
      this.addDOMListener(btn, 'click', (e) => this.handleStepperChange(e.currentTarget));
    });

    // 步进器输入框
    const stepperInputs = modalBody.querySelectorAll('.stepper-input');
    stepperInputs.forEach(input => {
      this.addDOMListener(input, 'input', (e) => this.handleStepperInputChange(e.target));
      this.addDOMListener(input, 'blur', (e) => this.validateStepperInput(e.target));
    });

    // 重置按钮
    const resetBtn = modalBody.querySelector('#reset-chat-settings');
    if (resetBtn) {
      this.bindClick(resetBtn, () => this.handleReset());
    }
  }

  /**
   * 处理开关切换
   */
  handleToggleChange(toggle) {
    const settingName = toggle.dataset.setting;
    if (!settingName) return;

    // 切换状态
    this.settings[settingName] = !this.settings[settingName];
    
    // 更新UI
    if (this.settings[settingName]) {
      toggle.classList.add('active');
    } else {
      toggle.classList.remove('active');
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 处理可折叠区域切换
   */
  handleCollapsibleToggle(header) {
    const section = header.dataset.section;
    if (!section) return;

    // 切换折叠状态
    if (this.collapsedSections.has(section)) {
      this.collapsedSections.delete(section);
    } else {
      this.collapsedSections.add(section);
    }

    // 更新UI
    const collapsible = header.closest('.collapsible');
    if (collapsible) {
      if (this.collapsedSections.has(section)) {
        collapsible.classList.remove('expanded');
        collapsible.classList.add('collapsed');
      } else {
        collapsible.classList.remove('collapsed');
        collapsible.classList.add('expanded');
      }
    }
  }

  /**
   * 处理步进器按钮变化
   */
  handleStepperChange(btn) {
    const target = btn.dataset.target;
    const min = parseFloat(btn.dataset.min) || 0;
    const max = parseFloat(btn.dataset.max) || 100;
    const step = parseFloat(btn.dataset.step) || 1;
    
    if (!target) return;

    // 获取当前值
    let currentValue = parseFloat(this.settings[target]) || min;
    
    // 根据按钮类型增减值
    if (btn.classList.contains('decrease')) {
      currentValue = Math.max(min, currentValue - step);
    } else if (btn.classList.contains('increase')) {
      currentValue = Math.min(max, currentValue + step);
    }
    
    // 更新设置
    this.settings[target] = currentValue;
    
    // 更新UI
    const input = btn.closest('.value-stepper').querySelector('.stepper-input');
    if (input) {
      input.value = currentValue;
    }

    // 保存设置
    this.saveSettings();
  }

  /**
   * 处理步进器输入框变化
   */
  handleStepperInputChange(input) {
    const target = input.dataset.target;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    
    if (!target) return;

    // 获取输入值
    let value = parseFloat(input.value);
    
    // 验证和限制值范围
    if (isNaN(value)) {
      value = parseFloat(this.settings[target]) || min;
    } else {
      value = Math.max(min, Math.min(max, value));
    }
    
    // 更新设置
    this.settings[target] = value;
    
    // 保存设置
    this.saveSettings();
  }

  /**
   * 验证步进器输入
   */
  validateStepperInput(input) {
    const target = input.dataset.target;
    const min = parseFloat(input.min) || 0;
    const max = parseFloat(input.max) || 100;
    
    if (!target) return;

    // 获取输入值
    let value = parseFloat(input.value);
    
    // 验证和限制值范围
    if (isNaN(value)) {
      value = parseFloat(this.settings[target]) || min;
      input.value = value;
    } else {
      value = Math.max(min, Math.min(max, value));
      input.value = value;
      this.settings[target] = value;
      this.saveSettings();
    }
  }

  /**
   * 处理重置设置
   */
  handleReset() {
    if (confirm('确定要重置所有聊天参数为默认值吗？')) {
      // 获取默认设置
      const defaultSettings = this.configCacheService.getDefaultSettings();
      
      // 只重置聊天相关的设置
      this.settings.contextMessages = defaultSettings.contextMessages;
      this.settings.samplingTemperature = defaultSettings.samplingTemperature;
      this.settings.topK = defaultSettings.topK;
      this.settings.maxTokens = defaultSettings.maxTokens;
      this.settings.saveConversation = defaultSettings.saveConversation;
      this.settings.networkMode = defaultSettings.networkMode || false;
      this.settings.streamResponse = defaultSettings.streamResponse ?? true;
      
      // 保存设置
      this.saveSettings();
      
      // 更新UI
      this.updateSettingsContent();
    }
  }

  /**
   * 保存设置
   */
  saveSettings() {
    this.configCacheService.saveSettings(this.settings);

    // 发送全局事件
    this.emitGlobal('chat:settings:change', this.settings);
  }

  /**
   * 重写 getEventNamespace，返回空字符串
   * 这样 emitGlobal 发送的事件名就不会添加命名空间前缀
   */
  getEventNamespace() {
    return '';
  }

  /**
   * 生命周期钩子 - 组件挂载后
   */
  onMounted() {
    // 组件挂载后的操作
  }
}