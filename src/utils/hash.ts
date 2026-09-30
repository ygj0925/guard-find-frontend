/**
 * 前端摘要计算（目前只用于文件秒传查重）。
 *
 * `crypto.subtle` 只在安全上下文（https / localhost）可用，http 部署时是 undefined；
 * 大文件整体读进内存也不划算，所以调用方给了体积上限。
 * 任一前提不满足就返回 `null`，表示"放弃秒传、走普通上传"。
 */
export async function sha256Hex(
  file: File | Blob,
  maxBytes = 100 * 1024 * 1024,
): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle || file.size === 0 || file.size > maxBytes) return null;
  try {
    const digest = await subtle.digest('SHA-256', await file.arrayBuffer());
    return [...new Uint8Array(digest)]
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  } catch {
    return null;
  }
}
