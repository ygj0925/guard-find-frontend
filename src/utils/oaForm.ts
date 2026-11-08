/**
 * OA 表单 schema 的类型、默认值与前端预检。
 *
 * 与服务端 `OaFormSchemaValidator` 保持同一套约束；服务端仍是发布时的最终裁决方，
 * 这里的结果只用于设计期即时提示。
 */

export const OA_FORM_FIELD_TYPES = [
  { type: 'text', label: '单行文本', hint: '姓名、编号等短文本' },
  { type: 'textarea', label: '多行文本', hint: '事由、说明等长文本' },
  { type: 'number', label: '数字', hint: '金额、数量等数值' },
  { type: 'date', label: '日期', hint: '按天选择的日期' },
  { type: 'radio', label: '单选', hint: '一组选项中选一个' },
  { type: 'checkbox', label: '多选', hint: '一组选项中选多个' },
  { type: 'attachment', label: '附件', hint: '上传证明材料' },
  { type: 'person', label: '人员', hint: '选择组织内员工' },
  { type: 'table', label: '明细表', hint: '多行明细，如报销项目' },
] as const;

export type OaFormFieldType = (typeof OA_FORM_FIELD_TYPES)[number]['type'];

export const OA_FORM_FIELD_TYPE_SET = new Set<string>(
  OA_FORM_FIELD_TYPES.map((item) => item.type),
);

export const OA_FORM_OPTION_TYPES = new Set(['radio', 'checkbox']);

/** 明细表列只允许基础类型，与服务端 OaFormSchemaValidator.COLUMN_TYPES 一致 */
export const OA_FORM_COLUMN_TYPES = [
  { type: 'text', label: '单行文本' },
  { type: 'textarea', label: '多行文本' },
  { type: 'number', label: '数字' },
  { type: 'date', label: '日期' },
  { type: 'radio', label: '单选' },
] as const;

export type OaFormColumnType = (typeof OA_FORM_COLUMN_TYPES)[number]['type'];

const OA_FORM_COLUMN_TYPE_SET = new Set<string>(
  OA_FORM_COLUMN_TYPES.map((item) => item.type),
);

export const OA_FORM_LIMITS = {
  maxBytes: 1024 * 1024,
  maxFields: 100,
  maxOptions: 50,
  /** 与服务端 OaAttachmentService.MAX_ATTACHMENT_BYTES 一致 */
  maxAttachmentBytes: 10 * 1024 * 1024,
  maxColumns: 20,
  maxTableRows: 200,
  defaultTableRows: 50,
} as const;

export interface OaFormOption {
  /** 仅用于设计器列表渲染，不写入 schema */
  id?: string;
  label: string;
  value: string;
}

export interface OaFormColumn {
  /** 仅用于设计器列表渲染，不写入 schema */
  id?: string;
  key: string;
  label: string;
  type: OaFormColumnType;
  required?: boolean;
  options?: OaFormOption[];
}

export type OaFormTableRow = Record<string, unknown>;

export interface OaFormField {
  id: string;
  key: string;
  label: string;
  type: OaFormFieldType;
  required?: boolean;
  /** 只读字段由系统带入，填写人不可编辑 */
  readonly?: boolean;
  /** 隐藏字段不渲染、不参与必填校验 */
  hidden?: boolean;
  placeholder?: string;
  options?: OaFormOption[];
  columns?: OaFormColumn[];
  /** 明细表最多行数，缺省时服务端按 50 行限制 */
  maxRows?: number;
}

export interface OaFormSchema {
  version: number;
  fields: OaFormField[];
}

const FIELD_KEY = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const FIELD_ID = /^[A-Za-z0-9_-]{1,64}$/;

export function emptyOaFormSchema(): OaFormSchema {
  return { version: 1, fields: [] };
}

