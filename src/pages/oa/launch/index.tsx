/**
 * 发起流程列表：只展示当前用户可发起、且仍有生效发布版本的流程。
 */
import { FormOutlined, UnorderedListOutlined } from '@ant-design/icons';
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tag, Typography } from 'antd';
import React from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type OaLaunchItemVo,
  queryOaLaunches,
} from '@/services/web/guardfind/oa';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const LaunchListPage: React.FC = () => {
  const columns: ProColumns<OaLaunchItemVo>[] = [
    {
      title: '搜索',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '流程名称或标识' },
    },
    {
      title: '分类',
      dataIndex: 'category',
      hideInTable: true,
      fieldProps: { placeholder: '分类' },
    },
    {
      title: '流程',
      dataIndex: 'modelName',
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text strong>{record.modelName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.modelKey}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        record.category ? <Tag>{record.category}</Tag> : '—',
    },
    {
      title: '表单',
      dataIndex: 'formName',
      width: 220,
      hideInSearch: true,
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Typography.Text>{record.formName}</Typography.Text>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {record.formKey} · v{record.formVersion}
          </Typography.Text>
        </Space>
      ),
    },
    {
      title: '发布版本',
      dataIndex: 'releaseVersion',
      width: 100,
      hideInSearch: true,
      render: (_, record) => `v${record.releaseVersion}`,
    },
    {
      title: '发布时间',
      dataIndex: 'publishTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 140,
      render: (_, record) => (
        <AccessControl permission="system:oa:launch:submit">
          <Button
            type="link"
            icon={<FormOutlined />}
            onClick={() =>
              history.push(`/oa/launch/fill?releaseId=${record.releaseId}`)
            }
          >
            发起
          </Button>
        </AccessControl>
      ),
    },
  ];

  return (
    <PageContainer
      header={{
        title: '发起流程',
        extra: (
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => history.push('/oa/application')}
          >
            我的申请
          </Button>
        ),
      }}
    >
      <ProTable<OaLaunchItemVo>
        rowKey="releaseId"
        columns={columns}
        search={{ labelWidth: 'auto' }}
        options={false}
        scroll={{ x: 900 }}
        request={async (params) => {
          try {
            const response = await queryOaLaunches({
              keyword: params.keyword?.trim() || undefined,
              category: params.category?.trim() || undefined,
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
      />
    </PageContainer>
  );
};

export default LaunchListPage;
