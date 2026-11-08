/**
 * 发起流程的前端工具：可发起范围、一次性请求 ID、审批人绑定与表单提交值转换。
 * 服务端仍是范围、审批人与表单校验的最终裁决方。
 */
import type { UploadFile } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import type { OaAssigneeVariableVo } from '@/services/web/guardfind/oa';
import {
  isBlankOaTableRow,
  OA_FORM_OPTION_TYPES,
  type OaFormColumn,
  type OaFormField,
  type OaFormTableRow,
  oaAttachmentFileId,
} from '@/utils/oaForm';

export interface OaLaunchScopeValue {
  users: number[];
  depts: number[];
  roles: string[];
}

export const EMPTY_OA_LAUNCH_SCOPE: OaLaunchScopeValue = {
  users: [],
  depts: [],
  roles: [],
};

export const OA_ASSIGNEE_TYPE_OPTIONS = [
  { value: 'DEPT_LEADER', label: '部门负责人' },
  { value: 'SUPERVISOR', label: '直属主管' },
  { value: 'EMPLOYEE', label: '指定员工' },
  { value: 'POSITION', label: '岗位' },
  { value: 'FORM_FIELD', label: '表单人员字段' },
] as const;

const ASSIGNEE_TYPES = new Set<string>(
  OA_ASSIGNEE_TYPE_OPTIONS.map((item) => item.value),
);

export function parseOaLaunchScope(json?: string | null): OaLaunchScopeValue {
  if (!json?.trim()) return { ...EMPTY_OA_LAUNCH_SCOPE };
  try {
    const parsed = JSON.parse(json);
    return {
      users: numericIds(parsed?.users),
      depts: numericIds(parsed?.depts),
      roles: stringValues(parsed?.roles),
    };
  } catch {
    return { ...EMPTY_OA_LAUNCH_SCOPE };
  }
}

export function serializeOaLaunchScope(
  scope: OaLaunchScopeValue,
): string | undefined {
  const users = numericIds(scope.users);
  const depts = numericIds(scope.depts);
  const roles = stringValues(scope.roles);
  if (!users.length && !depts.length && !roles.length) return undefined;
  return JSON.stringify({ users, depts, roles });
}

export function numericIds(values: unknown): number[] {
  if (!Array.isArray(values)) return [];
  const ids = new Set<number>();
  values.forEach((value) => {
    const text = String(value ?? '').trim();
    if (/^[1-9]\d*$/.test(text)) {
      const id = Number(text);
      if (Number.isSafeInteger(id)) ids.add(id);
    }
  });
  return [...ids];
}

export function stringValues(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const items = new Set<string>();
  values.forEach((value) => {
    const text = String(value ?? '').trim();
    if (text) items.add(text);
  });
  return [...items];
}

export function buildOaRequestId() {
  const uuid = globalThis.crypto?.randomUUID?.();
  if (uuid) return uuid;
  return `oa-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`.slice(
    0,
    64,
  );
}

export function oaPersonFieldOptions(fields: OaFormField[]) {
  return fields
    .filter(
      (field) => field.type === 'person' && !field.hidden && !field.readonly,
    )
    .map((field) => ({
      value: field.key,
      label: `${field.label}（${field.key}）`,
    }));
}

export function normalizeAssigneeType(type?: string | null) {
  const normalized = String(type ?? '')
    .trim()
    .toUpperCase();
  return ASSIGNEE_TYPES.has(normalized) ? normalized : undefined;
}

export function toOaSubmitFormData(
  fields: OaFormField[],
  values: Record<string, unknown>,
) {
  const formData: Record<string, unknown> = {};
  fields
    .filter((field) => !field.hidden && !field.readonly)
    .forEach((field) => {
      const value = values[field.key];
      if (value === undefined || value === null || value === '') return;
      if (Array.isArray(value) && value.length === 0) return;
      switch (field.type) {
        case 'date': {
          const date = value as Dayjs;
          if (typeof date?.format === 'function') {
            formData[field.key] = date.format('YYYY-MM-DD');
          }
          break;
        }
        case 'attachment': {
          const files = (value as UploadFile[]).flatMap((file) => {
            const fileId = oaAttachmentFileId(file);
            return fileId ? [{ uid: file.uid, name: file.name, fileId }] : [];
          });
          if (files.length) formData[field.key] = files;
          break;
        }
        case 'person':
          formData[field.key] = String(value).trim();
          break;
        case 'checkbox':
          formData[field.key] = (Array.isArray(value) ? value : [value]).map(
            String,
          );
          break;
        case 'table': {
          const rows = toOaSubmitTableRows(field, value);
          if (rows.length) formData[field.key] = rows;
          break;
        }
        default:
          formData[field.key] = value;
      }
    });
  return formData;
}

function toOaSubmitTableRows(field: OaFormField, value: unknown) {
  if (!Array.isArray(value)) return [];
  const columns = field.columns ?? [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as OaFormTableRow;
    if (isBlankOaTableRow(columns, row)) return [];
    const cells: OaFormTableRow = {};
    columns.forEach((column) => {
      const cell = row[column.key];
      if (cell === undefined || cell === null) return;
      if (typeof cell === 'string' && !cell.trim()) return;
      if (column.type === 'date') {
        const date = cell as Dayjs;
        if (typeof date?.format === 'function') {
          cells[column.key] = date.format('YYYY-MM-DD');
        }
        return;
      }
      cells[column.key] = cell;
    });
    return [cells];
  });
}

