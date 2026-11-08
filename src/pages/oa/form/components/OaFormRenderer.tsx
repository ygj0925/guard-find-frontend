/**
 * 通用表单渲染器：按不可变 schema 渲染可见字段并采集填写值。
 * 附件在 10.5 接入文件上传，提交前必须拿到服务端 fileId。
 */
import {
  DeleteOutlined,
  PlusOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import {
  Button,
  Checkbox,
  DatePicker,
  Empty,
  Input,
  InputNumber,
  message,
  Radio,
  Select,
  Space,
  Table,
  Typography,
  Upload,
  type UploadFile,
  type UploadProps,
} from 'antd';
import type { Dayjs } from 'dayjs';
import React from 'react';
import { OaEmployeeSelect } from '@/pages/oa/components/OaStaffSelects';
import { uploadOaAttachment } from '@/services/web/guardfind/oa';
import {
  OA_FORM_LIMITS,
  type OaFormColumn,
  type OaFormField,
  type OaFormTableRow,
} from '@/utils/oaForm';

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

let tableRowSeq = 0;

function nextRowKey() {
  tableRowSeq += 1;
  return `row_${tableRowSeq}`;
}

interface OaTableInputProps {
  field: OaFormField;
  value: unknown;
  disabled: boolean;
  onChange: (rows: OaFormTableRow[]) => void;
}

const OaTableInput: React.FC<OaTableInputProps> = ({
  field,
  value,
  disabled,
  onChange,
}) => {
  const rows = Array.isArray(value) ? (value as OaFormTableRow[]) : [];
  const columns = field.columns ?? [];
  const maxRows = field.maxRows ?? OA_FORM_LIMITS.defaultTableRows;
  // 行 key 只在前端使用，用 WeakMap 挂在行对象上避免写入提交值。
  const keys = React.useRef(new WeakMap<OaFormTableRow, string>());
  const rowKey = (row: OaFormTableRow) => {
    let key = keys.current.get(row);
    if (!key) {
      key = nextRowKey();
      keys.current.set(row, key);
    }
    return key;
  };

  const updateCell = (rowIndex: number, columnKey: string, next: unknown) => {
    const current = rows[rowIndex];
    const updated = { ...current, [columnKey]: next };
    keys.current.set(updated, rowKey(current));
    onChange(rows.map((row, index) => (index === rowIndex ? updated : row)));
  };

  const renderCell = (
    column: OaFormColumn,
    row: OaFormTableRow,
    rowIndex: number,
  ) => {
    const cell = row[column.key];
    const label = `${field.label}第 ${rowIndex + 1} 行${column.label}`;
    const set = (next: unknown) => updateCell(rowIndex, column.key, next);
    switch (column.type) {
      case 'textarea':
        return (
          <Input.TextArea
            aria-label={label}
            autoSize={{ minRows: 1, maxRows: 4 }}
            value={typeof cell === 'string' ? cell : ''}
            disabled={disabled}
            onChange={(event) => set(event.target.value)}
          />
        );
      case 'number':
        return (
          <InputNumber
            aria-label={label}
            style={{ width: '100%' }}
            value={typeof cell === 'number' ? cell : undefined}
            disabled={disabled}
            onChange={(next) => set(next ?? undefined)}
          />
        );
      case 'date':
        return (
          <DatePicker
            aria-label={label}
            style={{ width: '100%' }}
            value={(cell ?? null) as Dayjs | null}
            disabled={disabled}
            onChange={(next) => set(next ?? undefined)}
          />
        );
      case 'radio':
        return (
          <Select
            aria-label={label}
            style={{ width: '100%' }}
            allowClear
            value={typeof cell === 'string' ? cell : undefined}
            disabled={disabled}
            onChange={(next) => set(next ?? undefined)}
            options={(column.options ?? []).map((option) => ({
              label: option.label,
              value: option.value,
            }))}
          />
        );
      default:
        return (
          <Input
            aria-label={label}
            value={typeof cell === 'string' ? cell : ''}
            disabled={disabled}
            onChange={(event) => set(event.target.value)}
          />
        );
    }
  };

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Table<OaFormTableRow>
        size="small"
        bordered
        pagination={false}
        scroll={{ x: true }}
        rowKey={rowKey}
        dataSource={rows}
        locale={{ emptyText: '暂无明细，点击下方添加一行' }}
        columns={[
          {
            key: '__index',
            title: '#',
            width: 48,
            render: (_, __, index) => index + 1,
          },
          ...columns.map((column) => ({
            key: column.key,
            title: (
              <span>
                {column.label}
                {column.required ? (
                  <Typography.Text type="danger"> *</Typography.Text>
                ) : null}
              </span>
            ),
            width: column.type === 'textarea' ? 220 : 160,
            render: (_: unknown, row: OaFormTableRow, index: number) =>
              renderCell(column, row, index),
          })),
          {
            key: '__actions',
            title: '操作',
            width: 64,
            render: (_, __, index) => (
              <Button
                danger
                type="text"
                aria-label={`删除${field.label}第 ${index + 1} 行`}
                icon={<DeleteOutlined />}
                disabled={disabled}
                onClick={() =>
                  onChange(rows.filter((_, current) => current !== index))
                }
              />
            ),
          },
        ]}
      />
      <Button
        icon={<PlusOutlined />}
        disabled={disabled || rows.length >= maxRows}
        aria-label={`添加${field.label}行`}
        onClick={() => onChange([...rows, {}])}
      >
        添加一行
      </Button>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        最多 {maxRows} 行，整行留空的明细不会提交。
      </Typography.Text>
    </Space>
  );
};

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
            const response = await uploadOaAttachment(file as File);
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
            <OaEmployeeSelect
              id={id}
              ariaLabel={field.label}
              value={typeof value === 'string' ? value : ''}
              disabled={fieldDisabled}
              onChange={(next) => update(next ?? '')}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              从本租户在职员工中选择；找不到请先在员工管理中建档。
            </Typography.Text>
          </Space>
        );
      case 'table':
        return (
          <OaTableInput
            field={field}
            value={value}
            disabled={fieldDisabled}
            onChange={update}
          />
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
