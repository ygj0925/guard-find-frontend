/**
 * OA 人员/岗位选择器：选项来自本租户数据，值分别使用员工 userId 与岗位 code。
 */
import { Select } from 'antd';
import type { CSSProperties } from 'react';
import { useEffect, useState } from 'react';
import {
  type OaEmployeeOptionVo,
  type OaPositionOptionVo,
  queryOaEmployeeOptions,
  queryOaPositionOptions,
} from '@/services/web/guardfind/oa';

interface StaffSelectProps {
  id?: string;
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: CSSProperties;
  allowClear?: boolean;
  ariaLabel?: string;
}

const EMPLOYEE_EMPTY = '暂无可选员工，请先在员工管理中建档';

function useEmployeeOptions() {
  const [options, setOptions] = useState<OaEmployeeOptionVo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    queryOaEmployeeOptions()
      .then((response) => {
        if (active) setOptions(response.data ?? []);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return {
    loading,
    options: options.map((option) => ({
      value: String(option.userId),
      label: employeeLabel(option),
    })),
  };
}

export function OaEmployeeSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder = '搜索姓名、账号或工号',
  style,
  allowClear,
  ariaLabel,
}: StaffSelectProps) {
  const { options, loading } = useEmployeeOptions();

  return (
    <Select<string>
      id={id}
      aria-label={ariaLabel}
      style={style ?? { width: '100%' }}
      showSearch
      allowClear={allowClear}
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      value={value || undefined}
      optionFilterProp="label"
      notFoundContent={loading ? '加载中…' : EMPLOYEE_EMPTY}
      options={options}
      onChange={(next) => onChange?.(next)}
    />
  );
}

interface EmployeeMultiSelectProps {
  value?: string[];
  onChange?: (value: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
  style?: CSSProperties;
  maxCount?: number;
  ariaLabel?: string;
}

export function OaEmployeeMultiSelect({
  value,
  onChange,
  disabled,
  placeholder = '搜索并选择员工',
  style,
  maxCount,
  ariaLabel,
}: EmployeeMultiSelectProps) {
  const { options, loading } = useEmployeeOptions();

  return (
    <Select<string[]>
      mode="multiple"
      aria-label={ariaLabel}
      style={style ?? { width: '100%' }}
      allowClear
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      value={value ?? []}
      maxCount={maxCount}
      optionFilterProp="label"
      notFoundContent={loading ? '加载中…' : EMPLOYEE_EMPTY}
      options={options}
      onChange={(next) => onChange?.(next)}
    />
  );
}

export function OaPositionSelect({
  id,
  value,
  onChange,
  disabled,
  placeholder = '搜索岗位编码或名称',
  style,
  allowClear,
  ariaLabel,
}: StaffSelectProps) {
  const [options, setOptions] = useState<OaPositionOptionVo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    queryOaPositionOptions()
      .then((response) => {
        if (active) setOptions(response.data ?? []);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <Select<string>
      id={id}
      aria-label={ariaLabel}
      style={style ?? { width: '100%' }}
      showSearch
      allowClear={allowClear}
      loading={loading}
      disabled={disabled}
      placeholder={placeholder}
      value={value || undefined}
      optionFilterProp="label"
      notFoundContent={
        loading ? '加载中…' : '暂无启用岗位，请先在岗位管理中维护'
      }
      options={options.map((option) => ({
        value: option.code,
        label: `${option.name}（${option.code}）`,
      }))}
      onChange={(next) => onChange?.(next)}
    />
  );
}

function employeeLabel(option: OaEmployeeOptionVo) {
  const parts = [option.nickname];
  if (option.deptName) parts.push(`· ${option.deptName}`);
  if (option.employeeNo) parts.push(`(${option.employeeNo})`);
  return parts.join(' ');
}
