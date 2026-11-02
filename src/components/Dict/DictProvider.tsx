import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { dict } from '@/services/web/system';
import { createDictStore } from './store';

const createStore = () =>
  createDictStore(async (codes) => {
    const response = await dict.dictData(codes);
    return response.data ?? [];
  });
const emptyStore = createDictStore(async () => []);
const DictContext = createContext(emptyStore);
const EMPTY_DICT_CODES: string[] = [];

export const useDictStore = () => useContext(DictContext);

/** Full-context compatibility for callers that intentionally observe all codes. */
export function useDictContext() {
  const store = useDictStore();
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );
  return useMemo(() => ({ ...store, ...snapshot }), [store, snapshot]);
}

interface DictProviderProps {
  children: React.ReactNode;
  dictCodes?: string[];
}

export const DictProvider: React.FC<DictProviderProps> = ({
  children,
  dictCodes = EMPTY_DICT_CODES,
}) => {
  const [store] = useState(createStore);
  useEffect(() => {
    if (dictCodes.length > 0) void store.ensureDictData(dictCodes);
  }, [dictCodes, store]);
  return <DictContext.Provider value={store}>{children}</DictContext.Provider>;
};

export default DictProvider;
