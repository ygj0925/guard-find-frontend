/**
 * 工作报告：本人按日/周填写与提交报告；主管查看下属报告并批注，统计提交情况并催交未提交成员。
 */
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Descriptions,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  message,
  Popconfirm,
  Segmented,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import {
  commentOaWorkReport,
  deleteMyOaWorkReport,
  getMyOaWorkReportForPeriod,
  getOaWorkReport,
  type OaWorkReportDetailVo,
  type OaWorkReportMemberStatVo,
  type OaWorkReportSummaryVo,
  type OaWorkReportType,
  type OaWorkReportVo,
  queryMyOaWorkReports,
  queryOaWorkReportSummary,
  queryTeamOaWorkReports,
  remindOaWorkReport,
  saveMyOaWorkReport,
} from '@/services/web/guardfind/oa';
import {
  periodText,
  REPORT_STATUS_META,
  REPORT_TYPE_META,
  reportPeriod,
} from '@/utils/oaResource';
import { statusValueEnum } from '@/utils/oaTravel';
import { metaTag } from '../purchase/components/PurchaseDetail';

const DATE = 'YYYY-MM-DD';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function pageResult<T>(response: {
  data?: { list?: T[]; total?: number } | null;
}) {
  return {
    data: response.data?.list ?? [],
    total: response.data?.total ?? 0,
    success: true,
  };
}

const TYPE_OPTIONS = [
  { value: 'DAILY', label: '日报' },
  { value: 'WEEKLY', label: '周报' },
];

function PeriodPicker({
  type,
  date,
  onType,
  onDate,
}: {
  type: OaWorkReportType;
  date: Dayjs;
  onType: (type: OaWorkReportType) => void;
  onDate: (date: Dayjs) => void;
}) {
  return (
    <Space wrap>
      <Segmented
        options={TYPE_OPTIONS}
        value={type}
        onChange={(value) => onType(value as OaWorkReportType)}
      />
      <DatePicker
        aria-label="报告日期"
        allowClear={false}
        picker={type === 'WEEKLY' ? 'week' : 'date'}
        value={date}
        disabledDate={(day) => day.isAfter(dayjs(), 'day')}
        onChange={(value) => value && onDate(value)}
      />
    </Space>
  );
}

function statusTag(report: { status: string; late?: boolean }) {
  return (
    <Space size={4}>
      {metaTag(REPORT_STATUS_META, report.status)}
      {report.late ? <Tag color="orange">迟交</Tag> : null}
    </Space>
  );
}

function ReportContent({ report }: { report: OaWorkReportVo }) {
  const block = (text?: string | null) => (
    <Typography.Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
      {text || '-'}
    </Typography.Paragraph>
  );
  return (
    <Descriptions column={1} size="small" bordered>
      <Descriptions.Item label="周期">
        {metaTag(REPORT_TYPE_META, report.reportType)}
        {periodText(report.reportType, report.periodStart, report.periodEnd)}
      </Descriptions.Item>
      <Descriptions.Item label="状态">{statusTag(report)}</Descriptions.Item>
      <Descriptions.Item label="已完成">
        {block(report.doneContent)}
      </Descriptions.Item>
      <Descriptions.Item label="计划">
        {block(report.planContent)}
      </Descriptions.Item>
      <Descriptions.Item label="问题与协调">
        {block(report.issueContent)}
      </Descriptions.Item>
    </Descriptions>
  );
}

type ReportValues = {
  doneContent: string;
  planContent?: string;
  issueContent?: string;
};

