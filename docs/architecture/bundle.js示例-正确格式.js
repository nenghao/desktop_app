/**
 * 智能体UI Bundle.js 正确格式示例
 * 
 * 重要：bundle.js 必须返回一个 init 函数！
 * 
 * 格式要求：
 * 1. 使用立即执行函数表达式 (IIFE)
 * 2. 最后必须 return init 函数
 * 3. init 函数接收 context 参数
 */

// ============================================
// 方式1: 推荐格式（使用 IIFE）
// ============================================
(function () {
  'use strict';

  /**
   * 智能体UI初始化函数
   * @param {Object} context - 上下文对象
   * @param {HTMLElement} context.container - UI容器
   * @param {Object} context.agentData - 智能体数据
   * @param {Object} context.config - 配置对象
   * @param {Object} context.utils - 工具函数
   */
  function init(context) {
    const { container, agentData, config, utils } = context;

    console.log('🚀 初始化智能体UI:', agentData.name);

    // 1. 渲染UI结构
    renderUI(container, agentData, config);

    // 2. 绑定事件
    bindEvents(container, utils);

    // 3. 初始化状态
    initializeState(config);
  }

  /**
   * 渲染UI结构
   */
  function renderUI(container, agentData, config) {
    container.innerHTML = `
      <div class="math-calculator">
        <div class="calculator-header">
          <h2>${agentData.name}</h2>
          <p>${agentData.description}</p>
        </div>
        
        <div class="calculator-display">
          <input type="text" id="calc-input" placeholder="输入表达式..." />
          <div id="calc-result" class="result"></div>
        </div>
        
        <div class="calculator-buttons">
          <button class="calc-btn" data-value="7">7</button>
          <button class="calc-btn" data-value="8">8</button>
          <button class="calc-btn" data-value="9">9</button>
          <button class="calc-btn operator" data-value="+">+</button>
          
          <button class="calc-btn" data-value="4">4</button>
          <button class="calc-btn" data-value="5">5</button>
          <button class="calc-btn" data-value="6">6</button>
          <button class="calc-btn operator" data-value="-">-</button>
          
          <button class="calc-btn" data-value="1">1</button>
          <button class="calc-btn" data-value="2">2</button>
          <button class="calc-btn" data-value="3">3</button>
          <button class="calc-btn operator" data-value="*">×</button>
          
          <button class="calc-btn" data-value="0">0</button>
          <button class="calc-btn" data-value=".">.</button>
          <button class="calc-btn" data-value="=">=</button>
          <button class="calc-btn operator" data-value="/">÷</button>
          
          <button class="calc-btn clear" data-value="C">C</button>
        </div>
        
        <div class="calculator-history">
          <h4>历史记录</h4>
          <ul id="history-list"></ul>
        </div>
      </div>
    `;
  }

  /**
   * 绑定事件
   */
  function bindEvents(container, utils) {
    const input = container.querySelector('#calc-input');
    const buttons = container.querySelectorAll('.calc-btn');
    const result = container.querySelector('#calc-result');

    // 按钮点击事件
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;

        if (value === 'C') {
          // 清除
          input.value = '';
          result.textContent = '';
        } else if (value === '=') {
          // 计算
          calculate(container, utils);
        } else {
          // 输入
          input.value += value;
        }
      });
    });

    // 回车计算
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        calculate(container, utils);
      }
    });
  }

  /**
   * 计算表达式
   */
  function calculate(container, utils) {
    const input = container.querySelector('#calc-input');
    const result = container.querySelector('#calc-result');

    try {
      const expression = input.value;

      // 注意：实际应用中应该调用后端API进行计算
      // 这里仅作示例，使用 eval（不安全）
      const answer = eval(expression);

      result.textContent = `= ${answer}`;
      addToHistory(container, expression, answer);

      utils.notificationCenter.success('计算成功');
    } catch (error) {
      result.textContent = '错误';
      utils.notificationCenter.error('计算失败: ' + error.message);
    }
  }

  /**
   * 添加到历史记录
   */
  function addToHistory(container, expression, result) {
    const historyList = container.querySelector('#history-list');
    const item = document.createElement('li');
    item.textContent = `${expression} = ${result}`;
    historyList.insertBefore(item, historyList.firstChild);

    // 限制历史记录数量
    if (historyList.children.length > 10) {
      historyList.removeChild(historyList.lastChild);
    }
  }

  /**
   * 初始化状态
   */
  function initializeState(config) {
    console.log('📋 配置:', config);
    // 根据配置初始化状态
  }

  // ⚠️ 重要：必须返回 init 函数！
  return init;
})();


