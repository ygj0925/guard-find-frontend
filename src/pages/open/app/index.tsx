import {
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
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
import { deleteApp, exportApps, queryApps } from '@/services/web/open/app';
import type { AppVo } from '@/services/web/open/typings';
import AppForm from './components/AppForm';
import SecretModal from './components/SecretModal';

const AppPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AppVo | null>(null);
  const [secretVisible, setSecretVisible] = useState(false);
  const [secretApp, setSecretApp] = useState<AppVo | null>(null);

  const columns: ProColumns<AppVo>[] = [
    {
      title: '应用名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: 'AppKey',
      dataIndex: 'appKey',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      valueEnum: {
        0: { text: '禁用', status: 'Default' },
        1: { text: '启用', status: 'Success' },
      },
      render: (_, record) => (
        <Tag color={record.status === 1 ? 'green' : 'default'}>
          {record.status === 1 ? '启用' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      ellipsis: true,
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
          <AccessControl permission="open:app:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="open:app:secret">
            <Button
              type="link"
              icon={<EyeOutlined />}
              onClick={() => handleViewSecret(record)}
            >
              查看密钥
            </Button>
          </AccessControl>
          <AccessControl permission="open:app:del">
            <Popconfirm
              title="确认删除该应用吗？"
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

  const handleEdit = (record: AppVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleViewSecret = (record: AppVo) => {
    setSecretApp(record);
    setSecretVisible(true);
  };

  const handleDelete = async (record: AppVo) => {
    try {
      await deleteApp(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      const blob = await exportApps();
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'apps.xlsx');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      message.success('导出成功');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<AppVo>
        headerTitle="开放平台应用"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryApps({
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
          <AccessControl key="add" permission="open:app:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
          <AccessControl key="export" permission="open:app:export">
            <Button icon={<ExportOutlined />} onClick={handleExport}>
              导出
            </Button>
          </AccessControl>,
        ]}
      />

      <AppForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />

      <SecretModal
        visible={secretVisible}
        app={secretApp}
        onCancel={() => setSecretVisible(false)}
      />
    </PageContainer>
  );
};

export default AppPage;
