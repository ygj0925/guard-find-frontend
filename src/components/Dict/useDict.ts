import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { SysDictDataItem } from '@/services/web/system';
import { useDictStore } from './DictProvider';
import { findDictItem } from './store';

const EMPTY_ITEMS: SysDictDataItem[] = [];

export function useDict(dictCode: string) {
  const store = useDictStore();
  const subscribe = useCallback(
    (listener: () => void) => store.subscribeCode(dictCode, listener),
    [dictCode, store],
  );
  const getSnapshot = useCallback(
    () => store.getCodeSnapshot(dictCode),
    [dictCode, store],
  );
  const { data: dictData, loading } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getSnapshot,
  );

  useEffect(() => {
    if (dictCode) void store.ensureDictData([dictCode]);
  }, [dictCode, store]);

  return {
    dictData,
    dictItems: dictData?.dictItems ?? EMPTY_ITEMS,
    loading,
  };
}

export function useDictItem(dictCode: string, value: string) {
  const { dictData, loading } = useDict(dictCode);
  const dictItem = findDictItem(dictData, value);

  return {
    dictItem,
    name: dictItem?.name || String(value),
    attributes: dictItem?.attributes,
    loading,
  };
}

export default useDict;
