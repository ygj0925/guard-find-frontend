import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { SysDictData, SysDictDataItem } from '@/services/web/system';
import { dict } from '@/services/web/system';

interface DictContextType {
  dictMap: Record<string, SysDictData>;
  loading: boolean;
  getDictData: (dictCode: string) => SysDictData | undefined;
  getDictItem: (dictCode: string, value: string) => SysDictDataItem | undefined;
  getDictItemName: (dictCode: string, value: string) => string;
  ensureDictData: (dictCodes: string[]) => Promise<void>;
  refreshDict: (dictCodes?: string[]) => Promise<void>;
}

const DictContext = createContext<DictContextType>({
  dictMap: {},
  loading: false,
  getDictData: () => undefined,
  getDictItem: () => undefined,
  getDictItemName: () => '',
  ensureDictData: async () => {},
  refreshDict: async () => {},
});

export const useDictContext = () => useContext(DictContext);

interface DictProviderProps {
  children: React.ReactNode;
  dictCodes?: string[];
}

const EMPTY_DICT_CODES: string[] = [];

function getRealValue(valueType: number, value: string): unknown {
  switch (valueType) {
    case 1:
      return Number(value);
    case 3:
      return value === 'true';
    default:
      return value;
  }
}

function normalizeDictData(item: SysDictData): SysDictData {
  return {
    ...item,
    dictItems: item.dictItems.map((dictItem) => ({
      ...dictItem,
      realVal: getRealValue(item.valueType, dictItem.value),
    })),
  };
}

export const DictProvider: React.FC<DictProviderProps> = ({
  children,
  dictCodes = EMPTY_DICT_CODES,
}) => {
  const [dictMap, setDictMap] = useState<Record<string, SysDictData>>({});
  const [loading, setLoading] = useState(false);
  const dictMapRef = useRef(dictMap);
  const pendingRef = useRef(new Map<string, Promise<void>>());
  dictMapRef.current = dictMap;

  const loadDictData = useCallback(async (codes: string[], force = false) => {
    const uniqueCodes = [...new Set(codes.filter(Boolean))];
    const waiting = uniqueCodes
      .map((code) => pendingRef.current.get(code))
      .filter((request): request is Promise<void> => Boolean(request));
    const targetCodes = uniqueCodes.filter(
      (code) =>
        !pendingRef.current.has(code) && (force || !dictMapRef.current[code]),
    );

    if (targetCodes.length === 0) {
      await Promise.all(waiting);
      return;
    }

    setLoading(true);
    const request = (async () => {
      try {
        const response = await dict.dictData(targetCodes);
        if (response?.data) {
          setDictMap((current) => {
            const next = { ...current };
            response.data.forEach((item) => {
              next[item.dictCode] = normalizeDictData(item);
            });
            dictMapRef.current = next;
            return next;
          });
        }
      } catch (error) {
        console.error('Failed to load dict data:', error);
      } finally {
        targetCodes.forEach((code) => {
          if (pendingRef.current.get(code) === request) {
            pendingRef.current.delete(code);
          }
        });
        if (pendingRef.current.size === 0) setLoading(false);
      }
    })();

    targetCodes.forEach((code) => {
      pendingRef.current.set(code, request);
    });
    await Promise.all([...waiting, request]);
  }, []);

  const getDictData = useCallback(
    (dictCode: string) => {
      return dictMap[dictCode];
    },
    [dictMap],
  );

  const getDictItem = useCallback(
    (dictCode: string, value: string) => {
      const dictData = dictMap[dictCode];
      if (!dictData) return undefined;
      return dictData.dictItems.find((item) => item.value === String(value));
    },
    [dictMap],
  );

  const getDictItemName = useCallback(
    (dictCode: string, value: string) => {
      const item = getDictItem(dictCode, value);
      return item?.name || String(value);
    },
    [getDictItem],
  );

  const ensureDictData = useCallback(
    (codes: string[]) => loadDictData(codes),
    [loadDictData],
  );

  const refreshDict = useCallback(
    async (codes?: string[]) => {
      const targetCodes = codes || Object.keys(dictMapRef.current);
      if (targetCodes.length > 0) {
        await loadDictData(targetCodes, true);
      }
    },
    [loadDictData],
  );

  useEffect(() => {
    if (dictCodes.length > 0) {
      void ensureDictData(dictCodes);
    }
  }, [dictCodes, ensureDictData]);

  const value = useMemo(
    () => ({
      dictMap,
      loading,
      getDictData,
      getDictItem,
      getDictItemName,
      ensureDictData,
      refreshDict,
    }),
    [
      dictMap,
      loading,
      getDictData,
      getDictItem,
      getDictItemName,
      ensureDictData,
      refreshDict,
    ],
  );

  return <DictContext.Provider value={value}>{children}</DictContext.Provider>;
};

export default DictProvider;
