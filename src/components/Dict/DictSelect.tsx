import type { SelectProps } from 'antd';
import { Select } from 'antd';
import React from 'react';
import { useDict } from './useDict';

interface DictSelectProps extends Omit<SelectProps, 'options' | 'loading'> {
  dictCode: string;
  showAll?: boolean;
  allLabel?: string;
  allValue?: string | number;
}

const DictSelect: React.FC<DictSelectProps> = ({
  dictCode,
  showAll = false,
  allLabel = '全部',
  allValue = '',
  ...restProps
}) => {
  const { dictItems, loading } = useDict(dictCode);

  const options = [
    ...(showAll ? [{ label: allLabel, value: allValue }] : []),
    ...dictItems.map((item) => ({
      label: item.name,
      value: item.realVal,
    })),
  ];

  return <Select options={options} loading={loading} {...restProps} />;
};

export default DictSelect;
