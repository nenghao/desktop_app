/**
 * 报告问题模态框组件
 */
import { Modal } from './Modal.js';
import { chatApiService } from '../../services/api/ChatApiService.js';

export class ReportModal {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.notificationCenter = options.notificationCenter;
    this.conversationId = options.conversationId;
    this.userManager = options.userManager;
  }

  /**
   * 获取报告理由列表
   */
  async fetchReportReasons() {
    try {
      // 从 UserManager 获取token
      if (!this.userManager || !this.userManager.getCurrentUser()) {
        throw new Error('用户未登录');
      }
      const token = this.userManager.getCurrentUser().access_token;

      // 使用 ChatApiService 调用获取报告理由的接口
      const response = await chatApiService.getReportReasons(token, this.conversationId);

      if (response.success && response.data && response.data.reasons) {
        console.log('📋 获取到报告理由列表:', response.data.reasons);
        return response.data.reasons;
      } else {
        throw new Error(response.message || '获取报告理由失败');
      }
    } catch (error) {
      console.error('获取报告理由失败:', error);
      // 返回默认理由列表作为降级方案
      return [
        "没有理解问题",
        "没有完成任务",
        "编造事实",
        "废话太多",
        "没有创意",
        "文风不好",
        "内容不合规2"
      ];
    }
  }

  /**
   * 显示报告模态框
   */
  async show() {
    // 创建报告表单
    const reportForm = document.createElement('div');
    reportForm.className = 'report-form';

    // 创建样式元素
    const style = document.createElement('style');
    style.textContent = `
      .report-form {
        padding: 8px 0;
      }
      .modal-body {
          padding: 20px;
        }
      .report-title {
        font-size: 14px;
        margin-bottom: 16px;
        color: var(--color-text-primary);
      }
      .report-loading {
        text-align: center;
        padding: 20px;
        color: var(--color-text-secondary);
        font-size: 14px;
      }
      .report-reasons {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 16px;
      }
      .report-reason-item {
        display: inline-flex;
        align-items: center;
        padding: 8px 16px;
        border: 1px solid var(--color-border);
        border-radius: 20px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-size: 13px;
        background-color: var(--color-background);
        color: var(--color-text-primary);
      }
      .report-reason-item:hover {
        border-color: var(--color-primary-light);
      }
      .report-reason-item.selected {
        border-color: var(--color-primary);
        background-color: var(--color-primary-light);
        color: var(--color-text-primary);
      }
      .report-comments {
        margin-top: 16px;
      }
      .report-comment-input {
        width: 100%;
        min-height: 120px;
        padding: 10px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background-color: var(--color-background);
        color: var(--color-text-primary);
        font-size: 13px;
        resize: vertical;
      }
      .report-comment-input:focus {
        outline: none;
        border-color: var(--color-primary-light);
      }
      .report-comment-input.warning {
        border-color: var(--color-warning);
      }
      .report-comment-input.error {
        border-color: var(--color-error);
      }
      .report-comment-counter {
        text-align: right;
        font-size: 12px;
        color: var(--color-text-secondary);
      }
      .report-comment-counter.warning {
        color: var(--color-warning);
      }
      .report-comment-counter.error {
        color: var(--color-error);
      }
      .report-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 8px;
        padding-top: 16px;
        border-top: 1px solid var(--color-border);
      }
      .report-btn {
        padding: 8px 20px;
        border: 1px solid var(--color-border);
        border-radius: 4px;
        background-color: var(--color-background-hover);
        color: var(--color-text-primary);
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      .report-btn:hover {
        background-color: var(--color-background);
      }
      .report-btn-primary {
        background-color: var(--color-primary-light);
        color: var(--color-text-primary);
        border-color: var(--color-primary);
      }
      .report-btn-primary:hover {
        background-color: var(--color-primary);
        color: var(--color-text-inverse);
      }
      .report-btn-primary:disabled {
        background-color: var(--color-surface-tertiary);
        color: var(--color-text-tertiary);
        border-color: var(--color-border-disabled);
      }
    `;
    reportForm.appendChild(style);

    // 创建初始HTML结构（显示加载状态）
    reportForm.innerHTML += `
      <div class="report-title">请选择理由帮助我们做的更好</div>
      <div class="report-loading">正在加载报告理由...</div>
      <div class="report-reasons" id="report-reasons-container"></div>
      <div class="report-comments">
        <textarea id="report-comment-input" class="report-comment-input" placeholder="描述内容中存在的问题：对于不合规内容可以说明相关事件/人物。" maxlength="500"></textarea>
        <div id="report-comment-counter" class="report-comment-counter">0/500</div>
      </div>
      <div class="report-footer">
        <button class="report-btn" id="report-cancel-btn">取消</button>
        <button class="report-btn report-btn-primary" id="report-submit-btn" disabled>提交反馈</button>
      </div>
    `;

    // 保存引用
    let selectedReason = null;
    const submitBtn = reportForm.querySelector('#report-submit-btn');
    const cancelBtn = reportForm.querySelector('#report-cancel-btn');
    const reasonsContainer = reportForm.querySelector('#report-reasons-container');
    const commentInput = reportForm.querySelector('#report-comment-input');
    const commentCounter = reportForm.querySelector('#report-comment-counter');
    const loadingElement = reportForm.querySelector('.report-loading');

    // 字数统计功能
    const updateCharCounter = () => {
      const currentLength = commentInput.value.length;
      const maxLength = 500;

      // 更新计数器文本
      commentCounter.textContent = `${currentLength}/${maxLength}`;

      // 根据字数更新样式
      commentInput.classList.remove('warning', 'error');
      commentCounter.classList.remove('warning', 'error');

      if (currentLength >= maxLength) {
        commentInput.classList.add('error');
        commentCounter.classList.add('error');
      } else if (currentLength >= maxLength * 0.8) { // 400字以上显示警告色
        commentInput.classList.add('warning');
        commentCounter.classList.add('warning');
      }
    };

    // 绑定输入事件
    commentInput.addEventListener('input', updateCharCounter);
    commentInput.addEventListener('paste', () => {
      // 粘贴后稍微延迟更新，确保内容已粘贴
      setTimeout(updateCharCounter, 10);
    });

    // 获取报告理由并渲染
    try {
      const reasons = await this.fetchReportReasons();
      loadingElement.style.display = 'none';

      // 渲染理由选项
      reasonsContainer.innerHTML = reasons.map(reason =>
        `<div class="report-reason-item" data-reason="${reason}">${reason}</div>`
      ).join('');

      // 绑定理由项点击事件
      const reasonItems = reasonsContainer.querySelectorAll('.report-reason-item');
      reasonItems.forEach(item => {
        item.addEventListener('click', () => {
          // 移除其他项的选中状态
          reasonItems.forEach(i => i.classList.remove('selected'));
          // 添加当前项的选中状态
          item.classList.add('selected');
          // 保存选中的理由
          selectedReason = item.dataset.reason;
          // 启用提交按钮
          submitBtn.disabled = false;
        });
      });
    } catch (error) {
      loadingElement.textContent = '加载报告理由失败，请稍后重试';
      loadingElement.style.color = 'var(--color-error)';
    }

    // 创建模态框
    const reportModal = new Modal({
      title: '抱歉, ⌈奇境探索⌋ 让你有不好的感受',
      content: reportForm,
      width: 480,
      closable: true,
      maskClosable: true,
      keyboard: true,
      centered: true,
      className: 'modal-report',
      showFooter: false, // 隐藏默认footer，使用自定义footer
      onOk: () => {
        // 这里不使用默认确定按钮，而是使用自定义的提交按钮
      }
    });

    // 绑定自定义按钮事件
    submitBtn.addEventListener('click', async () => {
      // 获取选择的原因和评论
      const comment = commentInput.value;

      // 提交报告
      console.log('📤 提交报告:', {
        conversation_id: this.conversationId,
        reason: selectedReason,
        comment: comment
      });

      try {
        // 禁用提交按钮防止重复提交
        submitBtn.disabled = true;
        submitBtn.textContent = '提交中...';

        // 从 UserManager 获取token
        if (!this.userManager || !this.userManager.getCurrentUser()) {
          throw new Error('用户未登录');
        }
        const token = this.userManager.getCurrentUser().access_token;

        // 发送报告请求
        const response = await chatApiService.reportConversation(
          token,
          this.conversationId,
          selectedReason,
          comment
        );

        // 发送报告事件
        if (this.eventBus) {
          this.eventBus.emit('chat:report:submit', {
            reason: selectedReason,
            comment: comment,
            success: response.success
          });
        }

        // 显示提示信息
        if (this.notificationCenter) {
          if (response.success) {
            this.notificationCenter.success(response.message || '感谢您的反馈，我们会努力改进！');
          } else {
            this.notificationCenter.error(response.message || '提交失败，请稍后重试');
          }
        } else {
          alert(response.message || (response.success ? '感谢您的反馈，我们会努力改进！' : '提交失败，请稍后重试'));
        }

        // 如果成功提交，则关闭模态框
        if (response.success) {
          reportModal.close();
        } else {
          // 失败时恢复按钮状态
          submitBtn.disabled = false;
          submitBtn.textContent = '提交反馈';
        }
      } catch (error) {
        console.error('报告提交失败:', error);

        // 显示错误提示
        if (this.notificationCenter) {
          this.notificationCenter.error(error.message || '网络错误，请检查网络连接后重试');
        } else {
          alert(error.message || '网络错误，请检查网络连接后重试');
        }

        // 恢复按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = '提交反馈';
      }
    });

    cancelBtn.addEventListener('click', () => {
      // 关闭模态框
      reportModal.close();
    });

    // 显示模态框
    reportModal.show();

    // 发送事件
    if (this.eventBus) {
      this.eventBus.emit('chat:report');
    }
  }
}

// 导出工厂函数
let reportModalInstance = null;

export function showReportModal(options = {}) {
  // 检查是否有会话ID
  if (!options.conversationId) {
    // 使用NotificationManager进行提示
    if (options.notificationCenter) {
      options.notificationCenter.error('需要选中会话');
    } else {
      alert('需要选中会话');
    }
    return;
  }

  // 每次都创建新实例，确保能接收最新的options
  reportModalInstance = new ReportModal(options);
  reportModalInstance.show();
}