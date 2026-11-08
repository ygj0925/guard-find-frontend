/**
 * 抄送我的：只展示当前登录人收到的抄送，查看详情后标记已读。
 */
import { MailOutlined } from '@ant-design/icons';
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tag, Typography } from 'antd';
import React from 'react';
import { type OaCcItemVo, queryOaCcPage } from '@/services/web/guardfind/oa';
import { applicationStatusTag } from '../application/components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function ccStatusTag(status: string) {
  return status === 'READ' ? <Tag>已读</Tag> : <Tag color="red">未读</Tag>;
}

const CcListPage: React.FC = () => {
  const columns: ProColumns<OaCcItemVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '标题、业务编号或申请人' },
    },
    {
      title: '阅读状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: { UNREAD: { text: '未读' }, READ: { text: '已读' } },
    },
    {
      title: '申请',
      dataIndex: 'title',
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.title}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.businessKey}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      width: 160,
      hideInSearch: true,
      render: (_, record) =>
        [record.applicantName, record.applicantDeptName]
          .filter(Boolean)
          .join(' · ') || '—',
    },
    {
      title: '流程',
      dataIndex: 'modelName',
      width: 140,
      hideInSearch: true,
      render: (_, record) => record.modelName || '—',
    },
    {
      title: '申请状态',
      dataIndex: 'applicationStatus',
      width: 100,
      hideInSearch: true,
      render: (_, record) => applicationStatusTag(record.applicationStatus),
    },
    {
      title: '阅读',
      dataIndex: 'status',
      width: 80,
      hideInSearch: true,
      render: (_, record) => ccStatusTag(record.status),
    },
    {
      title: '抄送时间',
      dataIndex: 'createTime',
      width: 170,
      hideInSearch: true,
      render: (_, record) => record.createTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 90,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() =>
            history.push(`/oa/cc/detail?id=${record.applicationId}`)
          }
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer header={{ title: '抄送我的' }}>
      <ProTable<OaCcItemVo>
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        options={false}
        scroll={{ x: 960 }}
        request={async (params) => {
          try {
            const response = await queryOaCcPage({
              keyword: params.keyword?.trim() || undefined,
              status: params.status || undefined,
              page: params.current ?? 1,
              size: params.pageSize ?? 20,
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
        pagination={{ defaultPageSize: 20, showSizeChanger: true }}
        locale={{
          emptyText: (
            <Space direction="vertical" align="center">
              <MailOutlined style={{ fontSize: 28 }} />
              <Typography.Text type="secondary">
                暂无抄送给您的申请
              </Typography.Text>
            </Space>
          ),
        }}
      />
    </PageContainer>
  );
};

export default CcListPage;
