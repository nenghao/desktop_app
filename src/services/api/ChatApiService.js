/**
 * 聊天API服务 - 专门处理聊天相关的网络请求
 */
import { ApiService } from "./ApiService.js";
import { API_CONFIG, API_REQUEST_CACHE } from "./api-config.js";

export class ChatApiService extends ApiService {
  constructor(options = {}) {
    // 使用统一的API配置
    super({
      baseURL: API_CONFIG.baseURL,
      timeout: API_CONFIG.timeout,
      headers: {
        ...API_CONFIG.defaultHeaders,
      },
      ...options,
    });

    this.currentConversationId = null; // 当前选中的会话 ID

    // 缓存和请求时间记录
    this.cache = {
      models: { data: null, lastFetchTime: null },
      roles: { data: null, lastFetchTime: null }
    };
  }

  /**
   * 检查是否需要重新请求
   * @param {string} key - 缓存键名
   * @param {number} intervalMs - 时间间隔（毫秒）
   * @returns {boolean} true表示需要重新请求
   */
  shouldFetch(key, intervalMs) {
    const cacheEntry = this.cache[key];
    if (!cacheEntry || !cacheEntry.lastFetchTime) {
      console.log(`🔍 [ChatApiService] ${key} 无缓存，需要请求`);
      return true;
    }

    const timeDiff = Date.now() - cacheEntry.lastFetchTime;
    const shouldFetch = timeDiff >= intervalMs;

    console.log(`🔍 [ChatApiService] ${key} 时间检查:`, {
      lastFetchTime: new Date(cacheEntry.lastFetchTime).toISOString(),
      timeDiff: `${Math.floor(timeDiff / 1000)}秒`,
      intervalMs: `${intervalMs / 1000}秒`,
      shouldFetch
    });

    return shouldFetch;
  }

  // ==================== 聊天相关API ====================

  /**
   * 获取AI模型列表
   * @returns {Promise<{success: boolean, data: any, message?: string}>} 返回原始响应
   */
  async getModels(token) {
    // Token参数保留用于兼容性，但实际由ApiService自动管理
    try {
      const intervalMs = API_REQUEST_CACHE.CHAT_MODELS;

      // 检查是否需要重新请求
      if (!this.shouldFetch('models', intervalMs)) {
        console.log('✅ [ChatApiService] 使用缓存的模型列表');
        return this.cache.models.data;
      }

      // 使用get方法，直接返回 {success, data, message} 格式
      const response = await this.get("chat/models/");

      // 更新缓存
      this.cache.models = {
        data: response,
        lastFetchTime: Date.now()
      };

      console.log('💾 [ChatApiService] 已缓存模型列表');
      return response;
    } catch (error) {
      console.error("❌ [ChatApiService.getModels] 获取模型列表失败:", error);
      // 如果请求失败且有缓存，返回缓存数据
      if (this.cache.models.data) {
        console.warn('⚠️ [ChatApiService] 请求失败，返回缓存的模型列表');
        return this.cache.models.data;
      }
      throw error;
    }
  }

  /**
   * 获取角色列表
   * @returns {Promise<{success: boolean, data: any, message?: string}>} 返回原始响应
   */
  async getRoles(token) {
    // Token参数保留用于兼容性，但实际由ApiService自动管理
    try {
      const intervalMs = API_REQUEST_CACHE.CHAT_ROLES;

      // 检查是否需要重新请求
      if (!this.shouldFetch('roles', intervalMs)) {
        console.log('✅ [ChatApiService] 使用缓存的角色列表');
        return this.cache.roles.data;
      }

      // 使用get方法，直接返回 {success, data, message} 格式
      const response = await this.get("chat/roles/");

      // 更新缓存
      this.cache.roles = {
        data: response,
        lastFetchTime: Date.now()
      };

      console.log('💾 [ChatApiService] 已缓存角色列表');
      return response;
    } catch (error) {
      console.error("❌ [ChatApiService.getRoles] 获取角色列表失败:", error);
      // 如果请求失败且有缓存，返回缓存数据
      if (this.cache.roles.data) {
        console.warn('⚠️ [ChatApiService] 请求失败，返回缓存的角色列表');
        return this.cache.roles.data;
      }
      throw error;
    }
  }

