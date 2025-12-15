(function () {
  'use strict';

  /**
   * AI翻译智能体插件
   * 支持文本翻译、文档翻译、单词解释和例句展示
   * 
   * 注意：此bundle使用全局函数注册方式，符合CSP安全策略
   */
  function init(context) {
    const { container, agentData, config, services, utils } = context;

    console.log('🚀 初始化AI翻译智能体UI:', agentData.name);

    const translator = new AITranslatorAgent(context);
    translator.render();
  }

  class AITranslatorAgent {
    constructor(context) {
      this.context = context;
      this.container = context.container;
      this.agentData = context.agentData;
      this.config = context.config;
      this.services = context.services;
      this.utils = context.utils;

      // 状态管理
      this.currentTool = 'text'; // 'text' or 'document'
      this.selectedFile = null;
      this.translationHistory = [];
      this.isAnalysisExpanded = false; // 默认展开
      this.currentAnalysis = null;
      this.currentScene = 'general'; // 当前场景：general, medical, computer, finance
      this.autoTranslateTimer = null; // 自动翻译定时器
      this.isTranslating = false; // 是否正在翻译
      this.expandedHistoryIndex = null; // 当前展开的历史记录索引
      this.needAnalysis = false; // 是否需要智能分析（默认关闭）

      // API配置 - 从 context.apiConfig 获取
      const apiConfig = context.apiConfig || {};
      this.API_BASE_URL = apiConfig.baseUrl || 'https://api.baizesz.com'; // 翻译API服务地址
      this.API_TIMEOUT = apiConfig.timeout || 60000; // API超时时间


      // 翻译配置（从接口获取）
      this.translateConfig = null;

      console.log('[AI Translator] API配置:', {
        baseUrl: this.API_BASE_URL,
        timeout: this.API_TIMEOUT,
        hasAuthToken: !!this.getAccessToken()
      });
    }

    /**
     * 获取访问令牌
     */
    getAccessToken() {
      try {
        // 从 services 中获取 app 实例
        const app = this.services?.app;
        if (app) {
          const userManager = app.getService?.('userManager');
          if (userManager) {
            const currentUser = userManager.getCurrentUser?.();
            if (currentUser && currentUser.access_token) {
              return currentUser.access_token;
            } else {
              // 用户未登录
              console.warn('[AI Translator] 用户未登录，无法获取 access_token');
              return null; // 返回null表示未登录
            }
          }
        }
      } catch (error) {
        console.warn('[AI Translator] 从 userManager 获取 token 失败:', error);
      }
      return null; // 返回null表示获取失败
    }

    /**
     * 检查用户是否已登录
     */
    checkUserLogin() {
      const token = this.getAccessToken();
      if (!token) {
        // 用户未登录，提供登录选项
        this.utils.notificationCenter.error('登录才能使用，请先登录');
        return false;
      }
      return true;
    }

    /**
     * 获取图标SVG
     */
    getIcon(iconName, size = 16) {
      // 从context.utils获取IconUtils
      const IconUtils = this.utils?.IconUtils;
      if (!IconUtils) {
        console.warn('[AI Translator] IconUtils not available in context.utils');
        return `<span>${iconName}</span>`; // 降级显示图标名称
      }
      return IconUtils.getIcon(iconName, { size, className: 'trans-icon' });
    }

    /**
     * 加载翻译配置
     */
    async loadTranslateConfig() {
      try {
        // 构建请求头，配置接口不需要授权令牌
        const headers = {
          'Content-Type': 'application/json'
        };

        const response = await fetch(`${this.API_BASE_URL}/toolkit/translate/config`, {
          method: 'GET',
          headers: headers
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result.success && result.data) {
          this.translateConfig = result.data;
          console.log('[AI Translator] 配置加载成功:', this.translateConfig);
          return true;
        } else {
          throw new Error(result.message || '配置数据无效');
        }
      } catch (error) {
        console.error('[AI Translator] 配置加载失败:', error);
        console.warn('[AI Translator] 使用默认配置');
        this.translateConfig = this.getDefaultConfig();
        return false;
      }
    }

    /**
     * 获取默认配置（降级方案）
     */
    getDefaultConfig() {
      return {
        source_languages: [
          { value: 'auto', label: '自动检测' },
          { value: 'en', label: '英文' },
          { value: 'zh', label: '中文' }
        ],
        target_languages: [
          { value: 'zh', label: '中文' },
          { value: 'en', label: '英文' }
        ],
        engines: [
          { value: 'ai_auto', label: 'AI智能选择', enabled: true },
        ],
        scenes: [
          { value: 'general', label: '通用场景' },
          { value: 'medical', label: '医学' }
        ]
      };
    }

    /**
     * 创建自定义下拉框
     * @param {string} id - 下拉框ID
     * @param {Array} options - 选项数组 [{value, label}]
     * @param {string} defaultValue - 默认值
     */
    createCustomSelect(id, options, defaultValue) {
      const selectedOption = options.find(opt => opt.value === defaultValue) || options[0];
      return `
        <div class="trans-custom-select" data-select-id="${id}">
          <div class="trans-select-trigger" data-value="${selectedOption.value}">
            <span class="trans-select-label">${selectedOption.label}</span>
            ${this.getIcon('chevron-down', 14)}
          </div>
          <div class="trans-select-dropdown">
            ${options.map(opt => `
              <div class="trans-select-option ${opt.value === selectedOption.value ? 'trans-selected' : ''}"
                   data-value="${opt.value}">
                ${opt.label}
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }



    async render() {
      const agentName = this.agentData.name || 'AI翻译';

      // 1. 加载配置
      this.utils.updateAgentStatus(agentName, 'loading', '加载配置中...');
      await this.loadTranslateConfig();

      // 2. 渲染 HTML
      this.utils.updateAgentStatus(agentName, 'ready', '就绪');
      this.renderHTML();
      this.initializeEventListeners();
      this.renderHistory();
    }

    renderHTML() {
      // 确保配置已加载
      if (!this.translateConfig) {
        console.error('[AI Translator] 配置未加载，无法渲染');
        this.container.innerHTML = '<div style="padding: 20px; text-align: center; color: #999;">配置加载失败，请刷新重试</div>';
        return;
      }

      const { source_languages, target_languages, engines } = this.translateConfig;

      // 只显示启用的翻译引擎
      const enabledEngines = engines.filter(e => e.enabled);

      this.container.innerHTML = `
        <div class="trans-workspace">
          <div class="trans-workspace-inner">
          <!-- 配置区域 -->
          <div class="trans-config">
            <!-- 工具选择器 -->
            <div class="trans-tool-selector">
              <button class="trans-tool-btn trans-active" data-tool="text">
                文本翻译
              </button>
              <button class="trans-tool-btn" data-tool="document">
                文档翻译
              </button>
            </div>

            <div class="trans-config-divider"></div>

            <!-- 语言选择 -->
            <div class="trans-config-group">
              ${this.createCustomSelect('source-lang', source_languages, 'auto')}
            </div>
            <button class="trans-swap-btn" id="swap-lang-btn" title="交换语言">
              ⇄
            </button>
            <div class="trans-config-group">
              ${this.createCustomSelect('target-lang', target_languages, 'zh')}
            </div>

            <div class="trans-config-divider"></div>

            <!-- 翻译引擎 -->
            <div class="trans-config-group">
            <p class="trans-config-label">翻译引擎</p>
              ${this.createCustomSelect('trans-engine', enabledEngines, 'google')}
            </div>
          </div>

          <!-- 输入输出区域 -->
          <div class="trans-io-container" id="io-container">
            ${this.getTextTranslationHTML()}
          </div>

          <!-- 分析区域 -->
          <div class="trans-analysis" id="analysis-section">
            <div class="trans-analysis-header" id="analysis-header">
              <div class="trans-analysis-left">
                <div class="trans-analysis-title" id="analysis-title">
                  单词解释 & 例句展示
                </div>
              </div>
              <div class="trans-analysis-toggle" id="analysis-toggle">${this.getIcon('chevron-down', 16)}</div>
            </div>
            <div class="trans-analysis-content trans-hidden" id="analysis-content">
              <!-- 动态内容 -->
            </div>
          </div>

          <!-- 历史记录 -->
          <div class="trans-history">
            <div class="trans-history-header">
              <div class="trans-history-title">
                翻译历史
              </div>
              <div class="trans-history-actions">
                <button class="trans-btn trans-btn-secondary" id="clear-history-btn">
                  ${this.getIcon('trash-2', 16)} 清空历史
                </button>
                <button class="trans-btn trans-btn-secondary" id="export-history-btn">
                  ${this.getIcon('file-down', 16)} 导出历史
                </button>
              </div>
            </div>
            <div class="trans-history-list" id="history-list">
              <div class="trans-history-empty">暂无翻译历史</div>
            </div>
          </div>
          </div>
        </div>
      `;
    }

    getTextTranslationHTML() {
      const scenes = this.translateConfig?.scenes || [];

      return `
        <!-- 翻译面板（输入和结果合并） -->
        <div class="trans-io-panel trans-io-panel-merged">
          <div class="trans-io-split-container">
            <!-- 左侧：输入区 -->
            <div class="trans-io-split-left">
              <div class="trans-io-header">
                <div class="trans-io-title-group">
                  <span class="trans-io-title">输入文本</span>
                  <span class="trans-char-count" id="char-count">(0 / ${this.translateConfig.max_word_count})</span>
                  <button class="trans-btn trans-btn-icon" id="clear-input-btn" title="清空">
                    ${this.getIcon('trash-2', 16)}
                  </button>
                  <button class="trans-btn trans-btn-icon" id="paste-btn" title="粘贴">
                    ${this.getIcon('copy', 16)}
                  </button>
                </div>
                <div class="trans-io-header-actions">
                  <span class="trans-control-label">单词例句</span>
                  <label class="trans-analysis-switch" title="开启将同时提取关键词释义、音标和例句，但速度变慢。">
                    <input type="checkbox" id="need-analysis-toggle">
                    <span class="trans-switch-slider"></span>
                  </label>
                  ${this.createCustomSelect('scene-selector', scenes, 'general')}
                  <button class="trans-btn trans-btn-primary" id="translate-btn" title="翻译 (Ctrl+Enter)">
                    ${this.getIcon('send', 16)} 翻译
                  </button>
                </div>
              </div>
              <textarea
                id="input-text"
                class="trans-textarea trans-textarea-merged"
                placeholder="请输入要翻译的文本...，Ctrl+Enter翻译"
                maxlength="${this.translateConfig.max_word_count}"
                spellcheck="false"
              ></textarea>
            </div>

            <!-- 中间分隔线 -->
            <div class="trans-io-divider"></div>

            <!-- 右侧：结果区 -->
            <div class="trans-io-split-right">
              <div class="trans-io-header">
                <div class="trans-io-title-group">
                  <span class="trans-io-title">翻译结果</span>
                  <span class="trans-char-count" id="result-count">(0)</span>
                </div>
                <div class="trans-io-header-actions">
                  <button class="trans-btn trans-btn-icon" id="copy-result-btn" disabled title="复制">
                    ${this.getIcon('copy', 16)}
                  </button>
                  <button class="trans-btn trans-btn-icon" id="speak-result-btn" disabled title="朗读">
                    ${this.getIcon('volume-2', 16)}
                  </button>
                </div>
              </div>
              <div class="trans-result-container">
                <div class="trans-result-text trans-result-text-merged" id="result-text">
                  <div class="trans-result-placeholder">翻译结果将显示在这里...</div>
                </div>
                <div class="trans-translating-indicator" id="translating-indicator" style="display: none;">
                  <span class="trans-spinner"></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    getDocumentTranslationHTML() {
      return `
        <!-- 文件选择面板 -->
        <div class="trans-io-panel">
          <div class="trans-io-header">
            <div class="trans-io-title" id="doc-title">选择文档</div>
            <div id="file-selected" style="display: none;"></div>
          </div>
          <input type="file" id="file-input" class="trans-file-input" accept=".txt,.pdf,.docx,.doc">
          <label for="file-input" class="trans-file-label" id="file-label">
            <div class="trans-file-icon">${this.getIcon('file-text', 48)}</div>
            <div class="trans-file-text">点击选择文档或拖拽文件到此处</div>
            <div class="trans-file-hint">支持 TXT, PDF, DOCX, DOC 格式</div>
          </label>
        </div>

        <!-- 翻译结果面板 -->
        <div class="trans-io-panel">
          <div class="trans-io-header">
            <div class="trans-io-title-group">
              <span class="trans-io-title">翻译结果</span>
              <span class="trans-char-count" id="doc-result-count">(0)</span>
            </div>
            <div class="trans-io-header-actions">
              <button class="trans-btn trans-btn-icon" id="download-result-btn" disabled title="下载译文">
                ${this.getIcon('file-down', 16)}
              </button>
            </div>
          </div>
          <div class="trans-result-text" id="result-text">
            <div class="trans-result-placeholder">翻译结果将显示在这里...</div>
          </div>
        </div>
      `;
    }

    initializeEventListeners() {
      // 工具切换
      const toolBtns = this.container.querySelectorAll('.trans-tool-btn');
      toolBtns.forEach(btn => {
        btn.addEventListener('click', () => {
          const tool = btn.dataset.tool;
          this.switchTool(tool);
        });
      });

      // 自定义下拉框事件
      this.bindCustomSelectEvents();

      // 语言交换按钮
      const swapLangBtn = this.container.querySelector('#swap-lang-btn');
      if (swapLangBtn) {
        swapLangBtn.addEventListener('click', () => this.swapLanguages());
      }

      // 智能分析开关
      const needAnalysisToggle = this.container.querySelector('#need-analysis-toggle');
      if (needAnalysisToggle) {
        needAnalysisToggle.addEventListener('change', (e) => {
          e.stopPropagation(); // 阻止事件冒泡到header
          this.needAnalysis = e.target.checked;
        });
      }

      // 分析区域折叠
      const analysisHeader = this.container.querySelector('#analysis-header');
      if (analysisHeader) {
        analysisHeader.addEventListener('click', (e) => {
          // 如果点击的是开关或其子元素，不触发折叠
          if (e.target.closest('.trans-analysis-switch')) {
            return;
          }
          this.toggleAnalysis();
        });
      }

      // 历史记录按钮
      const clearHistoryBtn = this.container.querySelector('#clear-history-btn');
      const exportHistoryBtn = this.container.querySelector('#export-history-btn');

      if (clearHistoryBtn) {
        clearHistoryBtn.addEventListener('click', () => this.clearHistory());
      }

      if (exportHistoryBtn) {
        exportHistoryBtn.addEventListener('click', () => this.exportHistory());
      }

      // 绑定当前工具的事件
      this.bindToolEvents();
    }

    /**
     * 绑定自定义下拉框事件
     */
    bindCustomSelectEvents() {
      const customSelects = this.container.querySelectorAll('.trans-custom-select');

      customSelects.forEach(select => {
        const trigger = select.querySelector('.trans-select-trigger');
        const dropdown = select.querySelector('.trans-select-dropdown');
        const options = select.querySelectorAll('.trans-select-option');
        const selectId = select.dataset.selectId;

        // 点击触发器显示/隐藏下拉框
        trigger.addEventListener('click', (e) => {
          e.stopPropagation();

          // 关闭其他下拉框
          this.container.querySelectorAll('.trans-custom-select').forEach(s => {
            if (s !== select) {
              s.classList.remove('trans-open');
            }
          });

          // 切换当前下拉框
          select.classList.toggle('trans-open');
        });

        // 选择选项
        options.forEach(option => {
          option.addEventListener('click', (e) => {
            e.stopPropagation();

            const value = option.dataset.value;
            const label = option.textContent.trim();

            // 更新触发器显示
            trigger.dataset.value = value;
            trigger.querySelector('.trans-select-label').textContent = label;

            // 更新选中状态
            options.forEach(opt => opt.classList.remove('trans-selected'));
            option.classList.add('trans-selected');

            // 关闭下拉框
            select.classList.remove('trans-open');

            // 触发change事件
            this.handleSelectChange(selectId, value);
          });
        });
      });

      // 点击外部关闭所有下拉框
      document.addEventListener('click', () => {
        this.container.querySelectorAll('.trans-custom-select').forEach(select => {
          select.classList.remove('trans-open');
        });
      });
    }

    /**
     * 处理下拉框值变化
     */
    handleSelectChange(selectId, value) {
      if (selectId === 'scene-selector') {
        this.currentScene = value;
        const sceneLabels = {
          general: '通用场景',
          medical: '医学',
          computer: '计算机',
          finance: '金融经济'
        };
        // 应用场景改变下次翻译时生效
      }
    }

    /**
     * 获取自定义下拉框的值
     */
    getCustomSelectValue(selectId) {
      const select = this.container.querySelector(`[data-select-id="${selectId}"]`);
      if (!select) return null;

      const trigger = select.querySelector('.trans-select-trigger');
      return trigger ? trigger.dataset.value : null;
    }

    bindToolEvents() {
      if (this.currentTool === 'text') {
        this.bindTextToolEvents();
      } else if (this.currentTool === 'document') {
        this.bindDocumentToolEvents();
      }
    }

    bindTextToolEvents() {
      const inputText = this.container.querySelector('#input-text');
      const charCount = this.container.querySelector('#char-count');
      const clearInputBtn = this.container.querySelector('#clear-input-btn');
      const pasteBtn = this.container.querySelector('#paste-btn');
      const translateBtn = this.container.querySelector('#translate-btn');
      const copyResultBtn = this.container.querySelector('#copy-result-btn');
      const speakResultBtn = this.container.querySelector('#speak-result-btn');

      // 输入框事件
      if (inputText && charCount) {
        inputText.addEventListener('input', () => {
          const length = inputText.value.length;
          charCount.textContent = `(${length} / ${this.translateConfig.max_word_count})`;
        });

        // Ctrl+Enter 快捷键
        inputText.addEventListener('keydown', (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.handleTranslate();
          }
        });
      }

      // 清空按钮
      if (clearInputBtn && inputText) {
        clearInputBtn.addEventListener('click', () => {
          inputText.value = '';
          if (charCount) charCount.textContent = `(0 / ${this.translateConfig.max_word_count})`;

          // 清除自动翻译定时器
          if (this.autoTranslateTimer) {
            clearTimeout(this.autoTranslateTimer);
          }

          // 清空结果
          const resultText = this.container.querySelector('#result-text');
          if (resultText) {
            resultText.innerHTML = '<div class="trans-result-placeholder">翻译结果将显示在这里...</div>';
          }
          this.updateResultCount('');
        });
      }

      // 粘贴按钮
      if (pasteBtn && inputText) {
        pasteBtn.addEventListener('click', async () => {
          try {
            const text = await navigator.clipboard.readText();
            inputText.value = text;
            if (charCount) charCount.textContent = `(${text.length} / ${this.translateConfig.max_word_count})`;
            this.utils.notificationCenter.success('已粘贴文本');
          } catch (error) {
            this.utils.notificationCenter.error('粘贴失败: ' + error.message);
          }
        });
      }

      // 翻译按钮
      if (translateBtn) {
        translateBtn.addEventListener('click', () => this.handleTranslate());
      }

      if (copyResultBtn) {
        copyResultBtn.addEventListener('click', () => this.copyResult());
      }

      if (speakResultBtn) {
        speakResultBtn.addEventListener('click', () => this.speakResult());
      }
    }

    bindDocumentToolEvents() {
      const fileInput = this.container.querySelector('#file-input');
      const downloadBtn = this.container.querySelector('#download-result-btn');

      if (fileInput) {
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
      }

      if (downloadBtn) {
        downloadBtn.addEventListener('click', () => this.downloadResult());
      }
    }

    /**
     * 交换源语言和目标语言
     */
    swapLanguages() {
      const sourceValue = this.getCustomSelectValue('source-lang');
      const targetValue = this.getCustomSelectValue('target-lang');

      if (!sourceValue || !targetValue) return;

      // 如果源语言是"自动检测"，不能交换
      if (sourceValue === 'auto') {
        this.utils.notificationCenter.warning('源语言为"自动检测"时无法交换');
        return;
      }

      // 交换值
      const sourceLangSelect = this.container.querySelector('[data-select-id="source-lang"]');
      const targetLangSelect = this.container.querySelector('[data-select-id="target-lang"]');

      if (!sourceLangSelect || !targetLangSelect) return;

      // 更新源语言
      const sourceTrigger = sourceLangSelect.querySelector('.trans-select-trigger');
      const sourceOptions = sourceLangSelect.querySelectorAll('.trans-select-option');
      const targetOption = Array.from(sourceOptions).find(opt => opt.dataset.value === targetValue);
      if (targetOption) {
        sourceTrigger.dataset.value = targetValue;
        sourceTrigger.querySelector('.trans-select-label').textContent = targetOption.textContent.trim();
        sourceOptions.forEach(opt => opt.classList.remove('trans-selected'));
        targetOption.classList.add('trans-selected');
      }

      // 更新目标语言
      const targetTrigger = targetLangSelect.querySelector('.trans-select-trigger');
      const targetOptions = targetLangSelect.querySelectorAll('.trans-select-option');
      const sourceOption = Array.from(targetOptions).find(opt => opt.dataset.value === sourceValue);
      if (sourceOption) {
        targetTrigger.dataset.value = sourceValue;
        targetTrigger.querySelector('.trans-select-label').textContent = sourceOption.textContent.trim();
        targetOptions.forEach(opt => opt.classList.remove('trans-selected'));
        sourceOption.classList.add('trans-selected');
      }
    }

    switchTool(tool) {
      this.currentTool = tool;

      // 更新按钮状态
      const toolBtns = this.container.querySelectorAll('.trans-tool-btn');
      toolBtns.forEach(btn => {
        if (btn.dataset.tool === tool) {
          btn.classList.add('trans-active');
        } else {
          btn.classList.remove('trans-active');
        }
      });

      // 更新IO容器内容
      const ioContainer = this.container.querySelector('#io-container');
      if (ioContainer) {
        if (tool === 'text') {
          ioContainer.innerHTML = this.getTextTranslationHTML();
        } else if (tool === 'document') {
          ioContainer.innerHTML = this.getDocumentTranslationHTML();
        }

        // 重新绑定事件
        this.bindToolEvents();
      }
    }

    /**
     * 处理翻译请求
     */
    async handleTranslate() {
      // 防止重复点击
      if (this.isTranslating) {
        console.log('正在翻译中，跳过本次请求');
        return;
      }

      // 检查用户是否已登录
      if (!this.checkUserLogin()) {
        return;
      }

      const inputText = this.container.querySelector('#input-text');
      if (this.currentTool === 'text' && (!inputText || !inputText.value.trim())) {
        this.utils.notificationCenter.warning('请输入要翻译的文本');
        return;
      }

      if (this.currentTool === 'document' && !this.selectedFile) {
        this.utils.notificationCenter.warning('请选择要翻译的文档');
        return;
      }

      try {
        this.isTranslating = true;
        this.utils.updateStatus('processing', '翻译中...');
        this.updateTranslateButton(true);

        let result;
        if (this.currentTool === 'text') {
          result = await this.translateText();
        } else if (this.currentTool === 'document') {
          result = await this.translateDocument();
        }

        if (result) {
          this.displayResult(result);
          this.addToHistory(result);

          // 如果是文本翻译，显示分析
          if (this.currentTool === 'text') {
            if (result.analysis) {
              this.displayAnalysis(result.analysis);
            } else {
              // 如果没有分析数据，清空分析内容
              this.clearAnalysis();
            }
          }
        }

        this.utils.updateStatus('ready', '就绪');
        this.utils.notificationCenter.success('翻译完成');

      } catch (error) {
        console.error('翻译失败:', error);
        this.utils.notificationCenter.error('翻译失败: ' + error.message);
        this.utils.updateStatus('error', '翻译失败');
      } finally {
        this.isTranslating = false;
        this.updateTranslateButton(false);
      }
    }

    /**
     * 调用翻译API
     * @param {string} text - 要翻译的文本
     * @param {string} sourceLang - 源语言
     * @param {string} targetLang - 目标语言
     * @param {string} engine - 翻译引擎
     * @param {string} scene - 翻译场景
     * @param {string} fileName - 文件名（仅在文档翻译时需要）
     * @returns {Promise} API响应
     */
    async callTranslateAPI(text, sourceLang, targetLang, engine, scene, fileName = null) {
      try {
        // 检查是否有 ApiService（支持自动 Token 刷新）
        const apiService = this.services?.apiService;

        // 构建请求体
        const requestBody = {
          type: 'text',
          content: text,
          source_lang: sourceLang,
          target_lang: targetLang,
          engine: engine,
          scene: scene,
          need_analysis: this.needAnalysis
        };

        // 如果提供了文件名，添加到请求体
        if (fileName) {
          requestBody.file_name = fileName;
        }

        let result;
        if (apiService) {
          // 使用 ApiService（自动处理 Token 刷新）
          console.log('[AI Translator] 使用 ApiService 发送请求');
          result = await apiService.post('/toolkit/translate/', requestBody);
        } else {
          // 降级：使用原生 fetch（无 Token 自动刷新）
          console.warn('[AI Translator] ApiService 不可用，降级使用 fetch');
          const authToken = this.getAccessToken();
          const response = await fetch(`${this.API_BASE_URL}/toolkit/translate/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            if (response.status === 401) {
              this.utils.notificationCenter.error('登录已失效，请重新登录。');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          result = await response.json();
        }

        if (!result.success) {
          throw new Error(result.message || '翻译失败');
        }

        return result;

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('[AI Translator] API请求超时');
          throw new Error('翻译请求超时，请稍后重试');
        }
        console.error('[AI Translator] API调用失败:', error);
        throw error;
      }
    }

    /**
     * 调用文档翻译API
     * @param {File} file - 文件对象
     * @param {string} sourceLang - 源语言
     * @param {string} targetLang - 目标语言
     * @param {string} engine - 翻译引擎
     * @returns {Promise} API响应
     */
    async callDocumentTranslateAPI(file, sourceLang, targetLang, engine) {
      try {
        // 读取文件并转换为base64
        const base64Content = await this.fileToBase64(file);

        // 检查是否有 ApiService（支持自动 Token 刷新）
        const apiService = this.services?.apiService;

        const requestBody = {
          type: 'document',
          content: base64Content,
          source_lang: sourceLang,
          target_lang: targetLang,
          engine: engine,
          need_analysis: this.needAnalysis,
          file_name: file.name
        };

        let result;
        if (apiService) {
          // 使用 ApiService（自动处理 Token 刷新）
          console.log('[AI Translator] 使用 ApiService 发送文档翻译请求');
          result = await apiService.post('/agent/translate/', requestBody);
        } else {
          // 降级：使用原生 fetch（无 Token 自动刷新）
          console.warn('[AI Translator] ApiService 不可用，降级使用 fetch');
          const authToken = this.getAccessToken();
          const response = await fetch(`${this.API_BASE_URL}/agent/translate/`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(requestBody)
          });

          if (!response.ok) {
            if (response.status === 401) {
              this.utils.notificationCenter.error('登录已失效，请重新登录。');
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          result = await response.json();
        }

        if (!result.success) {
          throw new Error(result.message || '文档翻译失败');
        }

        return result;

      } catch (error) {
        if (error.name === 'AbortError') {
          console.error('[AI Translator] 文档翻译请求超时');
          throw new Error('文档翻译请求超时，请稍后重试');
        }
        console.error('[AI Translator] 文档翻译API调用失败:', error);
        throw error;
      }
    }

    /**
     * 将文件转换为base64
     */
    fileToBase64(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          // 移除data:xxx;base64,前缀
          const base64 = reader.result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // ============================================================
    // 以下为模拟数据方法，仅用于开发调试
    // 生产环境请设置 this.USE_MOCK_DATA = false
    // ============================================================

    /**
     * 获取模拟翻译响应数据（仅用于开发调试）
     * @param {string} text - 要翻译的文本
     * @param {string} sourceLang - 源语言
     * @param {string} targetLang - 目标语言
     * @param {string} engine - 翻译引擎
     * @param {string} scene - 翻译场景
     * @returns {Promise} 模拟的API响应
     */
    getMockTranslateResponse(text, sourceLang, targetLang, engine, scene) {
      // 模拟网络延迟
      return new Promise(resolve => {
        setTimeout(() => {
          // 判断是否为单个单词
          const isSingleWord = /^[a-zA-Z]+$/.test(text.trim());

          // 模拟翻译结果
          const mockTranslation = {
            'hello': '你好',
            'world': '世界',
            'Hello World': '你好世界',
            'artificial intelligence': '人工智能',
            'machine learning': '机器学习'
          };

          const translatedText = mockTranslation[text] || `[模拟翻译] ${text}`;

          // 构建响应数据
          const response = {
            success: true,
            message: '翻译成功',
            data: {
              type: 'text',
              translation: {
                source_text: text,
                target_text: translatedText,
                detected_lang: sourceLang === 'auto' ? 'en' : sourceLang,
                source_lang: sourceLang === 'auto' ? 'en' : sourceLang,
                target_lang: targetLang,
                engine: engine,
                scene: scene
              },
              analysis: this.needAnalysis ? {
                is_single_word: isSingleWord,
                words: isSingleWord ? [
                  {
                    word: text,
                    phonetic: '/həˈloʊ/',
                    pos: 'n./v./int.',
                    meaning: '你好；打招呼；问候'
                  }
                ] : [
                  {
                    word: 'Hello',
                    phonetic: '/həˈloʊ/',
                    pos: 'int.',
                    meaning: '你好；打招呼'
                  },
                  {
                    word: 'World',
                    phonetic: '/wɜːrld/',
                    pos: 'n.',
                    meaning: '世界；地球'
                  }
                ],
                examples: isSingleWord ? [
                  {
                    original: 'Hello, nice to meet you.',
                    translation: '你好，很高兴见到你。'
                  },
                  {
                    original: 'Say hello to your family.',
                    translation: '向你的家人问好。'
                  },
                  {
                    original: 'He said hello and left.',
                    translation: '他打了个招呼就离开了。'
                  }
                ] : [
                  {
                    original: 'Hello, how are you?',
                    translation: '你好，你好吗？'
                  },
                  {
                    original: 'The world is beautiful.',
                    translation: '世界是美丽的。'
                  }
                ]
              } : null
            },
            error_code: null
          };

          resolve(response);
        }, 1000);
      });
    }

    /**
     * 获取模拟文档翻译响应数据（仅用于开发调试）
     */
    getMockDocumentTranslateResponse(fileName, sourceLang, targetLang, engine) {
      return new Promise(resolve => {
        setTimeout(() => {
          const response = {
            success: true,
            message: '翻译成功',
            data: {
              type: 'document',
              translation: {
                file_name: fileName,
                source_lang: sourceLang,
                target_lang: targetLang,
                engine: engine,
                translated_content: 'base64_encoded_content_here',
                download_url: 'http://example.com/download/' + fileName,
                page_count: 10,
                max_word_count: 5000
              },
              analysis: null
            },
            error_code: null
          };
          resolve(response);
        }, 2000);
      });
    }

    /**
     * 模拟翻译（使用新的API方法）
     */
    async simulateTranslation(text, sourceLang, targetLang, engine) {
      try {
        // 调用API
        const response = await this.callTranslateAPI(text, sourceLang, targetLang, engine, this.currentScene);

        if (!response.success) {
          throw new Error(response.message);
        }

        const { translation, analysis } = response.data;

        // 更新分析标题
        if (analysis) {
          this.updateAnalysisTitle(analysis.is_single_word);
        }

        // 显示翻译结果
        this.displayResult({
          translatedText: translation.target_text
        });

        // 显示分析结果
        if (analysis) {
          this.displayAnalysis(analysis);
        } else {
          // 如果没有分析数据，清空分析内容
          this.clearAnalysis();
        }

      } catch (error) {
        console.error('[AI Translator] 翻译失败:', error);
        this.utils.notificationCenter.error('翻译失败: ' + error.message);
      }
    }

    /**
     * 显示/隐藏翻译中指示器
     */
    showTranslatingIndicator(show) {
      const indicator = this.container.querySelector('#translating-indicator');
      if (indicator) {
        indicator.style.display = show ? 'flex' : 'none';
      }
    }

    /**
     * 更新翻译按钮状态
     */
    updateTranslateButton(loading) {
      const translateBtn = this.container.querySelector('#translate-btn');
      if (!translateBtn) return;

      if (loading) {
        // 禁用按钮
        translateBtn.disabled = true;
        translateBtn.classList.add('trans-btn-loading');

        // 更新按钮内容为加载状态，使用NewsDetail的菊花样式
        translateBtn.innerHTML = `
          <span class="nd-loading-spinner"></span>
        `;
      } else {
        // 恢复按钮状态
        translateBtn.disabled = false;
        translateBtn.classList.remove('trans-btn-loading');

        // 恢复按钮内容
        translateBtn.innerHTML = `${this.getIcon('send', 16)} 翻译`;
      }
    }

    /**
     * 更新分析区域标题
     */
    updateAnalysisTitle(isSingleWord) {
      const titleElement = this.container.querySelector('#analysis-title');
      if (titleElement) {
        const icon = this.getIcon('file-text', 16);
        titleElement.innerHTML = isSingleWord ? `${icon} 单词解释 & 例句展示` : `${icon} 重点词汇`;
      }
    }


    async translateText() {
      const inputText = this.container.querySelector('#input-text');

      if (!inputText || !inputText.value.trim()) {
        throw new Error('请输入要翻译的文本');
      }

      const text = inputText.value.trim();
      const source = this.getCustomSelectValue('source-lang') || 'auto';
      const target = this.getCustomSelectValue('target-lang') || 'zh';
      const engineValue = this.getCustomSelectValue('trans-engine') || 'google';

      // 调用翻译API
      const result = await this.callTranslateAPI(text, source, target, engineValue, this.currentScene);

      if (result.success) {
        const { translation, analysis } = result.data;

        return {
          type: 'text',
          sourceText: translation.source_text,
          translatedText: translation.target_text,
          sourceLang: this.getLangName(translation.source_lang),
          targetLang: this.getLangName(translation.target_lang),
          engine: this.getEngineName(translation.engine),
          analysis: analysis // 包含单词解释和例句
        };
      } else {
        throw new Error(result.message || '翻译失败');
      }
    }

    async translateDocument() {
      if (!this.selectedFile) {
        throw new Error('请选择要翻译的文档');
      }

      if (!this.selectedFile.file) {
        throw new Error('文件对象不存在');
      }

      const source = this.getCustomSelectValue('source-lang') || 'auto';
      const target = this.getCustomSelectValue('target-lang') || 'zh';
      const engineValue = this.getCustomSelectValue('trans-engine') || 'google';

      // 调用文档翻译API
      const result = await this.callDocumentTranslateAPI(
        this.selectedFile.file,
        source,
        target,
        engineValue
      );

      if (result.success) {
        const { translation } = result.data;

        return {
          type: 'document',
          fileName: this.selectedFile.name,
          translatedText: `文档翻译完成

文件名: ${translation.file_name}
页数: ${translation.page_count || 'N/A'}
字数: ${translation.max_word_count || 'N/A'}
下载链接: ${translation.download_url || 'N/A'}`,
          sourceLang: this.getLangName(translation.source_lang),
          targetLang: this.getLangName(translation.target_lang),
          engine: this.getEngineName(translation.engine),
          downloadUrl: translation.download_url
        };
      } else {
        throw new Error(result.message || '文档翻译失败');
      }
    }

    displayResult(result) {
      const resultText = this.container.querySelector('#result-text');
      if (!resultText) return;

      resultText.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(result.translatedText)}</div>`;

      // 更新字符计数
      this.updateResultCount(result.translatedText);

      // 启用操作按钮
      if (this.currentTool === 'text') {
        const copyBtn = this.container.querySelector('#copy-result-btn');
        const speakBtn = this.container.querySelector('#speak-result-btn');
        if (copyBtn) copyBtn.disabled = false;
        if (speakBtn) speakBtn.disabled = false;
      } else if (this.currentTool === 'document') {
        const downloadBtn = this.container.querySelector('#download-result-btn');
        if (downloadBtn) downloadBtn.disabled = false;
      }
    }

    displayAnalysis(analysis) {
      if (!analysis || (!analysis.words && !analysis.examples)) {
        return;
      }

      const analysisSection = this.container.querySelector('#analysis-section');
      const analysisContent = this.container.querySelector('#analysis-content');

      if (!analysisSection || !analysisContent) return;

      this.currentAnalysis = analysis;

      let html = '';
      const hasWords = analysis.words && analysis.words.length > 0;
      const hasExamples = analysis.examples && analysis.examples.length > 0;

      // 如果没有任何数据，显示空状态
      if (!hasWords && !hasExamples) {
        html = `
          <div class="trans-analysis-empty">
            <div class="trans-analysis-empty-icon">${this.getIcon('file-text', 32)}</div>
            <div class="trans-analysis-empty-text">暂无分析数据</div>
          </div>
        `;
      } else {
        // 多行布局：每行左侧word-item，右侧example-item
        html += `<div class="trans-analysis-grid">`;

        // 获取最多的条数
        const wordCount = hasWords ? analysis.words.length : 0;
        const exampleCount = hasExamples ? analysis.examples.length : 0;
        const maxCount = Math.max(wordCount, exampleCount);

        // 生成数据行
        for (let i = 0; i < maxCount; i++) {
          html += `<div class="trans-analysis-row">`;

          // 左侧：关键词
          if (hasWords && i < wordCount) {
            const word = analysis.words[i];
            html += `
              <div class="trans-analysis-col trans-word-col">
                <div class="trans-word-item">
                  <div class="trans-word-header" style="white-space: nowrap; display: flex; align-items: center; gap: 8px;">
                    <span class="trans-word-text" style="white-space: nowrap;">${this.escapeHtml(word.word)}</span>
                    ${word.phonetic ? `<span class="trans-word-phonetic" style="white-space: nowrap;">${this.escapeHtml(word.phonetic)}</span>` : ''}
                    ${word.pos ? `<span class="trans-word-pos" style="white-space: nowrap;">${this.escapeHtml(word.pos)}</span>` : ''}
                  </div>
                  <div class="trans-word-meaning">${this.escapeHtml(word.meaning)}</div>
                </div>
              </div>
            `;
          } else if (hasWords) {
            html += `<div class="trans-analysis-col trans-word-col"></div>`;
          }

          // 右侧：例句
          if (hasExamples && i < exampleCount) {
            const example = analysis.examples[i];
            html += `
              <div class="trans-analysis-col trans-example-col">
                <div class="trans-example-item">
                  <div class="trans-example-original">${this.escapeHtml(example.original)}</div>
                  <div class="trans-example-translation">${this.escapeHtml(example.translation)}</div>
                </div>
              </div>
            `;
          } else if (hasExamples) {
            html += `<div class="trans-analysis-col trans-example-col"></div>`;
          }

          html += `</div>`;
        }

        html += `</div>`;
      }

      analysisContent.innerHTML = html;
      // 分析区域永远显示
      analysisSection.style.display = 'block';

      // 如果有分析数据，自动展开分析区域
      if (hasWords || hasExamples) {
        this.isAnalysisExpanded = true;
        analysisContent.classList.remove('trans-hidden');
        const analysisToggle = this.container.querySelector('#analysis-toggle');
        if (analysisToggle) {
          analysisToggle.classList.remove('trans-collapsed');
        }
      }
    }

    /**
     * 清空分析内容
     */
    clearAnalysis() {
      const analysisContent = this.container.querySelector('#analysis-content');
      const analysisToggle = this.container.querySelector('#analysis-toggle');

      if (analysisContent) {
        // 清空分析内容
        analysisContent.innerHTML = '';
        // 折叠分析区域
        analysisContent.classList.add('trans-hidden');
      }

      if (analysisToggle) {
        // 更新切换图标为折叠状态
        analysisToggle.classList.add('trans-collapsed');
        analysisToggle.innerHTML = this.getIcon('chevron-right', 16);
      }

      // 重置当前分析数据
      this.currentAnalysis = null;
      this.isAnalysisExpanded = false;
    }

    toggleAnalysis() {
      const analysisContent = this.container.querySelector('#analysis-content');
      const analysisToggle = this.container.querySelector('#analysis-toggle');

      if (!analysisContent || !analysisToggle) return;

      this.isAnalysisExpanded = !this.isAnalysisExpanded;

      if (this.isAnalysisExpanded) {
        analysisContent.classList.remove('trans-hidden');
        analysisToggle.classList.remove('trans-collapsed');
        analysisToggle.innerHTML = this.getIcon('chevron-down', 16);
      } else {
        analysisContent.classList.add('trans-hidden');
        analysisToggle.classList.add('trans-collapsed');
        analysisToggle.innerHTML = this.getIcon('chevron-right', 16);
      }
    }

    addToHistory(result) {
      const historyItem = {
        sourceLang: result.sourceLang,
        targetLang: result.targetLang,
        sourceText: result.sourceText || result.fileName,
        translatedText: result.translatedText,
        timestamp: new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }),
        engine: result.engine,
        type: result.type
      };

      this.translationHistory.unshift(historyItem);

      // 限制历史记录数量
      if (this.translationHistory.length > 50) {
        this.translationHistory = this.translationHistory.slice(0, 50);
      }

      this.renderHistory();
    }

    renderHistory() {
      const historyList = this.container.querySelector('#history-list');

      if (!historyList) {
        console.error('[AI Translator] #history-list not found!');
        return;
      }

      if (this.translationHistory.length === 0) {
        historyList.innerHTML = '<div class="trans-history-empty">暂无翻译历史</div>';
        return;
      }

      historyList.innerHTML = this.translationHistory.map((item, index) => {
        const isExpanded = this.expandedHistoryIndex === index;
        return `
          <div class="trans-history-item ${isExpanded ? 'trans-history-expanded' : ''}" data-index="${index}">
            <div class="trans-history-row">
              <div class="trans-history-source">${this.escapeHtml(item.sourceText)}</div>
              <div class="trans-history-target">${this.escapeHtml(item.translatedText)}</div>
              <div class="trans-history-time">${this.escapeHtml(item.timestamp)}</div>
            </div>
          </div>
        `;
      }).join('');

      // 绑定点击事件 - 展开/收起
      const items = historyList.querySelectorAll('.trans-history-item');
      console.log('[AI Translator] Binding click events to', items.length, 'history items');

      items.forEach(item => {
        item.addEventListener('click', (e) => {
          const index = parseInt(item.dataset.index);
          console.log('[AI Translator] History item clicked, index:', index);
          this.toggleHistoryItem(index);
        });
      });
    }

    toggleHistoryItem(index) {
      console.log('[AI Translator] Toggling item', index, '| Current expanded:', this.expandedHistoryIndex);

      // 如果点击的是已展开的项，则收起
      if (this.expandedHistoryIndex === index) {
        this.expandedHistoryIndex = null;
      } else {
        // 否则展开新项（自动收起其他项）
        this.expandedHistoryIndex = index;
      }

      console.log('[AI Translator] New expanded index:', this.expandedHistoryIndex);

      // 重新渲染历史记录
      this.renderHistory();
    }

    loadHistoryItem(index) {
      const item = this.translationHistory[index];
      if (!item) return;

      // 如果是文本翻译，加载到输入框
      if (item.type === 'text' && this.currentTool === 'text') {
        const inputText = this.container.querySelector('#input-text');
        const resultText = this.container.querySelector('#result-text');

        if (inputText) {
          inputText.value = item.sourceText;
          const charCount = this.container.querySelector('#char-count');
          if (charCount) {
            charCount.textContent = `${item.sourceText.length} / ${this.translateConfig.max_word_count}`;
          }
        }

        if (resultText) {
          resultText.innerHTML = `<div style="white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(item.translatedText)}</div>`;
        }

        this.utils.notificationCenter.info('已加载历史记录');
      }
    }

    clearHistory() {
      if (this.translationHistory.length === 0) {
        this.utils.notificationCenter.warning('没有历史记录可清空');
        return;
      }

      if (confirm('确定要清空所有翻译历史吗？')) {
        this.translationHistory = [];
        this.renderHistory();
        this.utils.notificationCenter.success('历史记录已清空');
      }
    }

    exportHistory() {
      if (this.translationHistory.length === 0) {
        this.utils.notificationCenter.warning('没有历史记录可导出');
        return;
      }

      const content = this.translationHistory.map(item =>
        `${item.timestamp}\t${item.sourceLang} → ${item.targetLang}\t${item.engine}\n` +
        `原文: ${item.sourceText}\n` +
        `译文: ${item.translatedText}\n` +
        `${'='.repeat(80)}\n`
      ).join('\n');

      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `translation_history_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);

      this.utils.notificationCenter.success('历史记录已导出');
    }

    async handleFileSelect(event) {
      const file = event.target.files[0];
      if (!file) return;

      const fileLabel = this.container.querySelector('#file-label');
      const fileSelected = this.container.querySelector('#file-selected');

      try {
        // 显示上传中状态
        if (fileLabel) fileLabel.style.display = 'none';
        if (fileSelected) {
          fileSelected.style.display = 'block';
          fileSelected.innerHTML = `
            <div class="trans-file-selected">
              <span class="trans-file-icon">${this.getIcon('file-text', 20)}</span>
              <span class="trans-file-name">${this.escapeHtml(file.name)}</span>
              <span class="trans-file-uploading">上传中...</span>
            </div>
          `;
        }

        // 更新标题为"已选文档"
        const docTitle = this.container.querySelector('#doc-title');
        if (docTitle) {
          docTitle.textContent = '已选文档';
        }

        // 移除header底部边框，避免双重边框
        const ioHeader = this.container.querySelector('.trans-io-panel .trans-io-header');
        if (ioHeader) {
          ioHeader.classList.add('trans-file-selected-mode');
        }

        // 上传文件到服务器
        this.utils.notificationCenter.info(`正在上传文件: ${file.name}`);

        const uploadResult = await this.utils.uploadFile(file, {
          maxSize: 10 * 1024 * 1024,  // 最大10MB
          fileType: 'document',
          description: '待翻译的文档',
          onProgress: (percent) => {
            // 更新上传进度
            const uploadingText = fileSelected?.querySelector('.trans-file-uploading');
            if (uploadingText) {
              uploadingText.textContent = `上传中 ${percent}%`;
            }
          }
        });

        if (!uploadResult) {
          throw new Error('文件上传被取消');
        }

        // 保存文件信息（包含上传后的URL和ID以及原始文件对象）
        this.selectedFile = {
          name: file.name,
          size: file.size,
          type: file.type,
          fileId: uploadResult.fileId,
          fileUrl: uploadResult.url,
          filePath: uploadResult.filePath,
          file: file  // 保存原始文件对象，用于API调用
        };

        // 显示上传成功状态
        if (fileSelected) {
          fileSelected.innerHTML = `
            <div class="trans-file-selected">
              <span class="trans-file-icon">${this.getIcon('file-text', 20)}</span>
              <span class="trans-file-name trans-file-name-underline">${this.escapeHtml(file.name)}</span>
              <span class="trans-file-success-dot"></span>
              <button class="trans-file-remove" id="remove-file-btn">${this.getIcon('x', 16)} 删除</button>
            </div>
          `;

          // 更新标题为"已选文档"
          const docTitle = this.container.querySelector('#doc-title');
          if (docTitle) {
            docTitle.textContent = '已选文档';
          }

          const removeBtn = fileSelected.querySelector('#remove-file-btn');
          if (removeBtn) {
            removeBtn.addEventListener('click', () => {
              this.selectedFile = null;
              fileSelected.style.display = 'none';
              if (fileLabel) fileLabel.style.display = 'flex';
              event.target.value = '';

              // 恢复标题为"选择文档"
              if (docTitle) {
                docTitle.textContent = '选择文档';
              }

              // 恢复header底部边框
              const ioHeader = this.container.querySelector('.trans-io-panel .trans-io-header');
              if (ioHeader) {
                ioHeader.classList.remove('trans-file-selected-mode');
              }
            });
          }
        }

        this.utils.notificationCenter.success(`文件上传成功: ${file.name}`);

      } catch (error) {
        console.error('文件上传失败:', error);

        // 恢复初始状态
        this.selectedFile = null;
        if (fileSelected) fileSelected.style.display = 'none';
        if (fileLabel) fileLabel.style.display = 'flex';
        event.target.value = '';

        // 恢复标题为"选择文档"
        const docTitle = this.container.querySelector('#doc-title');
        if (docTitle) {
          docTitle.textContent = '选择文档';
        }

        // 恢复header底部边框
        const ioHeader = this.container.querySelector('.trans-io-panel .trans-io-header');
        if (ioHeader) {
          ioHeader.classList.remove('trans-file-selected-mode');
        }

        this.utils.notificationCenter.error(`文件上传失败: ${error.message}`);
      }
    }

    async copyResult() {
      const resultText = this.container.querySelector('#result-text');
      if (!resultText) return;

      const text = resultText.textContent.trim();
      if (!text || text === '翻译结果将显示在这里...') {
        this.utils.notificationCenter.warning('没有可复制的内容');
        return;
      }

      try {
        await navigator.clipboard.writeText(text);
        this.utils.notificationCenter.success('已复制到剪贴板');
      } catch (error) {
        this.utils.notificationCenter.error('复制失败: ' + error.message);
      }
    }

    speakResult() {
      const resultText = this.container.querySelector('#result-text');
      if (!resultText) return;

      const text = resultText.textContent.trim();
      if (!text || text === '翻译结果将显示在这里...') {
        this.utils.notificationCenter.warning('没有可朗读的内容');
        return;
      }

      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        const targetLang = this.getCustomSelectValue('target-lang') || 'zh';
        utterance.lang = this.getSpeechLang(targetLang);
        window.speechSynthesis.speak(utterance);
        this.utils.notificationCenter.info('开始朗读');
      } else {
        this.utils.notificationCenter.error('您的浏览器不支持语音朗读功能');
      }
    }

    downloadResult() {
      const resultText = this.container.querySelector('#result-text');
      if (!resultText) return;

      const text = resultText.textContent.trim();
      if (!text || text === '翻译结果将显示在这里...') {
        this.utils.notificationCenter.warning('没有可下载的内容');
        return;
      }

      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;

      const originalName = this.selectedFile ? this.selectedFile.name : 'document';
      const baseName = originalName.replace(/\.[^/.]+$/, '');
      a.download = `${baseName}_translated.txt`;

      a.click();
      URL.revokeObjectURL(url);

      this.utils.notificationCenter.success('译文已下载');
    }

    // 辅助方法
    updateResultCount(text) {
      const countElement = this.container.querySelector('#result-count');
      if (countElement) {
        const count = text ? text.length : 0;
        countElement.textContent = `(${count})`;
      }

      // 文档翻译模式也更新计数
      const docCountElement = this.container.querySelector('#doc-result-count');
      if (docCountElement) {
        const count = text ? text.length : 0;
        docCountElement.textContent = `(${count})`;
      }
    }

    getLangName(code) {
      // 从配置中动态查找语言名称
      if (!this.translateConfig) {
        return code;
      }

      // 先在源语言列表中查找
      const sourceLang = this.translateConfig.source_languages?.find(l => l.value === code);
      if (sourceLang) {
        return sourceLang.label;
      }

      // 再在目标语言列表中查找
      const targetLang = this.translateConfig.target_languages?.find(l => l.value === code);
      if (targetLang) {
        return targetLang.label;
      }

      // 未找到则返回原始代码
      return code;
    }

    getEngineName(code) {
      // 从配置中动态查找引擎名称
      if (!this.translateConfig) {
        return code;
      }

      const engine = this.translateConfig.engines?.find(e => e.value === code);
      return engine?.label || code;
    }

    getSpeechLang(code) {
      const speechLangMap = {
        'en': 'en-US',
        'zh': 'zh-CN',
        'ja': 'ja-JP',
        'ko': 'ko-KR',
        'fr': 'fr-FR',
        'de': 'de-DE',
        'es': 'es-ES',
        'ru': 'ru-RU'
      };
      return speechLangMap[code] || 'en-US';
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    /**
     * 处理配置重新加载（登录成功后）
     */
    async handleConfigReload() {
      try {
        // 重新加载翻译配置
        const configLoaded = await this.loadTranslateConfig();

        if (configLoaded) {
          this.utils.notificationCenter.success('翻译配置已更新，可以正常使用');
        } else {
          this.utils.notificationCenter.warning('翻译配置更新失败，将使用默认配置');
        }

        // 重新渲染UI以更新语言和引擎选项
        this.renderHTML();
        this.initializeEventListeners();

      } catch (error) {
        console.error('[AI Translator] 配置重新加载失败:', error);
        this.utils.notificationCenter.error('配置更新失败: ' + error.message);
      }
    }
  }

  // 注册到全局命名空间（使用智能体ID）
  // 这样可以避免使用 eval 或 new Function()，符合 CSP 安全策略
  window.__AGENT_INIT__ = window.__AGENT_INIT__ || {};
  window.__AGENT_INIT__['ai_translator'] = init;

  console.log('[AI Translator Bundle] 已注册到 window.__AGENT_INIT__.ai_translator');
})();