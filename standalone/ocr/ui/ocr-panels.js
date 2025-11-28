// OCR Agent - 面板HTML生成模块
// 负责生成 OCR 面板的HTML

const OCRPanels = {
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
   * 获取页面范围设置HTML（支持OCR语言选择）
   */
  getPageRangeHTML(toolName) {
    return `
      <div class="pdf-input-group">
        <div style="display: flex; gap: var(--spacing-2); align-items: center;">
          <div style="display: flex; align-items: center; gap: 4px; flex-shrink: 0;">
            <label style="margin: 0; white-space: nowrap;">识别语言:</label>
            <select id="${toolName}-language" class="pdf-select" style="width: auto;">
              <option value="">加载中...</option>
            </select>
          </div>
          <div style="display: flex; align-items: center; gap: 4px; flex: 1;">
            <label style="margin: 0; white-space: nowrap;">页面范围:</label>
            <input type="text" id="${toolName}-pages" placeholder="例如: 1-5 / 2,4,6 / 默认所有" class="pdf-text-input" style="flex: 1;">
          </div>
        </div>
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
   * 获取OCR识别面板HTML
   */
  getOCRPanelHTML() {
    return `
      <div class="pdf-panel-content">
        ${this.getFileSelectionGroupHTML('ocr', '.pdf,image/*', '📁', '选择文件', '未选择文件')}
        ${this.getPageRangeHTML('ocr')}
        ${this.getCheckboxHTML('ocr-searchable', '创建可搜索PDF（在原PDF上添加文字层）')}
        ${this.getOutputDirectoryHTML('ocr')}
        ${this.getSubmitButtonHTML()}
      </div>
    `;
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.OCRPanels = OCRPanels;
}
