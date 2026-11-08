/**
 * 通用表单渲染器：按不可变 schema 渲染可见字段并采集填写值。
 * 附件在 10.5 接入文件上传，提交前必须拿到服务端 fileId。
 */
import { UploadOutlined } from '@ant-design/icons';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  message,
  Radio,
  Space,
  Typography,
  Upload,
  type UploadFile,
  type UploadProps,
} from 'antd';
import type { Dayjs } from 'dayjs';
import React from 'react';
import { uploadFile } from '@/services/web/file';
import { OA_FORM_LIMITS, type OaFormField } from '@/utils/oaForm';

export interface OaFormRendererProps {
  fields: OaFormField[];
  values: Record<string, unknown>;
  errors?: Record<string, string>;
  onChange: (key: string, value: unknown) => void;
  disabled?: boolean;
}

function controlId(field: OaFormField) {
  return `oa-fill-${field.id || field.key}`;
}

function requiredMark(field: OaFormField) {
  return field.required ? (
    <Typography.Text type="danger" aria-label={`${field.label}必填`}>
      {' '}
      *
    </Typography.Text>
  ) : null;
}

const OaFormRenderer: React.FC<OaFormRendererProps> = ({
  fields,
  values,
  errors = {},
  onChange,
  disabled = false,
}) => {
  const visibleFields = fields.filter((field) => !field.hidden);
  if (visibleFields.length === 0) {
    return <Empty description="该版本没有可见字段" />;
  }

  const renderControl = (field: OaFormField) => {
    const fieldDisabled = disabled || Boolean(field.readonly);
    const value = values[field.key];
    const placeholder = field.placeholder || `请输入${field.label}`;
    const id = controlId(field);
    const update = (next: unknown) => onChange(field.key, next);

    switch (field.type) {
      case 'textarea':
        return (
          <Input.TextArea
            id={id}
            rows={3}
            aria-label={field.label}
            placeholder={placeholder}
            value={typeof value === 'string' ? value : ''}
            disabled={fieldDisabled}
            onChange={(event) => update(event.target.value)}
          />
        );
      case 'number':
        return (
          <InputNumber
            id={id}
            style={{ width: '100%' }}
            aria-label={field.label}
            placeholder={placeholder}
            value={typeof value === 'number' ? value : undefined}
            disabled={fieldDisabled}
            onChange={(next) => update(next ?? undefined)}
          />
        );
      case 'date':
        return (
          <DatePicker
            id={id}
            style={{ width: '100%' }}
            aria-label={field.label}
            placeholder={placeholder}
            value={(value ?? null) as Dayjs | null}
            disabled={fieldDisabled}
            onChange={(next) => update(next ?? undefined)}
          />
        );
      case 'radio':
        return (
          <Radio.Group
            id={id}
            aria-label={field.label}
            value={typeof value === 'string' ? value : undefined}
            disabled={fieldDisabled}
            onChange={(event) => update(event.target.value)}
            options={(field.options ?? []).map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
        );
      case 'checkbox':
        return (
          <Checkbox.Group
            aria-label={field.label}
            value={Array.isArray(value) ? (value as string[]) : []}
            disabled={fieldDisabled}
            onChange={(next) => update(next)}
            options={(field.options ?? []).map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
        );
      case 'attachment': {
        const customRequest: UploadProps['customRequest'] = async (options) => {
          const { file, onProgress, onSuccess: onUploaded, onError } = options;
          onProgress?.({ percent: 30 });
          try {
            const response = await uploadFile(file as File);
            onProgress?.({ percent: 100 });
            onUploaded?.(response.data);
          } catch (error) {
            onError?.(error as Error);
          }
        };
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Upload
              id={id}
              multiple
              customRequest={customRequest}
              fileList={Array.isArray(value) ? (value as UploadFile[]) : []}
              disabled={fieldDisabled}
              beforeUpload={(file) => {
                if (file.size > OA_FORM_LIMITS.maxAttachmentBytes) {
                  message.error(`「${file.name}」超过 10MB，请压缩后重新上传`);
                  return Upload.LIST_IGNORE;
                }
                return true;
              }}
              onChange={(info) => update(info.fileList)}
            >
              <Button icon={<UploadOutlined />} disabled={fieldDisabled}>
                选择文件
              </Button>
            </Upload>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              单个文件不超过 10MB，上传完成后才能提交。
            </Typography.Text>
          </Space>
        );
      }
      case 'person':
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Input
              id={id}
              inputMode="numeric"
              aria-label={field.label}
              placeholder="请输入员工 ID"
              value={typeof value === 'string' ? value : ''}
              disabled={fieldDisabled}
              onChange={(event) => update(event.target.value)}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              人员字段暂按员工 ID 填写，组织人员选择器待 10.1 接入。
            </Typography.Text>
          </Space>
        );
      default:
        return (
          <Input
            id={id}
            aria-label={field.label}
            placeholder={placeholder}
            value={typeof value === 'string' ? value : ''}
            disabled={fieldDisabled}
            onChange={(event) => update(event.target.value)}
          />
        );
    }
  };

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {visibleFields.map((field) => (
        <div key={field.id || field.key}>
          <div style={{ marginBottom: 6 }}>
            <Typography.Text>{field.label}</Typography.Text>
            {requiredMark(field)}
            {field.readonly ? (
              <Typography.Text type="secondary">（只读）</Typography.Text>
            ) : null}
          </div>
          {renderControl(field)}
          {errors[field.key] ? (
            <Typography.Text type="danger" role="alert">
              {errors[field.key]}
            </Typography.Text>
          ) : null}
        </div>
      ))}
    </Space>
  );
};

export default OaFormRenderer;
