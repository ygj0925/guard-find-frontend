import {
  AppstoreOutlined,
  FileOutlined,
  NotificationOutlined,
  PushpinOutlined,
  SettingOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useModel } from '@umijs/max';
import { Card, Col, List, Row, Space, Statistic, Tag, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import * as dashboardService from '@/services/web/dashboard';
import type {
  DashboardNoticeResp,
  DashboardOverviewCommonResp,
} from '@/services/web/dashboard/typings';

const { Title, Text } = Typography;

const shortcuts = [
  {
    title: '用户管理',
    icon: <TeamOutlined />,
    path: '/system/user',
    permission: 'system:user:list',
  },
  {
    title: '角色管理',
    icon: <AppstoreOutlined />,
    path: '/system/role',
    permission: 'system:role:list',
  },
  {
    title: '菜单管理',
    icon: <SettingOutlined />,
    path: '/system/menu',
    permission: 'system:menu:list',
  },
  {
    title: '文件管理',
    icon: <FileOutlined />,
    path: '/system/file',
    permission: 'system:file:list',
  },
  {
    title: '公告管理',
    icon: <NotificationOutlined />,
    path: '/notify/announcement',
    permission: 'system:notice:list',
  },
  {
    title: '系统配置',
    icon: <SettingOutlined />,
    path: '/system/config',
    permission: 'system:option:list',
  },
];

const WorkplacePage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const userInfo = initialState?.user;
  const [pvOverview, setPvOverview] = useState<DashboardOverviewCommonResp>();
  const [ipOverview, setIpOverview] = useState<DashboardOverviewCommonResp>();
  const [notices, setNotices] = useState<DashboardNoticeResp[]>([]);

  useEffect(() => {
    dashboardService.getDashboardOverviewPv().then((res) => {
      if (res.data) setPvOverview(res.data);
    });
    dashboardService.getDashboardOverviewIp().then((res) => {
      if (res.data) setIpOverview(res.data);
    });
    dashboardService.listDashboardNotice().then((res) => {
      if (res.data) setNotices(res.data);
    });
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 9) return '早上好';
    if (hour < 12) return '上午好';
    if (hour < 14) return '中午好';
    if (hour < 18) return '下午好';
    return '晚上好';
  };

  return (
    <PageContainer>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Card>
            <Space size="large">
              <div>
                <Title level={4} style={{ marginBottom: 4 }}>
                  {getGreeting()}，{userInfo?.nickname || userInfo?.username}
                </Title>
                <Text type="secondary">欢迎回来，祝你开心每一天！</Text>
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="访问次数"
              value={pvOverview?.total || 0}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  今日 {pvOverview?.today || 0}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="独立IP"
              value={ipOverview?.total || 0}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  今日 {ipOverview?.today || 0}
                </Text>
              }
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="PV增长率"
              value={pvOverview?.growth || 0}
              suffix="%"
              valueStyle={{
                color: (pvOverview?.growth || 0) >= 0 ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="IP增长率"
              value={ipOverview?.growth || 0}
              suffix="%"
              valueStyle={{
                color: (ipOverview?.growth || 0) >= 0 ? '#3f8600' : '#cf1322',
              }}
            />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="快捷操作">
            <Row gutter={[16, 16]}>
              {shortcuts.map((item) => (
                <Col span={8} key={item.path}>
                  <Card
                    hoverable
                    size="small"
                    onClick={() => history.push(item.path)}
                  >
                    <Space>
                      {item.icon}
                      <span>{item.title}</span>
                    </Space>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="最新公告" style={{ height: '100%' }}>
            <List
              size="small"
              dataSource={notices}
              renderItem={(item) => (
                <List.Item
                  style={{ cursor: 'pointer' }}
                  onClick={() => history.push(`/user/notice?id=${item.id}`)}
                >
                  <Space>
                    {item.isTop && (
                      <Tag icon={<PushpinOutlined />} color="red">
                        置顶
                      </Tag>
                    )}
                    <Text ellipsis style={{ maxWidth: 180 }}>
                      {item.title}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default WorkplacePage;
