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
  }

  /**
   * 显示报告模态框
   */
  show() {
    // 创建报告原因选项的DOM元素
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
      .report-footer {
        display: flex;
        justify-content: flex-end;
        gap: 10px;
        margin-top: 20px;
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

    // 创建HTML结构
    reportForm.innerHTML += `
      <div class="report-title">请选择理由帮助我们做的更好</div>
      <div class="report-reasons">
        <div class="report-reason-item" data-reason="没有理解问题">没有理解问题</div>
        <div class="report-reason-item" data-reason="没有完成任务">没有完成任务</div>
        <div class="report-reason-item" data-reason="编造事实">编造事实</div>
        <div class="report-reason-item" data-reason="废话太多">废话太多</div>
        <div class="report-reason-item" data-reason="没有创意">没有创意</div>
        <div class="report-reason-item" data-reason="文风不好">文风不好</div>
      </div>
      <div class="report-comments">
        <textarea id="report-comment-input" class="report-comment-input" placeholder="欢迎说说你的想法"></textarea>
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
    const reasonItems = reportForm.querySelectorAll('.report-reason-item');
    const commentInput = reportForm.querySelector('#report-comment-input');

    // 绑定理由项点击事件
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
        const userManager = options.userManager;
        if (!userManager || !userManager.getCurrentUser()) {
          throw new Error('用户未登录');
        }
        const token = userManager.getCurrentUser().access_token;

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