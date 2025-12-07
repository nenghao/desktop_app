/**
 * 聊天界面组件
 * 使用独立的消息列表和输入组件构建聊天界面
 */

import { getChatApiService } from "../../services/index.js";
import { ChatListView } from "./ChatListView.js";
import { ChatInput } from "./ChatInput.js";
import { ChatHistoryView } from "./ChatHistoryView.js";
import { chatConfig } from "../../config/chat-config.js";
import { NotificationCenter } from "../common/NotificationCenter.js";
import { configCacheService } from "../../services/ConfigCacheService.js";

export class ChatInterface {
  constructor(options = {}) {
    this.container = null;
    // 使用全局初始化的ChatApiService实例（已注入userManager）
    this.chatApiService = getChatApiService();
    this.chatListView = null;
    this.chatInput = null;
    this.chatHistoryView = null;
    this.isTyping = false;
    this.userManager = options.userManager;
    this.eventBus = options.eventBus;
    this.settingsModal = options.settingsModal;
    this.stateManager = options.stateManager;
    this.currentController = null;
    this.notificationCenter = options.notificationCenter || new NotificationCenter();
    this.configCacheService = configCacheService;

    // 初始化聊天参数缓存（内存缓存，避免每次请求都读磁盘）
    this.chatParams = null;
    this.loadChatParamsToMemory();

    // 绑定事件监听
    this.setupEventListeners();
  }

  /**
   * 渲染聊天界面
   */
  async render(container) {
    this.container = container;

    // 创建主要区域：消息列表、输入区域和历史记录
    container.innerHTML = `
      <div class="chat-interface">
        <!-- 聊天消息区域 -->
        <div class="chat-messages-area" id="chat-list-container"></div>

        <!-- 聊天输入区域 -->
        <div class="chat-input-area" id="chat-input-container"></div>
        
        <!-- 聊天历史记录区域 -->
        <div class="chat-history-area" id="chat-history-container"></div>
      </div>
    `;

    await this.initializeComponents();
    this.loadWelcomeMessage();
  }

  /**
   * 加载聊天参数到内存缓存
   */
  loadChatParamsToMemory() {
    // 获取默认配置（从chat-config.js）
    const defaultConfig = chatConfig.getConfig();

    // 从缓存加载实际的聊天参数（会合并用户修改的设置）
    const cachedParams = this.configCacheService.loadChatParameters();

    // 获取其他设置（从缓存，如果没有则使用 chat-config.js 的默认值）
    const saveConversation = this.configCacheService.getCachedSetting(
      "saveConversation",
      defaultConfig.store
    );
    const streamResponse = this.configCacheService.getCachedSetting(
      "streamResponse",
      defaultConfig.stream
    );
    const networkMode = this.configCacheService.getCachedSetting(
      "networkMode",
      defaultConfig.deep_search
    );

    // 保存到内存缓存
    this.chatParams = {
      store: saveConversation,
      stream: streamResponse,
      webSearch: networkMode,
      historyCount: cachedParams.historyCount,
      temperature: cachedParams.temperature,
      max_completion_tokens: cachedParams.max_completion_tokens,
      top_p: cachedParams.top_p,
    };
  }

  /**
   * 初始化组件
   */
  async initializeComponents() {
    // 初始化聊天列表视图组件
    this.chatListView = new ChatListView({
      eventBus: this.eventBus,
      chatApiService: this.chatApiService,
      userManager: this.userManager,
      settingsModal: this.settingsModal,
      stateManager: this.stateManager,
    });
    const chatListContainer = this.container.querySelector(
      "#chat-list-container"
    );
    await this.chatListView.render(chatListContainer);

    // 初始化聊天输入组件
    this.chatInput = new ChatInput({
      userManager: this.userManager,
    });
    const chatInputContainer = this.container.querySelector(
      "#chat-input-container"
    );
    await this.chatInput.render(chatInputContainer);

    // 初始化聊天历史记录组件
    this.chatHistoryView = new ChatHistoryView({
      eventBus: this.eventBus,
      chatApiService: this.chatApiService,
      userManager: this.userManager,
    });
    const chatHistoryContainer = this.container.querySelector(
      "#chat-history-container"
    );
    await this.chatHistoryView.render(chatHistoryContainer);

    // 设置回调函数
    this.chatInput.onSendMessage = (message, options) =>
      this.handleSendMessage(message, options);
    this.chatInput.onStopMessage = () => this.handleStopMessage();
    this.chatInput.onNewChat = () => this.handleNewChat();
    this.chatInput.onModelChange = (model) => this.handleModelChange(model);
    this.chatInput.onRoleChange = (role) => this.handleRoleChange(role);

    // 设置消息列表回调
    this.chatListView.onFeedback = (rating, messageId) =>
      this.handleFeedback(rating, messageId);
    this.chatListView.onRetry = (message) => this.handleRetry(message);
    this.chatListView.onQuote = (content) => this.handleQuote(content);

    // 组件初始化完成后，设置输入框焦点
    setTimeout(() => {
      if (this.chatInput) {
        this.chatInput.focusInput();
      }
    }, 100);
  }

