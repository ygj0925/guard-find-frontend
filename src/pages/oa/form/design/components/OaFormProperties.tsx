import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Divider,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  Typography,
} from 'antd';
import React from 'react';
import {
  createOaFormColumn,
  OA_FORM_COLUMN_TYPES,
  OA_FORM_LIMITS,
  OA_FORM_OPTION_TYPES,
  type OaFormColumn,
  type OaFormColumnType,
  type OaFormField,
  type OaFormFieldType,
} from '@/utils/oaForm';

const TYPE_LABELS: Record<OaFormFieldType, string> = {
  text: '单行文本',
  textarea: '多行文本',
  number: '数字',
  date: '日期',
  datetime: '日期时间',
  radio: '单选',
  checkbox: '多选',
  attachment: '附件',
  person: '人员',
  table: '明细表',
};

interface ColumnEditorProps {
  field: OaFormField;
  onChange: (patch: Partial<OaFormField>) => void;
}

const ColumnEditor: React.FC<ColumnEditorProps> = ({ field, onChange }) => {
  const columns = field.columns ?? [];

  const updateColumn = (index: number, patch: Partial<OaFormColumn>) => {
    onChange({
      columns: columns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, ...patch } : column,
      ),
    });
  };

  const updateColumnOption = (
    index: number,
    optionIndex: number,
    patch: { label?: string; value?: string },
  ) => {
    const options = columns[index].options ?? [];
    updateColumn(index, {
      options: options.map((option, current) =>
        current === optionIndex ? { ...option, ...patch } : option,
      ),
    });
  };

  const addColumnOption = (index: number) => {
    const options = columns[index].options ?? [];
    const usedValues = new Set(options.map((option) => option.value));
    let seq = options.length + 1;
    while (usedValues.has(`option_${seq}`)) seq += 1;
    updateColumn(index, {
      options: [
        ...options,
        {
          id: `${columns[index].id ?? index}_opt_${seq}`,
          label: `选项${seq}`,
          value: `option_${seq}`,
        },
      ],
    });
  };

  return (
    <>
      <Divider style={{ margin: '4px 0' }} />
      <div>
        <Typography.Text>最多行数</Typography.Text>
        <InputNumber
          aria-label="最多行数"
          style={{ width: '100%' }}
          min={1}
          max={OA_FORM_LIMITS.maxTableRows}
          precision={0}
          value={field.maxRows}
          onChange={(value) => onChange({ maxRows: value ?? undefined })}
        />
      </div>
      <Typography.Text>明细列</Typography.Text>
      <Space direction="vertical" size={12} style={{ width: '100%' }}>
        {columns.map((column, index) => (
          <Card
            key={column.id ?? column.key}
            size="small"
            title={`第 ${index + 1} 列`}
            extra={
              <Button
                danger
                size="small"
                aria-label={`删除第 ${index + 1} 列`}
                icon={<DeleteOutlined />}
                onClick={() =>
                  onChange({
                    columns: columns.filter(
                      (_, columnIndex) => columnIndex !== index,
                    ),
                  })
                }
              />
            }
          >
            <Space direction="vertical" size={8} style={{ width: '100%' }}>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  aria-label={`第 ${index + 1} 列名称`}
                  value={column.label}
                  maxLength={100}
                  placeholder="列名称"
                  onChange={(event) =>
                    updateColumn(index, { label: event.target.value })
                  }
                />
                <Input
                  aria-label={`第 ${index + 1} 列 key`}
                  value={column.key}
                  maxLength={64}
                  placeholder="列 key"
                  onChange={(event) =>
                    updateColumn(index, { key: event.target.value })
                  }
                />
              </Space.Compact>
              <Space wrap>
                <Select<OaFormColumnType>
                  aria-label={`第 ${index + 1} 列类型`}
                  style={{ width: 120 }}
                  value={column.type}
                  options={OA_FORM_COLUMN_TYPES.map((item) => ({
                    value: item.type,
                    label: item.label,
                  }))}
                  onChange={(type) =>
                    updateColumn(index, {
                      type,
                      options:
                        type === 'radio' ? (column.options ?? []) : undefined,
                    })
                  }
                />
                <Typography.Text>必填</Typography.Text>
                <Switch
                  aria-label={`第 ${index + 1} 列必填`}
                  size="small"
                  checked={Boolean(column.required)}
                  onChange={(checked) =>
                    updateColumn(index, { required: checked })
                  }
                />
              </Space>
              {column.type === 'radio' ? (
                <Space direction="vertical" size={6} style={{ width: '100%' }}>
                  {(column.options ?? []).map((option, optionIndex) => (
                    <Space.Compact
                      key={option.id ?? option.value}
                      style={{ width: '100%' }}
                    >
                      <Input
                        aria-label={`第 ${index + 1} 列选项 ${optionIndex + 1} 名称`}
                        value={option.label}
                        placeholder="显示名称"
                        onChange={(event) =>
                          updateColumnOption(index, optionIndex, {
                            label: event.target.value,
                          })
                        }
                      />
                      <Input
                        aria-label={`第 ${index + 1} 列选项 ${optionIndex + 1} 值`}
                        value={option.value}
                        placeholder="存储值"
                        onChange={(event) =>
                          updateColumnOption(index, optionIndex, {
                            value: event.target.value,
                          })
                        }
                      />
                      <Button
                        danger
                        aria-label={`删除第 ${index + 1} 列选项 ${optionIndex + 1}`}
                        icon={<DeleteOutlined />}
                        onClick={() =>
                          updateColumn(index, {
                            options: (column.options ?? []).filter(
                              (_, current) => current !== optionIndex,
                            ),
                          })
                        }
                      />
                    </Space.Compact>
                  ))}
                  <Button
                    size="small"
                    icon={<PlusOutlined />}
                    aria-label={`第 ${index + 1} 列添加选项`}
                    onClick={() => addColumnOption(index)}
                  >
                    添加选项
                  </Button>
                </Space>
              ) : null}
            </Space>
          </Card>
        ))}
        <Button
          block
          icon={<PlusOutlined />}
          aria-label="添加列"
          disabled={columns.length >= OA_FORM_LIMITS.maxColumns}
          onClick={() =>
            onChange({ columns: [...columns, createOaFormColumn(columns)] })
          }
        >
          添加列
        </Button>
      </Space>
    </>
  );
};

