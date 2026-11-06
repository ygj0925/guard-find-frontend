import {
  AlignLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckSquareOutlined,
  FontSizeOutlined,
  NumberOutlined,
  PaperClipOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Card, Tooltip } from 'antd';
import React from 'react';
import { OA_FORM_FIELD_TYPES, type OaFormFieldType } from '@/utils/oaForm';

const TYPE_ICONS: Record<OaFormFieldType, React.ReactNode> = {
  text: <FontSizeOutlined />,
  textarea: <AlignLeftOutlined />,
  number: <NumberOutlined />,
  date: <CalendarOutlined />,
  radio: <CheckCircleOutlined />,
  checkbox: <CheckSquareOutlined />,
  attachment: <PaperClipOutlined />,
  person: <UserOutlined />,
};

interface OaFormPaletteProps {
  onAdd: (type: OaFormFieldType) => void;
}

const OaFormPalette: React.FC<OaFormPaletteProps> = ({ onAdd }) => (
  <Card title="字段类型" size="small" style={{ width: 190, flex: '0 0 190px' }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {OA_FORM_FIELD_TYPES.map((item) => (
        <Tooltip key={item.type} title={`${item.hint}；可点击或拖入画布`}>
          <button
            type="button"
            draggable
            aria-label={`添加${item.label}`}
            onClick={() => onAdd(item.type)}
            onDragStart={(event) => {
              event.dataTransfer.setData('text/oa-field-type', item.type);
              event.dataTransfer.effectAllowed = 'copy';
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              padding: '8px 10px',
              textAlign: 'left',
              cursor: 'grab',
              background: '#fff',
              border: '1px solid #e5e7eb',
              borderRadius: 6,
              color: 'inherit',
            }}
          >
            <span style={{ color: '#1677ff' }}>{TYPE_ICONS[item.type]}</span>
            <span>{item.label}</span>
          </button>
        </Tooltip>
      ))}
    </div>
  </Card>
);

export default OaFormPalette;
