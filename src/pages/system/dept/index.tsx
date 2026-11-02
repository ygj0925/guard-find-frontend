import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import DialogHost, { useDialog } from '@/components/DialogHost';
import type { SysOrganizationVo } from '@/services/web/system';
import { organization } from '@/services/web/system';
import { getTableScrollX } from '@/utils/tableLayout';
import OrgForm from './components/OrgForm';

const OrganizationPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const formDialog = useDialog<{
    record: SysOrganizationVo | null;
    parent: SysOrganizationVo | null;
  }>();

  const columns: ProColumns<SysOrganizationVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.organization.name' }),
      dataIndex: 'name',
      width: 200,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.sort' }),
      dataIndex: 'sort',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.status' }),
      dataIndex: 'status',
      width: 80,
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'red'}>
          {record.status === 1
            ? intl.formatMessage({ id: 'common.status.normal' })
            : intl.formatMessage({ id: 'common.status.frozen' })}
        </Tag>
      ),
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'description',
      width: 220,
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
          <AccessControl permission="system:dept:create">
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => handleAddChild(record)}
            >
              {intl.formatMessage({ id: 'common.operation.add.child' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:dept:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:dept:delete">
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              description={intl.formatMessage({
                id: 'system.organization.delete.children.confirm',
              })}
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
    formDialog.open({ record: null, parent: null });
  };

  const handleAddChild = (record: SysOrganizationVo) => {
    formDialog.open({ record: null, parent: record });
  };

  const handleEdit = (record: SysOrganizationVo) => {
    formDialog.open({ record, parent: null });
  };

  const handleDelete = async (record: SysOrganizationVo) => {
    try {
      await organization.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      await organization.exportDepts();
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFormSuccess = () => {
    formDialog.close();
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysOrganizationVo>
        headerTitle={intl.formatMessage({ id: 'system.organization.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        virtual
        scroll={{ x: getTableScrollX(columns), y: 480 }}
        search={false}
        pagination={false}
        request={async () => {
          const response = await organization.query();
          return {
            data: response.data || [],
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:dept:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
          <AccessControl key="export" permission="system:dept:export">
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              {intl.formatMessage({ id: 'common.operation.export' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <DialogHost dialog={formDialog}>
        {({ visible, data }) => (
          <OrgForm
            visible={visible}
            org={data.record}
            parentOrg={data.parent}
            onCancel={() => formDialog.close()}
            onSuccess={handleFormSuccess}
          />
        )}
      </DialogHost>
    </PageContainer>
  );
};

export default OrganizationPage;
