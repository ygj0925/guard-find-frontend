import { EditOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history, useIntl, useSearchParams } from '@umijs/max';
import { Button, Space, Tabs } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import DialogHost, { useDialog } from '@/components/DialogHost';
import { useAccess } from '@/hooks/useAccess';
import type { SysConfigQo, SysConfigVo } from '@/services/web/system';
import { config } from '@/services/web/system';
import { getOptionPermission } from '@/utils/optionAccess';
import { getTableScrollX } from '@/utils/tableLayout';
import ClientConfig from './components/ClientConfig';
import ConfigForm from './components/ConfigForm';
import LoginConfig from './components/LoginConfig';
import MailConfig from './components/MailConfig';
import SecurityConfig from './components/SecurityConfig';
import SiteConfig from './components/SiteConfig';

const ConfigPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  // 深链 /system/config?tab=xxx 直达对应 tab(sys_menu 隐藏菜单/浏览器刷新场景)
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<string>();
  const intl = useIntl();
  const { hasPermission, hasAnyPermission } = useAccess();
  const formDialog = useDialog<SysConfigVo | null>();

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
      title: intl.formatMessage({ id: 'common.table.actions' }),
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 100,
      render: (_, record) => (
        <Space wrap>
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
    formDialog.open(record);
  };

  const handleFormSuccess = () => {
    formDialog.close();
    actionRef.current?.reload();
  };

  // tab 清单:深链 /system/config?tab=xxx 直达对应 tab(sys_menu 隐藏菜单/浏览器刷新场景)
  const tabItems = [
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
            scroll={{ x: getTableScrollX(columns) }}
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
          <DialogHost dialog={formDialog}>
            {({ visible, data }) => (
              <ConfigForm
                visible={visible}
                config={data}
                onCancel={() => formDialog.close()}
                onSuccess={handleFormSuccess}
              />
            )}
          </DialogHost>
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
    // 存储配置/短信配置的管理页在独立路由 /system/storage、/system/sms-config。
    // 客户端配置对接后端 /system/client(CRUD)。
    {
      key: 'client',
      label: '客户端配置',
      children: <ClientConfig />,
      allowed: hasPermission('system:client:list'),
    },
  ];
  const currentTab = tabItems.some((item) => item.key === activeTab)
    ? activeTab
    : (tabItems.find((item) => item.key === searchParams.get('tab'))?.key ??
      tabItems[0]?.key);

  return (
    <PageContainer>
      <Tabs activeKey={currentTab} onChange={setActiveTab} items={tabItems} />
    </PageContainer>
  );
};

export default ConfigPage;