function parseOptions(options: unknown, idPrefix: string) {
  return Array.isArray(options)
    ? options.map((option, optionIndex) => ({
        id: String(option?.id ?? `${idPrefix}_${optionIndex}`),
        label: String(option?.label ?? ''),
        value: String(option?.value ?? ''),
      }))
    : undefined;
}

function serializeOptions(options?: OaFormOption[]) {
  return (options ?? []).map((option) => ({
    label: option.label,
    value: option.value,
  }));
}

export function parseOaFormSchema(json?: string | null): OaFormSchema {
  if (!json?.trim()) return emptyOaFormSchema();
  try {
    const parsed = JSON.parse(json);
    const fields = Array.isArray(parsed?.fields) ? parsed.fields : [];
    return {
      version: typeof parsed?.version === 'number' ? parsed.version : 1,
      fields: fields
        .filter((field: unknown) => field && typeof field === 'object')
        .map((field: Partial<OaFormField>, fieldIndex: number) => ({
          id: String(field.id ?? ''),
          key: String(field.key ?? ''),
          label: String(field.label ?? ''),
          type: (OA_FORM_FIELD_TYPE_SET.has(String(field.type))
            ? field.type
            : 'text') as OaFormFieldType,
          required: Boolean(field.required),
          readonly: Boolean(field.readonly),
          hidden: Boolean(field.hidden),
          placeholder: field.placeholder
            ? String(field.placeholder)
            : undefined,
          options: parseOptions(field.options, `opt_${fieldIndex}`),
          ...(field.type === 'table'
            ? {
                columns: (Array.isArray(field.columns) ? field.columns : [])
                  .filter((column) => column && typeof column === 'object')
                  .map((column, columnIndex) => ({
                    id: String(column.id ?? `col_${fieldIndex}_${columnIndex}`),
                    key: String(column.key ?? ''),
                    label: String(column.label ?? ''),
                    type: (OA_FORM_COLUMN_TYPE_SET.has(String(column.type))
                      ? column.type
                      : 'text') as OaFormColumnType,
                    required: Boolean(column.required),
                    options: parseOptions(
                      column.options,
                      `opt_${fieldIndex}_${columnIndex}`,
                    ),
                  })),
                maxRows:
                  typeof field.maxRows === 'number' ? field.maxRows : undefined,
              }
            : {}),
        })),
    };
  } catch {
    return emptyOaFormSchema();
  }
}

export function serializeOaFormSchema(schema: OaFormSchema): string {
  return JSON.stringify({
    version: schema.version || 1,
    fields: schema.fields.map((field) => ({
      id: field.id,
      key: field.key,
      label: field.label,
      type: field.type,
      required: Boolean(field.required),
      ...(field.readonly ? { readonly: true } : {}),
      ...(field.hidden ? { hidden: true } : {}),
      ...(field.placeholder ? { placeholder: field.placeholder } : {}),
      ...(OA_FORM_OPTION_TYPES.has(field.type)
        ? { options: serializeOptions(field.options) }
        : {}),
      ...(field.type === 'table'
        ? {
            ...(field.maxRows ? { maxRows: field.maxRows } : {}),
            columns: (field.columns ?? []).map((column) => ({
              key: column.key,
              label: column.label,
              type: column.type,
              required: Boolean(column.required),
              ...(column.type === 'radio'
                ? { options: serializeOptions(column.options) }
                : {}),
            })),
          }
        : {}),
    })),
  });
}

export function nextFieldIdentity(
  type: OaFormFieldType,
  fields: OaFormField[],
): { id: string; key: string } {
  const usedIds = new Set(fields.map((field) => field.id));
  const usedKeys = new Set(fields.map((field) => field.key));
  let seq = fields.length + 1;
  while (usedIds.has(`field_${seq}`)) seq += 1;
  const id = `field_${seq}`;
  let keySeq = seq;
  while (usedKeys.has(`${type}_${keySeq}`)) keySeq += 1;
  return { id, key: `${type}_${keySeq}` };
}

