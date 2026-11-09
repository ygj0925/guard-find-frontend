import { UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Card,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  Radio,
  Select,
  Space,
  Table,
  Typography,
  Upload,
} from 'antd';
import React from 'react';
import type { OaFormField } from '@/utils/oaForm';

interface OaFormPreviewProps {
  fields: OaFormField[];
}

function requiredMark(field: OaFormField) {
  return field.required ? (
    <Typography.Text type="danger" aria-label={`${field.label}必填`}>
      {' '}
      *
    </Typography.Text>
  ) : null;
}

function PreviewControl({
  field,
  disabled,
}: {
  field: OaFormField;
  disabled?: boolean;
}) {
  const placeholder = field.placeholder || `请输入${field.label}`;
  switch (field.type) {
    case 'textarea':
      return (
        <Input.TextArea
          rows={3}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={field.label}
        />
      );
    case 'date':
      return (
        <DatePicker
          style={{ width: '100%' }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={field.label}
        />
      );
    case 'datetime':
      return (
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="YYYY-MM-DD HH:mm"
          style={{ width: '100%' }}
          placeholder={placeholder}
          disabled={disabled}
          aria-label={field.label}
        />
      );
    case 'radio':
      return (
        <Radio.Group
          disabled={disabled}
          options={(field.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );
    case 'checkbox':
      return (
        <Checkbox.Group
          disabled={disabled}
          options={(field.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );
    case 'attachment':
      return (
        <Upload
          beforeUpload={() => false}
          showUploadList={false}
          disabled={disabled}
        >
          <Button icon={<UploadOutlined />} disabled={disabled}>
            选择文件
          </Button>
        </Upload>
      );
    case 'person':
      return (
        <Select
          showSearch
          disabled={disabled}
          style={{ width: '100%' }}
          placeholder={placeholder}
          options={[]}
          notFoundContent="组织人员接入后可搜索"
          aria-label={field.label}
        />
      );
    case 'table':
      return (
        <Table
          size="small"
          bordered
          pagination={false}
          rowKey="key"
          dataSource={[]}
          aria-label={field.label}
          locale={{ emptyText: `填写时可添加最多 ${field.maxRows ?? 50} 行` }}
          scroll={{ x: true }}
          columns={(field.columns ?? []).map((column) => ({
            key: column.key,
            dataIndex: column.key,
            title: column.required ? `${column.label} *` : column.label,
          }))}
        />
      );
    default:
      return (
        <Input
          placeholder={placeholder}
          disabled={disabled}
          aria-label={field.label}
        />
      );
  }
}

const OaFormPreview: React.FC<OaFormPreviewProps> = ({ fields }) => {
  const visibleFields = fields.filter((field) => !field.hidden);
  const hiddenCount = fields.length - visibleFields.length;
  return (
    <Card title="实时预览" size="small" styles={{ body: { minHeight: 360 } }}>
      {visibleFields.length === 0 ? (
        <Empty
          description={
            fields.length === 0 ? '添加字段后在此预览' : '所有字段均已隐藏'
          }
        />
      ) : (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {hiddenCount > 0 ? (
            <Typography.Text type="secondary">
              另有 {hiddenCount} 个隐藏字段不在此显示
            </Typography.Text>
          ) : null}
          {visibleFields.map((field) => (
            <div key={field.id}>
              <div style={{ marginBottom: 6 }}>
                <Typography.Text>{field.label}</Typography.Text>
                {requiredMark(field)}
                {field.readonly ? (
                  <Typography.Text type="secondary"> （只读）</Typography.Text>
                ) : null}
              </div>
              <PreviewControl field={field} disabled={field.readonly} />
            </div>
          ))}
        </Space>
      )}
    </Card>
  );
};

export default OaFormPreview;
