import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  ModalForm,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { message } from 'antd';
import React, { useRef, useState } from 'react';
import type { SysUserVo } from '@/services/web/system';
import { role, user } from '@/services/web/system';
import { getTableScrollX } from '@/utils/tableLayout';

interface UserSelectProps {
  visible: boolean;
  roleId: number;
  onCancel: () => void;
  onSuccess?: () => void;
}

/**
 * 为角色挑选用户。
 *
 * 只查"尚未拥有该角色"的用户：后端 `UserQuery.roleId` 在 `buildQueryWrapper` 里是
 * `notIn(id, listUserIdByRoleId(roleId))`（排除语义），不是"按角色筛选"，
 * 所以这里不用再在客户端过滤已绑定用户。
 * 提交走 `POST /system/role/{id}/user`，body 是裸的用户 ID 数组。
 */
const UserSelect: React.FC<UserSelectProps> = ({
  visible,
  roleId,
  onCancel,
  onSuccess,
}) => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const { refreshAuthorization } = useModel('authorization');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const columns: ProColumns<SysUserVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.user.username' }),
      dataIndex: 'username',
      width: 140,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.nickname' }),
      dataIndex: 'nickname',
      width: 140,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.organization' }),
      dataIndex: 'deptName',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.phone' }),
      dataIndex: 'phone',
      width: 140,
      hideInSearch: true,
      copyable: true,
    },
  ];

  return (
    <ModalForm
      title={intl.formatMessage({ id: 'system.role.user.add' })}
      open={visible}
      width={800}
      modalProps={{ destroyOnHidden: true, onCancel }}
      submitTimeout={6000}
      submitter={{
        searchConfig: { submitText: '确定添加' },
        submitButtonProps: { disabled: selectedRowKeys.length === 0 },
      }}
      onFinish={async () => {
        await role.assignUsers(
          roleId,
          // React.Key 含 bigint；雪花 ID 在 FLEXIBLE 模式下是字符串，不能 Number() 转换（会丢精度）
          selectedRowKeys as unknown as (string | number)[],
        );
        await refreshAuthorization();
        message.success(intl.formatMessage({ id: 'common.operation.success' }));
        setSelectedRowKeys([]);
        onSuccess?.();
        return true;
      }}
    >
      <ProTable<SysUserVo>
        headerTitle={false}
        actionRef={actionRef}
        rowKey="id"
        size="small"
        columns={columns}
        scroll={{ x: getTableScrollX(columns, 64) }}
        options={false}
        search={{ labelWidth: 'auto' }}
        params={{ roleId }}
        rowSelection={{
          type: 'checkbox',
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
          preserveSelectedRowKeys: true,
        }}
        tableAlertOptionRender={() => [
          <a key="clear" onClick={() => setSelectedRowKeys([])}>
            取消选择
          </a>,
        ]}
        request={async ({ current, pageSize, ...rest }) => {
          const response = await user.query({
            page: current as number,
            size: pageSize as number,
            roleId,
            ...rest,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        pagination={{ defaultPageSize: 10, showSizeChanger: false }}
        toolBarRender={() => [
          <span key="tip" style={{ color: 'rgba(0,0,0,.45)' }}>
            <PlusOutlined /> 仅列出尚未拥有该角色的用户
          </span>,
        ]}
      />
    </ModalForm>
  );
};

export default UserSelect;
