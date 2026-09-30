import { ClearOutlined, DeleteOutlined, UndoOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space } from 'antd';
import React, { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  cleanRecycle,
  permanentDelete,
  queryRecycleFiles,
  restoreFile,
} from '@/services/web/file';
import type { FileVo } from '@/services/web/file/typings';
import { formatFileSize } from '@/utils/format';

const RecycleBin: React.FC = () => {
  const actionRef = useRef<ActionType>(null);

  const reload = () => actionRef.current?.reload();

  const handleRestore = async (record: FileVo) => {
    await restoreFile(record.id);
    message.success('恢复成功');
    reload();
  };

  const handlePermanentDelete = async (record: FileVo) => {
    await permanentDelete(record.id);
    message.success('永久删除成功');
    reload();
  };

  const handleClean = async () => {
    await cleanRecycle();
    message.success('回收站已清空');
    reload();
  };

  const columns: ProColumns<FileVo>[] = [
    {
      title: '文件名',
      dataIndex: 'originalName',
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
      valueEnum: {
        0: { text: '目录' },
        1: { text: '其他' },
        2: { text: '图片' },
        3: { text: '文档' },
        4: { text: '视频' },
        5: { text: '音频' },
      },
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
          <AccessControl permission="system:fileRecycle:restore">
            <Button
              type="link"
              size="small"
              icon={<UndoOutlined />}
              onClick={() => handleRestore(record)}
            >
              恢复
            </Button>
          </AccessControl>
          {/* 回收站的永久删除是 `system:fileRecycle:delete`，
              与文件列表"移入回收站"的 `system:file:delete` 是两个码 */}
          <AccessControl permission="system:fileRecycle:delete">
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
      pagination={{ defaultPageSize: 10 }}
      request={async ({ current, pageSize, ...rest }) => {
        const response = await queryRecycleFiles({
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
        <AccessControl
          key="clean"
          permission="system:fileRecycle:clean"
          mode="disable"
          disabledTip="没有清空回收站的权限"
        >
          <Popconfirm
            title="清空后所有文件将不可恢复，确定继续？"
            onConfirm={handleClean}
          >
            <Button danger icon={<ClearOutlined />}>
              清空回收站
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    />
  );
};

export default RecycleBin;
