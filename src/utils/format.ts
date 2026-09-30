/**
 * 展示层格式化工具。
 *
 * 单独成文件是因为文件大小此前在 文件列表 / 回收站 / 存储统计 里各抄了一份，
 * 且实现对 `bytes = 0`、`bytes = undefined` 的处理不一致。
 */

const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** 字节数 → 人类可读（后端 `FileResp.size` 是 Long，`FLEXIBLE` 模式下大数以字符串下发，这里都兼容） */
export function formatFileSize(
  bytes: number | string | null | undefined,
): string {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return '0 B';
  const i = Math.min(
    Math.floor(Math.log(value) / Math.log(1024)),
    SIZE_UNITS.length - 1,
  );
  return `${(value / 1024 ** i).toFixed(i === 0 ? 0 : 2)} ${SIZE_UNITS[i]}`;
}
