/**
 * OA 工作台：汇总当前用户的待办、进行中申请、未读消息、今日日程、会议与用车，数据仅限本人。
 */
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Button,
  Card,
  Col,
  Empty,
  List,
  message,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
} from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import {
  getOaWorkbench,
  type OaWorkbenchItemVo,
  type OaWorkbenchVo,
} from '@/services/web/guardfind/oa';
import {
  MEETING_BOOKING_STATUS_META,
  timeRange,
  VEHICLE_REQUEST_STATUS_META,
} from '@/utils/oaResource';
import { BUSINESS_TYPE_META } from '@/utils/oaStats';
import { applicationStatusTag } from '../application/components/ApplicationStatus';
import { metaTag } from '../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

function itemTime(item: OaWorkbenchItemVo) {
  if (!item.startTime || !item.endTime) return null;
  return timeRange(item.startTime, item.endTime);
}

interface ItemCardProps {
  title: string;
  items: OaWorkbenchItemVo[];
  path: string;
  empty: string;
  statusMeta?: Record<string, { text: string; color: string }>;
}

const ItemCard: React.FC<ItemCardProps> = ({
  title,
  items,
  path,
  empty,
  statusMeta,
}) => (
  <Card
    title={title}
    size="small"
    extra={
      <Button type="link" size="small" onClick={() => history.push(path)}>
        查看全部
      </Button>
    }
  >
    {items.length === 0 ? (
      <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={empty} />
    ) : (
      <List
        size="small"
        dataSource={items}
        renderItem={(item) => (
          <List.Item
            extra={statusMeta ? metaTag(statusMeta, item.status) : null}
          >
            <List.Item.Meta
              title={item.title}
              description={
                <Space size={8} wrap>
                  {itemTime(item) && <span>{itemTime(item)}</span>}
                  {item.subtitle && <span>{item.subtitle}</span>}
                </Space>
              }
            />
          </List.Item>
        )}
      />
    )}
  </Card>
);

const WorkbenchPage: React.FC = () => {
  const [data, setData] = useState<OaWorkbenchVo | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getOaWorkbench();
      setData(response.data ?? null);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cards = data
    ? [
        {
          key: 'todo',
          title: '待我审批',
          value: data.todoCount,
          path: '/oa/tasks',
          extra:
            data.overdueTodoCount > 0 ? (
              <Tag color="red">
                超 {data.overdueHours} 小时 {data.overdueTodoCount}
              </Tag>
            ) : null,
        },
        {
          key: 'running',
          title: '我发起进行中',
          value: data.runningCount,
          path: '/oa/application',
        },
        {
          key: 'notify',
          title: '未读通知',
          value: data.unreadNotificationCount,
          path: '/oa/notifications',
        },
        {
          key: 'cc',
          title: '未读抄送',
          value: data.unreadCcCount,
          path: '/oa/cc',
        },
        {
          key: 'report',
          title: '今日日报',
          value: data.dailyReportSubmitted ? '已提交' : '未提交',
          path: '/oa/report',
          extra: data.dailyReportSubmitted ? null : (
            <Tag color="orange">待填写</Tag>
          ),
        },
      ]
    : [];

  return (
    <PageContainer
      header={{ title: 'OA 工作台' }}
      extra={[
        <Button key="refresh" onClick={() => void load()}>
          刷新
        </Button>,
        <Button
          key="launch"
          type="primary"
          onClick={() => history.push('/oa/launch')}
        >
          发起申请
        </Button>,
      ]}
    >
      <Spin spinning={loading}>
        {!data ? (
          <Card>
            <Empty description={loading ? '加载中' : '暂无数据'} />
          </Card>
        ) : (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Row gutter={[16, 16]}>
              {cards.map((card) => (
                <Col key={card.key} flex="1 0 180px">
                  <Card
                    hoverable
                    size="small"
                    data-testid={`workbench-${card.key}`}
                    onClick={() => history.push(card.path)}
                  >
                    <Statistic title={card.title} value={card.value} />
                    {card.extra}
                  </Card>
                </Col>
              ))}
            </Row>
            <Row gutter={[16, 16]}>
              <Col xs={24} lg={12}>
                <Card
                  title="最近申请"
                  size="small"
                  extra={
                    <Button
                      type="link"
                      size="small"
                      onClick={() => history.push('/oa/application')}
                    >
                      查看全部
                    </Button>
                  }
                >
                  {data.recentApplications.length === 0 ? (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description="暂无申请"
                    />
                  ) : (
                    <List
                      size="small"
                      dataSource={data.recentApplications}
                      renderItem={(app) => (
                        <List.Item
                          style={{ cursor: 'pointer' }}
                          onClick={() =>
                            history.push(`/oa/application/detail?id=${app.id}`)
                          }
                          extra={applicationStatusTag(app.status)}
                        >
                          <List.Item.Meta
                            title={
                              <Typography.Text ellipsis>
                                {app.title}
                              </Typography.Text>
                            }
                            description={
                              <Space size={8} wrap>
                                {metaTag(BUSINESS_TYPE_META, app.businessType)}
                                {app.submittedTime && (
                                  <span>{app.submittedTime}</span>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  )}
                </Card>
              </Col>
              <Col xs={24} lg={12}>
                <ItemCard
                  title="今日日程"
                  items={data.todayEvents}
                  path="/oa/calendar"
                  empty="今日暂无日程"
                />
              </Col>
              <Col xs={24} lg={12}>
                <ItemCard
                  title="即将开始的会议"
                  items={data.upcomingMeetings}
                  path="/oa/meeting/book"
                  empty="暂无会议预订"
                  statusMeta={MEETING_BOOKING_STATUS_META}
                />
              </Col>
              <Col xs={24} lg={12}>
                <ItemCard
                  title="进行中的用车"
                  items={data.activeVehicleRequests}
                  path="/oa/vehicle/mine"
                  empty="暂无用车申请"
                  statusMeta={VEHICLE_REQUEST_STATUS_META}
                />
              </Col>
            </Row>
          </Space>
        )}
      </Spin>
    </PageContainer>
  );
};

export default WorkbenchPage;
