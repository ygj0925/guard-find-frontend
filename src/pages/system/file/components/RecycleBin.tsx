import { DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  permanentDelete,
  queryRecycleFiles,
  restoreFile,
} from '@/services/web/file';
import type { FileVo } from '@/services/web/file/typings';

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / 1024 ** i).toFixed(2)} ${units[i]}`;
}

const RecycleBin: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const handleRestore = async (record: FileVo) => {
    try {
      await restoreFile(record.id);
      message.success('恢复成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Restore failed:', error);
    }
  };

  const handlePermanentDelete = async (record: FileVo) => {
    try {
      await permanentDelete(record.id);
      message.success('永久删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Permanent delete failed:', error);
    }
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
      title: '删除时间',
      dataIndex: 'createTime',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:file:restore">
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => handleRestore(record)}
            >
              恢复
            </Button>
          </AccessControl>
          <AccessControl permission="system:file:del">
            <Popconfirm
              title="确定要永久删除该文件吗？此操作不可恢复。"
              onConfirm={() => handlePermanentDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                永久删除
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  return (
    <ProTable<FileVo>
      headerTitle="回收站"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      request={async (params) => {
        const { current, pageSize, ...rest } = params;
        const response = await queryRecycleFiles({
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
    />
  );
};

export default RecycleBin;
