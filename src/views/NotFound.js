/**
 * 404页面视图
 */

export class NotFound {
  constructor() {
    this.container = null;
  }
  
  /**
   * 渲染404页面
   */
  async render(container, props = {}) {
    this.container = container;
    
    container.innerHTML = `
      <div class="not-found">
        <div class="not-found-content">
          <div class="not-found-icon">🔍</div>
          <h1>404</h1>
          <h2>页面未找到</h2>
          <p>抱歉，您访问的页面不存在或已被移动。</p>
          
          <div class="not-found-actions">
            <button class="btn btn-primary" onclick="window.app.getService('router').navigate('/dashboard')">
              返回首页
            </button>
            <button class="btn btn-secondary" onclick="window.history.back()">
              返回上页
            </button>
          </div>
          
          <div class="not-found-suggestions">
            <h3>您可能想要：</h3>
            <ul>
              <li><a href="#/agents">浏览智能体</a></li>
              <li><a href="#/chat">开始聊天</a></li>
              <li><a href="#/">返回主页</a></li>
            </ul>
          </div>
        </div>
      </div>
    `;
    
    console.log('✅ NotFound 渲染完成');
  }
  
  /**
   * 卸载组件
   */
  async unmount() {
    console.log('✅ NotFound 卸载完成');
  }
}

export default NotFound;
