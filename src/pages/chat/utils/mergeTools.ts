import type { ToolCall, ToolCallChunk } from '../types';

export function mergeTools(
  existing: ToolCall[] = [],
  incoming: ToolCallChunk[] = [],
): ToolCall[] {
  const merged = [...existing];
  for (const chunk of incoming) {
    const idx = merged.findIndex((t) => t.id === chunk.id);
    const status = chunk.status === 'pending' ? 'running' : chunk.status;
    if (idx >= 0) {
      merged[idx] = { ...merged[idx], ...chunk, status };
    } else {
      merged.push({ ...chunk, status });
    }
  }
  return merged;
}