interface FieldPropertiesProps {
  field: OaFormField;
  onChange: (patch: Partial<OaFormField>) => void;
  onRemove: () => void;
}

const FieldProperties: React.FC<FieldPropertiesProps> = ({
  field,
  onChange,
  onRemove,
}) => {
  const optionType = OA_FORM_OPTION_TYPES.has(field.type);
  const options = field.options ?? [];

  const updateOption = (
    index: number,
    patch: { label?: string; value?: string },
  ) => {
    onChange({
      options: options.map((option, optionIndex) =>
        optionIndex === index ? { ...option, ...patch } : option,
      ),
    });
  };

  const addOption = () => {
    const usedValues = new Set(options.map((option) => option.value));
    const usedIds = new Set(options.map((option) => option.id));
    let seq = options.length + 1;
    while (usedValues.has(`option_${seq}`)) seq += 1;
    let idSeq = options.length + 1;
    while (usedIds.has(`opt_${idSeq}`)) idSeq += 1;
    onChange({
      options: [
        ...options,
        {
          id: `opt_${idSeq}`,
          label: `选项${seq}`,
          value: `option_${seq}`,
        },
      ],
    });
  };

  return (
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space wrap>
        <Typography.Text strong>字段属性</Typography.Text>
        <Tag>{TYPE_LABELS[field.type]}</Tag>
      </Space>
      <div>
        <Typography.Text>字段名称</Typography.Text>
        <Input
          aria-label="字段名称"
          value={field.label}
          maxLength={100}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </div>
      <div>
        <Typography.Text>字段 key</Typography.Text>
        <Input
          aria-label="字段 key"
          value={field.key}
          maxLength={64}
          onChange={(event) => onChange({ key: event.target.value })}
        />
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          用于审批条件与数据存储，需以字母开头
        </Typography.Text>
      </div>
      <div>
        <Typography.Text>占位提示</Typography.Text>
        <Input
          aria-label="占位提示"
          value={field.placeholder ?? ''}
          maxLength={100}
          onChange={(event) =>
            onChange({ placeholder: event.target.value || undefined })
          }
        />
      </div>
      <Space>
        <Typography.Text>必填</Typography.Text>
        <Switch
          aria-label="必填"
          checked={Boolean(field.required)}
          onChange={(checked) =>
            onChange({
              required: checked,
              ...(checked ? { readonly: false, hidden: false } : {}),
            })
          }
        />
      </Space>
      <Space>
        <Typography.Text>只读</Typography.Text>
        <Switch
          aria-label="只读"
          checked={Boolean(field.readonly)}
          onChange={(checked) =>
            onChange({
              readonly: checked,
              ...(checked ? { required: false } : {}),
            })
          }
        />
      </Space>
      <Space>
        <Typography.Text>隐藏</Typography.Text>
        <Switch
          aria-label="隐藏"
          checked={Boolean(field.hidden)}
          onChange={(checked) =>
            onChange({
              hidden: checked,
              ...(checked ? { required: false } : {}),
            })
          }
        />
      </Space>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        只读字段由系统带入；隐藏字段不渲染、不参与填写校验。
      </Typography.Text>

      {optionType ? (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <Typography.Text>选项</Typography.Text>
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            {options.map((option, index) => (
              <Space.Compact
                key={option.id ?? option.value}
                style={{ width: '100%' }}
              >
                <Input
                  aria-label={`选项 ${index + 1} 名称`}
                  value={option.label}
                  placeholder="显示名称"
                  onChange={(event) =>
                    updateOption(index, { label: event.target.value })
                  }
                />
                <Input
                  aria-label={`选项 ${index + 1} 值`}
                  value={option.value}
                  placeholder="存储值"
                  onChange={(event) =>
                    updateOption(index, { value: event.target.value })
                  }
                />
                <Button
                  danger
                  aria-label={`删除选项 ${index + 1}`}
                  icon={<DeleteOutlined />}
                  onClick={() =>
                    onChange({
                      options: options.filter(
                        (_, optionIndex) => optionIndex !== index,
                      ),
                    })
                  }
                />
              </Space.Compact>
            ))}
            <Button
              block
              icon={<PlusOutlined />}
              onClick={addOption}
              aria-label="添加选项"
            >
              添加选项
            </Button>
          </Space>
        </>
      ) : null}

      {field.type === 'table' ? (
        <ColumnEditor field={field} onChange={onChange} />
      ) : null}

      <Divider style={{ margin: '4px 0' }} />
      <Button danger block icon={<DeleteOutlined />} onClick={onRemove}>
        删除字段
      </Button>
    </Space>
  );
};

