import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Avatar, Button, message, Popconfirm, Space, Switch } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import AvatarCropper from '@/components/AvatarCropper';
import OrganizationTree from '@/components/OrganizationTree';
import type { SysUserVo } from '@/services/web/system';
import { user } from '@/services/web/system';
import Grant from './components/Grant';
import Pass from './components/Pass';
import UserForm from './components/UserForm';

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentUser, setCurrentUser] = useState<SysUserVo | null>(null);
  const [grantVisible, setGrantVisible] = useState(false);
  const [grantUser, setGrantUser] = useState<SysUserVo | null>(null);
  const [passVisible, setPassVisible] = useState(false);
  const [passUser, setPassUser] = useState<SysUserVo | null>(null);
  const [avatarVisible, setAvatarVisible] = useState(false);
  const [avatarUser, setAvatarUser] = useState<SysUserVo | null>(null);
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();

  const genderMap: Record<number, string> = {
    0: intl.formatMessage({ id: 'common.gender.unknown' }),
    1: intl.formatMessage({ id: 'common.gender.male' }),
    2: intl.formatMessage({ id: 'common.gender.female' }),
  };

  const columns: ProColumns<SysUserVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.user.avatar' }),
      dataIndex: 'avatar',
      width: 60,
      render: (_, record) => (
        <Avatar
          src={record.avatar}
          icon={<UserOutlined />}
          style={{ cursor: 'pointer' }}
          onClick={() => handleAvatarUpload(record)}
        />
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.username' }),
      dataIndex: 'username',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.nickname' }),
      dataIndex: 'nickname',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.gender' }),
      dataIndex: 'gender',
      render: (_, record) => genderMap[record.gender] || '-',
      hideInSearch: true,
      width: 80,
    },
    {
      title: intl.formatMessage({ id: 'system.user.phone' }),
      dataIndex: 'phoneNumber',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.email' }),
      dataIndex: 'email',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.organization' }),
      dataIndex: 'organizationName',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.status' }),
      dataIndex: 'status',
      width: 100,
      render: (_, record) => (
        <AccessControl permission="system:user:edit">
          <Switch
            checked={record.status === 1}
            onChange={(checked) => handleStatusChange(record, checked ? 1 : 0)}
          />
        </AccessControl>
      ),
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
          <AccessControl permission="system:user:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:grant">
            <Button
              type="link"
              icon={<SafetyOutlined />}
              onClick={() => handleGrant(record)}
            >
              {intl.formatMessage({ id: 'common.operation.grant' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:pass">
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handlePass(record)}
            >
              {intl.formatMessage({ id: 'common.operation.change.password' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:del">
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
    setCurrentUser(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysUserVo) => {
    setCurrentUser(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysUserVo) => {
    try {
      await user.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleGrant = (record: SysUserVo) => {
    setGrantUser(record);
    setGrantVisible(true);
  };

  const handlePass = (record: SysUserVo) => {
    setPassUser(record);
    setPassVisible(true);
  };

  const handleAvatarUpload = (record: SysUserVo) => {
    setAvatarUser(record);
    setAvatarVisible(true);
  };

  const handleStatusChange = async (record: SysUserVo, status: 0 | 1) => {
    try {
      await user.updateStatus([record.userId], status);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Status update failed:', error);
    }
  };

  const handleBatchEnable = async () => {
    const selectedRows = (actionRef.current as any)?.getSelectedRows?.() || [];
    if (selectedRows.length === 0) {
      message.warning(
        intl.formatMessage({ id: 'system.user.batch.select.warning' }),
      );
      return;
    }
    try {
      await user.updateStatus(
        selectedRows.map((r: SysUserVo) => r.userId),
        1,
      );
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Batch enable failed:', error);
    }
  };

  const handleBatchDisable = async () => {
    const selectedRows = (actionRef.current as any)?.getSelectedRows?.() || [];
    if (selectedRows.length === 0) {
      message.warning(
        intl.formatMessage({ id: 'system.user.batch.select.warning' }),
      );
      return;
    }
    try {
      await user.updateStatus(
        selectedRows.map((r: SysUserVo) => r.userId),
        0,
      );
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Batch disable failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  const handleGrantSuccess = () => {
    setGrantVisible(false);
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
  };

  const handlePassSuccess = () => {
    setPassVisible(false);
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
  };

  const handleAvatarUploadSuccess = async (file: Blob) => {
    if (!avatarUser) return;
    try {
      await user.updateAvatar(avatarUser, file, { name: 'avatar.jpg' } as any);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      setAvatarVisible(false);
      actionRef.current?.reload();
    } catch (error) {
      console.error('Avatar upload failed:', error);
    }
  };

  const handleOrgSelect = useCallback((org: any) => {
    setSelectedOrgId(org?.id);
    actionRef.current?.reload();
  }, []);

  return (
    <PageContainer>
      <div style={{ display: 'flex', gap: 16 }}>
        <div
          style={{
            width: 250,
            background: '#fff',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <OrganizationTree onSelectOrganization={handleOrgSelect} />
        </div>
        <div style={{ flex: 1 }}>
          <ProTable<SysUserVo>
            headerTitle={intl.formatMessage({ id: 'system.user.title' })}
            actionRef={actionRef}
            rowKey="userId"
            columns={columns}
            rowSelection={{}}
            params={{
              organizationId: selectedOrgId ? [selectedOrgId] : undefined,
            }}
            request={async (params) => {
              const { current, pageSize, organizationId, ...rest } = params;
              const response = await user.query({
                page: current as number,
                size: pageSize as number,
                organizationId: organizationId as number[],
                ...rest,
              });
              return {
                data: response.data?.records || [],
                total: response.data?.total || 0,
                success: true,
              };
            }}
            toolBarRender={() => [
              <AccessControl key="add" permission="system:user:add">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  {intl.formatMessage({ id: 'common.operation.add' })}
                </Button>
              </AccessControl>,
              <AccessControl key="batchEnable" permission="system:user:edit">
                <Button onClick={handleBatchEnable}>
                  {intl.formatMessage({ id: 'system.user.batch.enable' })}
                </Button>
              </AccessControl>,
              <AccessControl key="batchDisable" permission="system:user:edit">
                <Button onClick={handleBatchDisable}>
                  {intl.formatMessage({ id: 'system.user.batch.disable' })}
                </Button>
              </AccessControl>,
            ]}
          />
        </div>
      </div>

      <UserForm
        visible={formVisible}
        user={currentUser}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <Grant
        visible={grantVisible}
        user={grantUser}
        onCancel={() => setGrantVisible(false)}
        onSuccess={handleGrantSuccess}
      />

      <Pass
        visible={passVisible}
        user={passUser}
        onCancel={() => setPassVisible(false)}
        onSuccess={handlePassSuccess}
      />

      <AvatarCropper
        visible={avatarVisible}
        onCancel={() => setAvatarVisible(false)}
        onUpload={handleAvatarUploadSuccess}
      />
    </PageContainer>
  );
};

export default UserPage;
