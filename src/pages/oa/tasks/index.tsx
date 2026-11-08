/**
 * 审批中心：待办与已办只展示当前处理人的任务，动作在详情页提交。
 */
import {
  CheckSquareOutlined,
  SettingOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons';
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Space, Tabs, Tag, Typography } from 'antd';
import React, { useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type OaDoneRecordVo,
  type OaTodoTaskVo,
  queryOaDoneRecords,
  queryOaTodoTasks,
} from '@/services/web/guardfind/oa';
import { APPLICATION_STATUS_META } from '../application/components/ApplicationStatus';
import DelegateRulesModal from './components/DelegateRulesModal';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const DONE_ACTION_META: Record<string, { text: string; color: string }> = {
  APPROVE: { text: '审批通过', color: 'green' },
  REJECT: { text: '驳回', color: 'red' },
  RETURN: { text: '退回上一节点', color: 'orange' },
  CLAIM: { text: '领取任务', color: 'blue' },
  TRANSFER: { text: '转交任务', color: 'purple' },
};

function doneActionTag(action: string) {
  const meta = DONE_ACTION_META[action] || { text: action, color: 'default' };
  return <Tag color={meta.color}>{meta.text}</Tag>;
}

const todoColumns: ProColumns<OaTodoTaskVo>[] = [
  {
    title: '搜索',
    dataIndex: 'keyword',
    hideInTable: true,
    fieldProps: { placeholder: '标题或业务编号' },
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
    title: '流程 / 表单',
    dataIndex: 'modelName',
    width: 190,
    hideInSearch: true,
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Typography.Text>{record.modelName || '—'}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.formName || '—'}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '申请人',
    dataIndex: 'applicantName',
    width: 160,
    hideInSearch: true,
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Typography.Text>{record.applicantName || '—'}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.applicantDeptName || '—'}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '当前节点',
    dataIndex: 'taskName',
    width: 180,
    hideInSearch: true,
    render: (_, record) => (
      <Space size={4} wrap>
        <span>{record.taskName || '—'}</span>
        {record.proxyForName ? (
          <Tag color="purple">代 {record.proxyForName}</Tag>
        ) : null}
      </Space>
    ),
  },
  {
    title: '到达时间',
    dataIndex: 'taskCreateTime',
    width: 170,
    hideInSearch: true,
    render: (_, record) => record.taskCreateTime || record.submittedTime || '—',
  },
  {
    title: '操作',
    valueType: 'option',
    fixed: 'right',
    className: 'table-action-column',
    width: 100,
    render: (_, record) => (
      <Button
        type="link"
        onClick={() => history.push(`/oa/tasks/detail?taskId=${record.taskId}`)}
      >
        处理
      </Button>
    ),
  },
];

const doneColumns: ProColumns<OaDoneRecordVo>[] = [
  {
    title: '搜索',
    dataIndex: 'keyword',
    hideInTable: true,
    fieldProps: { placeholder: '标题或业务编号' },
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
    title: '流程 / 表单',
    dataIndex: 'modelName',
    width: 190,
    hideInSearch: true,
    render: (_, record) => (
      <Space direction="vertical" size={0}>
        <Typography.Text>{record.modelName || '—'}</Typography.Text>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {record.formName || '—'}
        </Typography.Text>
      </Space>
    ),
  },
  {
    title: '申请人',
    dataIndex: 'applicantName',
    width: 120,
    hideInSearch: true,
    render: (_, record) => record.applicantName || '—',
  },
  {
    title: '动作',
    dataIndex: 'action',
    width: 130,
    hideInSearch: true,
    render: (_, record) => doneActionTag(record.action),
  },
  {
    title: '意见',
    dataIndex: 'reason',
    width: 180,
    hideInSearch: true,
    ellipsis: true,
    render: (_, record) => record.reason || '—',
  },
  {
    title: '处理时间',
    dataIndex: 'operatedTime',
    width: 170,
    hideInSearch: true,
    render: (_, record) => record.operatedTime || '—',
  },
  {
    title: '申请状态',
    dataIndex: 'applicationStatus',
    width: 100,
    hideInSearch: true,
    render: (_, record) => {
      const meta = APPLICATION_STATUS_META[record.applicationStatus] || {
        text: record.applicationStatus,
        color: 'default',
      };
      return <Tag color={meta.color}>{meta.text}</Tag>;
    },
  },
  {
    title: '操作',
    valueType: 'option',
    fixed: 'right',
    className: 'table-action-column',
    width: 100,
    render: (_, record) =>
      record.taskId ? (
        <Button
          type="link"
          onClick={() =>
            history.push(`/oa/tasks/detail?taskId=${record.taskId}`)
          }
        >
          查看
        </Button>
      ) : (
        <span>—</span>
      ),
  },
];

const TaskListPage: React.FC = () => {
  const [delegateOpen, setDelegateOpen] = useState(false);

  return (
    <PageContainer
      header={{
        title: '审批中心',
        subTitle: '只展示当前处理人的待办与已办',
        extra: (
          <AccessControl permission="system:oa:delegate:manage">
            <Button
              icon={<SettingOutlined />}
              onClick={() => setDelegateOpen(true)}
            >
              限时代理
            </Button>
          </AccessControl>
        ),
      }}
    >
      <Tabs
        items={[
          {
            key: 'todo',
            label: '待办',
            children: (
              <ProTable<OaTodoTaskVo>
                rowKey="taskId"
                columns={todoColumns}
                search={{ labelWidth: 'auto' }}
                options={false}
                scroll={{ x: 1100 }}
                request={async (params) => {
                  try {
                    const response = await queryOaTodoTasks({
                      keyword: params.keyword?.trim() || undefined,
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
                      <CheckSquareOutlined style={{ fontSize: 28 }} />
                      <Typography.Text type="secondary">
                        当前没有待审批任务
                      </Typography.Text>
                    </Space>
                  ),
                }}
              />
            ),
          },
          {
            key: 'done',
            label: '已办',
            children: (
              <ProTable<OaDoneRecordVo>
                rowKey={(record) =>
                  `${record.taskId ?? record.applicationId}-${record.operatedTime ?? ''}`
                }
                columns={doneColumns}
                search={{ labelWidth: 'auto' }}
                options={false}
                scroll={{ x: 1200 }}
                request={async (params) => {
                  try {
                    const response = await queryOaDoneRecords({
                      keyword: params.keyword?.trim() || undefined,
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
                        还没有处理过审批任务
                      </Typography.Text>
                    </Space>
                  ),
                }}
              />
            ),
          },
        ]}
      />
      <DelegateRulesModal
        open={delegateOpen}
        onClose={() => setDelegateOpen(false)}
      />
    </PageContainer>
  );
};

export default TaskListPage;
