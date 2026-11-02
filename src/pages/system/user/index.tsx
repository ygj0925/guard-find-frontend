import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
  SafetyOutlined,
  UploadOutlined,
  UserOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl, useModel } from '@umijs/max';
import { Avatar, Button, message, Popconfirm, Space, Switch } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import DialogHost, { useDialog } from '@/components/DialogHost';
import OrganizationTree from '@/components/OrganizationTree';
import type { SysUserVo } from '@/services/web/system';
import { user } from '@/services/web/system';
import { getTableScrollX } from '@/utils/tableLayout';
import Grant from './components/Grant';
import ImportModal from './components/ImportModal';
import Pass from './components/Pass';
import UserForm from './components/UserForm';
import './index.css';

const UserPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const { refreshAuthorization } = useModel('authorization');
  const formDialog = useDialog<SysUserVo | null>();
  const grantDialog = useDialog<SysUserVo>();
  const passDialog = useDialog<SysUserVo>();
  const [selectedOrgId, setSelectedOrgId] = useState<number | undefined>();
  const importDialog = useDialog();

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
        <Avatar src={record.avatar} icon={<UserOutlined />} />
      ),
      hideInSearch: true,
    },
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
      title: intl.formatMessage({ id: 'system.user.gender' }),
      dataIndex: 'gender',
      render: (_, record) => genderMap[record.gender] || '-',
      hideInSearch: true,
      width: 80,
    },
    {
      title: intl.formatMessage({ id: 'system.user.phone' }),
      dataIndex: 'phone',
      width: 140,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.user.email' }),
      dataIndex: 'email',
      width: 200,
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
      title: intl.formatMessage({ id: 'common.field.status' }),
      dataIndex: 'status',
      width: 100,
      render: (_, record) => (
        <AccessControl permission="system:user:update">
          <Switch
            checked={record.status === 1}
            onChange={(checked) => handleStatusChange(record, checked ? 1 : 2)}
          />
        </AccessControl>
      ),
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
          <AccessControl permission="system:user:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:updateRole">
            <Button
              type="link"
              icon={<SafetyOutlined />}
              onClick={() => handleGrant(record)}
            >
              {intl.formatMessage({ id: 'common.operation.grant' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:resetPwd">
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handlePass(record)}
            >
              {intl.formatMessage({ id: 'common.operation.change.password' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:user:delete">
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
    formDialog.open(null);
  };

  const handleEdit = (record: SysUserVo) => {
    formDialog.open(record);
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
    grantDialog.open(record);
  };

  const handlePass = (record: SysUserVo) => {
    passDialog.open(record);
  };

  const handleStatusChange = async (record: SysUserVo, status: 1 | 2) => {
    try {
      await user.updateStatus([record.id], status);
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
        selectedRows.map((r: SysUserVo) => r.id),
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
        selectedRows.map((r: SysUserVo) => r.id),
        2,
      );
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Batch disable failed:', error);
    }
  };

  const handleOpenImport = () => importDialog.open(undefined);

  const handleExport = async () => {
    try {
      await user.exportUsers({ deptId: selectedOrgId });
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFormSuccess = () => {
    formDialog.close();
    actionRef.current?.reload();
  };

  const handleGrantSuccess = async () => {
    await refreshAuthorization();
    grantDialog.close();
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
  };

  const handlePassSuccess = () => {
    passDialog.close();
    message.success(intl.formatMessage({ id: 'common.operation.success' }));
  };

  const handleOrgSelect = useCallback((org: any) => {
    setSelectedOrgId(org?.id);
  }, []);

  return (
    <PageContainer>
      <div className="user-management-layout">
        <div
          className="user-management-organization"
          style={{
            background: '#fff',
            padding: 16,
            borderRadius: 8,
          }}
        >
          <OrganizationTree onSelectOrganization={handleOrgSelect} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <ProTable<SysUserVo>
            headerTitle={intl.formatMessage({ id: 'system.user.title' })}
            actionRef={actionRef}
            rowKey="id"
            columns={columns}
            scroll={{ x: getTableScrollX(columns, 64) }}
            rowSelection={{}}
            params={{
              deptId: selectedOrgId || undefined,
            }}
            request={async (params) => {
              const { current, pageSize, deptId, ...rest } = params;
              const response = await user.query({
                page: current as number,
                size: pageSize as number,
                deptId: deptId as number,
                ...rest,
              });
              return {
                data: response.data?.list || [],
                total: response.data?.total || 0,
                success: true,
              };
            }}
            toolBarRender={() => [
              <AccessControl key="add" permission="system:user:create">
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAdd}
                >
                  {intl.formatMessage({ id: 'common.operation.add' })}
                </Button>
              </AccessControl>,
              <AccessControl key="batchEnable" permission="system:user:update">
                <Button onClick={handleBatchEnable}>
                  {intl.formatMessage({ id: 'system.user.batch.enable' })}
                </Button>
              </AccessControl>,
              <AccessControl key="batchDisable" permission="system:user:update">
                <Button onClick={handleBatchDisable}>
                  {intl.formatMessage({ id: 'system.user.batch.disable' })}
                </Button>
              </AccessControl>,
              <AccessControl key="import" permission="system:user:import">
                <Button icon={<UploadOutlined />} onClick={handleOpenImport}>
                  {intl.formatMessage({ id: 'common.operation.import' })}
                </Button>
              </AccessControl>,
              <AccessControl key="export" permission="system:user:export">
                <Button icon={<DownloadOutlined />} onClick={handleExport}>
                  {intl.formatMessage({ id: 'common.operation.export' })}
                </Button>
              </AccessControl>,
            ]}
          />
        </div>
      </div>

      <DialogHost dialog={formDialog}>
        {({ visible, data }) => (
          <UserForm
            visible={visible}
            user={data}
            onCancel={() => formDialog.close()}
            onSuccess={handleFormSuccess}
          />
        )}
      </DialogHost>

      <DialogHost dialog={grantDialog}>
        {({ visible, data }) => (
          <Grant
            visible={visible}
            user={data}
            onCancel={() => grantDialog.close()}
            onSuccess={handleGrantSuccess}
          />
        )}
      </DialogHost>

      <DialogHost dialog={passDialog}>
        {({ visible, data }) => (
          <Pass
            visible={visible}
            user={data}
            onCancel={() => passDialog.close()}
            onSuccess={handlePassSuccess}
          />
        )}
      </DialogHost>

      <DialogHost dialog={importDialog}>
        {({ visible }) => (
          <ImportModal
            visible={visible}
            onCancel={() => importDialog.close()}
            onSuccess={() => actionRef.current?.reload()}
          />
        )}
      </DialogHost>
    </PageContainer>
  );
};

export default UserPage;
