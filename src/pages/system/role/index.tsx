import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysRoleQo, SysRoleVo } from '@/services/web/system';
import { role } from '@/services/web/system';
import { getTableScrollX } from '@/utils/tableLayout';
import MenuGrant from './components/MenuGrant';
import RoleForm from './components/RoleForm';
import UserBind from './components/UserBind';

const RolePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<SysRoleVo | null>(null);
  const [grantVisible, setGrantVisible] = useState(false);
  const [grantRoleId, setGrantRoleId] = useState(0);
  const [userBindVisible, setUserBindVisible] = useState(false);
  const [userBindRoleId, setUserBindRoleId] = useState(0);

  const columns: ProColumns<SysRoleVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.role.name' }),
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.role.code' }),
      dataIndex: 'code',
      width: 160,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.role.type' }),
      dataIndex: 'isSystem',
      width: 100,
      render: (_, record) => (
        <Tag color={record.isSystem ? 'blue' : 'green'}>
          {record.isSystem
            ? intl.formatMessage({ id: 'system.role.type.system' })
            : intl.formatMessage({ id: 'system.role.type.business' })}
        </Tag>
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'description',
      width: 240,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          <AccessControl permission="system:role:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:updatePermission">
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => handleGrant(record)}
            >
              {intl.formatMessage({ id: 'system.role.menu.grant' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:list">
            <Button
              type="link"
              icon={<TeamOutlined />}
              onClick={() => handleUserBind(record)}
            >
              {intl.formatMessage({ id: 'system.role.user.bind' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:delete">
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'common.operation.delete' })}
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentRole(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysRoleVo) => {
    setCurrentRole(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysRoleVo) => {
    try {
      await role.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleGrant = (record: SysRoleVo) => {
    setGrantRoleId(record.id);
    setGrantVisible(true);
  };

  const handleUserBind = (record: SysRoleVo) => {
    setUserBindRoleId(record.id);
    setUserBindVisible(true);
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysRoleVo>
        headerTitle={intl.formatMessage({ id: 'system.role.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: getTableScrollX(columns) }}
        pagination={false}
        request={async (params) => {
          const { current: _c, pageSize: _p, ...rest } = params;
          // 后端 `GET /system/role/list` 不分页，忽略 ProTable 的分页参数
          const response = await role.query(rest as Partial<SysRoleQo>);
          return {
            data: response.data || [],
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:role:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <RoleForm
        visible={formVisible}
        role={currentRole}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <MenuGrant
        visible={grantVisible}
        roleId={grantRoleId}
        onCancel={() => setGrantVisible(false)}
      />

      <UserBind
        visible={userBindVisible}
        roleId={userBindRoleId}
        onCancel={() => setUserBindVisible(false)}
      />
    </PageContainer>
  );
};

export default RolePage;
