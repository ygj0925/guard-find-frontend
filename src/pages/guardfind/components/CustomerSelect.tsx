import { message, Select } from 'antd';
import { useEffect, useRef, useState } from 'react';
import {
  type Customer,
  customerOptions,
} from '@/services/web/guardfind/operations';
export default function CustomerSelect({
  id,
  value,
  onChange,
  managers = false,
  disabled = false,
}: {
  id?: string;
  value?: string;
  onChange?: (value?: string) => void;
  managers?: boolean;
  disabled?: boolean;
}) {
  const [options, setOptions] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const version = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(
    () => () => {
      version.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  const search = (keyword: string) => {
    clearTimeout(timer.current);
    const seq = ++version.current;
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await customerOptions(keyword, managers);
        if (seq === version.current) setOptions(result.data.list);
      } catch {
        if (seq === version.current) message.error('用户搜索失败，请重试');
      } finally {
        if (seq === version.current) setLoading(false);
      }
    }, 250);
  };
  return (
    <Select
      id={id}
      showSearch
      allowClear
      value={value}
      disabled={disabled}
      loading={loading}
      filterOption={false}
      placeholder={
        managers ? '搜索服务管家的昵称或 ID' : '搜索小程序用户昵称或 ID'
      }
      onSearch={search}
      onFocus={() => search('')}
      onChange={onChange}
      options={options.map((u) => ({
        value: u.id,
        label: `${u.nickname || '用户'} · ${u.id}${u.accountStatus === 1 ? '' : ' · 已停用'}`,
        disabled: u.accountStatus !== 1,
      }))}
    />
  );
}
