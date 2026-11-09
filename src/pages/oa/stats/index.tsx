/**
 * OA 统计报表：按区间与业务类型查看申请量、通过率、耗时、金额、部门分布与超期待办；有导出权限时可创建异步导出并下载本人的导出文件。
 */
import { PageContainer } from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  message,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import type { Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  createOaExport,
  getOaStatsOverview,
  type OaBusinessType,
  type OaExportTaskVo,
  type OaExportType,
  type OaStatsDeptRowVo,
  type OaStatsOverdueTaskVo,
  type OaStatsTypeRowVo,
  type OaStatsVo,
  oaExportDownloadUrl,
  queryOaExports,
} from '@/services/web/guardfind/oa';
import { download } from '@/utils/download';
import {
  approvalRate,
  BUSINESS_TYPE_META,
  BUSINESS_TYPE_OPTIONS,
  businessTypeText,
  defaultStatsRange,
  EXPORT_STATUS_META,
  EXPORT_TYPE_META,
  exportActive,
  exportDownloadable,
  formatHours,
  formatMoney,
  statsRangeError,
} from '@/utils/oaStats';
import { newRequestId } from '@/utils/oaTravel';
import { metaTag } from '../purchase/components/PurchaseDetail';

const DATE = 'YYYY-MM-DD';
const POLL_MS = 3000;

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function rateText(row: OaStatsTypeRowVo) {
  const rate = approvalRate(row);
  return rate == null ? '—' : `${rate}%`;
}

const typeColumns: ColumnsType<OaStatsTypeRowVo> = [
  {
    title: '业务类型',
    dataIndex: 'businessType',
    render: (value) => metaTag(BUSINESS_TYPE_META, value),
  },
  { title: '总数', dataIndex: 'total' },
  { title: '审批中', dataIndex: 'running' },
  { title: '已通过', dataIndex: 'approved' },
  { title: '已驳回', dataIndex: 'rejected' },
  { title: '已撤回', dataIndex: 'withdrawn' },
  { title: '已终止', dataIndex: 'cancelled' },
  {
    title: '通过率',
    key: 'rate',
    render: (_, row) => rateText(row),
  },
  {
    title: '平均耗时',
    dataIndex: 'avgHours',
    render: (value) => formatHours(value),
  },
  {
    title: '申请金额',
    dataIndex: 'requestedAmount',
    align: 'right',
    render: (value) => formatMoney(value),
  },
  {
    title: '通过金额',
    dataIndex: 'approvedAmount',
    align: 'right',
    render: (value) => formatMoney(value),
  },
];

const deptColumns: ColumnsType<OaStatsDeptRowVo> = [
  { title: '部门', dataIndex: 'deptName' },
  { title: '申请数', dataIndex: 'total' },
  { title: '通过数', dataIndex: 'approved' },
  {
    title: '通过金额',
    dataIndex: 'approvedAmount',
    align: 'right',
    render: (value) => formatMoney(value),
  },
];

const overdueColumns: ColumnsType<OaStatsOverdueTaskVo> = [
  {
    title: '申请',
    dataIndex: 'title',
    render: (value, row) =>
      row.applicationId ? (
        <Typography.Link
          onClick={() =>
            history.push(`/oa/application/detail?id=${row.applicationId}`)
          }
        >
          {value || `申请 ${row.applicationId}`}
        </Typography.Link>
      ) : (
        (value ?? '—')
      ),
  },
  {
    title: '业务类型',
    dataIndex: 'businessType',
    render: (value) => metaTag(BUSINESS_TYPE_META, value),
  },
  { title: '节点', dataIndex: 'taskName', render: (value) => value ?? '—' },
  {
    title: '申请人',
    dataIndex: 'applicantName',
    render: (value) => value ?? '—',
  },
  {
    title: '当前处理人',
    dataIndex: 'assigneeName',
    render: (value) => value ?? '待领取',
  },
  { title: '到达时间', dataIndex: 'createTime' },
  {
    title: '已等待',
    dataIndex: 'pendingHours',
    render: (value) => <Tag color="red">{value} 小时</Tag>,
  },
];

