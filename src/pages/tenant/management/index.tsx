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
import { getTableScrollX } from '@/utils/tableLayout';
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
      width: 180,
      ellipsis: true,
    },
    {
      title: '域名',
      dataIndex: 'domain',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '管理员账号',
      dataIndex: 'adminUsername',
      width: 140,
      hideInSearch: true,
    },
    {
      title: '套餐名称',
      dataIndex: 'packageName',
      width: 140,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
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
      width: 180,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 180,
      render: (_, record) => (
        <Space wrap>
          <AccessControl permission="tenant:management:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:management:updateAdminUserPwd">
            <Button
              type="link"
              icon={<KeyOutlined />}
              onClick={() => handleResetPassword(record)}
            >
              重置密码
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:management:delete">
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
        scroll={{ x: getTableScrollX(columns) }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryTenants({
            page: current as number,
            size: pageSize as number,
            ...rest,
          });
          return {
            data: response.data?.list || [],
            total: response.data?.total || 0,
            success: true,
          };
        }}
        toolBarRender={() => [
          <AccessControl key="add" permission="tenant:management:create">
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
