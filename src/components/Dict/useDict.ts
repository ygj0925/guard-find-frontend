import { useEffect } from 'react';
import { useDictContext } from './DictProvider';

export function useDict(dictCode: string) {
  const { getDictData, ensureDictData, loading } = useDictContext();
  const dictData = getDictData(dictCode);

  useEffect(() => {
    if (dictCode && !dictData) void ensureDictData([dictCode]);
  }, [dictCode, dictData, ensureDictData]);

  return {
    dictData,
    dictItems: dictData?.dictItems || [],
    loading,
  };
}

export function useDictItem(dictCode: string, value: string) {
  const { dictData, loading } = useDict(dictCode);
  const dictItem = dictData?.dictItems.find(
    (item) => item.value === String(value),
  );

  return {
    dictItem,
    name: dictItem?.name || String(value),
    attributes: dictItem?.attributes,
    loading,
  };
}

export default useDict;
