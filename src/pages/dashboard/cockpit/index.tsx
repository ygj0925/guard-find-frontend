import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FileTextOutlined,
  PlusOutlined,
  TeamOutlined,
} from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { useModel } from '@umijs/max';
import {
  Avatar,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React from 'react';
import AccessControl from '@/components/AccessControl';

const metrics = [
  {
    title: '我的任务',
    value: 0,
    icon: <CheckCircleOutlined />,
    color: '#1677ff',
  },
  {
    title: '待处理',
    value: 0,
    icon: <ClockCircleOutlined />,
    color: '#fa8c16',
  },
  { title: '本周会议', value: 0, icon: <CalendarOutlined />, color: '#52c41a' },
  { title: '协作成员', value: 0, icon: <TeamOutlined />, color: '#722ed1' },
];

const CockpitPage: React.FC = () => {
  const { initialState } = useModel('@@initialState');
  const user = initialState?.user;

  return (
    <PageContainer
      title={`你好，${user?.nickname || user?.username || '欢迎回来'}`}
      subTitle="这里是你的协同工作台"
      extra={
        <AccessControl permission="task:item:create">
          <Button type="primary" icon={<PlusOutlined />}>
            新建任务
          </Button>
        </AccessControl>
      }
    >
      <Row gutter={[16, 16]}>
        {metrics.map((metric) => (
          <Col xs={24} sm={12} xl={6} key={metric.title}>
            <Card variant="borderless">
              <Flex justify="space-between" align="center">
                <Statistic title={metric.title} value={metric.value} />
                <Avatar
                  size={44}
                  style={{
                    background: `${metric.color}18`,
                    color: metric.color,
                  }}
                  icon={metric.icon}
                />
              </Flex>
            </Card>
          </Col>
        ))}
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} xl={16}>
          <Card
            title="任务看板"
            extra={<Tag color="blue">进行中</Tag>}
            variant="borderless"
          >
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description="暂无任务数据"
            >
              <AccessControl permission="task:item:create">
                <Button type="primary" icon={<PlusOutlined />}>
                  创建第一个任务
                </Button>
              </AccessControl>
            </Empty>
          </Card>
        </Col>
        <Col xs={24} xl={8}>
          <Card title="本周进度" variant="borderless">
            <Space direction="vertical" size={20} style={{ width: '100%' }}>
              <div>
                <Flex justify="space-between">
                  <Typography.Text>任务完成率</Typography.Text>
                  <Typography.Text type="secondary">0 / 0</Typography.Text>
                </Flex>
                <Progress percent={0} strokeColor="#1677ff" />
              </div>
              <div>
                <Flex justify="space-between">
                  <Typography.Text>会议执行率</Typography.Text>
                  <Typography.Text type="secondary">0 / 0</Typography.Text>
                </Flex>
                <Progress percent={0} strokeColor="#52c41a" />
              </div>
            </Space>
          </Card>
          <Card title="最近文件" variant="borderless" style={{ marginTop: 16 }}>
            <Empty
              image={
                <FileTextOutlined style={{ fontSize: 36, color: '#bfbfbf' }} />
              }
              description="暂无最近文件"
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default CockpitPage;
