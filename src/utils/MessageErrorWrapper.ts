// src/utils/messageErrorWrapper.ts
import { type MessageArgsProps, message } from 'antd';

// 维护全局的 message 实例（Ant Design 的 message 返回的是销毁函数，需特殊处理）
let messageCloseFunc: (() => void) | null = null;

/**
 * 错误提示封装函数 - 确保同一时间只显示一个错误提示
 * @param options - 提示配置，支持字符串（提示文本）或 Ant Design Message 配置对象
 * @returns void
 */
const messageErrorWrapper = (options: string | MessageArgsProps) => {
  try {
    // 1. 关闭已存在的提示实例
    if (messageCloseFunc) {
      messageCloseFunc();
      messageCloseFunc = null; // 清空已销毁的函数引用
    }

    // 2. 处理入参：兼容字符串和配置对象两种形式
    const finalOptions: MessageArgsProps =
      typeof options === 'string' ? { content: options } : { ...options };

    // 3. 自定义默认配置（可根据业务调整）
    const defaultConfig = {
      type: 'error' as const, // 固定为错误类型
      duration: 3, // 默认显示 3 秒
      maxCount: 1, // 最多同时显示 1 个提示
      style: { marginTop: '20px' }, // 自定义样式（可选）
    };

    // 4. 创建新的错误提示，并保存销毁函数
    messageCloseFunc = message.open({
      ...defaultConfig,
      ...finalOptions,
    });
  } catch (error) {
    // 异常兜底：避免提示组件报错导致主流程阻塞
    console.error('错误提示组件调用失败：', error);
    // 降级处理：直接用原生 alert（可选）
    const errorMsg =
      typeof options === 'string' ? options : options.content || '操作失败';
    window.alert(errorMsg);
  }
};

// 可选：导出重置函数，用于手动清空提示
export const resetMessageInstance = () => {
  if (messageCloseFunc) {
    messageCloseFunc();
    messageCloseFunc = null;
  }
};

export default messageErrorWrapper;
