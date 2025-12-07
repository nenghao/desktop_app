## Dashboard 新版开发指南
基本界面结构跟交互流程：
### Dashboard
Dashboard首页包含三个板块：
1. 今日要闻
2. AI日报
3. AI资讯
界面结构参考: standalone\dashboard.html

### 查看更多界面
Dashboard首页某个模块的查看更多按钮，进入这个新闻列表界面，如果点击的是ai日报里面的查看更多，那显示的就是ai日报的内容。界面结构参考 standalone\aidaily.html，点击的其它模块的也是以此类推。

### 详情界面
方式一：在Dashboard首页点击某条新闻item进入详情；
方式二：在查看更多界面点击某条新闻页进入这个详情界面，要请求展示具体的详情信息，界面结构参考standalone\ainews-detail.html


### 方案: 完全本地化

**思路：** 不再使用 standalone HTML 文件，而是使用本地 JS/CSS 模块

**优点：**
- ✅ 无跨域问题
- ✅ 无参数传递问题
- ✅ 代码模块化，易维护
- ✅ 支持热更新

**实现步骤：**

1. **创建视图组件**
   ```
   src/views/
   ├── Dashboard.js          # Dashboard 主视图
   ├── AIDailyList.js        # AI 日报列表
   ├── AINewsList.js         # AI 资讯列表
   └── NewsDetail.js         # 新闻详情
   ```

2. **使用组件路由**
   ```javascript
   // ComponentLoader.js
   const builtinComponents = {
     'Dashboard': () => import('../views/Dashboard.js'),
     'AIDailyList': () => import('../views/AIDailyList.js'),
     'AINewsList': () => import('../views/AINewsList.js'),
     'NewsDetail': () => import('../views/NewsDetail.js')
   };
   ```

3. **保持样式一致**
   - 将 standalone HTML 中的样式提取到 CSS 模块
   - 使用 CSS 变量保持主题一致性

---

## 样式说明

### 透明 Header

子视图的 header 设计为透明，内容可以穿透滚动：

```css
.subview-header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 44px;
  background: transparent;
  z-index: 1001;
  pointer-events: none;  /* 允许内容穿透 */
}

.subview-back-btn {
  pointer-events: auto;  /* 返回按钮可点击 */
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}
```