// PDF工具 - 历史记录组件模块
// 负责操作历史的管理和渲染

const PDFHistory = {
  // 历史记录存储键名
  STORAGE_KEY: 'pdf_tools_history',

  // 最大缓存数量
  MAX_HISTORY_COUNT: 10,
  /**
   * 渲染历史记录列表
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   */
  renderHistory(history, container) {
    const historyList = container.querySelector('#history-list');
    if (!historyList) return;

    if (history.length === 0) {
      historyList.innerHTML = '<div class="pdf-history-empty">暂无操作历史（记录保存在本地，最多保存10条，新的会覆盖旧的）</div>';
      return;
    }

    const operationNames = {
      merge: '合并',
      split: '拆分',
      create: '创建',
      ocr: 'OCR'
    };

    historyList.innerHTML = history.map((item, index) => {
      // 优先使用 result.outputPath（真实文件路径），回退到 tempFilePath
      const filePath = item.result.outputPath || item.tempFilePath;

      return `
        <div class="pdf-history-item" data-index="${index}">
          <span class="pdf-history-operation">${operationNames[item.operation] || item.operation}</span>
          ${filePath ? `
            <span class="pdf-history-filename pdf-history-filename-clickable" data-path="${PDFHelpers.escapeHtml(filePath)}" title="打开文件所在文件夹">
              ${PDFHelpers.escapeHtml(item.result.output)}
            </span>
          ` : `
            <span class="pdf-history-filename">${PDFHelpers.escapeHtml(item.result.output)}</span>
          `}
          <span class="pdf-history-time">${item.timestamp}</span>
        </div>
      `;
    }).join('');

    // 绑定文件名点击事件 - 打开文件所在文件夹
    historyList.querySelectorAll('.pdf-history-filename-clickable').forEach(fileNameEl => {
      fileNameEl.addEventListener('click', (e) => {
        const filePath = e.currentTarget.dataset.path;
        if (filePath) {
          PDFPreview.openFile(filePath);
        }
      });
    });
  },

  /**
   * 从 LocalStorage 加载历史记录
   * @returns {Array} 历史记录数组
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        console.log('📚 从缓存加载历史记录:', history.length, '条');
        return history;
      }
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
    return [];
  },

  /**
   * 保存历史记录到 LocalStorage
   * @param {Array} history - 历史记录数组
   */
  saveToStorage(history) {
    try {
      // 只保存前 MAX_HISTORY_COUNT 条，并且只保存必要的字段以减少存储空间
      const toSave = history.slice(0, this.MAX_HISTORY_COUNT).map(item => ({
        operation: item.operation,
        result: {
          message: item.result.message,
          output: item.result.output,
          outputPath: item.result.outputPath
          // 不保存其他可能很大的字段（如 pdfBytes, preview 等）
        },
        timestamp: item.timestamp,
        tempFilePath: item.tempFilePath
      }));

      const jsonString = JSON.stringify(toSave);
      const sizeKB = (new Blob([jsonString]).size / 1024).toFixed(2);

      localStorage.setItem(this.STORAGE_KEY, jsonString);
      console.log(`💾 历史记录已保存: ${toSave.length} 条 (${sizeKB} KB)`);
    } catch (error) {
      if (error.name === 'QuotaExceededError') {
        console.error('💥 LocalStorage 配额已满，尝试清理旧记录...');
        // 如果存储失败，尝试只保存前5条
        try {
          const reducedSave = history.slice(0, 5).map(item => ({
            operation: item.operation,
            result: {
              message: item.result.message,
              output: item.result.output,
              outputPath: item.result.outputPath
            },
            timestamp: item.timestamp,
            tempFilePath: item.tempFilePath
          }));
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(reducedSave));
          console.log('✅ 已保存前 5 条历史记录');
        } catch (retryError) {
          console.error('❌ 仍然无法保存，清空历史记录缓存');
          localStorage.removeItem(this.STORAGE_KEY);
        }
      } else {
        console.error('保存历史记录失败:', error);
      }
    }
  },

  /**
   * 添加历史记录
   * @param {string} operation - 操作类型
   * @param {object} result - 操作结果
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   * @param {object} services - 服务对象
   * @returns {Promise<object>} 添加的历史记录项
   */
  async addToHistory(operation, result, history, container, services) {
    // 保存文件到临时目录
    let tempFilePath = null;
    if (result.outputPath) {
      try {
        tempFilePath = await this.saveToTempDirectory(result.outputPath, result.output, services);
      } catch (error) {
        console.warn('保存到临时目录失败:', error);
      }
    }

    const historyItem = {
      operation,
      result,
      timestamp: PDFHelpers.formatDateTime(new Date()),
      tempFilePath: tempFilePath
    };

    history.unshift(historyItem);

    // 限制历史记录数量为 MAX_HISTORY_COUNT
    if (history.length > this.MAX_HISTORY_COUNT) {
      history.splice(this.MAX_HISTORY_COUNT);
    }

    // 保存到 LocalStorage
    this.saveToStorage(history);

    this.renderHistory(history, container);

    return historyItem;
  },

  /**
   * 保存文件到临时目录
   * @param {string} sourcePath - 源文件路径
   * @param {string} fileName - 文件名
   * @param {object} services - 服务对象
   * @returns {Promise<string>} 临时文件路径
   */
  async saveToTempDirectory(sourcePath, fileName, services) {
    // 获取系统临时目录
    const tmpdir = await PDFHelpers.getTempDir();

    // 生成临时文件名
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').split('.')[0];
    const tempFileName = `${fileName.replace('.pdf', '')}_${timestamp}.pdf`;

    // TODO: 实际的文件复制逻辑
    // 由于当前环境限制，先返回模拟路径
    // 实际实现需要调用文件系统API
    // await services.fileSystem.copy(sourcePath, path.join(tmpdir, tempFileName));

    return `${tmpdir}/${tempFileName}`;
  },

  /**
   * 清空历史记录
   * @param {Array} history - 历史记录数组
   * @param {HTMLElement} container - 容器元素
   * @param {object} utils - 工具对象
   */
  clearHistory(history, container, utils) {
    history.length = 0;

    // 清空 LocalStorage
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('🗑️ 历史记录缓存已清空');

    this.renderHistory(history, container);
    utils.notificationCenter.info('历史记录已清空');
  },

  /**
   * 导出历史记录
   * @param {Array} history - 历史记录数组
   * @param {object} utils - 工具对象
   */
  exportHistory(history, utils) {
    if (history.length === 0) {
      utils.notificationCenter.warning('没有历史记录可导出');
      return;
    }

    const content = history.map(item =>
      `${item.timestamp}\t${item.operation}\t${item.result.message}\t${item.result.output}`
    ).join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pdf_tools_history_${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    utils.notificationCenter.success('历史记录已导出');
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFHistory = PDFHistory;
}
