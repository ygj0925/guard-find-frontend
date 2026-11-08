/**
 * 我的草稿：只列当前用户自己的草稿；流程版本已停用或不在发起范围时只能删除。
 */
import { DeleteOutlined, EditOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tag, Typography } from 'antd';
import React, { useRef } from 'react';
import {
  deleteOaDraft,
  type OaDraftVo,
  queryOaDrafts,
} from '@/services/web/guardfind/oa';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const OaDraftTable: React.FC = () => {
  const actionRef = useRef<ActionType>(undefined);

  const handleDelete = async (record: OaDraftVo) => {
    try {
      await deleteOaDraft(String(record.id));
      message.success('草稿已删除');
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const columns: ProColumns<OaDraftVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '草稿标题或流程名称' },
    },
    {
      title: '草稿',
      dataIndex: 'title',
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>
            {record.title || '（未填写标题）'}
          </Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.modelName ?? '流程已删除'}
            {record.releaseVersion ? ` · 发布 v${record.releaseVersion}` : ''}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '表单',
      dataIndex: 'formName',
      width: 160,
      hideInSearch: true,
      render: (_, record) => record.formName ?? '—',
    },
    {
      title: '状态',
      dataIndex: 'launchable',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        record.launchable ? (
          <Tag color="green">可继续</Tag>
        ) : (
          <Tag color="default">流程已停用</Tag>
        ),
    },
    {
      title: '最后保存',
      dataIndex: 'updateTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 170,
      render: (_, record) => [
        <Button
          key="continue"
          type="link"
          icon={<EditOutlined />}
          disabled={!record.launchable}
          title={
            record.launchable ? undefined : '流程版本已停用或不在发起范围内'
          }
          onClick={() =>
            history.push(
              `/oa/launch/fill?releaseId=${record.releaseId}&draftId=${record.id}`,
            )
          }
        >
          继续
        </Button>,
        <Popconfirm
          key="delete"
          title="删除这份草稿？"
          description="删除后无法恢复"
          onConfirm={() => handleDelete(record)}
        >
          <Button type="link" danger icon={<DeleteOutlined />}>
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  return (
    <ProTable<OaDraftVo>
      headerTitle="我的草稿"
      actionRef={actionRef}
      rowKey="id"
      columns={columns}
      search={{ labelWidth: 'auto' }}
      options={false}
      scroll={{ x: 800 }}
      request={async (params) => {
        try {
          const response = await queryOaDrafts({
            keyword: params.keyword?.trim() || undefined,
            page: params.current ?? 1,
            size: params.pageSize ?? 10,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        } catch (error) {
          return {
            data: [],
            total: 0,
            success: false,
            errorMessage: errorText(error),
          };
        }
      }}
      pagination={{ defaultPageSize: 10, showSizeChanger: true }}
    />
  );
};

export default OaDraftTable;
