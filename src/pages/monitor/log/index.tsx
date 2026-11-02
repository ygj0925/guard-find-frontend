import { PageContainer } from '@ant-design/pro-components';
import { Tabs } from 'antd';
import React, { lazy, Suspense } from 'react';

const LoginLogPage = lazy(() => import('./login'));
const OperationLogPage = lazy(() => import('./operation'));

/**
 * 系统日志:登录日志 / 操作日志两个子页的 Tab 容器。
 * sys_menu 的 /monitor/log 指向本页,子页各自保留独立路由可直达。
 */
const MonitorLogPage: React.FC = () => (
  <PageContainer title={false}>
    <Tabs
      defaultActiveKey="login"
      items={[
        {
          key: 'login',
          label: '登录日志',
          children: (
            <Suspense fallback={null}>
              <LoginLogPage />
            </Suspense>
          ),
        },
        {
          key: 'operation',
          label: '操作日志',
          children: (
            <Suspense fallback={null}>
              <OperationLogPage />
            </Suspense>
          ),
        },
      ]}
    />
  </PageContainer>
);

export default MonitorLogPage;