  /**
   * 处理发送消息
   */
  async handleSendMessage(message, options) {
    // 生成唯一且有序的消息ID
    const timestamp = Date.now();
    const userMessageId = `user_${timestamp}_${Math.floor(Math.random() * 1000)}`;

    // 先添加用户消息
    this.chatListView.addMessage({
      id: userMessageId,
      type: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });

    // 设置输入状态
    this.setTypingState(true);

    try {
      // 将用户消息ID传递给sendAIRequest，确保消息顺序一致
      await this.sendAIRequest(message, options, userMessageId);
    } catch (error) {
      console.error("发送消息失败:", error);
      // 使用基于用户消息ID的错误消息ID
      const aiMessageId = `assistant_${userMessageId.replace("user_", "")}`;
      this.chatListView.addMessage({
        id: aiMessageId,
        type: "assistant",
        content: "",
        errorMessage: `发送消息失败：${error.message}`,
        timestamp: new Date().toISOString(),
        isError: true,
      });
      // 失败时重置状态
      this.setTypingState(false);
    }
  }

  /**
   * 处理新建聊天
   */
  handleNewChat() {
    // 确保先停止当前可能正在进行的聊天请求
    this.handleStopMessage();

    // 等待一小段时间以确保停止请求被处理
    setTimeout(() => {
      if (this.chatListView) {
        this.chatListView.clearMessages();
      }

      // 清除历史记录选中状态
      if (this.chatHistoryView) {
        this.chatHistoryView.clearSelection();
      }

      // 将焦点设置到输入框
      if (this.chatInput) {
        this.chatInput.focusInput();
      }

      console.log("新建聊天");
    }, 50);
  }

  /**
   * 处理模型变更
   */
  handleModelChange(model) {
    console.log("选择模型:", model);
  }

  /**
   * 处理角色变更
   */
  handleRoleChange(role) {
    console.log("选择角色:", role);
  }

  /**
   * 处理清空历史
   */
  handleClearHistory() {
    if (confirm("确定要清空聊天历史吗？")) {
      if (this.chatListView) {
        this.chatListView.messages = [];
        this.chatListView.renderMessages();
      }
      this.showNotification("聊天历史已清空", "success", "清空完成");
    }
  }