function fromOaSubmitTableRows(field: OaFormField, value: unknown) {
  if (!Array.isArray(value)) return [];
  const columns = field.columns ?? [];
  return value.flatMap((item) => {
    if (!item || typeof item !== 'object') return [];
    const row = item as OaFormTableRow;
    const cells: OaFormTableRow = {};
    columns.forEach((column) => {
      const cell = row[column.key];
      if (cell === undefined || cell === null || cell === '') return;
      if (column.type === 'date') {
        const date = dayjs(String(cell));
        if (date.isValid()) cells[column.key] = date;
        return;
      }
      if (column.type === 'number') {
        const amount = Number(cell);
        if (Number.isFinite(amount)) cells[column.key] = amount;
        return;
      }
      cells[column.key] = String(cell);
    });
    return [cells];
  });
}

/** toOaSubmitFormData 的逆转换：把草稿里的提交值还原为渲染器的受控值。 */
export function fromOaSubmitFormData(
  fields: OaFormField[],
  formData?: Record<string, unknown> | null,
) {
  const values: Record<string, unknown> = {};
  if (!formData) return values;
  fields
    .filter((field) => !field.hidden && !field.readonly)
    .forEach((field) => {
      const value = formData[field.key];
      if (value === undefined || value === null || value === '') return;
      switch (field.type) {
        case 'date': {
          const date = dayjs(String(value));
          if (date.isValid()) values[field.key] = date;
          break;
        }
        case 'attachment': {
          if (!Array.isArray(value)) break;
          const files: UploadFile[] = value.flatMap((item, index) => {
            if (!item || typeof item !== 'object') return [];
            const file = item as { uid?: unknown; name?: unknown };
            const fileId = oaAttachmentFileId(item as { fileId?: unknown });
            if (!fileId) return [];
            return [
              {
                uid: String(file.uid ?? `draft-${fileId}-${index}`),
                name: String(file.name ?? '附件'),
                status: 'done',
                fileId,
              } as UploadFile & { fileId: string },
            ];
          });
          if (files.length) values[field.key] = files;
          break;
        }
        case 'person':
          values[field.key] = String(value);
          break;
        case 'checkbox':
          values[field.key] = (Array.isArray(value) ? value : [value]).map(
            String,
          );
          break;
        case 'table': {
          const rows = fromOaSubmitTableRows(field, value);
          if (rows.length) values[field.key] = rows;
          break;
        }
        default:
          values[field.key] = value;
      }
    });
  return values;
}

/** 明细单元格的展示文本：单选列显示选项名称。 */
export function formatOaTableCell(column: OaFormColumn, value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (column.type === 'radio') {
    const option = column.options?.find((item) => item.value === String(value));
    return option?.label ?? String(value);
  }
  return String(value);
}

export function formatOaFormValue(field: OaFormField, value: unknown) {
  if (value === undefined || value === null || value === '') return '—';
  if (field.type === 'table' && Array.isArray(value)) {
    if (!value.length) return '—';
    const columns = field.columns ?? [];
    return value
      .map((row, index) => {
        const cells = columns
          .map((column) => {
            const cell = (row as OaFormTableRow | null)?.[column.key];
            return `${column.label}：${formatOaTableCell(column, cell)}`;
          })
          .join('，');
        return `第 ${index + 1} 行 ${cells}`;
      })
      .join('；');
  }
  if (field.type === 'attachment' && Array.isArray(value)) {
    const names = value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const file = item as { name?: unknown; url?: unknown };
        return String(file.name ?? file.url ?? '附件');
      }
      return String(item);
    });
    return names.length ? names.join('、') : '—';
  }
  if (OA_FORM_OPTION_TYPES.has(field.type) && field.options?.length) {
    const label = (item: unknown) =>
      field.options?.find((option) => option.value === String(item))?.label ??
      String(item);
    if (Array.isArray(value)) {
      return value.length ? value.map(label).join('、') : '—';
    }
    return label(value);
  }
  if (Array.isArray(value)) {
    return value.length ? value.map(String).join('、') : '—';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

export function validateAssigneeBindings(
  variables: OaAssigneeVariableVo[],
  bindings: Record<string, { type?: string; value?: string }>,
) {
  const errors: Record<string, string> = {};
  variables.forEach((variable) => {
    const binding = bindings[variable.name] ?? {};
    const type = normalizeAssigneeType(binding.type);
    if (!type) {
      errors[variable.name] = '请选择审批人来源';
      return;
    }
    if (
      (type === 'EMPLOYEE' || type === 'POSITION' || type === 'FORM_FIELD') &&
      !binding.value?.trim()
    ) {
      errors[variable.name] =
        type === 'EMPLOYEE'
          ? '请输入员工 ID'
          : type === 'POSITION'
            ? '请输入岗位编码'
            : '请选择表单人员字段';
    }
  });
  return errors;
}
