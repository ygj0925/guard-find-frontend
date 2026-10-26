import { EditOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Button, Space, Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import type { SysConfigQo, SysConfigVo } from '@/services/web/system';
import { config } from '@/services/web/system';
import { getOptionPermission } from '@/utils/optionAccess';
import ClientConfig from './components/ClientConfig';
import ConfigForm from './components/ConfigForm';
import LoginConfig from './components/LoginConfig';
import MailConfig from './components/MailConfig';
import SecurityConfig from './components/SecurityConfig';
import SiteConfig from './components/SiteConfig';

const ConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const intl = useIntl();
  const { hasPermission, hasAnyPermission } = useAccess();
  const [formVisible, setFormVisible] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<SysConfigVo | null>(null);

  const columns: ProColumns<SysConfigVo>[] = [
    {
      title: intl.formatMessage({ id: 'system.config.name' }),
      dataIndex: 'name',
      width: 180,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.config.key' }),
      dataIndex: 'code',
      width: 180,
      ellipsis: true,
    },
    {
      title: intl.formatMessage({ id: 'system.config.value' }),
      dataIndex: 'value',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.field.remark' }),
      dataIndex: 'description',
      width: 220,
      ellipsis: true,
      hideInSearch: true,
    },
    {
      title: intl.formatMessage({ id: 'common.operation.confirm' }),
      valueType: 'option',
      width: 100,
      render: (_, record) => (
        <Space>
          {record.category && (
            <AccessControl
              permission={getOptionPermission(record.category, 'update')}
            >
              <Button
                type="link"
                icon={<EditOutlined />}
                onClick={() => handleEdit(record)}
              >
                {intl.formatMessage({ id: 'common.operation.edit' })}
              </Button>
            </AccessControl>
          )}
        </Space>
      ),
    },
  ];

  const handleEdit = (record: SysConfigVo) => {
    setCurrentConfig(record);
    setFormVisible(true);
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
            allowed: hasAnyPermission([
              'system:siteConfig:get',
              'system:securityConfig:get',
              'system:mailConfig:get',
              'system:loginConfig:get',
            ]),
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
                  scroll={{ x: 'max-content' }}
                  pagination={false}
                  request={async (params) => {
                    const { name, code } = params as Partial<SysConfigQo>;
                    const response = await config.query({ name, code });
                    // 后端 `GET /system/option` 返回全量参数，不分页
                    return {
                      data: response.data || [],
                      success: true,
                    };
                  }}
                  toolBarRender={() => []}
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
          {
            key: 'site',
            label: '站点配置',
            children: <SiteConfig />,
            allowed: hasPermission('system:siteConfig:get'),
          },
          {
            key: 'security',
            label: '安全配置',
            children: <SecurityConfig />,
            allowed: hasPermission('system:securityConfig:get'),
          },
          {
            key: 'mail',
            label: '邮件配置',
            children: <MailConfig />,
            allowed: hasPermission('system:mailConfig:get'),
          },
          {
            key: 'login',
            label: '登录配置',
            children: <LoginConfig />,
            allowed: hasPermission('system:loginConfig:get'),
          },
          // 原先这里的"存储配置/短信配置"是伪装成 sys_option 的占位表单
          // （category=storage/sms 不属于后端 OptionCategoryEnum，请求必然 400）；
          // 真正的管理页已在各自路由：/system/storage、/system/sms-config。
          // "客户端配置"属后端 /system/client，尚未接入，见 align-backend-contract 阶段 6.1。
          {
            key: 'client',
            label: '客户端配置',
            children: <ClientConfig />,
            allowed: hasPermission('system:client:list'),
          },
        ].filter((item) => item.allowed)}
      />
    </PageContainer>
  );
};

export default ConfigPage;
