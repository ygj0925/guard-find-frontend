import { Tag } from 'antd';
import React from 'react';
import { useDictItem } from './useDict';

interface DictTagProps {
  dictCode: string;
  value: string | number;
  className?: string;
  style?: React.CSSProperties;
}

const DictTag: React.FC<DictTagProps> = ({
  dictCode,
  value,
  className,
  style,
}) => {
  const { dictItem, name, attributes } = useDictItem(dictCode, String(value));

  if (!dictItem) {
    return null;
  }

  const tagColor = attributes?.tagColor;
  const textColor = attributes?.textColor;

  return (
    <Tag
      color={tagColor}
      className={className}
      style={{
        color: textColor,
        ...style,
      }}
    >
      {name}
    </Tag>
  );
};

export default DictTag;