  /**
   * 处理导出对话
   */
  handleExportChat() {
    // 获取所有消息
    const messages = this.chatListView ? this.chatListView.messages : [];
    if (messages.length === 0) {
      this.showNotification("没有可导出的对话内容", "warning", "导出失败");
      return;
    }

    // 生成导出内容
    const exportContent = this.generateExportContent(messages);

    // 创建下载链接
    const blob = new Blob([exportContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chat-export-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.showNotification("对话已保存到文件", "success", "导出成功");
  }

  /**
   * 生成导出内容
   */
  generateExportContent(messages) {
    const header = `聊天记录导出
导出时间: ${new Date().toLocaleString()}
${"=".repeat(50)}

`;

    const content = messages
      .map((msg) => {
        const time = new Date(msg.timestamp).toLocaleString();
        const role = msg.type === "user" ? "用户" : "AI助手";
        return `[${time}] ${role}:\n${msg.content}\n`;
      })
      .join("\n");

    return header + content;
  }

  /**
   * 处理打开设置
   */
  handleOpenSettings() {
    // 触发全局事件打开设置模态框
    if (window.app && window.app.eventBus) {
      window.app.eventBus.emit('settings:modal:open');
    }
  }

  /**
   * 发送AI聊天请求
   */
  async sendAIRequest(userMessage, options, userMessageId) {
    // 确保等待 UserManager 初始化完成
    if (this.userManager && this.userManager.ready) {
      await this.userManager.ready();
      // 添加短暂延迟确保状态完全同步
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // 检查用户登录状态
    if (!this.userManager || !this.userManager.isUserAuthenticated()) {
      throw new Error("请先登录");
    }

    const user = this.userManager.getCurrentUser();
    if (!user || !user.access_token) {
      throw new Error("用户信息无效，请重新登录");
    }

    // 使用内存缓存的聊天参数（避免每次请求都读磁盘）
    const chatParams = {
      messages: this.buildMessageHistory(
        userMessage,
        this.chatParams.historyCount
      ),
      model: options.model || "deepseek-r1",
      stream: this.chatParams.stream,
      temperature: this.chatParams.temperature,
      max_completion_tokens: this.chatParams.max_completion_tokens,
      top_p: this.chatParams.top_p,
      webSearch: options.networkMode || this.chatParams.webSearch,
      store: this.chatParams.store,
      thinking: options.thinking !== undefined ? options.thinking : true,
      reasoning: options.reasoning !== undefined ? options.reasoning : true,
      prompt: options.prompt || "",
    };

    // 确定使用的模式（thinking 或 reasoning）
    let mode = "thinking";
    if (options.reasoning) {
      mode = "reasoning";
    } else if (options.thinking) {
      mode = "thinking";
    }

    // 保存mode到实例变量，供handleChatResponse使用
    this.currentMode = mode;

    // 无论流式还是非流式，都创建响应中的占位消息（显示加载动画）
    await this.chatListView.startStreamMessage("assistant", mode);

    // 发送请求
    this.currentController = await this.chatApiService.sendChatMessage(
      user.access_token,
      chatParams,
      (event) => {
        this.handleChatResponse(event, this.chatParams.stream);
      }
    );
  }

  /**
   * 构建模拟数据（调试用）
   */
  buildMockMessages() {
    return [
      {
        role: "user",
        content: "你好，请介绍一下JavaScript的异步编程",
      },
      {
        role: "assistant",
        reasoning_content:
          "深思：用户问关于JavaScript异步编程的问题，我需要全面介绍这个概念，包括基本理念、历史发展和具体用法。特别需要重点介绍：\n1. Callback回调函数的工作原理\n2. Promise的优势和使用方法\n3. Async/Await的语法糖特性\n4. 错误处理的最佳实践\n5. 实际应用场景\n\n这样能让用户对JavaScript异步编程有全面的理解。",
        content: `<think>
用户问关于JavaScript异步编程的问题，我需要全面介绍这个概念，包括基本理念、历史发展和具体用法。特别需要重点介绍：
1. Callback回调函数的工作原理
2. Promise的优势和使用方法
3. Async/Await的语法糖特性
4. 错误处理的最佳实践
5. 实际应用场景

这样能让用户对JavaScript异步编程有全面的理解。
</think>

JavaScript异步编程是处理非阻塞性操作的重要技术。以下是详细介绍：

## 主要方法对比

| 方法 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Callback** | 简单直接 | 回调地狱 | 简单异步操作 |
| **Promise** | 链式调用 | 语法复杂 | 复杂异步流程 |
| **Async/Await** | 代码清晰 | 需要支持ES2017+ | 现代项目推荐 |

### 1. Callback 回调函数
\`\`\`javascript
function fetchData(callback) {
  setTimeout(() => {
    const success = Math.random() > 0.2;
    if (success) {
      callback(null, { id: 1, name: "用户数据" });
    } else {
      callback(new Error("网络请求失败"), null);
    }
  }, 1000);
}

// 使用回调函数
fetchData((error, data) => {
  if (error) {
    console.error('错误:', error.message);
  } else {
    console.log('成功获取数据:', data);
  }
});
\`\`\`

### 2. Promise
\`\`\`javascript
function fetchUserData(userId) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (userId > 0) {
        resolve({
          id: userId,
          name: \`用户\${userId}\`,
          email: \`user\${userId}@example.com\`
        });
      } else {
        reject(new Error('无效的用户ID'));
      }
    }, 800);
  });
}

// Promise链式调用
fetchUserData(123)
  .then(user => {
    console.log('获取用户信息:', user);
    return fetchUserData(user.id + 1);
  })
  .then(nextUser => {
    console.log('获取下一个用户:', nextUser);
  })
  .catch(error => {
    console.error('操作失败:', error.message);
  })
  .finally(() => {
    console.log('请求完成');
  });
\`\`\`

### 3. Async/Await（推荐）
\`\`\`javascript
async function getUserProfile(userId) {
  try {
    console.log('开始获取用户资料...');
    
    const [user, posts, followers] = await Promise.all([
      fetchUserData(userId),
      fetchUserPosts(userId),
      fetchUserFollowers(userId)
    ]);
    
    return {
      user,
      posts,
      followers,
      summary: \`\${user.name}有\${posts.length}篇文章，\${followers.length}个粉丝\`
    };
  } catch (error) {
    console.error('获取用户资料失败:', error.message);
    throw error;
  }
}
\`\`\`

## 实际应用场景

**Promise.all**：并行处理多个操作
**Promise.race**：超时控制和多数据源竞争

## 关键优势
- **非阻塞执行：** 不会冻结用户界面
- **性能提升：** 可以同时处理多个操作
- **用户体验：** 保持应用的响应性
- **错误处理：** 统一的异常处理机制`,
      },
      {
        role: "user",
        content: "Promise.all和Promise.race有什么区别？请举例说明",
      },
      {
        role: "assistant",
        reasoning_content:
          "用户问Promise.all和Promise.race的区别，这是JavaScript异步编程的重要概念。我需要：\n1. 清楚解释两者的不同行为\n2. 提供实际的代码示例\n3. 说明各自的应用场景\n4. 包含错误处理的示例 \n 让我用简单易懂的例子来解释。",
        content: `<think>
用户问Promise.all和Promise.race的区别，这是JavaScript异步编程的重要概念。我需要：
1. 清楚解释两者的不同行为
2. 提供实际的代码示例
3. 说明各自的应用场景
4. 包含错误处理的示例

让我用简单易懂的例子来解释。
</think>
用户问Promise.all和Promise.race的区别，这是JavaScript异步编程的重要概念。我需要：
1. 清楚解释两者的不同行为
2. 提供实际的代码示例
3. 说明各自的应用场景
4. 包含错误处理的示例
\`Promise.all\`和\`Promise.race\`是处理多个Promise的两种不同策略：

## 核心区别

| 方法 | 行为 | 结果 | 失败情况 |
|------|------|------|----------|
| **Promise.all** | 等待所有Promise完成 | 所有结果的数组 | 任一失败则整体失败 |
| **Promise.race** | 等待第一个Promise完成 | 第一个完成的结果 | 第一个失败则整体失败 |

## Promise.all - "全部完成"

### 成功示例
\`\`\`javascript
// 模拟不同耗时的API请求
function fetchUser(id) {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve({ id, name: \`用户\${id}\` });
    }, Math.random() * 1000 + 500); // 500-1500ms随机延迟
  });
}

async function loadUserDashboard(userId) {
  try {
    console.log('开始加载用户仪表板...');
    const startTime = Date.now();
    
    // 并行执行所有请求，等待全部完成
    const [user, posts, settings] = await Promise.all([
      fetchUser(userId),
      fetchUserPosts(userId),
      fetchUserSettings(userId)
    ]);
    
    const endTime = Date.now();
    console.log(\`所有数据加载完成，耗时：\${endTime - startTime}ms\`);
    
    return { user, posts, settings, loadTime: endTime - startTime };
  } catch (error) {
    console.error('加载失败:', error);
    throw error;
  }
}
\`\`\`

## Promise.race - "谁先完成听谁的"

### 超时控制示例
\`\`\`javascript
function createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(\`请求超时：\${ms}ms\`));
    }, ms);
  });
}

function fetchWithTimeout(url, timeoutMs = 3000) {
  const fetchPromise = fetch(url).then(response => response.json());
  const timeoutPromise = createTimeout(timeoutMs);
  
  // 谁先完成听谁的：要么正常返回，要么超时失败
  return Promise.race([fetchPromise, timeoutPromise]);
}

// 使用示例
fetchWithTimeout('/api/slow-endpoint', 2000)
  .then(data => {
    console.log('请求成功:', data);
  })
  .catch(error => {
    if (error.message.includes('超时')) {
      console.error('请求超时，请稍后重试');
    } else {
      console.error('请求失败:', error);
    }
  });
\`\`\`

## 实际应用场景

**Promise.all适用于：**
- 加载页面所需的所有数据
- 批量处理多个文件
- 需要所有结果才能继续的操作

**Promise.race适用于：**
- 设置请求超时
- 多数据源冗余（CDN、镜像站）
- 性能优化（选择最快的服务）`,
      },
      {
        role: "user",
        content: "如何优雅地处理JavaScript中的错误？",
      },
      {
        role: "assistant",
        content: `<think>
用户问如何优雅地处理JavaScript错误，这是一个很重要的编程实践问题。我需要覆盖：
1. 同步和异步错误处理的不同方法
2. 错误的分类和处理策略
3. 最佳实践和常见陷阱
4. 实际项目中的错误处理模式

要提供完整而实用的解决方案。
</think>

JavaScript错误处理是编写健壮应用的关键。以下是优雅处理错误的完整指南：

## 错误类型分类

| 错误类型 | 特征 | 处理策略 | 示例 |
|----------|------|----------|------|
| **语法错误** | 代码解析阶段 | 开发期修复 | 拼写错误、语法问题 |
| **运行时错误** | 代码执行阶段 | try-catch捕获 | 空指针、类型错误 |
| **逻辑错误** | 结果不符合预期 | 单元测试覆盖 | 业务逻辑错误 |
| **异步错误** | Promise/async中 | .catch()或try-catch | 网络请求失败 |

## 1. 基础错误处理模式

### 同步错误处理
\`\`\`javascript
function parseUserInput(input) {
  try {
    // 参数验证
    if (!input) {
      throw new TypeError('输入不能为空');
    }
    
    if (typeof input !== 'string') {
      throw new TypeError('输入必须是字符串');
    }
    
    // 尝试解析JSON
    const data = JSON.parse(input);
    
    // 业务逻辑验证
    if (!data.username || data.username.length < 3) {
      throw new Error('用户名长度不能少于3个字符');
    }
    
    return { success: true, data: data };
    
  } catch (error) {
    // 区分不同类型的错误
    if (error instanceof SyntaxError) {
      return {
        success: false,
        error: 'JSON格式错误',
        details: error.message
      };
    }
    
    if (error instanceof TypeError) {
      return {
        success: false,
        error: '参数类型错误',
        details: error.message
      };
    }
    
    // 业务逻辑错误
    return {
      success: false,
      error: '数据验证失败',
      details: error.message
    };
  }
}
\`\`\`

### 异步错误处理
\`\`\`javascript
class ApiService {
  static async safeRequest(url, options = {}) {
    const maxRetries = 3;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(\`尝试请求 (\${attempt}/\${maxRetries}): \${url}\`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(\`HTTP \${response.status}: \${response.statusText}\`);
        }
        
        const data = await response.json();
        return { success: true, data, attempt };
        
      } catch (error) {
        lastError = error;
        console.warn('请求失败 (尝试' + attempt + '次):', error.message);
        
        // 最后一次尝试失败，不再重试
        if (attempt === maxRetries) break;
        
        // 等待一段时间后重试（指数退避）
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return {
      success: false,
      error: lastError.message,
      attempts: maxRetries
    };
  }
}
\`\`\`

## 关键最佳实践
- **早期验证：** 在函数入口处验证参数
- **错误分类：** 区分不同类型的错误并采取相应处理
- **优雅降级：** 提供备用方案，避免应用崩溃
- **日志记录：** 记录错误信息供调试分析
- **用户友好：** 给用户清楚的错误提示和解决建议`,
      },
    ];
  }

  /**
   * 构建消息历史
   */
  buildMessageHistory(currentMessage, historyCount = 3) {
    const messages = [];

    // 获取最近的历史消息（按historyCount数量限制）
    // 注意：当前用户消息已经在 handleSendMessage 中添加到 chatListView.messages 了
    const recentMessages = this.chatListView.messages
      .filter((m) => !m.isStreaming && !m.isError)
      .slice(-historyCount * 2); // 每轮对话包含用户和助手消息

    // 转换为API格式并过滤think标签
    for (const msg of recentMessages) {
      let content = msg.content;
      if (msg.type === "assistant") {
        // 移除<think>标签及其内容
        content = content.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
      }

      messages.push({
        role: msg.type === "user" ? "user" : "assistant",
        content: content,
      });
    }

    // 不需要再次添加当前消息，因为它已经在 chatListView.messages 中了
    return messages;
  }

  /**
   * 处理聊天响应
   */
  handleChatResponse(event, isStream) {
    switch (event.type) {
      case "chunk":
        if (isStream) {
          // 直接更新响应中的消息，传递服务器消息ID用于首次更新
          this.chatListView.updateStreamMessage(
            event.content,
            event.reasoningContent,
            event.messageId, // 服务器消息ID
            event.conversationId // 会话ID
          );

          // 如果conversationId，保存它
          if (event.conversationId) {
            this.chatApiService.setCurrentConversationId(event.conversationId);
          }

          // 通过eventBus广播chunk事件，供其他组件（如NewsDetail）监听
          if (this.eventBus) {
            this.eventBus.emit("chat:chunk", {
              content: event.content,
              reasoningContent: event.reasoningContent,
              messageId: event.messageId,
            });
          }
        }
        break;
      case "complete":
        if (!isStream) {
          // 非流式也使用updateStreamMessage更新占位消息，而不是添加新消息
          // 先更新reasoningContent
          if (event.reasoningContent) {
            this.chatListView.updateStreamMessage(
              null,
              event.reasoningContent,
              event.messageId,
              event.conversationId
            );
          }
          // 再更新content
          if (event.content) {
            this.chatListView.updateStreamMessage(
              event.content,
              null,
              event.messageId,
              event.conversationId
            );
          }
          // 保存conversationId
          if (event.conversationId) {
            this.chatApiService.setCurrentConversationId(event.conversationId);
          }
        }
        break;
      case "done":
        // 无论流式还是非流式，都需要finishStreamMessage
        this.chatListView.finishStreamMessage();
        // 保存最终的conversationId
        if (event.conversationId) {
          this.chatApiService.setCurrentConversationId(event.conversationId);
          console.log(
            "[ChatInterface] 保存conversationId:",
            event.conversationId
          );
        }
        this.setTypingState(false);
        this.currentController = null;

        // 通过eventBus广播done事件
        if (this.eventBus) {
          this.eventBus.emit("chat:done", {
            conversationId: event.conversationId,
          });
        }
        break;
      case "error":
        console.error("聊天响应错误:", event.error);

        // 查找是否有正在响应的消息
        const respondingMessage = this.chatListView.messages.find(m => m.isResponding === true);

        if (respondingMessage) {
          // 首先标记为错误消息
          respondingMessage.isError = true;

          // 如果有正在响应的消息，更新为错误消息
          this.chatListView.updateStreamMessage(
            `错误: ${event.error}`,
            null,
            null,
            null
          );
          // 结束响应状态，隐藏加载动画
          this.chatListView.finishStreamMessage();
        } else {
          // 如果没有正在响应的消息，添加新的错误消息
          this.chatListView.addMessage({
            id: Date.now(),
            type: "assistant",
            content: `错误: ${event.error}`,
            timestamp: new Date().toISOString(),
            isError: true,
          });
        }

        this.setTypingState(false);
        this.currentController = null;

        // 通过eventBus广播error事件
        if (this.eventBus) {
          this.eventBus.emit("chat:error", {
            error: event.error,
          });
        }
        break;
    }
  }

  /**
   * 显示登录提示
   */
  showLoginPrompt() {
    this.showNotification("请先登录以使用AI聊天功能", "warning", "需要登录");
  }

  /**
   * 显示通知
   */
  showNotification(message, type = "info", title = null) {
    if (this.eventBus) {
      this.eventBus.emit("notification:show", {
        title,
        message,
        type,
      });
    }
  }

  /**
   * 处理停止消息
   */
  handleStopMessage() {
    // 只有当有正在进行的请求时才中止并添加错误消息
    if (this.currentController) {
      this.currentController.abort();
      this.currentController = null;

      // 查找是否有正在响应的消息
      const respondingMessage = this.chatListView.messages.find(m => m.isResponding === true);

      if (respondingMessage) {
        // 如果有正在响应的消息，更新为停止消息
        this.chatListView.updateStreamMessage(
          "",
          null,
          null,
          null
        );
        // 结束响应状态，隐藏加载动画
        this.chatListView.finishStreamMessage();

        // 标记为错误消息
        respondingMessage.isError = true;
        respondingMessage.errorMessage = "消息发送已被用户停止";
      } else {
        // 添加用户主动停止的错误消息
        this.chatListView.addMessage({
          id: Date.now(),
          type: "assistant",
          content: "",
          errorMessage: "消息发送已被用户停止",
          timestamp: new Date().toISOString(),
          isError: true,
        });
      }
    }
    this.setTypingState(false);
  }

  /**
   * 处理反馈
   */
  async handleFeedback(rating, messageId) {
    try {
      const user = this.userManager.getCurrentUser();
      if (user?.access_token) {
        // 找到消息对象
        const message = this.chatListView.messages.find(
          (m) => m.id === messageId
        );

        console.log("[ChatInterface.handleFeedback] 消息对象:", message);

        // 获取conversationId：优先从消息对象，次之从缓存
        let conversationId = message?.conversationId;
        if (!conversationId) {
          conversationId = this.chatApiService.getCurrentConversationId();
        }

        // 验证必要字段
        if (!conversationId) {
          throw new Error("错误：无法获取会话ID，后台应该返回conversation_id");
        }

        if (!messageId) {
          throw new Error("错误：无法获取消息ID，后台应该返回id");
        }

        // 将rating转换为feedbackType: satisfied -> GOOD, unsatisfied -> BAD
        const feedbackType = rating === "satisfied" ? "GOOD" : "BAD";

        console.log("[ChatInterface.handleFeedback]", {
          messageId,
          conversationId,
          feedbackType,
          rating,
        });

        // 根据新接口文档调用submitFeedback
        await this.chatApiService.submitFeedback(
          user.access_token,
          conversationId,
          messageId,
          feedbackType
        );
        console.log("反馈提交成功:", feedbackType);
      }
    } catch (error) {
      console.error("反馈提交失败:", error);
      this.notificationCenter.error(`反馈提交失败: ${error.message}`);
    }
  }

  /**
   * 处理重试 - 处理所有类型的错误消息
   */
  handleRetry(message) {
    console.log('🔄 处理重试消息:', message);

    // 查找对应的用户消息（更健壮的查找逻辑）
    const userMessage = this.findCorrespondingUserMessage(message);

    if (userMessage) {
      console.log('✅ 找到对应的用户消息:', userMessage);
      // 保存用户消息内容
      const userContent = userMessage.content;

      // 收集需要删除的消息ID
      const messagesToDelete = new Set([message.id]); // 始终删除当前错误消息

      // 如果找到用户消息，也删除它
      if (userMessage.id !== message.id) {
        messagesToDelete.add(userMessage.id);
      }

      // 查找并删除所有相关的失败消息
      const relatedErrorMessages = this.findRelatedErrorMessages(userMessage, message);
      relatedErrorMessages.forEach(errorMsg => {
        messagesToDelete.add(errorMsg.id);
      });

      // 转换为数组
      const messagesToDeleteArray = Array.from(messagesToDelete);
      console.log('🗑️ 删除所有相关失败消息:', messagesToDeleteArray);

      // 批量删除失败的消息
      this.chatListView.removeMessages(messagesToDeleteArray);

      // 重新发送用户消息
      console.log('📤 重新发送消息:', userContent);
      this.handleSendMessage(userContent, {
        model: this.chatInput.currentModel,
        role: this.chatInput.currentRole,
        networkMode: this.configCacheService.getCachedSetting(
          "networkMode",
          false
        ),
        thinking: this.chatInput.thinking,
        reasoning: this.chatInput.reasoning,
      });
    } else {
      console.warn('⚠️ 未找到对应的用户消息，无法重试');
      this.showToast('未找到对应的用户消息，无法重试', 'error');
    }
  }

  /**
   * 查找与用户消息相关的所有错误消息
   */
  findRelatedErrorMessages(userMessage, currentError) {
    const messages = this.chatListView.messages;
    const userIndex = messages.findIndex(m => m.id === userMessage.id);
    const relatedErrors = [];

    if (userIndex === -1) return relatedErrors;

    // 查找用户消息之后的所有错误消息，直到遇到正常的AI响应
    for (let i = userIndex + 1; i < messages.length; i++) {
      const msg = messages[i];

      // 如果遇到正常的AI响应（非错误），停止查找
      if (msg.type === 'assistant' && !msg.isError) {
        break;
      }

      // 收集所有错误消息（不包括当前错误消息，避免重复）
      if (msg.isError && msg.id !== currentError.id) {
        relatedErrors.push(msg);
      }
    }

    console.log('🔍 找到相关错误消息:', relatedErrors);
    return relatedErrors;
  }

  /**
   * 查找对应的用户消息 - 支持多种错误场景
   */
  findCorrespondingUserMessage(errorMessage) {
    const messages = this.chatListView.messages;
    const errorIndex = messages.findIndex(m => m.id === errorMessage.id);

    if (errorIndex === -1) {
      console.warn('错误消息未找到:', errorMessage.id);
      return null;
    }

    console.log('🔍 查找失败消息对应的用户消息:', { errorMessage, errorIndex });

    // 策略1: 如果是用户消息本身出错，直接返回
    if (errorMessage.type === 'user') {
      console.log('📝 策略1: 错误消息本身是用户消息，直接重试', errorMessage);
      return errorMessage;
    }

    // 策略2: 向前查找最近的一条用户消息（跳过其他错误消息）
    for (let i = errorIndex - 1; i >= 0; i--) {
      const msg = messages[i];
      console.log('🔍 检查消息:', msg);

      if (msg.type === 'user') {
        console.log('📝 策略2成功: 找到前向用户消息', msg);
        return msg;
      }
      // 如果遇到其他AI错误消息，继续向前查找用户消息
      if (msg.isError && msg.type === 'assistant') {
        console.log('⏭️ 跳过其他AI错误消息，继续查找');
        continue;
      }
    }

    // 策略3: 在整个消息列表中查找最后一条用户消息（排除错误消息）
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.type === 'user' && !msg.isError) {
        console.log('📝 策略3成功: 找到最后一条有效用户消息', msg);
        return msg;
      }
    }

    // 策略4: 如果只找到用户错误消息，使用最后一条用户消息（包括错误的）
    const lastUserMessage = messages.slice().reverse().find(m => m.type === 'user');
    if (lastUserMessage) {
      console.log('📝 策略4成功: 使用最后一条用户消息（可能是错误消息）', lastUserMessage);
      return lastUserMessage;
    }

    console.warn('❌ 所有策略都未找到对应的用户消息');
    return null;
  }

  /**
   * 处理引用
   */
  handleQuote(content) {
    if (this.chatInput) {
      const currentValue = this.chatInput.getInputValue();
      const newValue = currentValue ? `${currentValue}\n\n${content}` : content;
      this.chatInput.setInputValue(newValue);
    }
  }

  /**
   * 设置输入状态
   */
  setTypingState(isTyping) {
    this.isTyping = isTyping;
    if (this.chatInput) {
      this.chatInput.setTypingState(isTyping);
    }
  }

  /**
   * 加载模拟数据（调试用）
   * 自动加载模拟数据，只有在点击按钮时才加
   */
  loadMockData() {
    const mockMessages = this.buildMockMessages();
    mockMessages.forEach((msg, index) => {
      this.chatListView.addMessage({
        id: `mock_${index}`,
        type: msg.role === "user" ? "user" : "assistant",
        content: msg.content,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * 加载欢迎消息
   */
  loadWelcomeMessage() {
    // 暂时不显示欢迎消息，保持界面简洁
  }

  /**
   * 添加消息（向后兼容）
   */
  addMessage(message) {
    if (this.chatListView) {
      this.chatListView.addMessage(message);
    }
  }

  /**
   * 设置事件监听
   */
  setupEventListeners() {
    if (this.eventBus) {
      // 监听聊天设置变更事件，更新内存缓存
      this.eventBus.on("chat:settings:change", (eventData) => {
        // EventBus 将数据包装在 data 属性中
        const settings = eventData.data || eventData;
        this.updateChatParamsFromSettings(settings);
      });

      // 监听聊天记录切换事件
      this.eventBus.on("chat:history:toggle", () => {
        this.toggleChatHistory();
      });

      // 监听新建聊天事件
      this.eventBus.on("chat:new", () => {
        this.handleNewChat();
      });

      // 监听停止聊天事件
      this.eventBus.on("chat:stop", () => {
        this.handleStopMessage();
      });

      // 监听清空消息事件
      this.eventBus.on("chat:clear-messages", () => {
        if (this.chatListView) {
          this.chatListView.clearMessages();
        }
      });

      // 监听添加模拟消息事件
      this.eventBus.on("chat:add-mock-message", (message) => {
        if (this.chatListView) {
          this.chatListView.addMockMessage(message);
        }
      });

      // 监听加载模拟数据事件（从Header组件触发）
      this.eventBus.on("chat:load-mock-data", () => {
        this.loadMockData();
      });

      // 监听清除模拟数据事件（从Header组件触发）
      this.eventBus.on("chat:clear-mock-data", () => {
        if (this.chatListView) {
          this.chatListView.clearMessages();
        }
      });

      // 监听来自Dashboard的AI解读事件
      this.eventBus.on("chat:send-message", (eventData) => {
        const { message, options } = eventData.data || eventData;
        if (message) {
          this.handleSendMessage(message, options || {});
        }
      });
    }
  }

  /**
   * 从设置更新内存中的聊天参数
   */
  updateChatParamsFromSettings(settings) {
    // 更新可配置的参数
    if ("saveConversation" in settings) {
      this.chatParams.store = settings.saveConversation;
    }
    if ("streamResponse" in settings) {
      this.chatParams.stream = settings.streamResponse;
    }
    if ("networkMode" in settings) {
      this.chatParams.webSearch = settings.networkMode;
    }
    if ("contextMessages" in settings) {
      this.chatParams.historyCount = settings.contextMessages;
    }
    if ("samplingTemperature" in settings) {
      this.chatParams.temperature = settings.samplingTemperature;
    }
    if ("topK" in settings) {
      this.chatParams.top_p = settings.topK;
    }
    if ("maxTokens" in settings) {
      this.chatParams.max_completion_tokens = settings.maxTokens;
    }
  }

  /**
   * 切换聊天历史记录显示
   */
  async toggleChatHistory() {
    if (this.chatHistoryView) {
      await this.chatHistoryView.toggle();
    }
  }

  /**
   * 销毁组件
   */
  destroy() {
    if (this.chatListView) {
      this.chatListView = null;
    }
    if (this.chatInput) {
      this.chatInput.destroy();
    }
    if (this.chatHistoryView) {
      this.chatHistoryView = null;
    }
  }
}