// ============================================
// 方式2: 简化格式（也可以）
// ============================================
/*
(function() {
  return function init(context) {
    const { container, agentData, config, utils } = context;

    // 渲染UI
    container.innerHTML = `
      <div class="my-agent-ui">
        <h2>${agentData.name}</h2>
        <p>${agentData.description}</p>
      </div>
    `;

    // 绑定事件
    // ...
  };
})();
*/


// ============================================
// ❌ 错误格式示例（不要这样写）
// ============================================

// 错误1: 没有返回 init 函数
/*
(function() {
  function init(context) {
    // ...
  }

  // ❌ 忘记 return init
})();
*/

// 错误2: 直接定义函数（没有 IIFE）
/*
function init(context) {
  // ...
}
// ❌ 这样不会被正确执行
*/

// 错误3: 返回的不是函数
/*
(function() {
  const init = {
    render: function() { }
  };

  return init; // ❌ 返回的是对象，不是函数
})();
*/


// ============================================
// 完整示例：数学计算器
// ============================================

// 这是一个完整的、可以直接使用的示例
// 复制这段代码到服务器的 bundle.js 文件中

/*
(function() {
  'use strict';
  
  function init(context) {
    const { container, agentData, config, utils } = context;
    
    // 渲染UI
    container.innerHTML = `
      <div class="math-calculator" style="padding: 20px;">
        <h2 style="margin-top: 0;">${agentData.name}</h2>
        <div style="margin-bottom: 20px;">
          <input type="text" id="calc-input" 
                 placeholder="输入表达式..." 
                 style="width: 100%; padding: 10px; font-size: 18px; border: 2px solid #ddd; border-radius: 4px;" />
          <div id="calc-result" 
               style="margin-top: 10px; font-size: 24px; font-weight: bold; color: #007bff;"></div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
          ${[7,8,9,'+',4,5,6,'-',1,2,3,'*',0,'.','=','/','C'].map(v => 
            `<button class="calc-btn" data-value="${v}" 
                     style="padding: 15px; font-size: 18px; border: 1px solid #ddd; 
                            border-radius: 4px; cursor: pointer; background: white;">
              ${v}
            </button>`
          ).join('')}
        </div>
        <div style="margin-top: 20px;">
          <h4>历史记录</h4>
          <ul id="history-list" style="list-style: none; padding: 0;"></ul>
        </div>
      </div>
    `;
    
    // 绑定事件
    const input = container.querySelector('#calc-input');
    const result = container.querySelector('#calc-result');
    const buttons = container.querySelectorAll('.calc-btn');
    
    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        const value = btn.dataset.value;
        if (value === 'C') {
          input.value = '';
          result.textContent = '';
        } else if (value === '=') {
          try {
            const answer = eval(input.value);
            result.textContent = `= ${answer}`;
            const historyList = container.querySelector('#history-list');
            const item = document.createElement('li');
            item.textContent = `${input.value} = ${answer}`;
            item.style.padding = '5px';
            item.style.background = '#f8f9fa';
            item.style.marginBottom = '5px';
            item.style.borderRadius = '4px';
            historyList.insertBefore(item, historyList.firstChild);
            utils.notificationCenter.success('计算成功');
          } catch (error) {
            result.textContent = '错误';
            utils.showError('计算失败');
          }
        } else {
          input.value += value;
        }
      });
    });
    
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        buttons[buttons.length - 5].click(); // 触发 = 按钮
      }
    });
  }
  
  return init;
})();
*/

