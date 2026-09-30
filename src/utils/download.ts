import { request } from '@umijs/max';

/**
 * 统一的文件下载/导出工具。
 *
 * 后端导出接口成功时返回 `application/octet-stream`（绕过响应信封），
 * 失败时返回 JSON 信封；JSON 分支由 `RequestConfig` 的响应拦截器识别并提示，
 * 因此这里只需处理"拿到 Blob 就保存"。
 */

export interface DownloadOptions {
  method?: 'GET' | 'POST';
  /** query 参数 */
  params?: Record<string, any>;
  /** 请求体（POST 导出） */
  data?: any;
  /** 保存到磁盘的文件名 */
  filename: string;
  /** 额外请求头 */
  headers?: Record<string, string>;
}

/** 触发浏览器保存 Blob */
export function saveBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * 下载并保存文件。
 *
 * @param url 相对路径（请求拦截器会补 requestPrefix）
 */
export async function download(
  url: string,
  options: DownloadOptions,
): Promise<void> {
  const { method = 'GET', params, data, filename, headers } = options;

  const blob = await request<Blob>(url, {
    method,
    params,
    data,
    headers,
    responseType: 'blob',
  });

  // 防御：个别环境下信封未被拦截器识别（如 content-type 缺失）
  if (blob instanceof Blob && blob.type.includes('application/json')) {
    const text =
      typeof blob.text === 'function'
        ? await blob.text()
        : await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result ?? ''));
            reader.onerror = () => reject(reader.error);
            reader.readAsText(blob);
          });
    throw new Error(text || '下载失败');
  }

  saveBlob(blob as Blob, filename);
}

/** 从 content-disposition 猜测文件名，取不到时用调用方给的默认名 */
export function filenameFromDisposition(
  disposition: string | undefined,
  fallback: string,
): string {
  if (!disposition) return fallback;
  const utf8 = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1]);
    } catch {
      return utf8[1];
    }
  }
  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain?.[1] || fallback;
}
