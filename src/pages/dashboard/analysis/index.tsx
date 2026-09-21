import { PageContainer } from '@ant-design/pro-components';
import { Card, Col, Row, Statistic, Table, Typography } from 'antd';
import React, { useEffect, useState } from 'react';
import * as dashboardService from '@/services/web/dashboard';
import type {
  DashboardChartCommonResp,
  DashboardOverviewCommonResp,
} from '@/services/web/dashboard/typings';

const { Text } = Typography;

const AnalysisPage: React.FC = () => {
  const [pvOverview, setPvOverview] = useState<DashboardOverviewCommonResp>();
  const [ipOverview, setIpOverview] = useState<DashboardOverviewCommonResp>();
  const [timeslotData, setTimeslotData] = useState<DashboardChartCommonResp[]>(
    [],
  );
  const [moduleData, setModuleData] = useState<DashboardChartCommonResp[]>([]);
  const [osData, setOsData] = useState<DashboardChartCommonResp[]>([]);
  const [browserData, setBrowserData] = useState<DashboardChartCommonResp[]>(
    [],
  );
  const [geoData, setGeoData] = useState<DashboardChartCommonResp[]>([]);

  useEffect(() => {
    dashboardService.getDashboardOverviewPv().then((res) => {
      if (res.data) setPvOverview(res.data);
    });
    dashboardService.getDashboardOverviewIp().then((res) => {
      if (res.data) setIpOverview(res.data);
    });
    dashboardService.getAnalysisTimeslot().then((res) => {
      if (res.data) setTimeslotData(res.data);
    });
    dashboardService.getAnalysisModule().then((res) => {
      if (res.data) setModuleData(res.data);
    });
    dashboardService.getAnalysisOs().then((res) => {
      if (res.data) setOsData(res.data);
    });
    dashboardService.getAnalysisBrowser().then((res) => {
      if (res.data) setBrowserData(res.data);
    });
    dashboardService.getAnalysisGeo().then((res) => {
      if (res.data) setGeoData(res.data);
    });
  }, []);

  const rankingColumns = [
    {
      title: '排名',
      dataIndex: 'rank',
      width: 60,
      render: (_: any, __: any, index: number) => index + 1,
    },
    { title: '名称', dataIndex: 'name', ellipsis: true },
    { title: '数量', dataIndex: 'value', width: 100 },
  ];

  return (
    <PageContainer>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <Statistic
              title="访问次数(PV)"
              value={pvOverview?.total || 0}
              suffix={
                <Text type="secondary" style={{ fontSize: 14 }}>
                  今日 {pvOverview?.today || 0}
                </Text>
              }
            />
            <div style={{ marginTop: 8 }}>
              <Text
                type={
                  pvOverview?.growth && pvOverview.growth >= 0
                    ? 'success'
                    : 'danger'
                }
              >
                较昨日 {pvOverview?.growth || 0}%
              </Text>
            </div>
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
            <div style={{ marginTop: 8 }}>
              <Text
                type={
                  ipOverview?.growth && ipOverview.growth >= 0
                    ? 'success'
                    : 'danger'
                }
              >
                较昨日 {ipOverview?.growth || 0}%
              </Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card title="操作系统分布">
            <Table
              size="small"
              columns={[
                { title: '系统', dataIndex: 'name' },
                { title: '数量', dataIndex: 'value', width: 60 },
              ]}
              dataSource={osData}
              rowKey="name"
              pagination={false}
              scroll={{ y: 120 }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card title="浏览器分布">
            <Table
              size="small"
              columns={[
                { title: '浏览器', dataIndex: 'name' },
                { title: '数量', dataIndex: 'value', width: 60 },
              ]}
              dataSource={browserData}
              rowKey="name"
              pagination={false}
              scroll={{ y: 120 }}
            />
          </Card>
        </Col>

        <Col xs={24} md={16}>
          <Card title="访问时段分布">
            <Table
              size="small"
              columns={[
                { title: '时段', dataIndex: 'name' },
                { title: '访问量', dataIndex: 'value', width: 100 },
                {
                  title: '占比',
                  dataIndex: 'value',
                  width: 200,
                  render: (val: number) => {
                    const max = Math.max(
                      ...timeslotData.map((d) => d.value),
                      1,
                    );
                    const percent = Math.round((val / max) * 100);
                    return (
                      <div
                        style={{
                          background: '#f0f0f0',
                          borderRadius: 4,
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: `${percent}%`,
                            height: 16,
                            background: '#1890ff',
                            borderRadius: 4,
                          }}
                        />
                      </div>
                    );
                  },
                },
              ]}
              dataSource={timeslotData}
              rowKey="name"
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card title="热门模块 (Top10)">
            <Table
              size="small"
              columns={rankingColumns}
              dataSource={moduleData}
              rowKey="name"
              pagination={false}
              scroll={{ y: 300 }}
            />
          </Card>
        </Col>

        <Col span={24}>
          <Card title="地域分布 (Top 10)">
            <Table
              size="small"
              columns={rankingColumns}
              dataSource={geoData.slice(0, 10)}
              rowKey="name"
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </PageContainer>
  );
};

export default AnalysisPage;