export function createOaFormField(
  type: OaFormFieldType,
  fields: OaFormField[],
): OaFormField {
  const identity = nextFieldIdentity(type, fields);
  const meta = OA_FORM_FIELD_TYPES.find((item) => item.type === type);
  return {
    ...identity,
    label: meta?.label ?? type,
    type,
    required: false,
    ...(OA_FORM_OPTION_TYPES.has(type)
      ? {
          options: [
            { id: 'opt_1', label: '选项一', value: 'option_1' },
            { id: 'opt_2', label: '选项二', value: 'option_2' },
          ],
        }
      : {}),
    ...(type === 'table'
      ? {
          maxRows: OA_FORM_LIMITS.defaultTableRows,
          columns: defaultTableColumns(),
        }
      : {}),
  };
}

function defaultTableColumns(): OaFormColumn[] {
  return [
    { id: 'col_1', key: 'item', label: '项目', type: 'text', required: true },
    {
      id: 'col_2',
      key: 'amount',
      label: '金额',
      type: 'number',
      required: false,
    },
  ];
}

export function createOaFormColumn(columns: OaFormColumn[]): OaFormColumn {
  const usedKeys = new Set(columns.map((column) => column.key));
  const usedIds = new Set(columns.map((column) => column.id));
  let seq = columns.length + 1;
  while (usedKeys.has(`col_${seq}`)) seq += 1;
  let idSeq = columns.length + 1;
  while (usedIds.has(`col_${idSeq}`)) idSeq += 1;
  return {
    id: `col_${idSeq}`,
    key: `col_${seq}`,
    label: `列${seq}`,
    type: 'text',
    required: false,
  };
}

function validateOptions(
  options: OaFormOption[] | undefined,
  prefix: string,
  errors: string[],
) {
  const items = options ?? [];
  if (!items.length) {
    errors.push(`${prefix}至少需要一个选项`);
  } else if (items.length > OA_FORM_LIMITS.maxOptions) {
    errors.push(`${prefix}的选项不能超过 ${OA_FORM_LIMITS.maxOptions} 个`);
  }
  const values = new Set<string>();
  items.forEach((option, optionIndex) => {
    const optionPrefix = `${prefix}第 ${optionIndex + 1} 个选项`;
    if (!option.label.trim()) errors.push(`${optionPrefix}缺少 label`);
    if (!option.value.trim()) {
      errors.push(`${optionPrefix}缺少 value`);
    } else if (values.has(option.value)) {
      errors.push(`${prefix}的选项值重复: ${option.value}`);
    } else {
      values.add(option.value);
    }
  });
}

function validateColumns(field: OaFormField, prefix: string, errors: string[]) {
  if (
    field.maxRows !== undefined &&
    (!Number.isInteger(field.maxRows) ||
      field.maxRows < 1 ||
      field.maxRows > OA_FORM_LIMITS.maxTableRows)
  ) {
    errors.push(
      `${prefix}的 maxRows 必须是 1~${OA_FORM_LIMITS.maxTableRows} 的整数`,
    );
  }
  const columns = field.columns ?? [];
  if (!columns.length) {
    errors.push(`${prefix}至少需要一列`);
    return;
  }
  if (columns.length > OA_FORM_LIMITS.maxColumns) {
    errors.push(`${prefix}的列不能超过 ${OA_FORM_LIMITS.maxColumns} 个`);
  }
  const keys = new Set<string>();
  columns.forEach((column, index) => {
    const columnPrefix = `${prefix}第 ${index + 1} 列`;
    if (!column.key) {
      errors.push(`${columnPrefix}缺少 key`);
    } else if (!FIELD_KEY.test(column.key)) {
      errors.push(
        `${columnPrefix}的 key 只能包含字母、数字和下划线，且以字母开头: ${column.key}`,
      );
    } else if (keys.has(column.key)) {
      errors.push(`${prefix}的列 key 重复: ${column.key}`);
    } else {
      keys.add(column.key);
    }
    if (!column.label.trim()) {
      errors.push(`${columnPrefix}缺少 label`);
    } else if (column.label.length > 100) {
      errors.push(`${columnPrefix}的 label 不能超过 100 个字符`);
    }
    if (!OA_FORM_COLUMN_TYPE_SET.has(column.type)) {
      errors.push(`${columnPrefix}的类型不支持: ${column.type || '(空)'}`);
    } else if (column.type === 'radio') {
      validateOptions(column.options, columnPrefix, errors);
    }
  });
}

