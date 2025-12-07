// PDF工具 - PDF预览组件模块
// 负责在pdf-result区域显示PDF预览

const PDFPreview = {
  /**
   * 生成通用的操作结果详情HTML
   * @param {object} result - 操作结果信息
   * @param {string} pdfPath - PDF文件路径（如果有）
   * @returns {string} HTML字符串
   */
  getResultDetailsHTML(result, pdfPath = null) {
    let html = '';

    // 1. 源文件
    if (result.files && result.files.length > 0) {
      html += `<div><strong>源文件:</strong>${result.files.join(', ')}</div>`;
    } else if (result.file) {
      html += `<div><strong>源文件:</strong>${PDFHelpers.escapeHtml(result.file)}</div>`;
    }

    // 2. 模式（create的mode、split的mode、ocr的language统一显示为模式）
    if (result.mode) {
      const modeLabels = {
        'images': '从图片创建',
        'text': '从文本创建',
        'blank': '空白PDF',
        'pages': '按页面范围',
        'every': '每N页拆分',
        'single': '每页单独拆分'
      };
      html += `<div><strong>模式:</strong>${modeLabels[result.mode] || result.mode}</div>`;
    } else if (result.language) {
      // OCR的语言也显示为"模式"
      html += `<div><strong>模式:</strong>${PDFHelpers.escapeHtml(result.language)}</div>`;
    }

    // 额外的OCR统计信息
    if (result.pageCount) {
      html += `<div><strong>页数:</strong>${result.recognizedPages || 0}/${result.pageCount}</div>`;
    }
    if (result.confidence) {
      html += `<div><strong>识别度:</strong>${(result.confidence * 100).toFixed(1)}%</div>`;
    }

    // 3. 输出（实际文件路径，可点击打开）
    if (pdfPath) {
      html += `<div><strong>输出:</strong><code class="pdf-path-code pdf-path-clickable" title="点击打开">${PDFHelpers.escapeHtml(pdfPath)}</code></div>`;
    } else if (result.output) {
      html += `<div><strong>输出:</strong><span class="pdf-output-text">${PDFHelpers.escapeHtml(result.output)}</span></div>`;
    }

    // 4. 识别文本（仅OCR有此项）
    if (result.textContent) {
      html += `
        <div class="pdf-text-content-container">
          <div class="pdf-text-content-label"><strong>识别文本:</strong></div>
          <div class="pdf-text-content">${PDFHelpers.escapeHtml(result.textContent)}</div>
        </div>
      `;
    }

    return html;
  },

  /**
   * 在结果区域显示PDF预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} container - 容器元素
   * @param {object} result - 操作结果信息
   */
  showPreview(pdfPath, container, result, pdfBytes) {
    const resultContainer = container.querySelector('#pdf-result');
    if (!resultContainer) return;

    const operationNames = {
      merge: '合并PDF',
      split: '拆分PDF',
      create: '创建PDF',
      ocr: 'OCR识别'
    };

    // Determine success/failure state
    const isSuccess = result.success !== false;
    const titleText = isSuccess ? `${operationNames[result.operation] || '操作'}成功` : `${operationNames[result.operation] || '操作'}失败`;

    // Get icon HTML from IconUtils if available, fallback to simple emoji
    const getIconHtml = (name, size = 24) => {
      try {
        if (typeof window !== 'undefined' && window.IconUtils && typeof window.IconUtils.getIcon === 'function') {
          return window.IconUtils.getIcon(name, { size, strokeWidth: 1.5 });
        }
      } catch (e) {
        // ignore and fallback
      }
      return isSuccess ? '📄' : '⚠️';
    };

    const iconHtml = getIconHtml(isSuccess ? 'file-down' : 'flag', 28);

    // 检查是否为 OCR 结果且有文本内容
    const isOCRResult = result.operation === 'ocr';
    const hasTextContent = isOCRResult && result.textContent;
    // searchable=true 且有 searchablePdfUrl 为可搜索PDF模式
    const hasSearchablePDF = isOCRResult && result.searchable && result.searchablePdfUrl;

    resultContainer.innerHTML = `
      <div class="pdf-result-header">
        <div class="pdf-result-header-left">
          <div class="pdf-result-icon">${iconHtml}</div>
          <div class="pdf-result-info">
            <div class="pdf-result-title">${PDFHelpers.escapeHtml(titleText)}</div>
          </div>
        </div>
        <div class="pdf-result-header-right">
          ${hasTextContent ? (
            hasSearchablePDF ? `
              <button id="pdf-preview-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">预览</button>
              <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
            ` : `
              <button id="pdf-copy-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">复制</button>
              <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
            `
          ) : `
            <button id="pdf-preview-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">预览</button>
            <button id="pdf-download-btn" class="pdf-btn pdf-btn-secondary pdf-result-btn">保存</button>
          `}
        </div>
      </div>

      ${isSuccess ? `
        <div class="pdf-result-success">
          <div class="pdf-result-details">
            ${this.getResultDetailsHTML(result, pdfPath)}
          </div>
        </div>
      ` : `
        <div class="pdf-result-error">
          <div class="pdf-result-details">
            <div><strong>原因：</strong>${PDFHelpers.escapeHtml(result.message || '未知错误')}</div>
            ${result.errorDetail ? `<div><strong>详细：</strong>${PDFHelpers.escapeHtml(result.errorDetail)}</div>` : ''}
          </div>
        </div>
      `}
    `;

    // 复制 pdfBytes 以避免 ArrayBuffer detached 问题
    let pdfBytesCopy = null;
    if (pdfBytes) {
      pdfBytesCopy = new Uint8Array(pdfBytes);
    }

    // 保存已下载文件路径（用于点击输出路径）
    let savedFilePath = pdfPath;

    // 绑定按钮事件
    const copyBtn = resultContainer.querySelector('#pdf-copy-btn');
    const previewBtn = resultContainer.querySelector('#pdf-preview-btn');
    const downloadBtn = resultContainer.querySelector('#pdf-download-btn');

    // 复制按钮（OCR 纯文本模式）
    if (copyBtn && hasTextContent) {
      copyBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(result.textContent);
          copyBtn.textContent = '✓ 已复制';
          setTimeout(() => {
            copyBtn.textContent = '复制';
          }, 2000);
        } catch (error) {
          console.error('复制失败:', error);
          alert('复制失败: ' + error.message);
        }
      });
    }

    // 预览按钮
    if (previewBtn) {
      previewBtn.addEventListener('click', () => {
        if (isOCRResult && hasSearchablePDF && result.searchablePdfUrl) {
          // OCR 可搜索PDF：打开URL
          window.open(result.searchablePdfUrl, '_blank');
        } else if (pdfBytesCopy) {
          // 本地PDF：显示预览弹窗
          const freshCopy = new Uint8Array(pdfBytesCopy);
          this.showPreviewModal(freshCopy, result.output, container);
        } else if (pdfPath) {
          this.showPreviewModal(null, result.output, container, pdfPath);
        }
      });
    }

    // 下载/保存按钮
    if (downloadBtn) {
      downloadBtn.addEventListener('click', async () => {
        if (isOCRResult && hasTextContent) {
          if (hasSearchablePDF && result.searchablePdfUrl) {
            // OCR 可搜索PDF：下载URL指向的PDF
            try {
              const response = await fetch(result.searchablePdfUrl);
              const blob = await response.blob();
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const originalFileName = result.file ? result.file.replace(/\.[^.]+$/, '') : 'output';
              const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0].slice(0, 12);
              a.download = `${originalFileName}_searchable_${timestamp}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
            } catch (error) {
              console.error('下载PDF失败:', error);
              alert('下载PDF失败: ' + error.message);
            }
          } else {
            // OCR 纯文本：保存TXT文件
            const originalFileName = result.file ? result.file.replace(/\.[^.]+$/, '') : 'output';
            const timestamp = new Date().toISOString().replace(/[-:]/g, '').replace('T', '').split('.')[0].slice(0, 12);
            const fileName = `${originalFileName}_ocr_${timestamp}.txt`;
            const filePath = await this.downloadTextFile(result.textContent, fileName);
            if (filePath) {
              savedFilePath = filePath;
            }
          }
        } else {
          // 其他操作：下载本地PDF文件
          this.downloadFile(pdfPath, result.output, pdfBytesCopy);
        }
      });
    }

    // Clickable output path
    const pathElement = resultContainer.querySelector('.pdf-path-clickable');
    if (pathElement) {
      pathElement.addEventListener('click', () => {
        if (isOCRResult && hasSearchablePDF && result.searchablePdfUrl) {
          window.open(result.searchablePdfUrl, '_blank');
        } else if (savedFilePath) {
          this.openFile(savedFilePath);
        } else if (pdfPath) {
          this.openFile(pdfPath);
        } else {
          alert('请先保存文件');
        }
      });
    }
  },

  /**
   * 显示预览弹窗
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {string} fileName - 文件名
   * @param {HTMLElement} container - 容器元素
   * @param {string} pdfPath - PDF文件路径（可选）
   */
  showPreviewModal(pdfBytes, fileName, container, pdfPath = null) {
    // 查找或创建弹窗容器 - 使用更健壮的查找方式
    let workspace = container.querySelector('.pdf-tools-workspace');
    if (!workspace) {
      workspace = container.closest('.pdf-tools-workspace');
    }
    if (!workspace) {
      // 如果还找不到，说明container本身可能就是workspace的父容器
      workspace = container;
    }

    let modal = workspace.querySelector('.pdf-preview-modal');

    if (!modal) {
      modal = document.createElement('div');
      modal.className = 'pdf-preview-modal';
      workspace.appendChild(modal);
    }

    modal.innerHTML = `
      <div class="pdf-preview-modal-overlay"></div>
      <div class="pdf-preview-modal-content">
        <div class="pdf-preview-modal-header">
          <div class="pdf-preview-modal-title">
            <span class="pdf-preview-modal-icon">📄</span>
            <span>${PDFHelpers.escapeHtml(fileName)}</span>
          </div>
          <button class="pdf-preview-modal-close" title="关闭">✕</button>
        </div>
        <div class="pdf-preview-modal-body" id="pdf-modal-viewer">
          <div class="pdf-preview-loading">
            <div class="pdf-preview-spinner"></div>
            <div>正在加载预览...</div>
          </div>
        </div>
      </div>
    `;

    // 显示弹窗
    modal.style.display = 'flex';

    // 绑定关闭事件
    const closeBtn = modal.querySelector('.pdf-preview-modal-close');
    const overlay = modal.querySelector('.pdf-preview-modal-overlay');

    const closeModal = () => {
      modal.style.display = 'none';
    };

    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // 加载预览
    const viewer = modal.querySelector('#pdf-modal-viewer');
    if (pdfBytes) {
      this.renderModalPreviewFromBytes(pdfBytes, viewer);
    } else if (pdfPath) {
      this.renderModalPreviewFromPath(pdfPath, viewer);
    }
  },

  /**
   * 从字节数组渲染弹窗预览
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderModalPreviewFromBytes(pdfBytes, viewer) {
    try {
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJSFromBytes(pdfBytes, viewer);
      } else {
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.renderWithIframe(url, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 从路径渲染弹窗预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderModalPreviewFromPath(pdfPath, viewer) {
    try {
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJS(pdfPath, viewer);
      } else {
        this.renderWithIframe(pdfPath, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 从字节数组加载PDF预览
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} container - 容器元素
   */
  async loadPDFPreviewFromBytes(pdfBytes, container) {
    const viewer = container.querySelector('#pdf-preview-viewer');
    if (!viewer) return;

    try {
      // 检查是否可以使用PDF.js
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJSFromBytes(pdfBytes, viewer);
      } else {
        // 创建 Blob URL 并使用 iframe
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        this.renderWithIframe(url, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败，请下载后查看</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 加载PDF预览
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} container - 容器元素
   */
  async loadPDFPreview(pdfPath, container) {
    const viewer = container.querySelector('#pdf-preview-viewer');
    if (!viewer) return;

    try {
      // 检查是否可以使用PDF.js
      if (typeof pdfjsLib !== 'undefined') {
        await this.renderWithPDFJS(pdfPath, viewer);
      } else {
        // 回退到iframe或embed
        this.renderWithIframe(pdfPath, viewer);
      }
    } catch (error) {
      console.error('PDF预览加载失败:', error);
      viewer.innerHTML = `
        <div class="pdf-preview-error">
          <div class="pdf-error-icon">⚠️</div>
          <div class="pdf-error-message">预览加载失败，请下载后查看</div>
          <div class="pdf-error-detail">${error.message}</div>
        </div>
      `;
    }
  },

  /**
   * 使用PDF.js从字节数组渲染PDF
   * @param {Uint8Array} pdfBytes - PDF字节数组
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderWithPDFJSFromBytes(pdfBytes, viewer) {
    try {
      // 复制数据以避免 ArrayBuffer detached 问题
      const pdfData = new Uint8Array(pdfBytes);

      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument({ data: pdfData });
      const pdf = await loadingTask.promise;

      // 只渲染第一页作为预览
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 设置合适的缩放比例
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染页面
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      viewer.innerHTML = '';
      viewer.appendChild(canvas);

      // 添加页面信息
      if (pdf.numPages > 1) {
        const pageInfo = document.createElement('div');
        pageInfo.className = 'pdf-preview-info';
        pageInfo.textContent = `第 1 / ${pdf.numPages} 页（仅显示第一页预览）`;
        viewer.appendChild(pageInfo);
      }
    } catch (error) {
      throw new Error('PDF.js渲染失败: ' + error.message);
    }
  },

  /**
   * 使用PDF.js渲染PDF
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  async renderWithPDFJS(pdfPath, viewer) {
    try {
      // 加载PDF文档
      const loadingTask = pdfjsLib.getDocument(pdfPath);
      const pdf = await loadingTask.promise;

      // 只渲染第一页作为预览
      const page = await pdf.getPage(1);

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      // 设置合适的缩放比例
      const viewport = page.getViewport({ scale: 1.5 });
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // 渲染页面
      await page.render({
        canvasContext: context,
        viewport: viewport
      }).promise;

      viewer.innerHTML = '';
      viewer.appendChild(canvas);

      // 添加页面信息
      if (pdf.numPages > 1) {
        const pageInfo = document.createElement('div');
        pageInfo.className = 'pdf-preview-info';
        pageInfo.textContent = `第 1 / ${pdf.numPages} 页（仅显示第一页预览）`;
        viewer.appendChild(pageInfo);
      }
    } catch (error) {
      throw new Error('PDF.js渲染失败: ' + error.message);
    }
  },

  /**
   * 使用iframe渲染PDF
   * @param {string} pdfPath - PDF文件路径
   * @param {HTMLElement} viewer - 预览容器
   */
  renderWithIframe(pdfPath, viewer) {
    viewer.innerHTML = `
      <iframe
        src="${pdfPath}"
        class="pdf-preview-iframe"
        type="application/pdf">
        <p>您的浏览器不支持PDF预览，请 <a href="${pdfPath}" download>下载文件</a> 查看。</p>
      </iframe>
    `;
  },

  /**
   * 显示错误信息
   * @param {string} message - 错误信息
   * @param {HTMLElement} container - 容器元素
   */
  showError(message, container) {
    const resultContainer = container.querySelector('#pdf-result');
    if (!resultContainer) return;

    resultContainer.innerHTML = `
      <div class="pdf-result-error">
        <div class="pdf-error-icon">⚠️</div>
        <div class="pdf-error-message">${PDFHelpers.escapeHtml(message)}</div>
      </div>
    `;
  },

  /**
   * 下载文件
   * @param {string} filePath - 文件路径
   * @param {string} fileName - 文件名（可选）
   * @param {Uint8Array} pdfBytes - PDF字节数组（可选）
   */
  async downloadFile(filePath, fileName, pdfBytes = null) {
    try {
      const defaultFileName = fileName || (filePath ? (filePath.split('/').pop() || filePath.split('\\').pop()) : 'document.pdf');

      if (window.electronAPI && window.electronAPI.showSaveDialog) {
        // Electron环境 - 使用保存对话框
        const result = await window.electronAPI.showSaveDialog({
          defaultPath: defaultFileName,
          filters: [
            { name: 'PDF Files', extensions: ['pdf'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result && !result.canceled && result.filePath) {
          // 复制文件到选择的位置
          if (filePath && window.electronAPI && typeof window.electronAPI.copyFile === 'function') {
            await window.electronAPI.copyFile(filePath, result.filePath);
          } else if (pdfBytes) {
            // 从字节数组保存：优先使用 preload 暴露的 fileAPI
            const fileAPI = (typeof window !== 'undefined' && window.fileAPI) ? window.fileAPI : null;
            const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

            const data = (pdfBytes instanceof Uint8Array) ? pdfBytes : new Uint8Array(pdfBytes);

            if (fileAPI && typeof fileAPI.writeFile === 'function') {
              await fileAPI.writeFile(result.filePath, data);
            } else if (electronAPI && typeof electronAPI.saveToDir === 'function') {
              // saveToDir 接受目录和文件名
              const parts = result.filePath.replace(/\\/g, '/').split('/');
              const name = parts.pop();
              const dir = parts.join('/') || '.';
              await electronAPI.saveToDir(dir, name, data);
            } else if (window.require) {
              const fs = window.require('fs');
              const buffer = (typeof Buffer !== 'undefined') ? Buffer.from(data) : data;
              fs.writeFileSync(result.filePath, buffer);
            } else {
              // 回退到浏览器下载
              const blob = new Blob([data], { type: 'application/pdf' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = fileName || (result.filePath.split('/').pop() || 'document.pdf');
              a.click();
              URL.revokeObjectURL(url);
            }

            alert('文件已保存到: ' + result.filePath);
          }
        }
      } else {
        // Web环境 - 使用Blob下载
        if (pdfBytes) {
          const blob = new Blob([pdfBytes], { type: 'application/pdf' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = defaultFileName;
          a.click();
          URL.revokeObjectURL(url);
        } else if (filePath) {
          const a = document.createElement('a');
          a.href = filePath;
          a.download = defaultFileName;
          a.click();
        }
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      alert('下载文件失败: ' + error.message);
    }
  },

  /**
   * 下载文本文件
   * @param {string} textContent - 文本内容
   * @param {string} fileName - 文件名
   * @returns {Promise<string|null>} 保存的文件路径（Electron环境）或 null（Web环境）
   */
  async downloadTextFile(textContent, fileName) {
    try {
      // 检查是否为 Electron 环境
      const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

      if (electronAPI && electronAPI.showSaveDialog) {
        // Electron 环境 - 使用保存对话框
        const result = await electronAPI.showSaveDialog({
          defaultPath: fileName,
          filters: [
            { name: 'Text Files', extensions: ['txt'] },
            { name: 'All Files', extensions: ['*'] }
          ]
        });

        if (result && !result.canceled && result.filePath) {
          // 保存文件
          const fileAPI = (typeof window !== 'undefined' && window.fileAPI) ? window.fileAPI : null;
          if (fileAPI && fileAPI.writeFile) {
            const encoder = new TextEncoder();
            const data = encoder.encode(textContent);
            await fileAPI.writeFile(result.filePath, data);
            console.log('✅ 文本文件保存成功:', result.filePath);
            return result.filePath;
          }
        }
        return null;
      } else {
        // Web 环境 - 使用 Blob 下载
        const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        console.log('✅ 文本文件下载成功:', fileName);
        return null;  // Web 环境无法获取保存路径
      }
    } catch (error) {
      console.error('下载文本文件失败:', error);
      alert('下载文本文件失败: ' + error.message);
      return null;
    }
  },

  /**
   * 打开文件所在的文件夹
   * @param {string} filePath - 文件路径
   */
  async openFile(filePath) {
    try {
      // 优先使用 preload 暴露的 electronAPI（contextBridge）
      const electronAPI = (typeof window !== 'undefined' && window.electronAPI) ? window.electronAPI : null;

      if (electronAPI && typeof electronAPI.showItemInFolder === 'function') {
        await electronAPI.showItemInFolder(filePath);
        console.log('✅ 已通过 preload 的 electronAPI 在文件管理器中打开:', filePath);
        return;
      }

      // 回退到老的 window.require 方法（只有在 nodeIntegration=true 时可用）
      if (window.require) {
        const { shell } = window.require('electron');

        try {
          const result = await shell.showItemInFolder(filePath);
          if (result === '') {
            console.log('✅ 已在文件管理器中打开:', filePath);
            return;
          }
        } catch (e) {
          // ignore and fallback
        }

        const path = window.require('path');
        const folderPath = path.dirname(filePath);
        await shell.openPath(folderPath);
        return;
      }

      console.warn('⚠️ 无法打开文件夹：既没有 preload 的 electronAPI，也没有 window.require（非Electron环境或受限）。');
      alert('仅在 Electron 环境下支持打开文件夹');
    } catch (error) {
      console.error('打开文件夹失败:', error);
      alert('打开文件夹失败: ' + error.message);
    }
  }
};

// 导出（开发模式使用）
if (typeof window !== 'undefined') {
  window.PDFPreview = PDFPreview;
}
