/**
 * 我的申请：只展示当前登录人发起的申请，支持按标题/业务编号与状态筛选。
 */
import { FormOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Typography } from 'antd';
import React from 'react';
import {
  type OaApplicationVo,
  queryOaApplications,
} from '@/services/web/guardfind/oa';
import {
  APPLICATION_STATUS_META,
  applicationStatusTag,
} from './components/ApplicationStatus';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const ApplicationListPage: React.FC = () => {
  const columns: ProColumns<OaApplicationVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '标题或业务编号' },
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInTable: true,
      valueType: 'select',
      valueEnum: Object.fromEntries(
        Object.entries(APPLICATION_STATUS_META).map(([value, meta]) => [
          value,
          { text: meta.text },
        ]),
      ),
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
      title: '流程',
      dataIndex: 'modelName',
      width: 160,
      hideInSearch: true,
      render: (_, record) => record.modelName || record.businessType,
    },
    {
      title: '表单',
      dataIndex: 'formName',
      width: 180,
      hideInSearch: true,
      render: (_, record) =>
        record.formName
          ? `${record.formName}${record.formVersion ? ` v${record.formVersion}` : ''}`
          : '—',
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      hideInSearch: true,
      render: (_, record) => applicationStatusTag(record.status),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedTime',
      width: 170,
      hideInSearch: true,
      render: (_, record) => record.submittedTime || record.createTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 110,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => history.push(`/oa/application/detail?id=${record.id}`)}
        >
          查看
        </Button>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '我的申请',
        extra: (
          <Button
            type="primary"
            icon={<FormOutlined />}
            onClick={() => history.push('/oa/launch')}
          >
            发起流程
          </Button>
        ),
      }}
    >
      <ProTable<OaApplicationVo>
        rowKey="id"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        options={false}
        scroll={{ x: 900 }}
        request={async (params) => {
          try {
            const response = await queryOaApplications({
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
              <UnorderedListOutlined style={{ fontSize: 28 }} />
              <Typography.Text type="secondary">
                还没有提交过申请
              </Typography.Text>
              <Button type="link" onClick={() => history.push('/oa/launch')}>
                去发起流程
              </Button>
            </Space>
          ),
        }}
      />
    </PageContainer>
  );
};

export default ApplicationListPage;
