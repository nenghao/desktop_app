/**
 * 文本处理工具类
 */

export class TextUtils {
  /**
   * 清理标题（剔除"AI日报"、"AI资讯"等前缀）
   * @param {string} title - 原始标题
   * @returns {string} 清理后的标题
   */
  static cleanTitle(title) {
    if (!title) return '';

    // 剔除各种格式的 "AI日报" 和 "AI资讯" 前缀
    return title
      .replace(/^AI\s*日报[\s：：:-]*/, '')     // AI日报、AI 日报、AI日报：、AI日报-
      .replace(/^AI\s*资讯[\s：：:-]*/, '')     // AI资讯、AI 资讯、AI资讯：
      .replace(/^【AI日报】[\s：：:-]*/, '')   // 【AI日报】
      .replace(/^【AI资讯】[\s：：:-]*/, '')   // 【AI资讯】
      .replace(/^\|\s*AI日报[\s：：:-]*/, '') // | AI日报
      .replace(/^\|\s*AI资讯[\s：：:-]*/, '') // | AI资讯
      .trim();
  }

  /**
   * 格式化日期
   * @param {string} dateString - 日期字符串
   * @returns {string} 格式化后的日期
   */
  static formatDate(dateString) {
    if (!dateString) return '未知日期';
    
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diff = now - date;
      const seconds = Math.floor(diff / 1000);
      const minutes = Math.floor(seconds / 60);
      const hours = Math.floor(minutes / 60);
      const days = Math.floor(hours / 24);

      if (days > 7) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      } else if (days > 0) {
        return `${days}天前`;
      } else if (hours > 0) {
        return `${hours}小时前`;
      } else if (minutes > 0) {
        return `${minutes}分钟前`;
      } else {
        return '刚刚';
      }
    } catch (error) {
      console.error('日期格式化失败:', error);
      return dateString;
    }
  }

  /**
   * 格式化数字（大数字转换为 k/w）
   * @param {number} num - 数字
   * @returns {string} 格式化后的字符串
   */
  static formatNumber(num) {
    if (!num) return '0';
    
    const number = parseInt(num);
    if (isNaN(number)) return '0';
    
    if (number >= 10000) {
      return (number / 10000).toFixed(1) + 'w';
    } else if (number >= 1000) {
      return (number / 1000).toFixed(1) + 'k';
    }
    return number.toString();
  }
}

export default TextUtils;