const MineTab: React.FC = () => {
  const [type, setType] = useState<OaWorkReportType>('DAILY');
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [current, setCurrent] = useState<OaWorkReportVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const actionRef = useRef<ActionType>(null);
  const [form] = Form.useForm<ReportValues>();
  const period = reportPeriod(type, date);
  const submitted = current?.status === 'SUBMITTED';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getMyOaWorkReportForPeriod({
        type,
        date: date.format(DATE),
      });
      const report = response.data ?? null;
      setCurrent(report);
      form.setFieldsValue({
        doneContent: report?.doneContent ?? '',
        planContent: report?.planContent ?? '',
        issueContent: report?.issueContent ?? '',
      });
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, [type, date, form]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (submit: boolean) => {
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSaving(true);
    try {
      const response = await saveMyOaWorkReport({
        reportType: type,
        date: date.format(DATE),
        doneContent: values.doneContent.trim(),
        planContent: values.planContent?.trim() || undefined,
        issueContent: values.issueContent?.trim() || undefined,
        submit,
        version: current?.version,
      });
      setCurrent(response.data);
      message.success(submit ? '报告已提交' : '草稿已保存');
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSaving(false);
    }
  };

  const removeDraft = async () => {
    if (!current) return;
    try {
      await deleteMyOaWorkReport(current.id);
      message.success('草稿已删除');
      actionRef.current?.reload();
      void load();
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const columns: ProColumns<OaWorkReportVo>[] = [
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: statusValueEnum(REPORT_TYPE_META),
      width: 80,
      render: (_, record) => metaTag(REPORT_TYPE_META, record.reportType),
    },
    {
      title: '周期',
      dataIndex: 'periodStart',
      search: false,
      render: (_, record) =>
        periodText(record.reportType, record.periodStart, record.periodEnd),
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 140,
      render: (_, record) => statusTag(record),
    },
    { title: '提交时间', dataIndex: 'submitTime', search: false, width: 170 },
    { title: '批注', dataIndex: 'commentCount', search: false, width: 70 },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => (
        <Button
          type="link"
          onClick={() => {
            setType(record.reportType);
            setDate(dayjs(record.periodStart));
          }}
        >
          打开
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        title={
          <Space wrap>
            <span>
              {REPORT_TYPE_META[type].text}：
              {periodText(type, period.start, period.end)}
            </span>
            {current ? statusTag(current) : <Tag>未填写</Tag>}
          </Space>
        }
        extra={
          <PeriodPicker
            type={type}
            date={date}
            onType={setType}
            onDate={setDate}
          />
        }
      >
        <Spin spinning={loading}>
          {submitted ? (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message={`已于 ${current?.submitTime ?? ''} 提交，提交后不可修改。`}
            />
          ) : null}
          <Form
            form={form}
            name="oaWorkReportForm"
            layout="vertical"
            disabled={submitted}
          >
            <Form.Item
              name="doneContent"
              label="已完成工作"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请填写已完成工作',
                },
              ]}
            >
              <Input.TextArea rows={4} maxLength={5000} showCount />
            </Form.Item>
            <Form.Item name="planContent" label="后续计划">
              <Input.TextArea rows={3} maxLength={5000} showCount />
            </Form.Item>
            <Form.Item name="issueContent" label="问题与需协调事项">
              <Input.TextArea rows={2} maxLength={2000} showCount />
            </Form.Item>
          </Form>
          {submitted ? null : (
            <Space>
              <Button loading={saving} onClick={() => void save(false)}>
                保存草稿
              </Button>
              <Button
                type="primary"
                loading={saving}
                onClick={() => void save(true)}
              >
                提交报告
              </Button>
              {current?.status === 'DRAFT' ? (
                <Popconfirm
                  title="删除该草稿？"
                  okText="删除"
                  cancelText="取消"
                  onConfirm={() => removeDraft()}
                >
                  <Button danger>删除草稿</Button>
                </Popconfirm>
              ) : null}
            </Space>
          )}
        </Spin>
      </Card>
      <ProTable<OaWorkReportVo>
        headerTitle="我的历史报告"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        request={async (params) =>
          pageResult(
            await queryMyOaWorkReports({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              type: params.type || undefined,
            }),
          )
        }
      />
    </Space>
  );
};

