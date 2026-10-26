import {
  DeleteOutlined,
  EditOutlined,
  PlayCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Switch } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  deleteJob,
  listGroups,
  queryJobs,
  toggleJobStatus,
  triggerJob,
} from '@/services/web/schedule/job';
import type { JobVo } from '@/services/web/schedule/typings';
import JobForm from './components/JobForm';

const JobPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<JobVo | null>(null);

  const columns: ProColumns<JobVo>[] = [
    {
      title: '任务名称',
      dataIndex: 'jobName',
      width: 180,
      ellipsis: true,
    },
    {
      title: '任务分组',
      dataIndex: 'groupName',
      width: 140,
      ellipsis: true,
      valueType: 'select',
      // 分组候选来自后端 `GET /schedule/job/group`，避免手输错拼
      request: async () => {
        try {
          const response = await listGroups();
          return (response.data || []).map((group) => ({
            label: group,
            value: group,
          }));
        } catch (error) {
          console.error('Load groups failed:', error);
          return [];
        }
      },
    },
    {
      title: '触发方式',
      dataIndex: 'triggerType',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      valueEnum: {
        1: { text: 'CRON' },
        2: { text: '固定时间' },
        3: { text: 'API' },
      },
    },
    {
      title: '触发表达式',
      dataIndex: 'triggerInterval',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '执行器',
      dataIndex: 'executorInfo',
      width: 180,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '状态',
      dataIndex: 'jobStatus',
      width: 100,
      valueType: 'select',
      // 后端 JobStatusEnum：0 禁用 / 1 启用（与 DisEnableStatusEnum 的 1/2 不同）
      valueEnum: {
        0: { text: '禁用', status: 'Default' },
        1: { text: '启用', status: 'Processing' },
      },
      render: (_, record) => (
        <Switch
          checked={record.jobStatus === 1}
          onChange={(checked) => handleToggleStatus(record, checked ? 1 : 0)}
        />
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '下次触发时间',
      dataIndex: 'nextTriggerAt',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createDt',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 260,
      render: (_, record) => (
        <Space>
          <AccessControl permission="schedule:job:update">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          <AccessControl permission="schedule:job:trigger">
            <Button
              type="link"
              icon={<PlayCircleOutlined />}
              onClick={() => handleTrigger(record)}
            >
              执行
            </Button>
          </AccessControl>
          <AccessControl permission="schedule:job:delete">
            <Popconfirm
              title="确定要删除此任务吗？"
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

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormVisible(true);
  };

  const handleEdit = (record: JobVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: JobVo) => {
    try {
      await deleteJob(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleTrigger = async (record: JobVo) => {
    try {
      await triggerJob(record.id);
      message.success('执行成功');
    } catch (error) {
      console.error('Trigger failed:', error);
    }
  };

  const handleToggleStatus = async (record: JobVo, status: number) => {
    try {
      await toggleJobStatus(record.id, status);
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

  return (
    <PageContainer>
      <ProTable<JobVo>
        headerTitle="定时任务"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 'max-content' }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryJobs({
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
          <AccessControl key="add" permission="schedule:job:create">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <JobForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default JobPage;
