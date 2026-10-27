import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { Button, Modal, message, Popconfirm, Space } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysRoleBindVo } from '@/services/web/system';
import { role } from '@/services/web/system';
import { getTableScrollX } from '@/utils/tableLayout';
import UserSelect from './UserSelect';

interface UserBindProps {
  visible: boolean;
  roleId: number;
  onCancel: () => void;
}

/**
 * 角色的用户绑定。
 *
 * 列表 `GET /system/role/{id}/user`（`RoleUserQuery.description` 为关键词）；
 * 解绑 `DELETE /system/role/user`，body 是**裸数组**且元素是 `sys_user_role.id`
 * （后端 `userRoleService.deleteByIds`），也就是列表行的 `record.id` 而不是 `userId`。
 */
const UserBind: React.FC<UserBindProps> = ({ visible, roleId, onCancel }) => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const { refreshAuthorization } = useModel('authorization');
  const [selectVisible, setSelectVisible] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const reload = () => actionRef.current?.reload();

  const handleUnbind = async (record: SysRoleBindVo) => {
    await role.unbindUser(record.id);
    await refreshAuthorization();
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
    setSelectedRowKeys((keys) => keys.filter((key) => key !== record.id));
    reload();
  };

  const handleBatchUnbind = async () => {
    await role.unbindUsers(selectedRowKeys as number[]);
    await refreshAuthorization();
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
    setSelectedRowKeys([]);
    reload();
  };

  const columns: ProColumns<SysRoleBindVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.user.username' }),
      dataIndex: 'username',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      // 后端 RoleUserQuery 只有一个关键词字段 description（匹配账号/昵称/备注）
      title: '关键词',
      dataIndex: 'description',
      hideInTable: true,
      fieldProps: { placeholder: '请输入用户名/昵称/备注' },
    },
    {
      title: intl.formatMessage({ id: 'system.user.nickname' }),
      dataIndex: 'nickname',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.organization' }),
      dataIndex: 'deptName',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) =>
        record.status === 1 ? '正常' : record.status === 2 ? '禁用' : '-',
    },
    {
      title: intl.formatMessage({ id: 'common.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 120,
      render: (_, record) => (
        <Space wrap>
          {/* 内置角色（如超级管理员）不允许解绑用户，后端会拒 */}
          <AccessControl
            permission="system:role:unassign"
            disabledTip="没有取消分配的权限"
          >
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              onConfirm={() => handleUnbind(record)}
            >
              <Button
                type="link"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={record.isSystem}
              >
                {intl.formatMessage({ id: 'system.role.user.unbind' })}
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  return (
    <Modal
      title={intl.formatMessage({ id: 'system.role.user.bind' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnHidden
    >
      <ProTable<SysRoleBindVo>
        headerTitle={false}
        actionRef={actionRef}
        rowKey="id"
        size="small"
        columns={columns}
        scroll={{ x: getTableScrollX(columns, 64) }}
        params={{ roleId }}
        // 只留"关键词"一个筛选项（后端 RoleUserQuery 只有 description 一个可搜字段）
        search={{ labelWidth: 'auto', span: 12 }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async ({ current, pageSize }) => {
          const response = await role.listRoleBindUser(roleId, {
            page: current as number,
            size: pageSize as number,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl
            key="add"
            permission="system:role:assign"
            mode="disable"
            disabledTip="没有分配用户的权限"
          >
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={() => setSelectVisible(true)}
            >
              {intl.formatMessage({ id: 'system.role.user.add' })}
            </Button>
          </AccessControl>,
          selectedRowKeys.length > 0 && (
            <AccessControl
              key="batchUnbind"
              permission="system:role:unassign"
              mode="disable"
              disabledTip="没有取消分配的权限"
            >
              <Popconfirm
                title={`确定要解绑选中的 ${selectedRowKeys.length} 个用户吗？`}
                onConfirm={handleBatchUnbind}
              >
                <Button size="small" danger icon={<DeleteOutlined />}>
                  批量解绑
                </Button>
              </Popconfirm>
            </AccessControl>
          ),
        ]}
      />

      <UserSelect
        visible={selectVisible}
        roleId={roleId}
        onCancel={() => setSelectVisible(false)}
        onSuccess={() => {
          setSelectVisible(false);
          reload();
        }}
      />
    </Modal>
  );
};

export default UserBind;
