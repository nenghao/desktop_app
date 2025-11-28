// PDF工具 - 面板HTML生成模块
// 负责生成各个工具面板的HTML

const PDFPanels = {
  /**
   * 获取文件选择组HTML（公共组件）
   */
  getFileSelectionGroupHTML(toolName, accept = '.pdf', buttonIcon = '📁', buttonText = '选择文件', emptyText = '未选择文件') {
    return `
      <div class="pdf-file-selection-group">
        <div class="pdf-file-selection-header">
          <label class="pdf-file-selection-label">
            <input type="file" id="${toolName}-files" accept="${accept}" multiple class="pdf-file-input">
            <span class="pdf-file-btn">${buttonIcon} ${buttonText}</span>
          </label>
          <button type="button" id="${toolName}-clear-files" class="pdf-btn pdf-btn-clear">🗑️ 清空列表</button>
        </div>
        <div class="pdf-file-list-container" id="${toolName}-file-list-container">
          <div class="pdf-file-list" id="${toolName}-file-list">
            <div class="pdf-file-list-empty">${emptyText}</div>
          </div>
        </div>
      </div>
    `;
  },

  /**
   * 获取页面范围设置HTML（公共组件）
   * @param {string} toolName - 工具名称
   * @param {boolean} showSplitMode - 是否显示拆分方式选择框
   * @param {boolean} showOCRLanguage - 是否显示OCR语言选择框
   */
  getPageRangeHTML(toolName, showSplitMode = false, showOCRLanguage = false) {
    const showLeftControl = showSplitMode || showOCRLanguage;
    return `
      <div class="pdf-input-group">
        <div style="display: flex; gap: var(--spacing-2); align-items: center;">
          ${showSplitMode ? `
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <label style="margin: 0; white-space: nowrap;">拆分方式:</label>
            <select id="${toolName}-mode" class="pdf-select" style="width: auto;">
              <option value="pages">按页面范围</option>
              <option value="every">每N页拆分</option>
              <option value="single">每页单独拆分</option>
            </select>
          </div>
          ` : ''}
          ${showOCRLanguage ? `
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <label style="margin: 0; white-space: nowrap;">识别语言:</label>
            <select id="${toolName}-language" class="pdf-select" style="width: auto;">
              <option value="">加载中...</option>
            </select>
          </div>
          ` : ''}
          <div style="display: flex; align-items: center; gap: 4px; flex: 1;" id="${toolName}-pages-group">
            <label style="margin: 0; white-space: nowrap;">页面范围:</label>
            <input type="text" id="${toolName}-pages" placeholder="例如: 1-5 / 2,4,6 / 默认所有" class="pdf-text-input" style="flex: 1;">
          </div>
        </div>
        ${showSplitMode ? `
        <div id="${toolName}-every-group" style="display:none; margin-top: var(--spacing-2);">
          <label>每几页拂分：</label>
          <input type="number" id="${toolName}-every" value="1" min="1" class="pdf-text-input">
        </div>
        ` : ''}
      </div>
    `;
  },

  /**
   * 获取输出目录设置HTML（公共组件）
   */
  getOutputDirectoryHTML(toolName) {
    return `
      <div class="pdf-input-group">
        <div style="display: flex; gap: var(--spacing-2); align-items: center;">
          <label style="margin: 0; white-space: nowrap;">输出目录:</label>
          <input type="text" id="${toolName}-output-dir" placeholder="设置后会自动保存，否则手动保存" class="pdf-text-input" style="flex: 1;">
          <button type="button" id="${toolName}-select-output-dir" class="pdf-btn pdf-btn-secondary" style="height: 30px; flex-shrink: 0;">📁 选择</button>
        </div>
      </div>
    `;
  },

  /**
   * 获取复选框HTML（公共组件）
   * @param {string} id - 复选框ID
   * @param {string} label - 复选框文本
   */
  getCheckboxHTML(id, label) {
    return `
      <label class="pdf-checkbox-wrapper">
        <input type="checkbox" id="${id}" class="pdf-checkbox">
        <span class="pdf-checkbox-label">${label}</span>
      </label>
    `;
  },

  /**
   * 获取提交按钮HTML（公共组件）
   */
  getSubmitButtonHTML() {
    return `<button type="submit" class="pdf-btn pdf-btn-primary pdf-create-btn">开始处理</button>`;
  },

  /**
   * 获取合并PDF面板HTML
   */
  getMergePanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('merge', '.pdf', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('merge')}
        ${this.getCheckboxHTML('merge-bookmark', '添加书签')}
        ${this.getOutputDirectoryHTML('merge')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取拆分PDF面板HTML
   */
  getSplitPanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('split', '.pdf', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('split', true)}
        ${this.getOutputDirectoryHTML('split')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取创建PDF面板HTML
   */
  getCreatePanelHTML() {
    return `
      <div class="pdf-panel-content">
        <div class="pdf-input-group">
          <label>创建方式:</label>
          <select id="create-mode" class="pdf-select">
            <option value="images">从图片创建</option>
            <option value="text">从文本创建</option>
            <option value="blank">创建空白PDF</option>
          </select>
          <label class="pdf-file-selection-label">
            <input type="file" id="create-images" accept="image/*" multiple class="pdf-file-input">
            <span class="pdf-file-btn">🖼️ 添加图片</span>
          </label>
          <button type="button" id="create-clear-files" class="pdf-btn pdf-btn-clear">🗑️ 清空列表</button>
        </div>
        <div class="pdf-file-selection-group" id="create-images-group">
          <div class="pdf-file-list-container" id="create-file-list-container">
            <div class="pdf-file-list" id="create-image-list">
              <div class="pdf-file-list-empty">未选择图片</div>
            </div>
          </div>
        </div>
        <div class="pdf-input-group pdf-input-group-fullwidth" id="create-text-group" style="display:none;">
          <textarea id="create-text" rows="8" placeholder="输入文本内容..." class="pdf-textarea"></textarea>
        </div>
        <div class="pdf-input-group" id="create-blank-group" style="display:none;">
          <label>页数：</label>
          <input type="number" id="create-pages" value="1" min="1" class="pdf-text-input">
        </div>
        ${this.getOutputDirectoryHTML('create')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  },

  /**
   * 获取OCR识别面板HTML
   */
  getOCRPanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('ocr', '.pdf,image/*', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('ocr', false, true)}
        ${this.getCheckboxHTML('ocr-searchable', '创建可搜索PDF（在原PDF上添加文字层）')}
        ${this.getOutputDirectoryHTML('ocr')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFPanels = PDFPanels;
}
