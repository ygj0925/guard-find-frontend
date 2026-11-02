import type { SysDictData, SysDictDataItem } from '@/services/web/system';

export interface DictSnapshot {
  data?: SysDictData;
  loading: boolean;
}

const EMPTY_SNAPSHOT: DictSnapshot = { loading: false };
const itemIndexes = new WeakMap<SysDictData, Map<string, SysDictDataItem>>();

export function findDictItem(data: SysDictData | undefined, value: string) {
  if (!data) return undefined;
  let index = itemIndexes.get(data);
  if (!index) {
    index = new Map();
    for (const item of data.dictItems) {
      // Preserve find() behavior if a response contains duplicate values.
      if (!index.has(item.value)) index.set(item.value, item);
    }
    itemIndexes.set(data, index);
  }
  return index.get(String(value));
}

function normalize(data: SysDictData): SysDictData {
  return {
    ...data,
    dictItems: data.dictItems.map((item) => ({
      ...item,
      realVal:
        data.valueType === 1
          ? Number(item.value)
          : data.valueType === 3
            ? item.value === 'true'
            : item.value,
    })),
  };
}

/** Provider-scoped cache: deduplicate requests and subscribe by code. */
export function createDictStore(
  load: (codes: string[]) => Promise<SysDictData[]>,
) {
  let snapshot = { dictMap: {} as Record<string, SysDictData>, loading: false };
  const codeSnapshots = new Map<string, DictSnapshot>();
  const listeners = new Set<() => void>();
  const codeListeners = new Map<string, Set<() => void>>();
  const pending = new Map<string, Promise<void>>();

  const publish = (codes: string[], dictMap = snapshot.dictMap) => {
    const loading = pending.size > 0;
    const globalChanged =
      dictMap !== snapshot.dictMap || loading !== snapshot.loading;
    if (globalChanged) {
      snapshot = { dictMap, loading };
    }
    const changed: string[] = [];
    for (const code of codes) {
      const previous = codeSnapshots.get(code) ?? EMPTY_SNAPSHOT;
      const data = dictMap[code];
      const codeLoading = pending.has(code);
      if (previous.data === data && previous.loading === codeLoading) continue;
      codeSnapshots.set(
        code,
        data || codeLoading ? { data, loading: codeLoading } : EMPTY_SNAPSHOT,
      );
      changed.push(code);
    }
    for (const code of changed)
      codeListeners.get(code)?.forEach((listener) => {
        listener();
      });
    if (globalChanged)
      listeners.forEach((listener) => {
        listener();
      });
  };

  const ensure = async (codes: string[], force = false) => {
    const waiting: Promise<void>[] = [];
    const changed: string[] = [];
    for (const code of new Set(codes.filter(Boolean))) {
      const request = pending.get(code);
      if (request) {
        waiting.push(request);
        continue;
      }
      if (!force && snapshot.dictMap[code]) continue;
      // The backend serves one code per HTTP request. Keep failures and loading
      // independent too, so a slow or failed code cannot block other controls.
      const promise = Promise.resolve()
        .then(() => load([code]))
        .then((data) => {
          const item = data.find((entry) => entry.dictCode === code);
          if (item)
            publish([code], { ...snapshot.dictMap, [code]: normalize(item) });
        })
        .catch((error) => {
          console.error('Failed to load dict data:', error);
        })
        .finally(() => {
          pending.delete(code);
          publish([code]);
        });
      pending.set(code, promise);
      changed.push(code);
      waiting.push(promise);
    }
    publish(changed);
    await Promise.all(waiting);
  };

  return {
    getSnapshot: () => snapshot,
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getCodeSnapshot: (code: string) =>
      codeSnapshots.get(code) ?? EMPTY_SNAPSHOT,
    subscribeCode(code: string, listener: () => void) {
      let subscriptions = codeListeners.get(code);
      if (!subscriptions) {
        subscriptions = new Set();
        codeListeners.set(code, subscriptions);
      }
      subscriptions.add(listener);
      return () => {
        subscriptions.delete(listener);
        if (subscriptions.size === 0) codeListeners.delete(code);
      };
    },
    ensureDictData: (codes: string[]) => ensure(codes),
    refreshDict: (codes?: string[]) =>
      ensure(codes ?? Object.keys(snapshot.dictMap), true),
    getDictData: (code: string) => snapshot.dictMap[code],
    getDictItem: (code: string, value: string) =>
      findDictItem(snapshot.dictMap[code], value),
    getDictItemName: (code: string, value: string) =>
      findDictItem(snapshot.dictMap[code], value)?.name || String(value),
  };
}
