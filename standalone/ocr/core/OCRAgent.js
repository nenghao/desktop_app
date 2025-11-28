// OCR Agent - 核心代理类
// 专门处理 OCR 识别功能

class OCRAgent {
  constructor(context) {
    this.context = context;
    this.container = context.container;
    this.agentData = context.agentData;
    this.config = context.config;
    this.services = context.services;
    this.utils = context.utils;
    this.statusBarManager = context.services.statusBarManager;
    this.app = context.services.app;

    // 从缓存加载历史记录
    this.operationHistory = PDFHistory.loadFromStorage();

    this.selectedFiles = {}; // 存储文件列表
    this.tempFiles = []; // 存储临时文件路径，用于清理

    // OCR 配置
    this.ocrLanguages = []; // OCR 语言列表
    // 从 context 动态获取 API 基础地址（支持 debug 和 release 环境）
    this.apiBaseUrl = context?.apiConfig?.baseUrl || context?.config?.apiBaseUrl || 'https://api.baizesz.com';
    console.log('🔧 [OCR Agent] API 基础地址:', this.apiBaseUrl);
  }

  // 清理临时文件和历史记录
  destroy() {
    // 清理临时文件
    this.tempFiles.forEach(filePath => {
      try {
        console.log('清理临时文件:', filePath);
      } catch (error) {
        console.warn('清理临时文件失败:', error);
      }
    });

    // 清空历史记录
    this.operationHistory = [];
    this.tempFiles = [];
  }

  async render() {
    const agentName = this.agentData.name || 'OCR识别';

    this.utils.updateAgentStatus(agentName, 'ready', '就绪');

    this.renderHTML();

    this.initializeEventListeners();

    // 渲染历史记录
    PDFHistory.renderHistory(this.operationHistory, this.container);

    // 启用表单
    this.enableForm();

    // 加载 OCR 语言列表
    this.loadOCRLanguages();
  }

  enableForm() {
    const form = this.container.querySelector('#ocr-form');

    if (form) {
      form.style.opacity = '1';
      form.style.pointerEvents = 'auto';
    }
  }

  renderHTML() {
    this.container.innerHTML = `
      <div class="pdf-tools-workspace">
        <div class="pdf-tool-selector" style="display: none;">
          <div class="pdf-categories">
            <button class="pdf-category-btn pdf-active" data-tool="ocr">
              <span class="pdf-icon">🔍</span>
              OCR识别
            </button>
          </div>
        </div>

        <form id="ocr-form" class="pdf-form" style="opacity: 0.6; pointer-events: none;">
          <div class="pdf-tool-panel" id="tool-panel">
            ${OCRPanels.getOCRPanelHTML()}
          </div>
        </form>

        <div class="pdf-result" id="pdf-result">
          <div class="pdf-result-placeholder">
            <div class="pdf-placeholder-icon">🔍</div>
            <p>选择文件并配置参数开始OCR识别</p>
            <p class="pdf-help-text">支持PDF和图片文件的文字识别</p>
          </div>
        </div>

        <div class="pdf-history" id="pdf-history">
          <div class="pdf-history-header">
            <h4 title="操作历史:最多保存10条，新的会覆盖旧的">操作历史</h4>
            <div class="pdf-history-controls">
              <button id="clear-history" class="pdf-btn pdf-btn-secondary">清空历史</button>
              <button id="export-history" class="pdf-btn pdf-btn-secondary">导出历史</button>
            </div>
          </div>
          <div class="pdf-history-list" id="history-list"></div>
        </div>
      </div>
    `;
  }

