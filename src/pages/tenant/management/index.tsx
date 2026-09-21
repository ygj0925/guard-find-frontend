import {
  DeleteOutlined,
  EditOutlined,
  KeyOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { deleteTenant, queryTenants } from '@/services/web/tenant/management';
import type { TenantVo } from '@/services/web/tenant/typings';
import ResetPassword from './components/ResetPassword';
import TenantForm from './components/TenantForm';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '禁用', color: 'red' },
  1: { text: '正常', color: 'green' },
};

const TenantPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TenantVo | null>(null);
  const [resetVisible, setResetVisible] = useState(false);
  const [resetTenantId, setResetTenantId] = useState<number | null>(null);

  const columns: ProColumns<TenantVo>[] = [
    {
      title: '租户名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '域名',
      dataIndex: 'domain',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '管理员账号',
      dataIndex: 'adminUsername',
      hideInSearch: true,
    },
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      valueEnum: {
        0: { text: '禁用', status: 'Error' },
        1: { text: '正常', status: 'Success' },
      },
      render: (_, record) => {
        const item = statusMap[record.status];
        return item ? <Tag color={item.color}>{item.text}</Tag> : '-';
      },
    },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <AccessControl permission="tenant:management:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:management:password">
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            >
              重置密码
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:management:del">
            <Popconfirm
              title="确定要删除此租户吗？"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormVisible(true);
  };

  const handleEdit = (record: TenantVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: TenantVo) => {
    try {
      await deleteTenant(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleResetPassword = (record: TenantVo) => {
    setResetTenantId(record.id);
    setResetVisible(true);
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  const handleResetSuccess = () => {
    setResetVisible(false);
  };

  return (
    <PageContainer>
      <ProTable<TenantVo>
        headerTitle="租户管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryTenants({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.records || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="tenant:management:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <TenantForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <ResetPassword
        visible={resetVisible}
        tenantId={resetTenantId}
        onCancel={() => setResetVisible(false)}
        onSuccess={handleResetSuccess}
      />
    </PageContainer>
  );
};

export default TenantPage;
