import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ToolOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysOrganizationVo } from '@/services/web/system';
import { organization } from '@/services/web/system';
import OrgForm from './components/OrgForm';

const OrganizationPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentOrg, setCurrentOrg] = useState<SysOrganizationVo | null>(null);
  const [parentOrg, setParentOrg] = useState<SysOrganizationVo | null>(null);

  const columns: ProColumns<SysOrganizationVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.organization.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.sort' }),
      dataIndex: 'sort',
      width: 80,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'remarks',
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
          <AccessControl permission="system:organization:add">
            <Button
              type="link"
              icon={<PlusOutlined />}
              onClick={() => handleAddChild(record)}
            >
              {intl.formatMessage({ id: 'common.operation.add.child' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:organization:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:organization:del">
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
    setCurrentOrg(null);
    setParentOrg(null);
    setFormVisible(true);
  };

  const handleAddChild = (record: SysOrganizationVo) => {
    setCurrentOrg(null);
    setParentOrg(record);
    setFormVisible(true);
  };

  const handleEdit = (record: SysOrganizationVo) => {
    setCurrentOrg(record);
    setParentOrg(null);
    setFormVisible(true);
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

  const handleRevised = async () => {
    try {
      await organization.revised();
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Revised failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<SysOrganizationVo>
        headerTitle={intl.formatMessage({ id: 'system.organization.title' })}
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        search={false}
        request={async () => {
          const response = await organization.query();
          return {
            data: response.data || [],
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="system:organization:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              {intl.formatMessage({ id: 'common.operation.add' })}
            </Button>
          </AccessControl>,
          <AccessControl key="revised" permission="system:organization:revised">
            <Button icon={<ToolOutlined />} onClick={handleRevised}>
              {intl.formatMessage({ id: 'system.organization.revised' })}
            </Button>
          </AccessControl>,
        ]}
      />

      <OrgForm
        visible={formVisible}
        org={currentOrg}
        parentOrg={parentOrg}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default OrganizationPage;