export function validateOaFormSchema(
  schema: OaFormSchema,
  requireFields = false,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (schema.fields.length > OA_FORM_LIMITS.maxFields) {
    errors.push(`表单字段不能超过 ${OA_FORM_LIMITS.maxFields} 个`);
  }
  if (requireFields && schema.fields.length === 0) {
    errors.push('表单至少需要一个字段才能发布');
  }
  const keys = new Set<string>();
  const ids = new Set<string>();
  let visibleFields = 0;
  schema.fields.forEach((field, index) => {
    const prefix = `第 ${index + 1} 个字段`;
    if (field.id && !FIELD_ID.test(field.id)) {
      errors.push(`${prefix}的 id 只能包含字母、数字、下划线和中划线`);
    } else if (field.id && ids.has(field.id)) {
      errors.push(`字段 id 重复: ${field.id}`);
    }
    if (field.id) ids.add(field.id);

    if (!field.key) {
      errors.push(`${prefix}缺少 key`);
    } else if (!FIELD_KEY.test(field.key)) {
      errors.push(
        `${prefix}的 key 只能包含字母、数字和下划线，且以字母开头: ${field.key}`,
      );
    } else if (keys.has(field.key)) {
      errors.push(`字段 key 重复: ${field.key}`);
    } else {
      keys.add(field.key);
    }

    if (!field.label.trim()) {
      errors.push(`${prefix}缺少 label`);
    } else if (field.label.length > 100) {
      errors.push(`${prefix}的 label 不能超过 100 个字符`);
    }

    if (!OA_FORM_FIELD_TYPE_SET.has(field.type)) {
      errors.push(`${prefix}的类型不支持: ${field.type || '(空)'}`);
      return;
    }
    if (field.required && (field.readonly || field.hidden)) {
      errors.push(`${prefix}不能同时设为必填与只读/隐藏`);
    }
    if (!field.hidden) visibleFields += 1;
    if (OA_FORM_OPTION_TYPES.has(field.type)) {
      validateOptions(field.options, prefix, errors);
    }
    if (field.type === 'table') {
      validateColumns(field, prefix, errors);
    }
  });
  if (requireFields && schema.fields.length > 0 && visibleFields === 0) {
    errors.push('表单至少需要一个可见字段才能发布');
  }
  return { valid: errors.length === 0, errors };
}

export interface OaFormValueValidation {
  valid: boolean;
  errors: Record<string, string>;
}

/** 从 Upload 组件状态中取服务端文件 ID；上传未完成或失败时返回 undefined。 */
export function oaAttachmentFileId(file: {
  response?: unknown;
  fileId?: unknown;
}): string | undefined {
  const response = file.response as { id?: unknown } | undefined;
  const text = String(response?.id ?? file.fileId ?? '').trim();
  // 雪花 ID 超出 JS 安全整数范围，必须全程按字符串透传，避免精度丢失
  return /^[1-9]\d*$/.test(text) ? text : undefined;
}

function isEmptyValue(value: unknown) {
  if (Array.isArray(value)) return value.length === 0;
  return value === undefined || value === null || String(value).trim() === '';
}

/** 整行所有列均为空的明细行，提交时丢弃，不参与校验。 */
export function isBlankOaTableRow(
  columns: OaFormColumn[],
  row: unknown,
): boolean {
  if (!row || typeof row !== 'object') return true;
  const cells = row as OaFormTableRow;
  return columns.every((column) => isEmptyValue(cells[column.key]));
}