  initializeEventListeners() {
    const form = this.container.querySelector('#ocr-form');
    const clearHistoryBtn = this.container.querySelector('#clear-history');
    const exportHistoryBtn = this.container.querySelector('#export-history');

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleOperation();
      });
    }

    if (clearHistoryBtn) {
      clearHistoryBtn.addEventListener('click', () => {
        PDFHistory.clearHistory(this.operationHistory, this.container, this.utils);
      });
    }

    if (exportHistoryBtn) {
      exportHistoryBtn.addEventListener('click', () => {
        PDFHistory.exportHistory(this.operationHistory, this.utils);
      });
    }

    // 绑定 OCR 面板事件
    this.bindOCRPanelEvents();
  }

  bindOCRPanelEvents() {
    const fileInput = this.container.querySelector('#ocr-files');
    const clearBtn = this.container.querySelector('#ocr-clear-files');
    const selectDirBtn = this.container.querySelector('#ocr-select-output-dir');

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        // OCR 文件选择时检测文件类型
        this.handleOCRFileSelection(e);
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () =>
        PDFFileList.clearFileList('ocr', 'ocr-file-list', this.selectedFiles, this.container)
      );
    }

    if (selectDirBtn) {
      selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('ocr'));
    }
  }

  async handleOperation() {
    // 获取提交按钮
    const submitBtn = this.container.querySelector('button[type="submit"]');

    try {
      // 禁用按钮并显示加载状态
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('pdf-btn-loading');

        // 保存原始文本并更新按钮文本
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.innerHTML = `<span class="pdf-spinner"></span>处理中...`;
      }

      this.utils.updateStatus('processing', '处理中...');

      const result = await this.handleOCR();

      // 显示结果和预览 - 统一使用 showPreview 方法
      PDFPreview.showPreview(result.outputPath || '', this.container, result, result.pdfBytes);

      // 添加到历史记录
      await PDFHistory.addToHistory('ocr', result, this.operationHistory, this.container, this.services);

      this.utils.updateStatus('ready', '就绪');

      // 根据是否设置了输出目录显示不同的提示
      if (result.hasOutputDir) {
        this.utils.notificationCenter.success(`成功！文件已自动保存到: ${result.outputPath}`);
      } else {
        this.utils.notificationCenter.success('成功！点击"保存"按钮进行保存');
      }

    } catch (error) {
      console.error('操作失败:', error);
      PDFPreview.showError(error.message, this.container);
      this.utils.notificationCenter.error('操作失败: ' + error.message);
      this.utils.updateStatus('error', '操作失败');
    } finally {
      // 恢复按钮状态
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('pdf-btn-loading');
        submitBtn.textContent = submitBtn.dataset.originalText || '开始处理';
      }
    }
  }

  async handleOCR() {
    const languageSelect = this.container.querySelector('#ocr-language');
    const pagesInput = this.container.querySelector('#ocr-pages');
    const searchableCheckbox = this.container.querySelector('#ocr-searchable');
    const outputDirInput = this.container.querySelector('#ocr-output-dir');

    const selectedFiles = this.selectedFiles['ocr'] || [];
    if (selectedFiles.length === 0) {
      throw new Error('请选择PDF或图片文件');
    }

    const file = selectedFiles[0];  // 直接传递File对象
    const fileName = selectedFiles[0].name;
    const language = languageSelect?.value || 'auto';  // 默认自动检测
    const pages = pagesInput?.value.trim() || 'all';
    const searchable = searchableCheckbox?.checked || false;
    const output = searchable ? 'searchable.pdf' : 'output.txt';
    const outputDir = outputDirInput?.value.trim() || '';

    // 调用API
    const result = await OCRApi.executeOCR({
      files: selectedFiles,  // 传递所有选中的文件
      language,
      pages,
      searchable,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      // 决定 output 显示内容
      let outputDisplay;

      if (searchable && result.searchablePdfUrl) {
        // searchable=true: 直接显示完整的 URL
        outputDisplay = result.searchablePdfUrl;
      } else if (result.outputPath) {
        // searchable=false: 显示本地文件路径
        outputDisplay = result.outputPath;
      } else {
        // 默认
        outputDisplay = output;
      }

      return {
        operation: 'ocr',
        file: fileName,
        language: language,
        output: outputDisplay,
        message: 'OCR识别成功',
        outputPath: result.outputPath || '',
        searchable: searchable,
        textContent: result.textContent,
        searchablePdfUrl: result.searchablePdfUrl,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || 'OCR识别失败');
    }
  }

  /**
   * 加载 OCR 语言列表
   */
  async loadOCRLanguages() {
    try {
      this.utils.updateStatus('loading', '加载 OCR 配置...');

      // 从 API 获取语言列表
      const languages = await OCRApi.fetchOCRConfig(this.apiBaseUrl);
      this.ocrLanguages = languages;

      // 更新下拉框
      this.renderOCRLanguageSelect(languages);

      this.utils.updateStatus('ready', '就绪');
      console.log('✅ OCR 语言列表加载成功:', languages.length, '种语言');
    } catch (error) {
      console.error('❌ OCR 语言列表加载失败:', error);
      this.utils.notificationCenter.warning('OCR 配置加载失败，使用默认配置');
    }
  }

  /**
   * 渲染 OCR 语言选择框
   */
  renderOCRLanguageSelect(languages) {
    const languageSelect = this.container.querySelector('#ocr-language');
    if (!languageSelect || !languages || languages.length === 0) {
      return;
    }

    // 清空并重新填充选项
    languageSelect.innerHTML = languages.map(lang =>
      `<option value="${lang.value}">${lang.label}</option>`
    ).join('');

    console.log('✅ OCR 语言选择框渲染完成');
  }

  /**
   * 处理 OCR 文件选择（检测文件类型，控制页面范围显示）
   */
  async handleOCRFileSelection(event) {
    const files = Array.from(event.target.files);
    if (files.length === 0) return;

    // 处理文件列表
    PDFFileList.handleFileSelection(event, 'ocr', 'ocr-file-list', this.selectedFiles, this.container);

    // 检测第一个文件的类型
    const firstFile = files[0];
    const isPDF = firstFile.type === 'application/pdf' || firstFile.name.toLowerCase().endsWith('.pdf');

    // 控制"页面范围"选项的显示/隐藏
    const pagesGroup = this.container.querySelector('#ocr-pages-group');
    if (pagesGroup) {
      if (isPDF) {
        pagesGroup.style.display = 'flex';
        console.log('✅ 检测到 PDF 文件，显示页面范围选项');
      } else {
        pagesGroup.style.display = 'none';
        console.log('✅ 检测到图片文件，隐藏页面范围选项');
      }
    }

    // 如果是图片，进行预处理（转换 + 压缩）
    if (!isPDF && typeof ImageConverter !== 'undefined') {
      try {
        this.utils.updateStatus('processing', '处理图片...');

        const processedFiles = [];
        for (const file of files) {
          try {
            const processed = await ImageConverter.prepareImageForOCR(file);

            // 创建新的 File 对象
            const newFile = new File([processed.blob], processed.fileName, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });

            processedFiles.push(newFile);

            // 显示压缩信息
            if (processed.compressed) {
              const originalMB = (processed.originalSize / 1024 / 1024).toFixed(2);
              const finalMB = (processed.finalSize / 1024 / 1024).toFixed(2);
              console.log(`✅ 图片已优化: ${file.name} (${originalMB}MB → ${finalMB}MB)`);
            }

          } catch (error) {
            console.error(`图片处理失败 (${file.name}):`, error);
            // 处理失败时使用原始文件
            processedFiles.push(file);
          }
        }

        // 更新 selectedFiles
        this.selectedFiles['ocr'] = processedFiles;

        this.utils.updateStatus('ready', '就绪');
        console.log('✅ 图片预处理完成');

      } catch (error) {
        console.error('图片预处理失败:', error);
        this.utils.notificationCenter.warning('图片预处理失败，将使用原始图片');
      }
    }
  }

  /**
   * 选择输出目录
   */
  async handleSelectOutputDir(toolName) {
    try {
      // 检查是否有文件选择API
      if (this.utils.electronAPI && typeof this.utils.electronAPI.selectDirectory === 'function') {
        const dirPath = await this.utils.electronAPI.selectDirectory();
        if (dirPath) {
          const outputDirInput = this.container.querySelector(`#${toolName}-output-dir`);
          if (outputDirInput) {
            outputDirInput.value = dirPath;
          }
        }
      } else {
        this.utils.notificationCenter.warning('当前环境不支持选择目录');
      }
    } catch (error) {
      console.error('选择输出目录失败:', error);
      this.utils.notificationCenter.error('选择输出目录失败');
    }
  }
}

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.OCRAgent = OCRAgent;
}