  /**
   * 获取聊天历史
   * conversationId: 会话id，不传获取的是会话列表，获取一个会话详情时必须传。
   * @returns {Promise<{success: boolean, data: any, message?: string}>} 返回原始响应
   */
  async getChatHistory(token, page = 1, pageSize = 20, conversationId = "") {
    try {
      const params = {
        page: page.toString(),
        page_size: pageSize.toString(),
      };
      if (conversationId) {
        params.conversation_id = conversationId;
      }

      // 使用父类的get方法，直接返回 {success, data, message} 格式
      return await this.get("chat/completions/", params);
    } catch (error) {
      console.error(
        "❌ [ChatApiService.getChatHistory] 获取聊天历史失败:",
        error
      );
      throw error;
    }
  }

  /**
   * 设置当前会话ID
   */
  setCurrentConversationId(conversationId) {
    this.currentConversationId = conversationId;
  }

  /**
   * 获取当前会话ID
   */
  getCurrentConversationId() {
    return this.currentConversationId;
  }

  /**
   * 清除当前会话ID
   */
  clearCurrentConversationId() {
    this.currentConversationId = null;
  }

  /**
   * 生成会话ID
   */
  generateConversationId() {
    const ts = Math.floor(Date.now() / 1000);
    const rand = String(Math.floor(Math.random() * 1e6)).padStart(6, "0");
    return `bzsz_${ts}_${rand}`;
  }

  /**
   * 发送聊天消息（统一入口）
   */
  async sendChatMessage(token, params, onMessage) {
    if (!token) {
      throw new Error("请先登录");
    }

    // 如果有当前会话ID，使用它；否则生成新的
    const conversationId =
      this.currentConversationId || this.generateConversationId();
    const requestBody = this.buildChatRequest(params, conversationId);

    if (params.stream) {
      return this.sendStreamRequest(
        token,
        requestBody,
        conversationId,
        onMessage
      );
    } else {
      return this.sendNonStreamRequest(
        token,
        requestBody,
        conversationId,
        onMessage
      );
    }
  }

  /**
   * 构建聊天请求体
   */
  buildChatRequest(params, conversationId) {
    // 获取用户标识符，如果没有则使用默认值
    let userIdentifier = "";
    try {
      if (
        window.app &&
        window.app.userManager &&
        window.app.userManager.getCurrentUser()
      ) {
        userIdentifier =
          window.app.userManager.getCurrentUser().user_identifier || "";
      }
    } catch (error) {
      console.warn("获取用户标识符失败:", error);
    }

    const request = {
      model: params.model || "glm-flash",
      messages: params.messages,
      max_tokens: params.max_completion_tokens || 2048,
      user: userIdentifier,
      stop: [],
      store: params.store ?? true,  // 使用 ?? 而不是 ||，避免 false 被当作 falsy
      stream: params.stream ?? false,  // 使用 ?? 而不是 ||，避免 false 被当作 falsy
      temperature: params.temperature || 0.7,
      top_p: params.top_p || 1,
      prompt: params.prompt || "",
    };

    // 添加联网搜索配置（直接作为参数，而不是工具）
    if (params.webSearch) {
      request.web_search = {
        enable: true
      };
    }

    // 添加推理模式配置（启用推理内容）
    if (params.reasoning !== undefined) {
      request.reasoning = params.reasoning;
    }

    // 添加深思模式配置
    if (params.thinking !== undefined) {
      request.thinking = params.thinking
    }

    return request;
  }

  /**
   * 过滤消息中的think标签内容
   */
  filterThinkContent(messages) {
    return messages.map((message) => {
      if (message.role === "assistant" && message.content) {
        // 移除<think>标签及其内容
        const filteredContent = message.content
          .replace(/<think>[\s\S]*?<\/think>/g, "")
          .trim();
        return {
          ...message,
          content: filteredContent,
        };
      }
      return message;
    });
  }

