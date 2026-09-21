import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, message, Popconfirm, Space, Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import type { SysConfigVo } from '@/services/web/system';
import { config } from '@/services/web/system';
import ClientConfig from './components/ClientConfig';
import ConfigForm from './components/ConfigForm';
import LoginConfig from './components/LoginConfig';
import MailConfig from './components/MailConfig';
import SecurityConfig from './components/SecurityConfig';
import SiteConfig from './components/SiteConfig';
import SmsConfig from './components/SmsConfig';
import StorageConfig from './components/StorageConfig';

const ConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const [formVisible, setFormVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<SysConfigVo | null>(null);

  const columns: ProColumns<SysConfigVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.config.name' }),
      dataIndex: 'name',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.config.key' }),
      dataIndex: 'confKey',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.config.value' }),
      dataIndex: 'confValue',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'system.config.category' }),
      dataIndex: 'category',
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'remarks',
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.time.create' }),
      dataIndex: 'createTime',
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      render: (_, record) => (
        <Space>
          <AccessControl permission="system:config:edit">
            <Button
              type="link"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            >
              {intl.formatMessage({ id: 'common.operation.edit' })}
            </Button>
          </AccessControl>
          <AccessControl permission="system:config:del">
            <Popconfirm
              title={intl.formatMessage({ id: 'common.delete.confirm' })}
              onConfirm={() => handleDelete(record)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                {intl.formatMessage({ id: 'common.operation.delete' })}
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleAdd = () => {
    setCurrentConfig(null);
    setFormVisible(true);
  };

  const handleEdit = (record: SysConfigVo) => {
    setCurrentConfig(record);
    setFormVisible(true);
  };

  const handleDelete = async (record: SysConfigVo) => {
    try {
      await config.del(record);
      message.success(intl.formatMessage({ id: 'common.delete.success' }));
      actionRef.current?.reload();
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const handleFormSuccess = () => {
    setFormVisible(false);
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <Tabs
        items={[
          {
            key: 'params',
            label: '参数配置',
            children: (
              <>
                <ProTable<SysConfigVo>
                  headerTitle={intl.formatMessage({
                    id: 'system.config.title',
                  })}
                  actionRef={actionRef}
                  rowKey="id"
                  columns={columns}
                  request={async (params) => {
                    const { current, pageSize, ...rest } = params;
                    const response = await config.query({
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
                    <AccessControl key="add" permission="system:config:edit">
                      <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={handleAdd}
                      >
                        {intl.formatMessage({ id: 'common.operation.add' })}
                      </Button>
                    </AccessControl>,
                  ]}
                />
                <ConfigForm
                  visible={formVisible}
                  config={currentConfig}
                  onCancel={() => setFormVisible(false)}
                  onSuccess={handleFormSuccess}
                />
              </>
            ),
          },
          { key: 'site', label: '站点配置', children: <SiteConfig /> },
          { key: 'security', label: '安全配置', children: <SecurityConfig /> },
          { key: 'mail', label: '邮件配置', children: <MailConfig /> },
          { key: 'login', label: '登录配置', children: <LoginConfig /> },
          { key: 'storage', label: '存储配置', children: <StorageConfig /> },
          { key: 'sms', label: '短信配置', children: <SmsConfig /> },
          { key: 'client', label: '客户端配置', children: <ClientConfig /> },
        ]}
      />
    </PageContainer>
  );
};

export default ConfigPage;
