/**
 * 结构化可发起范围编辑器：用户、部门、角色三组条件取并集，全部留空表示不限制。
 * 值以 JSON 字符串塞进发布表单，服务端发布时再做结构与上限校验。
 */
import { Select, Space, Typography } from 'antd';
import React from 'react';
import {
  numericIds,
  parseOaLaunchScope,
  serializeOaLaunchScope,
  stringValues,
} from '@/utils/oaLaunch';

export interface OaLaunchScopeEditorProps {
  value?: string;
  onChange?: (value?: string) => void;
  disabled?: boolean;
}

const OaLaunchScopeEditor: React.FC<OaLaunchScopeEditorProps> = ({
  value,
  onChange,
  disabled = false,
}) => {
  const scope = parseOaLaunchScope(value);
  const update = (next: Partial<typeof scope>) => {
    onChange?.(serializeOaLaunchScope({ ...scope, ...next }));
  };

  return (
    <Space direction="vertical" size={8} style={{ width: '100%' }}>
      <Select
        mode="tags"
        aria-label="可发起用户 ID"
        placeholder="用户 ID，可填多个"
        tokenSeparators={[',', '，', ' ']}
        disabled={disabled}
        value={scope.users.map(String)}
        onChange={(items) => update({ users: numericIds(items) })}
      />
      <Select
        mode="tags"
        aria-label="可发起部门 ID"
        placeholder="部门 ID，可填多个"
        tokenSeparators={[',', '，', ' ']}
        disabled={disabled}
        value={scope.depts.map(String)}
        onChange={(items) => update({ depts: numericIds(items) })}
      />
      <Select
        mode="tags"
        aria-label="可发起角色编码"
        placeholder="角色编码，可填多个"
        tokenSeparators={[',', '，', ' ']}
        disabled={disabled}
        value={scope.roles}
        onChange={(items) => update({ roles: stringValues(items) })}
      />
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        三组条件任一命中即可发起；全部留空表示所有员工都可发起。
      </Typography.Text>
    </Space>
  );
};

export default OaLaunchScopeEditor;