  /**
   * 获取上下文消息（用于历史会话）
   */
  getContextMessages(allMessages, contextCount) {
    if (!allMessages || allMessages.length === 0) {
      return [];
    }

    // 获取最后N条消息作为上下文
    const contextMessages = allMessages.slice(-contextCount * 2); // 每轮对话包含用户和助手消息

    // 过滤掉think标签内容
    return this.filterThinkContent(contextMessages);
  }

  /**
   * 发送流式请求
   * 注意：流式请求直接使用fetch，Token刷新由ApiService在其他请求中统一处理
   * 如果Token过期，首次请求会返回401，用户需要重试，此时Token已被ApiService刷新
   */
  async sendStreamRequest(token, requestBody, conversationId, onMessage) {
    const controller = new AbortController();

    try {
      // 直接使用fetch进行流式请求
      // Token由ApiService统一管理，这里使用最新的Token
      const currentToken = this.getAuthToken() || token;
      console.log("聊天请求参数2：", JSON.stringify(requestBody));

      const response = await fetch(this.resolveURL("chat/completions/"), {
        method: "POST",
        headers: {
          ...this.headers,
          "X-Conversation-Id": conversationId,
          Authorization: `Bearer ${currentToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!response.ok) {
        // 如果是401错误，Token可能过期
        if (response.status === 401) {
          // 触发一次非流式请求让ApiService刷新Token
          try {
            await this.get("chat/models/"); // 触发Token刷新
            // Token刷新成功，让用户重试
            throw new Error("Token已刷新，请重试");
          } catch (refreshError) {
            throw new Error("认证失败，请重新登录");
          }
        }

        let errorMsg = "";
        try {
          const errorData = await response.json();
          errorMsg = errorData.message || `HTTP ${response.status}`;
        } catch (e) {
          errorMsg = `发生了一点小问题! status: ${response.status}`;
        }
        throw new Error(errorMsg);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let buffer = "";

      // 从响应头获取真实的conversation_id
      const serverConversationId = response.headers.get("X-Conversation-Id");
      if (serverConversationId) {
        this.setCurrentConversationId(serverConversationId);
        console.log(
          "[ChatApiService] 从响应头获取conversation_id:",
          serverConversationId
        );
      }

      const processStream = async () => {
        try {
          let serverMessageId = null; // 保存来自服务器的消息ID

          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              onMessage({ type: "done", conversationId: serverConversationId });
              break;
            }

            buffer += decoder.decode(value, { stream: true });

            // 处理SSE数据
            let lines = buffer.split("\n");
            buffer = lines.pop() || ""; // 保留不完整的行

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  onMessage({
                    type: "done",
                    conversationId: serverConversationId,
                  });
                  return;
                }
                try {
                  const jsonData = JSON.parse(data);
                  // 提取并保存API返回的消息ID（仅在首次接收到时）
                  if (jsonData.id && !serverMessageId) {
                    serverMessageId = jsonData.id;
                    console.log(
                      "[ChatApiService] 获取服务器消息ID:",
                      serverMessageId
                    );
                  }

                  // 处理流式响应：同时支持content和reasoning_content
                  const delta = jsonData.choices?.[0]?.delta;
                  if (delta && (delta.content !== undefined || delta.reasoning_content !== undefined)) {
                    const chunkData = {
                      type: "chunk",
                      content: delta.content !== undefined ? delta.content : null,
                      reasoningContent: delta.reasoning_content !== undefined ? delta.reasoning_content : null,
                      data: jsonData,
                      messageId: serverMessageId, // 传递服务器消息ID
                      conversationId: serverConversationId, // 传递服务器conversation_id
                    };
                    onMessage(chunkData);
                  }
                } catch (e) {
                  console.warn("解析SSE数据失败:", e, data);
                }
              }
            }
          }
        } catch (error) {
          if (error.name === "AbortError") {
            // 用户主动停止，不需要显示错误
            return;
          } else {
            onMessage({
              type: "error",
              error: error.message,
              conversationId: serverConversationId,
            });
          }
        }
      };

      processStream();
      return controller;
    } catch (error) {
      const errorMessage = error.message || "发送消息失败";
      
      // 触发error事件，通知ChatInterface隐藏加载动画
      onMessage({
        type: "error",
        error: errorMessage
      });
      
      return controller;
    }
  }

  /**
   * 反馈评价
   * @param {string} token - 用户令牌
   * @param {string} conversationId - 会话ID
   * @param {string} messageId - 消息ID
   * @param {string} feedbackType - 反馈类型: GOOD 或 BAD，不传表示取消反馈
   * @param {string} feedbackDesc - 反馈描述（可选）
   * @param {string} feedbackTag - 反馈标签: harmful/nonsense/fake/other（可选）
   */
  async submitFeedback(
    token,
    conversationId,
    messageId,
    feedbackType = null,
    feedbackDesc = null,
    feedbackTag = null
  ) {
    if (!token) {
      throw new Error("请先登录");
    }

    const requestBody = {
      conversation_id: conversationId,
      message_id: messageId,
    };

    // 只在feedbackType不为null时添加
    if (feedbackType) {
      requestBody.feedback_type = feedbackType;
    }

    if (feedbackDesc) {
      requestBody.feedback_desc = feedbackDesc;
    }

    if (feedbackTag) {
      requestBody.feedback_tag = feedbackTag;
    }

    console.log("[ChatApiService.submitFeedback] 提交反馈:", requestBody);

    return this.post("chat/feedback/", requestBody, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  /**
   * 编辑会话标题
   */
  async editConversationTitle(token, conversationId, title) {
    if (!token) {
      throw new Error("请先登录");
    }

    return this.request(
      "PATCH",
      "chat/completions/",
      "",
      {
        conversation_id: conversationId,
        title: title,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  /**
   * 删除会话
   */
  async deleteConversation(token, conversationId) {
    if (!token) {
      throw new Error("请先登录");
    }

    return this.request(
      "DELETE",
      "chat/completions/",
      null,
      {
        conversation_id: conversationId,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }

  /**
   * 发送非流式请求（Token刷新由ApiService统一处理）
   */
  async sendNonStreamRequest(token, requestBody, conversationId, onMessage) {
    const controller = new AbortController();

    try {
      // 使用父类的post方法，返回 {success, data, message} 格式
      const response = await this.post("chat/completions/", requestBody, {
        headers: {
          "X-Conversation-Id": conversationId,
        },
        signal: controller.signal,
      });

      // 从响应头获取真实的conversation_id
      const serverConversationId = conversationId; // 后端应该返回相同的conversation_id
      
      // 检查响应是否成功
      if (response.success && response.data?.choices?.[0]?.message) {
        const messageData = response.data.choices[0].message;
        const content = messageData.content || '';
        const reasoningContent = messageData.reasoning_content || null;
        
        onMessage({
          type: "complete",
          content: content,
          reasoningContent: reasoningContent,
          data: response.data,
          messageId: response.data.id, // 传递服务器返回的messageId
          conversationId: serverConversationId, // 传递会话ID
        });
      } else if (!response.success) {
        throw new Error(response.message || "发送消息失败");
      } else {
        console.error('[ChatApiService] 响应格式错误:', response);
        throw new Error("响应数据格式错误");
      }

      onMessage({ type: "done", conversationId: serverConversationId });
      return controller;
    } catch (error) {
      if (error.name === "AbortError") {
        // 用户主动停止，不需要显示错误
        return controller;
      }
      console.error('[ChatApiService] 非流式请求失败:', error);
      const errorMessage = error.message || "发送消息失败";
      
      // 触发error事件，通知ChatInterface隐藏加载动画
      onMessage({
        type: "error",
        error: errorMessage
      });
      
      return controller;
    }
  }

  /**
   * 报告会话问题
   */
  async reportConversation(token, conversationId, reason, comment) {
    if (!token) {
      throw new Error("请先登录");
    }

    // 优先使用当前会话ID，如果没有则使用传入的会话ID
    const sessionId = this.currentConversationId || conversationId;

    return this.post(
      "/chat/report/",
      {
        conversation_id: sessionId,
        reason: reason,
        comment: comment,
      },
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
  }
}

// 创建默认实例
export const chatApiService = new ChatApiService();
