// PDF工具 - 文件列表组件模块
// 负责文件列表的渲染和管理

const PDFFileList = {
  /**
   * 处理文件选择事件
   * @param {Event} event - 文件选择事件
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  handleFileSelection(event, toolName, listId, selectedFiles, container) {
    const files = event.target.files;
    const listContainer = container.querySelector(`#${listId}`);

    if (!listContainer || files.length === 0) {
      return;
    }

    // 初始化文件列表
    if (!selectedFiles[toolName]) {
      selectedFiles[toolName] = [];
    }

    // 添加新文件到列表（不清空之前的）
    Array.from(files).forEach(file => {
      // 检查是否已存在同名文件
      const exists = selectedFiles[toolName].some(f => f.name === file.name && f.size === file.size);
      if (!exists) {
        selectedFiles[toolName].push(file);
      }
    });

    // 清空文件输入框，以便可以再次选择相同文件
    event.target.value = '';

    // 渲染文件列表
    this.renderFileList(toolName, listId, selectedFiles, container);
  },

  /**
   * 渲染文件列表
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  renderFileList(toolName, listId, selectedFiles, container) {
    const listContainer = container.querySelector(`#${listId}`);
    if (!listContainer) return;

    const files = selectedFiles[toolName] || [];

    if (files.length === 0) {
      listContainer.innerHTML = '<div class="pdf-file-list-empty">未选择文件</div>';
      return;
    }

    const fileListHTML = files.map((file, index) => `
      <div class="pdf-file-item" data-index="${index}">
        <span class="pdf-file-icon">📄</span>
        <span class="pdf-file-name">${this.escapeHtml(file.name)}</span>
        <span class="pdf-file-size">(${PDFHelpers.formatFileSize(file.size)})</span>
        <button type="button" class="pdf-file-remove" data-tool="${toolName}" data-index="${index}" title="删除">✕</button>
      </div>
    `).join('');

    listContainer.innerHTML = fileListHTML;

    // 绑定删除按钮事件
    listContainer.querySelectorAll('.pdf-file-remove').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tool = e.target.dataset.tool;
        const index = parseInt(e.target.dataset.index);
        this.removeFile(tool, index, listId, selectedFiles, container);
      });
    });
  },

  /**
   * 删除单个文件
   * @param {string} toolName - 工具名称
   * @param {number} index - 文件索引
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  removeFile(toolName, index, listId, selectedFiles, container) {
    if (selectedFiles[toolName]) {
      selectedFiles[toolName].splice(index, 1);
      this.renderFileList(toolName, listId, selectedFiles, container);
    }
  },

  /**
   * 清空文件列表
   * @param {string} toolName - 工具名称
   * @param {string} listId - 列表DOM ID
   * @param {object} selectedFiles - 已选文件对象
   * @param {HTMLElement} container - 容器元素
   */
  clearFileList(toolName, listId, selectedFiles, container) {
    selectedFiles[toolName] = [];
    this.renderFileList(toolName, listId, selectedFiles, container);
  },

  /**
   * HTML转义（使用helpers中的函数）
   */
  escapeHtml(text) {
    return PDFHelpers.escapeHtml(text);
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFFileList = PDFFileList;
}
