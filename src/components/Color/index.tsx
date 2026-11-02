import { Popover, Spin } from 'antd';
import React, { lazy, Suspense, useState } from 'react';
import type { ColorResult } from 'react-color';

const SketchPicker = lazy(() =>
  import('react-color').then((module) => ({ default: module.SketchPicker })),
);
const DEFAULT_PRESET_COLORS = [
  '#f5222d',
  '#fa8c16',
  '#fadb14',
  '#52c41a',
  '#13c2c2',
  '#1890ff',
  '#722ed1',
  '#eb2f96',
  '#333333',
  '#666666',
  '#999999',
  '#cccccc',
];

interface ColorProps {
  value?: string;
  onChange?: (color: string) => void;
  presetColors?: string[];
  disableAlpha?: boolean;
  disabled?: boolean;
}

const Color: React.FC<ColorProps> = ({
  value,
  onChange,
  presetColors = DEFAULT_PRESET_COLORS,
  disableAlpha = false,
  disabled = false,
}) => {
  const [visible, setVisible] = useState(false);

  const handleChange = (color: ColorResult) => {
    onChange?.(color.hex);
  };

  const handleClear = () => {
    onChange?.('');
    setVisible(false);
  };

  return (
    <Popover
      content={
        <div>
          {visible && (
            <Suspense
              fallback={
                <div
                  style={{
                    width: 220,
                    height: 280,
                    display: 'grid',
                    placeItems: 'center',
                  }}
                >
                  <Spin />
                </div>
              }
            >
              <SketchPicker
                color={value || '#000000'}
                onChange={handleChange}
                presetColors={presetColors}
                disableAlpha={disableAlpha}
              />
            </Suspense>
          )}
          <div style={{ textAlign: 'center', marginTop: 8 }}>
            <a onClick={handleClear}>清除颜色</a>
          </div>
        </div>
      }
      trigger="click"
      open={visible}
      onOpenChange={setVisible}
    >
      <div
        style={{
          display: 'inline-block',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
        }}
      >
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 4,
            border: '1px solid #d9d9d9',
            backgroundColor: value || '#ffffff',
          }}
        />
      </div>
    </Popover>
  );
};

export default Color;
