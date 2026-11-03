/**
 * 客户端配置页（sys_menu 组件路径 system/config/client/index）。
 * 与“系统配置 → 客户端配置”tab 共用同一实现，这里补外层 PageContainer。
 */
import { PageContainer } from '@ant-design/pro-components';
import React from 'react';
import ClientConfig from '../components/ClientConfig';

const ClientConfigPage: React.FC = () => (
  <PageContainer>
    <ClientConfig />
  </PageContainer>
);

export default ClientConfigPage;