const ReportDrawer: React.FC<{
  reportId: number | null;
  onClose: () => void;
}> = ({ reportId, onClose }) => {
  const [detail, setDetail] = useState<OaWorkReportDetailVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async (id: number) => {
    setLoading(true);
    try {
      const response = await getOaWorkReport(id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setDetail(null);
    setComment('');
    if (reportId != null) void load(reportId);
  }, [reportId, load]);

  const send = async () => {
    if (reportId == null || !comment.trim()) return;
    setSending(true);
    try {
      await commentOaWorkReport(reportId, { content: comment.trim() });
      message.success('批注已发送');
      setComment('');
      void load(reportId);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSending(false);
    }
  };

  return (
    <Drawer
      title={
        detail
          ? `${detail.report.authorName || detail.report.authorId} 的${REPORT_TYPE_META[detail.report.reportType]?.text ?? '报告'}`
          : '报告详情'
      }
      width={600}
      open={reportId != null}
      destroyOnHidden
      onClose={onClose}
    >
      <Spin spinning={loading}>
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <ReportContent report={detail.report} />
            <List
              header={<Typography.Text strong>批注</Typography.Text>}
              locale={{ emptyText: '暂无批注' }}
              dataSource={detail.comments}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <span>{item.userName || item.userId}</span>
                        <Typography.Text type="secondary">
                          {item.createTime}
                        </Typography.Text>
                      </Space>
                    }
                    description={
                      <span style={{ whiteSpace: 'pre-wrap' }}>
                        {item.content}
                      </span>
                    }
                  />
                </List.Item>
              )}
            />
            <Input.TextArea
              aria-label="批注内容"
              rows={3}
              maxLength={1000}
              showCount
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
            <Button
              type="primary"
              loading={sending}
              disabled={!comment.trim()}
              onClick={() => void send()}
            >
              发送批注
            </Button>
          </Space>
        ) : null}
      </Spin>
    </Drawer>
  );
};

const TeamTab: React.FC = () => {
  const [viewing, setViewing] = useState<number | null>(null);
  const columns: ProColumns<OaWorkReportVo>[] = [
    {
      title: '类型',
      dataIndex: 'type',
      valueType: 'select',
      valueEnum: statusValueEnum(REPORT_TYPE_META),
      width: 80,
      render: (_, record) => metaTag(REPORT_TYPE_META, record.reportType),
    },
    {
      title: '日期',
      dataIndex: 'date',
      valueType: 'date',
      hideInTable: true,
    },
    {
      title: '成员',
      dataIndex: 'authorName',
      search: false,
      width: 100,
      render: (_, record) => record.authorName || record.authorId,
    },
    { title: '部门', dataIndex: 'deptName', search: false, width: 120 },
    {
      title: '周期',
      dataIndex: 'periodStart',
      search: false,
      render: (_, record) =>
        periodText(record.reportType, record.periodStart, record.periodEnd),
    },
    {
      title: '状态',
      dataIndex: 'status',
      search: false,
      width: 140,
      render: (_, record) => statusTag(record),
    },
    { title: '提交时间', dataIndex: 'submitTime', search: false, width: 170 },
    { title: '批注', dataIndex: 'commentCount', search: false, width: 70 },
    {
      title: '操作',
      valueType: 'option',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => setViewing(record.id)}>
          查看
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<OaWorkReportVo>
        headerTitle="团队报告"
        rowKey="id"
        columns={columns}
        scroll={{ x: 900 }}
        request={async (params) =>
          pageResult(
            await queryTeamOaWorkReports({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              type: params.type || undefined,
              date: params.date
                ? dayjs(params.date as string).format(DATE)
                : undefined,
            }),
          )
        }
      />
      <ReportDrawer reportId={viewing} onClose={() => setViewing(null)} />
    </>
  );
};

const MISSING_FIRST: Record<string, number> = {
  MISSING: 0,
  DRAFT: 1,
  SUBMITTED: 2,
};

