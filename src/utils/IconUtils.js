/**
 * 图标工具类
 * 处理Lucide图标的转换和管理
 */

// 引入Lucide图标
import {
  Home,
  MessageCircle,
  Bot,
  Settings,
  Wrench,
  BarChart3,
  Image,
  Globe,
  Zap,
  Menu,
  ChevronRight,
  ChevronDown,
  ChevronLeft,
  ArrowLeft,
  Plus,
  X,
  User,
  CircleUserRound,
  Pin,
  Search,
  Copy,
  CopyCheck,
  FileText,
  Clock,
  MoreHorizontal,
  FileDown,
  ArrowUp,
  ImageDown,
  Flag,
  Trash2,
  RefreshCw,
  Volume2,
  Star,
  Download,
  Brain,
  Code,
  Sparkles,
  Calendar,
  Eye,
  Minus,
  Square,
  Maximize2
} from 'lucide';

export class IconUtils {
  /**
   * 图标映射表
   */
  static iconMap = {
    'home': Home,
    'message-circle': MessageCircle,
    'bot': Bot,
    'settings': Settings,
    'wrench': Wrench,
    'bar-chart-3': BarChart3,
    'image': Image,
    'globe': Globe,
    'zap': Zap,
    'menu': Menu,
    'chevron-right': ChevronRight,
    'chevron-down': ChevronDown,
    'chevron-left': ChevronLeft,
    'arrow-left': ArrowLeft,
    'plus': Plus,
    'x': X,
    'user': User,
    'circle-user-round': CircleUserRound,
    'pin': Pin,
    'search': Search,
    'copy': Copy,
    'copy-check': CopyCheck,
    'file-text': FileText,
    'clock': Clock,
    'more-horizontal': MoreHorizontal,
    'file-down': FileDown,
    'arrow-up': ArrowUp,
    'image-down': ImageDown,
    'flag': Flag,
    'trash-2': Trash2,
    'refresh': RefreshCw,
    'volume-2': Volume2,
    'star': Star,
    'download': Download,
    'brain': Brain,
    'code': Code,
    'sparkles': Sparkles,
    'calendar': Calendar,
    'eye': Eye,
    'minus': Minus,
    'square': Square,
    'maximize-2': Maximize2,
    'sparkles': Sparkles
  };

  /**
   * 将Lucide图标数据转换为SVG字符串
   * @param {Array} iconData - Lucide图标数据数组
   * @param {Object} attributes - SVG属性配置
   * @returns {string} SVG字符串
   */
  static iconToSvg(iconData, attributes = {}) {
    const {
      size = 24,
      strokeWidth = 2,
      color = 'currentColor',
      fill = 'none',
      className = ''
    } = attributes;

    if (!iconData || !Array.isArray(iconData)) {
      console.warn('Invalid icon data provided');
      return '';
    }

    const pathElements = iconData.map(([tag, attrs]) => {
      switch (tag) {
        case 'path':
          return `<path d="${attrs.d}" />`;
        case 'circle':
          return `<circle cx="${attrs.cx}" cy="${attrs.cy}" r="${attrs.r}" />`;
        case 'rect':
          return `<rect x="${attrs.x}" y="${attrs.y}" width="${attrs.width}" height="${attrs.height}" ${attrs.rx ? `rx="${attrs.rx}"` : ''} ${attrs.ry ? `ry="${attrs.ry}"` : ''} />`;
        case 'line':
          return `<line x1="${attrs.x1}" y1="${attrs.y1}" x2="${attrs.x2}" y2="${attrs.y2}" />`;
        case 'polyline':
          return `<polyline points="${attrs.points}" />`;
        case 'polygon':
          return `<polygon points="${attrs.points}" />`;
        case 'ellipse':
          return `<ellipse cx="${attrs.cx}" cy="${attrs.cy}" rx="${attrs.rx}" ry="${attrs.ry}" />`;
        default:
          console.warn(`Unsupported SVG element: ${tag}`);
          return '';
      }
    }).filter(Boolean).join('');

    const classAttr = className ? ` class="${className}"` : '';

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill}" stroke="${color}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"${classAttr}>${pathElements}</svg>`;
  }

  /**
   * 根据图标名称获取SVG字符串
   * @param {string} iconName - 图标名称
   * @param {Object} attributes - SVG属性配置
   * @returns {string} SVG字符串
   */
  static getIcon(iconName, attributes = {}) {
    const iconData = this.iconMap[iconName];

    if (!iconData) {
      console.warn(`Icon '${iconName}' not found, using 'home' as fallback`);
      return "";
    }

    return this.iconToSvg(iconData, attributes);
  }

  /**
   * 检查图标是否存在
   * @param {string} iconName - 图标名称
   * @returns {boolean} 是否存在
   */
  static hasIcon(iconName) {
    return iconName in this.iconMap;
  }

  /**
   * 获取所有可用的图标名称
   * @returns {string[]} 图标名称数组
   */
  static getAvailableIcons() {
    return Object.keys(this.iconMap);
  }

  /**
   * 添加新图标到映射表
   * @param {string} iconName - 图标名称
   * @param {Array} iconData - Lucide图标数据
   */
  static addIcon(iconName, iconData) {
    this.iconMap[iconName] = iconData;
  }

  /**
   * 批量添加图标
   * @param {Object} icons - 图标映射对象
   */
  static addIcons(icons) {
    Object.assign(this.iconMap, icons);
  }
}

export default IconUtils;