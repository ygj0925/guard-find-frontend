import type { RadioGroupProps } from 'antd';
import { Radio } from 'antd';
import React, { useMemo } from 'react';
import { useDict } from './useDict';

interface DictRadioProps extends Omit<RadioGroupProps, 'options' | 'loading'> {
  dictCode: string;
  optionType?: 'default' | 'button';
}

const DictRadio: React.FC<DictRadioProps> = ({
  dictCode,
  optionType = 'default',
  ...restProps
}) => {
  const { dictItems, loading } = useDict(dictCode);

  const options = useMemo(
    () =>
      dictItems.map((item) => ({
        label: item.name,
        value: item.realVal,
      })),
    [dictItems],
  );

  if (optionType === 'button') {
    return (
      <Radio.Group
        options={options}
        {...restProps}
        disabled={loading || restProps.disabled}
      />
    );
  }

  return (
    <Radio.Group {...restProps} disabled={loading || restProps.disabled}>
      {options.map((option) => (
        <Radio key={option.value} value={option.value}>
          {option.label}
        </Radio>
      ))}
    </Radio.Group>
  );
};

export default DictRadio;
