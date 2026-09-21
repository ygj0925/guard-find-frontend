import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Switch, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  deleteStorage,
  queryStorages,
  setDefault,
  toggleStatus,
} from '@/services/web/storage';
import type { StorageVo } from '@/services/web/storage/typings';
import StorageForm from './components/StorageForm';

const storageTypeMap: Record<number, string> = {
  0: '本地',
  1: 'S3',
  2: 'OSS',
  3: 'COS',
  4: 'MinIO',
};

const StoragePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<StorageVo | null>(null);

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormVisible(true);
  };

  const handleEdit = (record: StorageVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: StorageVo) => {
    try {
      await deleteStorage(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSetDefault = async (record: StorageVo) => {
    try {
      await setDefault(record.id);
      message.success('设置默认成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Set default failed:', error);
    }
  };

  const handleStatusChange = async (record: StorageVo, checked: boolean) => {
    try {
      await toggleStatus(record.id, checked ? 1 : 0);
      message.success('状态更新成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Toggle status failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  const columns: ProColumns<StorageVo>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '编码',
      dataIndex: 'code',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      valueEnum: {
        0: { text: '本地' },
        1: { text: 'S3' },
        2: { text: 'OSS' },
        3: { text: 'COS' },
        4: { text: 'MinIO' },
      },
      render: (_, record) => storageTypeMap[record.type] || '-',
    },
    {
      title: 'Endpoint',
      dataIndex: 'endpoint',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: 'Bucket',
      dataIndex: 'bucketName',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      hideInSearch: true,
      render: (_, record) =>
        record.isDefault ? <Tag color="green">默认</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) => (
        <Switch
          checked={record.status === 1}
          onChange={(checked) => handleStatusChange(record, checked)}
        />
      ),
    },
    {
      title: '创建时间',
      dataIndex: 'createTime',
      hideInSearch: true,
      width: 180,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 220,
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:storage:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          {!record.isDefault && (
            <AccessControl permission="system:storage:edit">
              <Popconfirm
                title="确定设为默认存储吗？"
                onConfirm={() => handleSetDefault(record)}
              >
                <Button type="link" icon={<StarOutlined />}>
                  默认
                </Button>
              </Popconfirm>
            </AccessControl>
          )}
          <AccessControl permission="system:storage:del">
            <Popconfirm
              title="确定要删除吗？"
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

  return (
    <PageContainer>
      <ProTable<StorageVo>
        headerTitle="存储管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryStorages({
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
          <AccessControl key="add" permission="system:storage:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <StorageForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default StoragePage;
