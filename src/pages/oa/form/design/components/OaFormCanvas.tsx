import {
  DeleteOutlined,
  HolderOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import { Button, Card, Empty, Space, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import {
  OA_FORM_FIELD_TYPES,
  type OaFormField,
  type OaFormFieldType,
} from '@/utils/oaForm';

interface OaFormCanvasProps {
  fields: OaFormField[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDropType: (type: OaFormFieldType, index: number) => void;
  onMoveField: (fieldId: string, targetIndex: number) => void;
}

function typeLabel(type: string) {
  return OA_FORM_FIELD_TYPES.find((item) => item.type === type)?.label || type;
}

function readDragData(event: React.DragEvent) {
  return {
    type: event.dataTransfer.getData('text/oa-field-type'),
    fieldId: event.dataTransfer.getData('text/oa-field-id'),
  };
}

function borderColor(selected: boolean, dragOver: boolean) {
  if (selected) return '#1677ff';
  if (dragOver) return '#91caff';
  return '#e5e7eb';
}

const OaFormCanvas: React.FC<OaFormCanvasProps> = ({
  fields,
  selectedId,
  onSelect,
  onRemove,
  onDropType,
  onMoveField,
}) => {
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDrop = (event: React.DragEvent, index: number) => {
    event.preventDefault();
    event.stopPropagation();
    setDragOverIndex(null);
    const drag = readDragData(event);
    if (drag.type) {
      onDropType(drag.type as OaFormFieldType, index);
      return;
    }
    if (drag.fieldId) {
      onMoveField(drag.fieldId, index);
    }
  };

  return (
    <Card
      title={`表单字段（${fields.length}）`}
      size="small"
      extra={<Typography.Text type="secondary">拖拽排序</Typography.Text>}
      style={{ flex: '1 1 420px', minWidth: 0 }}
      styles={{ body: { minHeight: 360 } }}
    >
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragOverIndex(fields.length);
        }}
        onDrop={(event) => handleDrop(event, fields.length)}
        style={{ minHeight: 320 }}
      >
        {fields.length === 0 ? (
          <Empty
            image={<InboxOutlined style={{ fontSize: 48, color: '#bfbfbf' }} />}
            description="从左侧点击或拖入字段开始设计"
          />
        ) : (
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {fields.map((field, index) => (
              <div
                key={field.id}
                data-testid="oa-form-field"
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setDragOverIndex(index);
                }}
                onDrop={(event) => handleDrop(event, index)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  border: `1px solid ${borderColor(
                    selectedId === field.id,
                    dragOverIndex === index,
                  )}`,
                  borderRadius: 6,
                  background: selectedId === field.id ? '#e6f4ff' : '#fff',
                }}
              >
                <button
                  type="button"
                  draggable
                  onClick={() => onSelect(field.id)}
                  onDragStart={(event) => {
                    event.dataTransfer.setData('text/oa-field-id', field.id);
                    event.dataTransfer.effectAllowed = 'move';
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    border: 'none',
                    background: 'transparent',
                    textAlign: 'left',
                    cursor: 'pointer',
                    color: 'inherit',
                  }}
                >
                  <HolderOutlined style={{ color: '#8c8c8c' }} />
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <Space wrap size={6}>
                      <Typography.Text strong>{field.label}</Typography.Text>
                      <Tag>{typeLabel(field.type)}</Tag>
                      {field.required ? <Tag color="red">必填</Tag> : null}
                    </Space>
                    <span style={{ display: 'block' }}>
                      <Typography.Text type="secondary" code>
                        {field.key}
                      </Typography.Text>
                    </span>
                  </span>
                </button>
                <Button
                  type="text"
                  danger
                  size="small"
                  aria-label={`删除字段 ${field.label}`}
                  icon={<DeleteOutlined />}
                  onClick={() => onRemove(field.id)}
                />
              </div>
            ))}
          </Space>
        )}
      </div>
    </Card>
  );
};

export default OaFormCanvas;
