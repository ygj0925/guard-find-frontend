import {
  DeleteOutlined,
  EditOutlined,
  MenuOutlined,
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
import { deletePackage, queryPackages } from '@/services/web/tenant/package';
import type { TenantPackageVo } from '@/services/web/tenant/typings';
import MenuAssign from './components/MenuAssign';
import PackageForm from './components/PackageForm';

const statusMap: Record<number, { text: string; color: string }> = {
  0: { text: '禁用', color: 'red' },
  1: { text: '正常', color: 'green' },
};

const PackagePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<TenantPackageVo | null>(
    null,
  );
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPackageId, setMenuPackageId] = useState<number | null>(null);

  const columns: ProColumns<TenantPackageVo>[] = [
    {
      title: '套餐名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) => {
        const item = statusMap[record.status];
        return item ? <Tag color={item.color}>{item.text}</Tag> : '-';
      },
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
          <AccessControl permission="tenant:package:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:package:menu">
            <Button
              type="link"
              icon={<MenuOutlined />}
              onClick={() => handleMenuAssign(record)}
            >
              分配菜单
            </Button>
          </AccessControl>
          <AccessControl permission="tenant:package:del">
            <Popconfirm
              title="确定要删除此套餐吗？"
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

  const handleEdit = (record: TenantPackageVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: TenantPackageVo) => {
    try {
      await deletePackage(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleMenuAssign = (record: TenantPackageVo) => {
    setMenuPackageId(record.id);
    setMenuVisible(true);
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  const handleMenuSuccess = () => {
    setMenuVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<TenantPackageVo>
        headerTitle="租户套餐"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryPackages({
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
          <AccessControl key="add" permission="tenant:package:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <PackageForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <MenuAssign
        visible={menuVisible}
        packageId={menuPackageId}
        onCancel={() => setMenuVisible(false)}
        onSuccess={handleMenuSuccess}
      />
    </PageContainer>
  );
};

export default PackagePage;