const StatsPage: React.FC = () => {
  const { hasPermission } = useAccess();
  const canExport = hasPermission('system:oa:stats:export');
  const [range, setRange] = useState<[Dayjs, Dayjs] | null>(() =>
    defaultStatsRange(),
  );
  const [businessType, setBusinessType] = useState<OaBusinessType>();
  const [stats, setStats] = useState<OaStatsVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [exports, setExports] = useState<OaExportTaskVo[]>([]);
  const [creating, setCreating] = useState<OaExportType | null>(null);
  const rangeError = statsRangeError(range);
  const queryRef = useRef({ range, businessType });
  queryRef.current = { range, businessType };

  const query = useCallback(async () => {
    const current = queryRef.current;
    const error = statsRangeError(current.range);
    if (error || !current.range) {
      message.error(error ?? '请选择统计区间');
      return;
    }
    setLoading(true);
    try {
      const response = await getOaStatsOverview({
        from: current.range[0].format(DATE),
        to: current.range[1].format(DATE),
        businessType: current.businessType,
      });
      setStats(response.data ?? null);
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadExports = useCallback(async () => {
    try {
      const response = await queryOaExports();
      setExports(response.data ?? []);
    } catch (e) {
      message.error(errorText(e));
    }
  }, []);

  useEffect(() => {
    void query();
  }, [query]);

  useEffect(() => {
    if (canExport) void loadExports();
  }, [canExport, loadExports]);

  const polling = canExport && exportActive(exports);
  useEffect(() => {
    if (!polling) return;
    const timer = window.setInterval(() => void loadExports(), POLL_MS);
    return () => window.clearInterval(timer);
  }, [polling, loadExports]);

  const createExport = async (exportType: OaExportType) => {
    if (rangeError || !range) {
      message.error(rangeError ?? '请选择统计区间');
      return;
    }
    setCreating(exportType);
    try {
      await createOaExport({
        requestId: newRequestId('export'),
        exportType,
        from: range[0].format(DATE),
        to: range[1].format(DATE),
        businessType: exportType === 'APPLICATION' ? businessType : undefined,
      });
      message.success('导出任务已创建，生成后可在下方下载');
      void loadExports();
    } catch (e) {
      message.error(errorText(e));
    } finally {
      setCreating(null);
    }
  };

  const downloadExport = async (task: OaExportTaskVo) => {
    try {
      await download(oaExportDownloadUrl(task.id), {
        filename: task.fileName || `oa-export-${task.id}.xlsx`,
      });
    } catch (e) {
      message.error(errorText(e));
    }
  };

  const exportColumns: ColumnsType<OaExportTaskVo> = [
    {
      title: '类型',
      dataIndex: 'exportType',
      render: (value) => metaTag(EXPORT_TYPE_META, value),
    },
    {
      title: '区间',
      key: 'range',
      render: (_, row) => `${row.dateFrom} ~ ${row.dateTo}`,
    },
    {
      title: '业务类型',
      dataIndex: 'businessType',
      render: (value) => businessTypeText(value),
    },
    {
      title: '状态',
      dataIndex: 'status',
      render: (value, row) => (
        <Space size={4} direction="vertical">
          {metaTag(EXPORT_STATUS_META, value)}
          {row.errorMessage && (
            <Typography.Text type="danger">{row.errorMessage}</Typography.Text>
          )}
        </Space>
      ),
    },
    {
      title: '行数',
      dataIndex: 'rowCount',
      render: (value) => value ?? '—',
    },
    { title: '创建时间', dataIndex: 'createTime' },
    {
      title: '过期时间',
      dataIndex: 'expireTime',
      render: (value) => value ?? '—',
    },
    {
      title: '操作',
      key: 'action',
      render: (_, row) =>
        exportDownloadable(row) ? (
          <Button
            type="link"
            size="small"
            onClick={() => void downloadExport(row)}
          >
            下载
          </Button>
        ) : (
          '—'
        ),
    },
  ];

  const total = stats?.total;

  return (
    <PageContainer header={{ title: '统计报表' }}>
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Card size="small">
          <Space wrap>
            <DatePicker.RangePicker
              value={range}
              allowClear={false}
              onChange={(value) =>
                setRange(value?.[0] && value[1] ? [value[0], value[1]] : null)
              }
            />
            <Select
              allowClear
              placeholder="全部业务类型"
              style={{ width: 180 }}
              options={BUSINESS_TYPE_OPTIONS}
              value={businessType}
              onChange={(value) => setBusinessType(value)}
            />
            <Button
              type="primary"
              loading={loading}
              disabled={!!rangeError}
              onClick={() => void query()}
            >
              查询
            </Button>
          </Space>
          {rangeError && (
            <Alert
              style={{ marginTop: 12 }}
              type="error"
              showIcon
              message={rangeError}
            />
          )}
        </Card>

        <Spin spinning={loading}>
          {!stats || !total ? (
            <Card>
              <Empty description={loading ? '加载中' : '暂无统计数据'} />
            </Card>
          ) : (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Row gutter={[16, 16]}>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic title="申请总数" value={total.total} />
                  </Card>
                </Col>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic title="通过率" value={rateText(total)} />
                  </Card>
                </Col>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic
                      title="平均耗时"
                      value={formatHours(total.avgHours)}
                    />
                  </Card>
                </Col>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic
                      title="申请金额"
                      value={formatMoney(total.requestedAmount)}
                    />
                  </Card>
                </Col>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic
                      title="通过金额"
                      value={formatMoney(total.approvedAmount)}
                    />
                  </Card>
                </Col>
                <Col flex="1 0 160px">
                  <Card size="small">
                    <Statistic
                      title={`超 ${stats.overdueHours} 小时待办`}
                      value={stats.overdueTaskCount}
                      valueStyle={
                        stats.overdueTaskCount > 0
                          ? { color: '#cf1322' }
                          : undefined
                      }
                    />
                  </Card>
                </Col>
              </Row>
              <Card size="small" title="按业务类型">
                <Table
                  rowKey={(row) => row.businessType ?? 'ALL'}
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  columns={typeColumns}
                  dataSource={stats.byType}
                />
              </Card>
              <Card size="small" title="按部门">
                <Table
                  rowKey="deptName"
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  columns={deptColumns}
                  dataSource={stats.byDept}
                />
              </Card>
              <Card
                size="small"
                title={`超期待办（超 ${stats.overdueHours} 小时，共 ${stats.overdueTaskCount} 条${
                  stats.overdueTasks.length < stats.overdueTaskCount
                    ? `，展示最早 ${stats.overdueTasks.length} 条`
                    : ''
                }）`}
              >
                <Table
                  rowKey="taskId"
                  size="small"
                  pagination={false}
                  scroll={{ x: 'max-content' }}
                  columns={overdueColumns}
                  dataSource={stats.overdueTasks}
                />
              </Card>
            </Space>
          )}
        </Spin>

        {canExport && (
          <Card
            size="small"
            title="导出任务"
            extra={
              <Space wrap>
                <Button
                  loading={creating === 'APPLICATION'}
                  disabled={!!rangeError || creating != null}
                  onClick={() => void createExport('APPLICATION')}
                >
                  导出申请明细
                </Button>
                <Button
                  loading={creating === 'VEHICLE_USE'}
                  disabled={!!rangeError || creating != null}
                  onClick={() => void createExport('VEHICLE_USE')}
                >
                  导出用车记录
                </Button>
                <Button onClick={() => void loadExports()}>刷新</Button>
              </Space>
            }
          >
            <Typography.Paragraph type="secondary">
              导出按当前筛选区间与业务类型生成，文件仅本人可下载，过期后自动清理；用车记录中的司机手机号已脱敏。
            </Typography.Paragraph>
            <Table
              rowKey="id"
              size="small"
              pagination={false}
              scroll={{ x: 'max-content' }}
              columns={exportColumns}
              dataSource={exports}
            />
          </Card>
        )}
      </Space>
    </PageContainer>
  );
};

export default StatsPage;
