/**
 * Markdown 处理工具 - 纯文本渲染
 * 只使用 marked 库进行 Markdown 解析，不使用代码高亮
 */

import { IconUtils } from './IconUtils.js';

let markedLib = null;

/**
 * 懒加载 marked 库
 */
async function loadMarked() {
  if (!markedLib) {
    const { marked } = await import('marked');
    markedLib = marked;
  }
  return markedLib;
}

/**
 * 解析 Markdown 内容
 * @param {string} content - Markdown 内容
 * @param {Object} options - 配置选项
 * @returns {Promise<string>} HTML 字符串
 */
export async function parseMarkdown(content, options = {}) {
  const marked = await loadMarked();
  
  // 先用默认设置解析，然后后处理代码块
  const defaultOptions = {
    breaks: false,
    gfm: true,
    tables: true,
    ...options
  };
  
  // 使用默认渲染器先解析
  const html = marked.parse(content, defaultOptions);
  
  // 后处理：替换代码块，添加自定义 header
  const processedHtml = html.replace(
    /<pre><code(?:\s+class="language-([^"]*)")?>([\s\S]*?)<\/code><\/pre>/g,
    function(match, lang, code) {
      const language = lang || 'text';
      const codeId = `code-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const langClass = lang ? ` class="language-${lang}"` : '';
      
      // 代码内容已经被 marked 转义过了，直接使用
      return `<div class="code-block-wrapper">
        <div class="code-block-header">
          <span class="code-language">${language}</span>
          <button class="copy-code-btn" data-code-id="${codeId}" title="复制代码">
            <span class="chat-btn-icon">${IconUtils.getIcon('copy', { size: 16, strokeWidth: 2 })}</span>
          </button>
        </div>
        <pre${langClass} id="${codeId}"><code>${code}</code></pre>
      </div>`;
    }
  );
  
  return processedHtml;
}

/**
 * 转义HTML字符
 * @param {string} html - HTML字符串
 * @param {boolean} encode - 是否编码
 * @returns {string} 转义后的字符串
 */
function escape(html, encode) {
  if (encode) {
    if (escape.escapeTest.test(html)) {
      return html.replace(escape.escapeReplace, function (ch) {
        return escape.replacements[ch];
      });
    }
  } else {
    if (escape.escapeTestNoEncode.test(html)) {
      return html.replace(escape.escapeReplaceNoEncode, function (ch) {
        return escape.replacements[ch];
      });
    }
  }

  return html;
}

escape.escapeTest = /[&<>"']/;
escape.escapeReplace = /[&<>"']/g;
escape.replacements = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;'
};

escape.escapeTestNoEncode = /[<>"']|&(?!#?\w+;)/;
escape.escapeReplaceNoEncode = /[<>"']|&(?!#?\w+;)/g;

/**
 * 高亮代码块（已移除）
 * @param {HTMLElement} container - 包含代码块的容器
 */
export async function highlightCodeBlocks(container) {
  // 不再使用代码高亮，保持函数接口兼容性
}

/**
 * 检查是否已加载
 */
export function isMarkdownLoaded() {
  return markedLib !== null;
}