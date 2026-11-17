import { PageContainer } from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Col,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
} from 'antd';
import { useEffect, useState } from 'react';
import {
  bookingLabels,
  type Metrics,
  metrics,
} from '@/services/web/guardfind/operations';
export default function Operations() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<Metrics>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(false);
    metrics(days)
      .then((r) => {
        if (alive) setData(r.data);
      })
      .catch(() => {
        if (alive) setError(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [days, revision]);
  const names: Record<string, string> = {
    VIEW: '房源浏览',
    CONSULT: '发起咨询',
    BOOKING: '提交预约',
    VISIT: '已到访',
    COMPLETE: '完成看房',
  };
  return (
    <PageContainer
      title="房源运营看板"
      extra={
        <Space>
          <Select
            value={days}
            onChange={setDays}
            options={[7, 30, 90].map((value) => ({
              value,
              label: `最近 ${value} 天`,
            }))}
          />
          <Button onClick={() => setRevision((v) => v + 1)}>刷新</Button>
        </Space>
      }
    >
      <Alert
        type="info"
        showIcon
        message="行为统计从本功能上线后开始记录；浏览和咨询按同一用户同一房源一分钟去重，事件数量不等同于独立访客。"
        style={{ marginBottom: 24 }}
      />
      {loading ? (
        <Spin />
      ) : error ? (
        <Alert type="error" message="统计加载失败，请刷新重试" />
      ) : (
        data && (
          <>
            <Row gutter={[24, 24]}>
              {Object.keys(names).map((key) => (
                <Col xs={12} md={4} key={key}>
                  <Statistic
                    title={names[key]}
                    value={
                      data.events.find((e) => e.eventType === key)?.total || 0
                    }
                  />
                </Col>
              ))}
            </Row>
            <Row gutter={32} style={{ margin: '32px 0' }}>
              <Col>
                <Statistic title="待确认预约" value={data.pending} />
              </Col>
              <Col>
                <Statistic title="已到时间仍未确认" value={data.overdue} />
              </Col>
              <Col>
                <Statistic title="待解决客服会话" value={data.unresolved} />
              </Col>
            </Row>
            <h3>预约结果分布</h3>
            <Table
              rowKey="status"
              pagination={false}
              dataSource={data.bookings}
              columns={[
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (v) => bookingLabels[v],
                },
                { title: '数量', dataIndex: 'total' },
              ]}
            />
            <h3>管家接待量</h3>
            <Table
              rowKey={(r) => String(r.managerId || 'unassigned')}
              dataSource={data.managers}
              columns={[
                {
                  title: '服务管家',
                  dataIndex: 'nickname',
                  render: (v) => v || '未分配',
                },
                { title: '预约数', dataIndex: 'bookings' },
                { title: '完成数', dataIndex: 'completed' },
              ]}
            />
            <h3>热门房源</h3>
            <Table
              rowKey="id"
              dataSource={data.properties}
              columns={[
                { title: '房源', dataIndex: 'title' },
                { title: '行为次数', dataIndex: 'events' },
                { title: '咨询次数', dataIndex: 'consultations' },
              ]}
            />
            <h3>每日行为</h3>
            <Table
              rowKey={(r) => `${r.day}-${r.eventType}`}
              dataSource={data.daily}
              columns={[
                { title: '日期', dataIndex: 'day' },
                {
                  title: '行为',
                  dataIndex: 'eventType',
                  render: (v) => names[v] || v,
                },
                { title: '数量', dataIndex: 'total' },
              ]}
            />
          </>
        )
      )}
    </PageContainer>
  );
}
