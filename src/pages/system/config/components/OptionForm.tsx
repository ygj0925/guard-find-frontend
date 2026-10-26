import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Alert, message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { request } from 'umi';
import { useAccess } from '@/hooks/useAccess';
import type { OptionCategory } from '@/services/web/system';
import { getOptionPermission } from '@/utils/optionAccess';

/**
 * 系统参数表单（后端 `/system/option`）。
 *
 * 契约要点：
 * - `category` 必须传后端 `OptionCategoryEnum` 的枚举名（`SITE`/`PASSWORD`/`MAIL`/`LOGIN`），
 *   小写会被 `@EnumValue` 判为"类别无效"
 * - 查询返回 `OptionResp[]`，取值以 `code` 为键；`value` 可能为 `null`，
 *   此时展示/回写的基准是 `defaultValue`
 * - 保存是 `PUT /system/option`，body 为 `[{ id, code, value }]`（后端形参 `List<OptionReq>`），
 *   不是键值对象；参数项不支持界面新增/删除
 */

export interface OptionField {
  /** 后端 sys_option.code */
  code: string;
  /** 缺省时用后端返回的 name */
  label?: string;
  type?: 'text' | 'password' | 'textarea' | 'number';
}

interface Props {
  category: OptionCategory;
  fields: OptionField[];
}

interface OptionRow {
  id: number;
  name?: string;
  code: string;
  value?: string | null;
  defaultValue?: string | null;
  description?: string;
}

const OptionForm: React.FC<Props> = ({ category, fields }) => {
  const { hasPermission } = useAccess();
  const canRead = hasPermission(getOptionPermission(category, 'get'));
  const canUpdate = hasPermission(getOptionPermission(category, 'update'));
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<OptionRow[]>([]);

  useEffect(() => {
    if (!canRead) {
      setRows([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    request('system/option', { method: 'GET', params: { category } })
      .then((res: { data?: OptionRow[] }) => {
        if (cancelled) return;
        setRows(Array.isArray(res?.data) ? res.data : []);
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [category, canRead]);

  const rowByCode = new Map(rows.map((row) => [row.code, row]));
  const missing = fields
    .map((f) => f.code)
    .filter((code) => !rowByCode.has(code));

  const initialValues: Record<string, string> = {};
  for (const field of fields) {
    const row = rowByCode.get(field.code);
    if (!row) continue;
    initialValues[field.code] = String(row.value ?? row.defaultValue ?? '');
  }

  const handleSubmit = async (values: Record<string, string>) => {
    if (!canUpdate) return false;
    const payload = fields
      .map((field) => {
        const row = rowByCode.get(field.code);
        if (!row) return undefined;
        return { id: row.id, code: row.code, value: values[field.code] ?? '' };
      })
      .filter(Boolean);
    await request('system/option', { method: 'PUT', data: payload });
    message.success('保存成功');
    return true;
  };

  if (!canRead) return null;
  if (loading) return <Spin />;

  return (
    <>
      {missing.length > 0 && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message={`后端未返回以下参数：${missing.join('、')}`}
          description="参数由后端数据库 sys_option 种子数据维护，界面不能新增。"
        />
      )}
      <ProForm
        key={category}
        initialValues={initialValues}
        onFinish={handleSubmit}
        disabled={!canUpdate}
        submitter={{ submitButtonProps: { disabled: !canUpdate } }}
        layout="horizontal"
        labelCol={{ span: 6 }}
        wrapperCol={{ span: 14 }}
      >
        {fields.map((field) => {
          const label =
            field.label || rowByCode.get(field.code)?.name || field.code;
          if (field.type === 'textarea') {
            return (
              <ProFormTextArea
                key={field.code}
                label={label}
                name={field.code}
              />
            );
          }
          if (field.type === 'password') {
            return (
              <ProFormText.Password
                key={field.code}
                label={label}
                name={field.code}
              />
            );
          }
          return (
            <ProFormText key={field.code} label={label} name={field.code} />
          );
        })}
      </ProForm>
    </>
  );
};

export default OptionForm;
