/**
 * Lit Components 统一导出文件
 * 用于集中管理所有 Lit Elements 组件
 */

// 导入并注册所有 Lit 组件
import './PowerButton.js';
import './PowerInput.js';
import './PowerCloseButton.js';

// 导出组件类（可选，用于需要直接引用类的场景）
export { PowerButton } from './PowerButton.js';
export { PowerInput } from './PowerInput.js';
export { PowerCloseButton } from './PowerCloseButton.js';

/**
 * 使用说明：
 * 
 * 1. 在需要使用 Lit 组件的地方导入此文件：
 *    import '../components/lit/index.js';
 * 
 * 2. 然后就可以在 HTML 中使用组件：
 *    <power-button type="primary" size="medium">保存</power-button>
 *    <power-input placeholder="请输入内容" label="用户名"></power-input>
 * 
 * 3. 监听组件事件：
 *    document.querySelector('power-button').addEventListener('power-click', (e) => {
 *      console.log('按钮被点击', e.detail);
 *    });
 */