function tableError(field: OaFormField, value: unknown): string | undefined {
  const columns = field.columns ?? [];
  const rows = (Array.isArray(value) ? value : []).filter(
    (row) => !isBlankOaTableRow(columns, row),
  );
  if (!rows.length) {
    return field.required ? `请至少填写一行${field.label}` : undefined;
  }
  const maxRows = field.maxRows ?? OA_FORM_LIMITS.defaultTableRows;
  if (rows.length > maxRows) return `${field.label}不能超过 ${maxRows} 行`;
  for (let index = 0; index < rows.length; index += 1) {
    const cells = rows[index] as OaFormTableRow;
    for (const column of columns) {
      const prefix = `第 ${index + 1} 行`;
      const cell = cells[column.key];
      if (isEmptyValue(cell)) {
        if (column.required) {
          return `${prefix}${column.type === 'radio' ? '请选择' : '请填写'}${column.label}`;
        }
        continue;
      }
      if (
        column.type === 'number' &&
        (typeof cell !== 'number' || !Number.isFinite(cell))
      ) {
        return `${prefix}${column.label}请输入有效数字`;
      }
      if (
        column.type === 'radio' &&
        !(column.options ?? []).some((option) => option.value === cell)
      ) {
        return `${prefix}${column.label}请选择有效选项`;
      }
    }
  }
  return undefined;
}

/**
 * 填写校验只覆盖当前可见字段；只读字段由系统带入，不要求填写人补齐。
 * 提交与实例落库在 10.1 接入，本函数只做前端校验。
 */
export function validateOaFormValues(
  fields: OaFormField[],
  values: Record<string, unknown>,
): OaFormValueValidation {
  const errors: Record<string, string> = {};
  fields
    .filter((field) => !field.hidden)
    .forEach((field) => {
      if (field.readonly) return;
      const value = values[field.key];
      if (field.type === 'table') {
        const error = tableError(field, value);
        if (error) errors[field.key] = error;
        return;
      }
      if (field.required && isEmptyValue(value)) {
        errors[field.key] =
          field.type === 'checkbox' || field.type === 'attachment'
            ? `请选择或上传${field.label}`
            : `请填写${field.label}`;
        return;
      }
      if (isEmptyValue(value)) return;
      if (field.type === 'attachment') {
        const files = Array.isArray(value) ? value : [];
        if (
          files.some(
            (item) => (item as { status?: string })?.status === 'uploading',
          )
        ) {
          errors[field.key] = `请等待${field.label}上传完成`;
        } else if (
          files.some(
            (item) =>
              (item as { status?: string })?.status === 'error' ||
              !oaAttachmentFileId(item as { response?: unknown }),
          )
        ) {
          errors[field.key] = `${field.label}存在未完成的上传，请删除后重试`;
        }
        return;
      }
      if (field.type === 'number') {
        if (typeof value !== 'number' || !Number.isFinite(value)) {
          errors[field.key] = '请输入有效数字';
        }
        return;
      }
      if (field.type === 'radio') {
        const allowed = new Set(
          (field.options ?? []).map((item) => item.value),
        );
        if (typeof value !== 'string' || !allowed.has(value)) {
          errors[field.key] = '请选择有效选项';
        }
        return;
      }
      if (field.type === 'checkbox') {
        const allowed = new Set(
          (field.options ?? []).map((item) => item.value),
        );
        if (
          !Array.isArray(value) ||
          value.some((item) => !allowed.has(String(item)))
        ) {
          errors[field.key] = '请选择有效选项';
        }
        return;
      }
      if (field.type === 'person') {
        if (!/^[1-9]\d*$/.test(String(value).trim())) {
          errors[field.key] = '请输入有效的员工 ID';
        }
      }
    });
  return { valid: Object.keys(errors).length === 0, errors };
}
