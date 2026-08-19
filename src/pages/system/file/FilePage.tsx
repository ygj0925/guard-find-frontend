import { DeleteOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tabs } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import { deleteFile, queryFiles } from '@/services/web/file';
import type { FileVo } from '@/services/web/file/typings';
import FileUpload from './components/FileUpload';
import RecycleBin from './components/RecycleBin';
import StorageStats from './components/StorageStats';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

const FilePage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const handleDelete = async (record: FileVo) => {
    try {
      await deleteFile(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleUploadSuccess = () => {
    actionRef.current?.reload();
  };

  const columns: ProColumns<FileVo>[] = [
    {
      title: '文件名',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '大小',
      dataIndex: 'size',
      width: 120,
      hideInSearch: true,
      render: (_, record) => formatFileSize(record.size),
    },
    {
      title: '类型',
      dataIndex: 'type',
      width: 100,
    },
    {
      title: '扩展名',
      dataIndex: 'extension',
      width: 100,
      hideInSearch: true,
    },
    {
      title: '上传者',
      dataIndex: 'createUser',
      width: 120,
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
      width: 100,
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:file:del">
            <Popconfirm
              title="确定要删除该文件吗？"
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
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
      <StorageStats />
      <Tabs
        defaultActiveKey="files"
        items={[
          {
            key: 'files',
            label: '文件列表',
            children: (
              <ProTable<FileVo>
                headerTitle="文件列表"
                actionRef={actionRef}
                rowKey="id"
                columns={columns}
                request={async (params) => {
                  const { current, pageSize, ...rest } = params;
                  const response = await queryFiles({
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
                  <AccessControl key="upload" permission="system:file:upload">
                    <FileUpload onSuccess={handleUploadSuccess} />
                  </AccessControl>,
                ]}
              />
            ),
          },
          {
            key: 'recycle',
            label: '回收站',
            children: <RecycleBin />,
          },
        ]}
      />
    </PageContainer>
  );
};

export default FilePage;
