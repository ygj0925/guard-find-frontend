import { DeleteOutlined, DownloadOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  batchDeleteSmsLogs,
  deleteSmsLog,
  exportSmsLogs,
  querySmsLogs,
} from '@/services/web/sms/log';
import type { SmsLogVo } from '@/services/web/sms/typings';
import { saveBlob } from '@/utils/download';
import { getTableScrollX } from '@/utils/tableLayout';

const SmsLogPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const handleDelete = async (record: SmsLogVo) => {
    try {
      await deleteSmsLog(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的记录');
      return;
    }
    try {
      await batchDeleteSmsLogs(selectedRowKeys as number[]);
      message.success('批量删除成功');
      setSelectedRowKeys([]);
      actionRef.current?.reload();
    } catch (error) {
      console.error('Batch delete failed:', error);
    }
  };

  const handleExport = async () => {
    try {
      const response = await exportSmsLogs({});
      saveBlob(response as Blob, '短信日志.xlsx');
      message.success('导出成功');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const columns: ProColumns<SmsLogVo>[] = [
    {
      title: '手机号',
      dataIndex: 'phone',
      width: 140,
      ellipsis: true,
    },
    {
      title: '参数配置',
      dataIndex: 'params',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        1: { text: '成功' },
        2: { text: '失败' },
      },
      render: (_, record) =>
        record.status === 1 ? (
          <Tag color="green">成功</Tag>
        ) : (
          <Tag color="red">失败</Tag>
        ),
    },
    {
      title: '返回数据',
      dataIndex: 'resMsg',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
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
      fixed: 'right',
      className: 'table-action-column',
      width: 100,
      render: (_, record) => (
        <AccessControl permission="system:smsLog:delete">
          <Popconfirm
            title="确定要删除吗？"
            onConfirm={() => handleDelete(record)}
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </AccessControl>
      ),
    },
  ];

  return (
    <PageContainer>
      <ProTable<SmsLogVo>
        headerTitle="短信日志"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: getTableScrollX(columns, 64) }}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys),
        }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await querySmsLogs({
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
          <AccessControl key="batchDel" permission="system:smsLog:delete">
            <Popconfirm
              title="确定要批量删除选中记录吗？"
              onConfirm={handleBatchDelete}
            >
              <Button danger icon={<DeleteOutlined />}>
                批量删除
              </Button>
            </Popconfirm>
          </AccessControl>,
          <AccessControl key="export" permission="system:smsLog:export">
            <Button icon={<DownloadOutlined />} onClick={handleExport}>
              导出
            </Button>
          </AccessControl>,
        ]}
      />
    </PageContainer>
  );
};

export default SmsLogPage;
