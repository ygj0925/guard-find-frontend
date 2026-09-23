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
import type { QueryParam } from '@/typings';
import MenuGrant from './components/MenuGrant';
import RoleForm from './components/RoleForm';
import UserBind from './components/UserBind';

const RolePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentRole, setCurrentRole] = useState<SysRoleVo | null>(null);
  const [grantVisible, setGrantVisible] = useState(false);
  const [grantRoleCode, setGrantRoleCode] = useState('');
  const [userBindVisible, setUserBindVisible] = useState(false);
  const [userBindRoleId, setUserBindRoleId] = useState(0);

  const columns: ProColumns<SysRoleVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.role.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.role.code' }),
      dataIndex: 'code',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.role.type' }),
      dataIndex: 'isSystem',
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
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:role:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:grant">
            <Button
              type="link"
              icon={<SettingOutlined />}
              onClick={() => handleGrant(record)}
            >
              {intl.formatMessage({ id: 'system.role.menu.grant' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:grant">
            <Button
              type="link"
              icon={<TeamOutlined />}
              onClick={() => handleUserBind(record)}
            >
              {intl.formatMessage({ id: 'system.role.user.bind' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:role:del">
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
    setGrantRoleCode(record.code);
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
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          void current;
          void pageSize;
          const response = await role.query(rest as QueryParam<SysRoleQo>);
          const list = response.data || [];
          return {
            data: list,
            total: list.length,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:role:add">
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
        roleCode={grantRoleCode}
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
