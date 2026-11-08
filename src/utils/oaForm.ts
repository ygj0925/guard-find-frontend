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
] as const;

export type OaFormFieldType = (typeof OA_FORM_FIELD_TYPES)[number]['type'];

export const OA_FORM_FIELD_TYPE_SET = new Set<string>(
  OA_FORM_FIELD_TYPES.map((item) => item.type),
);

export const OA_FORM_OPTION_TYPES = new Set(['radio', 'checkbox']);

export const OA_FORM_LIMITS = {
  maxBytes: 1024 * 1024,
  maxFields: 100,
  maxOptions: 50,
  /** 与服务端 OaAttachmentService.MAX_ATTACHMENT_BYTES 一致 */
  maxAttachmentBytes: 10 * 1024 * 1024,
} as const;

export interface OaFormOption {
  /** 仅用于设计器列表渲染，不写入 schema */
  id?: string;
  label: string;
  value: string;
}

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
          options: Array.isArray(field.options)
            ? field.options.map((option, optionIndex) => ({
                id: String(option?.id ?? `opt_${fieldIndex}_${optionIndex}`),
                label: String(option?.label ?? ''),
                value: String(option?.value ?? ''),
              }))
            : undefined,
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
        ? {
            options: (field.options ?? []).map((option) => ({
              label: option.label,
              value: option.value,
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
  };
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
      const options = field.options ?? [];
      if (!options.length) {
        errors.push(`${prefix}至少需要一个选项`);
      } else if (options.length > OA_FORM_LIMITS.maxOptions) {
        errors.push(`${prefix}的选项不能超过 ${OA_FORM_LIMITS.maxOptions} 个`);
      }
      const values = new Set<string>();
      options.forEach((option, optionIndex) => {
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