interface OaFormPropertiesProps {
  field: OaFormField | null;
  formKey: string;
  name: string;
  description: string;
  onMetaChange: (patch: { name?: string; description?: string }) => void;
  onFieldChange: (patch: Partial<OaFormField>) => void;
  onRemoveField: () => void;
}

const OaFormProperties: React.FC<OaFormPropertiesProps> = ({
  field,
  formKey,
  name,
  description,
  onMetaChange,
  onFieldChange,
  onRemoveField,
}) => (
  <Card
    title="表单 / 字段属性"
    size="small"
    style={{ width: 340, flex: '0 0 340px', maxWidth: '100%' }}
  >
    <Space direction="vertical" size={12} style={{ width: '100%' }}>
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <Typography.Text strong>表单信息</Typography.Text>
        <div>
          <Typography.Text>表单标识</Typography.Text>
          <Input value={formKey} disabled aria-label="表单标识" />
        </div>
        <div>
          <Typography.Text>表单名称</Typography.Text>
          <Input
            aria-label="表单名称"
            value={name}
            maxLength={100}
            onChange={(event) => onMetaChange({ name: event.target.value })}
          />
        </div>
        <div>
          <Typography.Text>说明</Typography.Text>
          <Input.TextArea
            aria-label="表单说明"
            rows={2}
            maxLength={500}
            showCount
            value={description}
            onChange={(event) =>
              onMetaChange({ description: event.target.value })
            }
          />
        </div>
      </Space>
      {field ? (
        <>
          <Divider style={{ margin: '4px 0' }} />
          <FieldProperties
            field={field}
            onChange={onFieldChange}
            onRemove={onRemoveField}
          />
        </>
      ) : (
        <Typography.Text type="secondary">
          点击画布中的字段可编辑名称、key、必填、只读、隐藏与选项。
        </Typography.Text>
      )}
    </Space>
  </Card>
);

export default OaFormProperties;
