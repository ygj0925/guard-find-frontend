import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  StarOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  deleteSmsConfig,
  querySmsConfigs,
  setDefaultSms,
} from '@/services/web/sms/config';
import type { SmsConfigVo } from '@/services/web/sms/typings';
import SmsConfigForm from './components/SmsConfigForm';

const SmsConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [formVisible, setFormVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<SmsConfigVo | null>(null);

  const handleAdd = () => {
    setCurrentRecord(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SmsConfigVo) => {
    setCurrentRecord(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SmsConfigVo) => {
    try {
      await deleteSmsConfig(record.id);
      message.success('删除成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleSetDefault = async (record: SmsConfigVo) => {
    try {
      await setDefaultSms(record.id);
      message.success('设置默认成功');
      actionRef.current?.reload();
    } catch (error) {
      console.error('Set default failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  const columns: ProColumns<SmsConfigVo>[] = [
    {
      title: '名称',
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: '平台',
      dataIndex: 'platform',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '签名',
      dataIndex: 'signName',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: '默认',
      dataIndex: 'isDefault',
      hideInSearch: true,
      render: (_, record) =>
        record.isDefault ? <Tag color="green">默认</Tag> : <Tag>否</Tag>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      hideInSearch: true,
      render: (_, record) =>
        record.status === 1 ? (
          <Tag color="green">启用</Tag>
        ) : (
          <Tag color="red">禁用</Tag>
        ),
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
      width: 220,
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:sms:config:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              编辑
            </Button>
          </AccessControl>
          {!record.isDefault && (
            <AccessControl permission="system:sms:config:edit">
              <Popconfirm
                title="确定设为默认短信配置吗？"
                onConfirm={() => handleSetDefault(record)}
              >
                <Button type="link" icon={<StarOutlined />}>
                  默认
                </Button>
              </Popconfirm>
            </AccessControl>
          )}
          <AccessControl permission="system:sms:config:del">
            <Popconfirm
              title="确定要删除吗？"
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

  return (
    <PageContainer>
      <ProTable<SmsConfigVo>
        headerTitle="短信配置"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await querySmsConfigs({
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
          <AccessControl key="add" permission="system:sms:config:add">
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              新增
            </Button>
          </AccessControl>,
        ]}
      />

      <SmsConfigForm
        visible={formVisible}
        record={currentRecord}
        onCancel={() => setFormVisible(false)}
        onSuccess={handleFormSuccess}
      />
    </PageContainer>
  );
};

export default SmsConfigPage;