const StatTab: React.FC = () => {
  const [type, setType] = useState<OaWorkReportType>('DAILY');
  const [date, setDate] = useState<Dayjs>(dayjs());
  const [summary, setSummary] = useState<OaWorkReportSummaryVo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reminding, setReminding] = useState(false);
  const [viewing, setViewing] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await queryOaWorkReportSummary({
        type,
        date: date.format(DATE),
      });
      setSummary(response.data);
    } catch (cause) {
      setSummary(null);
      setError(errorText(cause));
    } finally {
      setLoading(false);
    }
  }, [type, date]);

  useEffect(() => {
    void load();
  }, [load]);

  const remind = async () => {
    setReminding(true);
    try {
      const response = await remindOaWorkReport({
        reportType: type,
        date: date.format(DATE),
      });
      const count = response.data?.reminded ?? 0;
      message.success(count > 0 ? `已催交 ${count} 人` : '没有需要催交的成员');
    } catch (cause) {
      message.error(errorText(cause));
    } finally {
      setReminding(false);
    }
  };

  const members = [...(summary?.members ?? [])].sort(
    (a, b) => (MISSING_FIRST[a.status] ?? 3) - (MISSING_FIRST[b.status] ?? 3),
  );
  const pending = members.filter(
    (member) => member.status !== 'SUBMITTED',
  ).length;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space wrap style={{ justifyContent: 'space-between', width: '100%' }}>
        <PeriodPicker
          type={type}
          date={date}
          onType={setType}
          onDate={setDate}
        />
        <Popconfirm
          title={`催交 ${pending} 名未提交成员？`}
          okText="催交"
          cancelText="取消"
          disabled={pending === 0}
          onConfirm={() => remind()}
        >
          <Button loading={reminding} disabled={pending === 0}>
            催交未提交
          </Button>
        </Popconfirm>
      </Space>
      {error ? <Alert type="warning" showIcon message={error} /> : null}
      <Spin spinning={loading}>
        {summary ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Space size={48} wrap>
              <Statistic title="应提交" value={summary.total} />
              <Statistic title="已提交" value={summary.submitted} />
              <Statistic
                title="未提交"
                value={summary.total - summary.submitted}
              />
              <Statistic title="迟交" value={summary.late} />
            </Space>
            <Table<OaWorkReportMemberStatVo>
              aria-label="提交统计"
              rowKey={(record) => String(record.userId)}
              size="small"
              pagination={{ pageSize: 20 }}
              dataSource={members}
              columns={[
                {
                  title: '成员',
                  dataIndex: 'userName',
                  render: (_, record) => record.userName || record.userId,
                },
                { title: '部门', dataIndex: 'deptName' },
                {
                  title: '状态',
                  dataIndex: 'status',
                  render: (_, record) => statusTag(record),
                },
                { title: '提交时间', dataIndex: 'submitTime' },
                {
                  title: '操作',
                  render: (_, record) =>
                    record.reportId != null && record.status === 'SUBMITTED' ? (
                      <Button
                        type="link"
                        onClick={() => setViewing(record.reportId ?? null)}
                      >
                        查看
                      </Button>
                    ) : null,
                },
              ]}
            />
          </Space>
        ) : error ? null : (
          <Empty description="暂无统计" />
        )}
      </Spin>
      <ReportDrawer reportId={viewing} onClose={() => setViewing(null)} />
    </Space>
  );
};

const WorkReportPage: React.FC = () => {
  const { hasPermission } = useAccess();
  const canMine = hasPermission('system:oa:report:mine');
  const canTeam = canMine || hasPermission('system:oa:report:stat');
  const items = [
    ...(canMine
      ? [{ key: 'mine', label: '我的报告', children: <MineTab /> }]
      : []),
    ...(canTeam
      ? [
          { key: 'team', label: '团队报告', children: <TeamTab /> },
          { key: 'stat', label: '提交统计', children: <StatTab /> },
        ]
      : []),
  ];
  return (
    <PageContainer header={{ title: '工作报告' }}>
      <Tabs destroyOnHidden items={items} />
    </PageContainer>
  );
};

export default WorkReportPage;
