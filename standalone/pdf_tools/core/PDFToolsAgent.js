// PDF工具 - 核心代理类
// 负责整体逻辑协调和业务流程

class PDFToolsAgent {
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

    this.currentTool = 'merge';
    this.selectedFiles = {}; // 存储每个工具的文件列表
    this.tempFiles = []; // 存储临时文件路径，用于清理

    // OCR 配置
    this.ocrLanguages = []; // OCR 语言列表
    // 从 context 动态获取 API 基础地址（支持 debug 和 release 环境）
    this.apiBaseUrl = context?.apiConfig?.baseUrl || context?.config?.apiBaseUrl || 'https://api.baizesz.com';
    console.log('🔧 [PDF Tools] API 基础地址:', this.apiBaseUrl);
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
    const agentName = this.agentData.name || 'PDF工具集';

    this.utils.updateAgentStatus(agentName, 'ready', '就绪');

    this.renderHTML();

    this.initializeEventListeners();

    this.switchTool('create');

    // 渲染假数据历史记录
    PDFHistory.renderHistory(this.operationHistory, this.container);

    // 启用表单
    this.enableForm();
  }

  enableForm() {
    const form = this.container.querySelector('#pdf-tools-form');

    if (form) {
      form.style.opacity = '1';
      form.style.pointerEvents = 'auto';
    }
  }

  renderHTML() {
    this.container.innerHTML = `
      <div class="pdf-tools-workspace">
        <div class="pdf-tool-selector">
          <div class="pdf-categories">
            <button class="pdf-category-btn pdf-active" data-tool="create">
              <span class="pdf-icon">📑</span>
              创建PDF
            </button>
            <button class="pdf-category-btn" data-tool="merge">
              <span class="pdf-icon">📑</span>
              合并PDF
            </button>
            <button class="pdf-category-btn" data-tool="split">
              <span class="pdf-icon">✂️</span>
              拆分PDF
            </button>
            <button class="pdf-category-btn" data-tool="ocr">
              <span class="pdf-icon">🔍</span>
              OCR识别
            </button>
          </div>
        </div>

        <form id="pdf-tools-form" class="pdf-form" style="opacity: 0.6; pointer-events: none;">
          <div class="pdf-tool-panel" id="tool-panel"></div>
        </form>

        <div class="pdf-result" id="pdf-result">
          <div class="pdf-result-placeholder">
            <div class="pdf-placeholder-icon">📋</div>
            <p>选择工具并配置参数开始处理PDF</p>
            <p class="pdf-help-text">支持PDF合并、拆分、创建和OCR文字识别</p>
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
    const form = this.container.querySelector('#pdf-tools-form');
    const clearHistoryBtn = this.container.querySelector('#clear-history');
    const exportHistoryBtn = this.container.querySelector('#export-history');
    const categoryBtns = this.container.querySelectorAll('.pdf-category-btn');

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

    categoryBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const tool = btn.dataset.tool;
        this.switchTool(tool);
      });
    });
  }

  switchTool(tool) {
    this.currentTool = tool;

    const categoryBtns = this.container.querySelectorAll('.pdf-category-btn');
    categoryBtns.forEach(btn => {
      if (btn.dataset.tool === tool) {
        btn.classList.add('pdf-active');
      } else {
        btn.classList.remove('pdf-active');
      }
    });

    // 清空 pdf-result 区域，恢复占位符
    const resultContainer = this.container.querySelector('#pdf-result');
    if (resultContainer) {
      resultContainer.innerHTML = `
        <div class="pdf-result-placeholder">
          <div class="pdf-placeholder-icon">📋</div>
          <p>选择工具并配置参数开始处理PDF</p>
          <p class="pdf-help-text">支持PDF合并、拆分、创建和OCR文字识别</p>
        </div>
      `;
    }

    this.showToolPanel(tool);
  }

  showToolPanel(tool) {
    const toolPanel = this.container.querySelector('#tool-panel');
    if (!toolPanel) return;

    const panels = {
      merge: PDFPanels.getMergePanelHTML(),
      split: PDFPanels.getSplitPanelHTML(),
      create: PDFPanels.getCreatePanelHTML(),
      ocr: PDFPanels.getOCRPanelHTML()
    };

    toolPanel.innerHTML = panels[tool] || '';

    // 重新绑定事件
    this.bindToolPanelEvents(tool);
  }

  bindToolPanelEvents(tool) {
    // 绑定文件选择事件
    if (tool === 'merge') {
      const fileInput = this.container.querySelector('#merge-files');
      const clearBtn = this.container.querySelector('#merge-clear-files');
      const selectDirBtn = this.container.querySelector('#merge-select-output-dir');

      if (fileInput) {
        fileInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'merge', 'merge-file-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('merge', 'merge-file-list', this.selectedFiles, this.container)
        );
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('merge'));
      }
    } else if (tool === 'create') {
      const modeSelect = this.container.querySelector('#create-mode');
      const imageInput = this.container.querySelector('#create-images');
      const clearBtn = this.container.querySelector('#create-clear-files');
      const selectDirBtn = this.container.querySelector('#create-select-output-dir');

      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => this.handleCreateModeChange(e.target.value));
      }

      if (imageInput) {
        imageInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'create', 'create-image-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('create', 'create-image-list', this.selectedFiles, this.container)
        );
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('create'));
      }
    } else if (tool === 'split') {
      const fileInput = this.container.querySelector('#split-files');
      const clearBtn = this.container.querySelector('#split-clear-files');
      const modeSelect = this.container.querySelector('#split-mode');
      const selectDirBtn = this.container.querySelector('#split-select-output-dir');

      if (fileInput) {
        fileInput.addEventListener('change', (e) =>
          PDFFileList.handleFileSelection(e, 'split', 'split-file-list', this.selectedFiles, this.container)
        );
      }

      if (clearBtn) {
        clearBtn.addEventListener('click', () =>
          PDFFileList.clearFileList('split', 'split-file-list', this.selectedFiles, this.container)
        );
      }

      if (modeSelect) {
        modeSelect.addEventListener('change', (e) => this.handleSplitModeChange(e.target.value));
      }

      if (selectDirBtn) {
        selectDirBtn.addEventListener('click', () => this.handleSelectOutputDir('split'));
      }
    } else if (tool === 'ocr') {
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

      // 加载 OCR 语言列表
      this.loadOCRLanguages();
    }
  }

  handleCreateModeChange(mode) {
    const imagesGroup = this.container.querySelector('#create-images-group');
    const textGroup = this.container.querySelector('#create-text-group');
    const blankGroup = this.container.querySelector('#create-blank-group');

    if (imagesGroup) imagesGroup.style.display = mode === 'images' ? 'block' : 'none';
    if (textGroup) textGroup.style.display = mode === 'text' ? 'block' : 'none';
    if (blankGroup) blankGroup.style.display = mode === 'blank' ? 'block' : 'none';
  }

  handleSplitModeChange(mode) {
    const everyGroup = this.container.querySelector('#split-every-group');
    const pagesInput = this.container.querySelector('#split-pages');

    if (everyGroup) {
      everyGroup.style.display = mode === 'every' ? 'block' : 'none';
    }

    // 根据模式调整页面范围输入框的占位符
    if (pagesInput) {
      if (mode === 'single') {
        pagesInput.disabled = true;
        pagesInput.placeholder = '每页单独拆分无需设置';
      } else {
        pagesInput.disabled = false;
        pagesInput.placeholder = '例如: 1-5, 6-10';
      }
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

      let result;
      switch (this.currentTool) {
        case 'merge':
          result = await this.handleMerge();
          break;
        case 'split':
          result = await this.handleSplit();
          break;
        case 'create':
          result = await this.handleCreate();
          break;
        case 'ocr':
          result = await this.handleOCR();
          break;
        default:
          throw new Error('未知的工具类型');
      }

      // 显示结果和预览 - 统一使用 showPreview 方法
      PDFPreview.showPreview(result.outputPath || '', this.container, result, result.pdfBytes);

      // 添加到历史记录
      await PDFHistory.addToHistory(this.currentTool, result, this.operationHistory, this.container, this.services);

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

  async handleMerge() {
    const pagesInput = this.container.querySelector('#merge-pages');
    const bookmarkCheckbox = this.container.querySelector('#merge-bookmark');
    const outputDirInput = this.container.querySelector('#merge-output-dir');

    const selectedFiles = this.selectedFiles['merge'] || [];

    if (selectedFiles.length < 2) {
      throw new Error('请至少选择两个PDF文件');
    }

    // 直接传递File对象数组
    const files = selectedFiles;
    const pages = pagesInput?.value.trim() || 'all';
    const addBookmark = bookmarkCheckbox?.checked || false;
    const outputDir = outputDirInput?.value.trim() || '';

    // 自动生成输出文件名
    const output = PDFHelpers.generateOutputFileName(selectedFiles.map(f => f.name), 'pdf');

    // 调用API
    const result = await PDFApi.executeOperation('merge', {
      files,
      pages,
      addBookmark,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      return {
        operation: 'merge',
        files: selectedFiles.map(f => f.name),
        output: output,
        message: '合并成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '合并失败');
    }
  }

  async handleSplit() {
    const modeSelect = this.container.querySelector('#split-mode');
    const pagesInput = this.container.querySelector('#split-pages');
    const everyInput = this.container.querySelector('#split-every');
    const outputDirInput = this.container.querySelector('#split-output-dir');

    const selectedFiles = this.selectedFiles['split'] || [];
    if (selectedFiles.length === 0) {
      throw new Error('请选择PDF文件');
    }

    const file = selectedFiles[0];  // 直接传递File对象
    const fileName = selectedFiles[0].name;
    const mode = modeSelect?.value || 'pages';
    const pages = pagesInput?.value.trim();
    const every = everyInput?.value || '1';
    const outputDir = outputDirInput?.value.trim() || '';

    // 调用API
    const result = await PDFApi.executeOperation('split', {
      file,
      mode,
      pages,
      every,
      outputDir
    }, this.context);

    if (result.success) {
      return {
        operation: 'split',
        file: fileName,
        mode: mode,
        output: outputDir || '输出目录',
        message: '拆分成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '拆分失败');
    }
  }

  async handleCreate() {
    const modeSelect = this.container.querySelector('#create-mode');
    const textInput = this.container.querySelector('#create-text');
    const pagesInput = this.container.querySelector('#create-pages');
    const outputDirInput = this.container.querySelector('#create-output-dir');

    const mode = modeSelect?.value || 'images';
    const outputDir = outputDirInput?.value.trim() || '';

    let images = null;
    let text = null;
    let pages = null;

    if (mode === 'images') {
      const selectedFiles = this.selectedFiles['create'] || [];
      if (selectedFiles.length === 0) {
        throw new Error('请选择图片文件');
      }
      images = selectedFiles;  // 直接传递File对象数组
    } else if (mode === 'text') {
      text = textInput?.value.trim();
      if (!text) throw new Error('请输入文本内容');
    } else if (mode === 'blank') {
      pages = pagesInput?.value || '1';
    }

    // 自动生成输出文件名
    let output;
    if (mode === 'images' && images) {
      const fileNames = (this.selectedFiles['create'] || []).map(f => f.name);
      output = PDFHelpers.generateOutputFileName(fileNames, 'pdf');
    } else {
      output = 'document_' + new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0] + '.pdf';
    }

    // 调用API
    const result = await PDFApi.executeOperation('create', {
      mode,
      images,
      text,
      pages,
      output,
      outputDir
    }, this.context);

    if (result.success) {
      // 获取源文件信息
      let sourceFiles = null;
      if (mode === 'images' && images) {
        sourceFiles = images.map(f => f.name);
      } else if (mode === 'text') {
        sourceFiles = ['文本内容'];
      } else if (mode === 'blank') {
        sourceFiles = [`空白PDF (${pages}页)`];
      }

      return {
        operation: 'create',
        mode: mode,
        files: sourceFiles,  // 添加源文件信息
        output: output,
        message: '创建成功',
        outputPath: result.outputPath,
        pdfBytes: result.pdfBytes,
        hasOutputDir: !!outputDir
      };
    } else {
      throw new Error(result.error || '创建失败');
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
    const result = await PDFApi.executeOperation('ocr', {
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
      const languages = await PDFApi.fetchOCRConfig(this.apiBaseUrl);
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
            console.error(`❌ 图片处理失败 (${file.name}):`, error);
            this.utils.notificationCenter.warning(`图片处理失败: ${file.name}`);
          }
        }

        // 更新选中的文件列表
        if (processedFiles.length > 0) {
          this.selectedFiles['ocr'] = processedFiles;
          console.log(`✅ 共处理 ${processedFiles.length} 个图片文件`);
        }

        this.utils.updateStatus('ready', '就绪');
      } catch (error) {
        console.error('❌ 图片处理失败:', error);
        this.utils.notificationCenter.error('图片处理失败: ' + error.message);
        this.utils.updateStatus('ready', '就绪');
      }
    }
  }

  async handleSelectOutputDir(toolName) {
    try {
      // 调用 Electron API 选择目录
      if (window.electronAPI && window.electronAPI.showOpenDialog) {
        const result = await window.electronAPI.showOpenDialog({
          properties: ['openDirectory']
        });

        if (result && !result.canceled && result.filePaths && result.filePaths.length > 0) {
          const dirPath = result.filePaths[0];
          const outputInput = this.container.querySelector(`#${toolName}-output-dir`);
          if (outputInput) {
            outputInput.value = dirPath;
          }
          this.utils.notificationCenter.success('目录已选择');
        }
      } else {
        this.utils.notificationCenter.warning('当前环境不支持目录选择功能');
      }
    } catch (error) {
      console.error('选择目录失败:', error);
      this.utils.notificationCenter.error('选择目录失败: ' + error.message);
    }
  }
}

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFToolsAgent = PDFToolsAgent;
}
