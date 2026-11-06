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

function PreviewControl({ field }: { field: OaFormField }) {
  const placeholder = field.placeholder || `请输入${field.label}`;
  switch (field.type) {
    case 'textarea':
      return <Input.TextArea rows={3} placeholder={placeholder} />;
    case 'number':
      return (
        <InputNumber
          style={{ width: '100%' }}
          placeholder={placeholder}
          aria-label={field.label}
        />
      );
    case 'date':
      return (
        <DatePicker
          style={{ width: '100%' }}
          placeholder={placeholder}
          aria-label={field.label}
        />
      );
    case 'radio':
      return (
        <Radio.Group
          options={(field.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );
    case 'checkbox':
      return (
        <Checkbox.Group
          options={(field.options ?? []).map((option) => ({
            label: option.label,
            value: option.value,
          }))}
        />
      );
    case 'attachment':
      return (
        <Upload beforeUpload={() => false} showUploadList={false}>
          <Button icon={<UploadOutlined />}>选择文件</Button>
        </Upload>
      );
    case 'person':
      return (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder={placeholder}
          options={[]}
          notFoundContent="组织人员接入后可搜索"
          aria-label={field.label}
        />
      );
    default:
      return <Input placeholder={placeholder} aria-label={field.label} />;
  }
}

const OaFormPreview: React.FC<OaFormPreviewProps> = ({ fields }) => (
  <Card title="实时预览" size="small" styles={{ body: { minHeight: 360 } }}>
    {fields.length === 0 ? (
      <Empty description="添加字段后在此预览" />
    ) : (
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        {fields.map((field) => (
          <div key={field.id}>
            <div style={{ marginBottom: 6 }}>
              <Typography.Text>{field.label}</Typography.Text>
              {requiredMark(field)}
            </div>
            <PreviewControl field={field} />
          </div>
        ))}
      </Space>
    )}
  </Card>
);

export default OaFormPreview;
