import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  Descriptions,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  closeOaStocktake,
  countOaStocktake,
  createOaStocktake,
  getOaStocktake,
  type OaStocktakeDetailVo,
  type OaStocktakeLineVo,
  type OaStocktakeVo,
  queryOaStocktakes,
} from '@/services/web/guardfind/oa';
import { STOCKTAKE_STATUS_META, stocktakeVariance } from '@/utils/oaAsset';
import { metaTag } from '../../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function varianceText(line: OaStocktakeLineVo) {
  const variance = stocktakeVariance(line);
  if (variance === null)
    return <Typography.Text type="secondary">未盘</Typography.Text>;
  if (variance === 0) return '一致';
  return (
    <Typography.Text type="danger">
      {variance > 0 ? `盘盈 ${variance}` : `盘亏 ${-variance}`}
    </Typography.Text>
  );
}

const StocktakeTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const { hasPermission } = useAccess();
  const canOperate = hasPermission('system:oa:asset:operate');
  const [detail, setDetail] = useState<OaStocktakeDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [counts, setCounts] = useState<Record<number, number | null>>({});
  const [creating, setCreating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createForm] = Form.useForm<{ title: string }>();

  const applyDetail = (next: OaStocktakeDetailVo) => {
    setDetail(next);
    setCounts(
      Object.fromEntries(
        next.lines.map((line) => [line.id, line.countedQty ?? null]),
      ),
    );
  };

  const openDetail = async (id: number) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaStocktake(id);
      applyDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    createForm.resetFields();
    createForm.setFieldsValue({ title: `${dayjs().format('YYYY年M月')}盘点` });
    setCreating(true);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      const response = await createOaStocktake({ title: values.title.trim() });
      message.success(`已生成盘点单，共 ${response.data.lines.length} 项`);
      setCreating(false);
      actionRef.current?.reload();
      setOpen(true);
      applyDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const changed = detail
    ? detail.lines.filter(
        (line) =>
          counts[line.id] !== null &&
          counts[line.id] !== undefined &&
          counts[line.id] !== line.countedQty,
      )
    : [];

  const saveCounts = async () => {
    if (!detail) return;
    if (changed.length === 0) {
      message.info('没有需要保存的实盘数量');
      return;
    }
    setSubmitting(true);
    try {
      const response = await countOaStocktake(detail.stocktake.id, {
        counts: changed.map((line) => ({
          lineId: line.id,
          countedQty: Number(counts[line.id]),
        })),
      });
      message.success(`已保存 ${changed.length} 项实盘`);
      applyDetail(response.data);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const close = async () => {
    if (!detail) return;
    setSubmitting(true);
    try {
      const response = await closeOaStocktake(detail.stocktake.id);
      message.success('盘点已完成，差异已调整入账');
      applyDetail(response.data);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaStocktakeVo>[] = [
    { title: '盘点名称', dataIndex: 'title', ellipsis: true, width: 180 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      render: (_, record) => metaTag(STOCKTAKE_STATUS_META, record.status),
    },
    {
      title: '进度',
      key: 'progress',
      width: 110,
      render: (_, record) => `${record.countedCount}/${record.lineCount}`,
    },
    { title: '差异项', dataIndex: 'varianceCount', width: 80 },
    {
      title: '发起人',
      key: 'creator',
      width: 100,
      render: (_, record) => record.createUserName || record.createUser,
    },
    {
      title: '完成时间',
      dataIndex: 'closedTime',
      width: 170,
      render: (_, record) => record.closedTime || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <Button type="link" onClick={() => void openDetail(record.id)}>
          {record.status === 'OPEN' && canOperate ? '录入' : '详情'}
        </Button>
      ),
    },
  ];

  const editable = detail?.stocktake.status === 'OPEN' && canOperate;
  const uncounted = detail
    ? detail.lines.filter(
        (line) => counts[line.id] === null || counts[line.id] === undefined,
      ).length
    : 0;

  return (
    <>
      <ProTable<OaStocktakeVo>
        headerTitle="盘点记录"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        search={false}
        scroll={{ x: 900 }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:oa:asset:operate">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              发起盘点
            </Button>
          </AccessControl>,
        ]}
        request={async (params) => {
          const response = await queryOaStocktakes({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Modal
        title="发起盘点"
        open={creating}
        width={460}
        confirmLoading={submitting}
        okText="生成盘点单"
        destroyOnHidden
        onCancel={() => setCreating(false)}
        onOk={() => void submitCreate()}
      >
        <Form form={createForm} name="oaStocktakeCreateForm" layout="vertical">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="按当前账面快照全部启用用品与未报废资产；同一时间只能有一张进行中的盘点单。"
          />
          <Form.Item
            name="title"
            label="盘点名称"
            rules={[
              { required: true, whitespace: true, message: '请输入盘点名称' },
            ]}
          >
            <Input maxLength={100} aria-label="盘点名称" />
          </Form.Item>
        </Form>
      </Modal>
      <Drawer
        title={detail ? `盘点：${detail.stocktake.title}` : '盘点详情'}
        width={860}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
        extra={
          editable ? (
            <Space>
              <Button loading={submitting} onClick={() => void saveCounts()}>
                保存实盘
              </Button>
              <Popconfirm
                title="完成盘点？"
                description="完成后用品库存按实盘调整入台账，资产记录盘点履历，不能再修改。"
                okText="完成"
                cancelText="取消"
                disabled={uncounted > 0 || changed.length > 0}
                onConfirm={() => close()}
              >
                <Button
                  type="primary"
                  loading={submitting}
                  disabled={uncounted > 0 || changed.length > 0}
                >
                  完成盘点
                </Button>
              </Popconfirm>
            </Space>
          ) : null
        }
      >
        <Spin spinning={loading}>
          {detail ? (
            <Space direction="vertical" size={16} style={{ width: '100%' }}>
              <Descriptions column={{ xs: 1, sm: 3 }} size="small" bordered>
                <Descriptions.Item label="状态">
                  {metaTag(STOCKTAKE_STATUS_META, detail.stocktake.status)}
                </Descriptions.Item>
                <Descriptions.Item label="进度">
                  {`${detail.stocktake.countedCount}/${detail.stocktake.lineCount}`}
                </Descriptions.Item>
                <Descriptions.Item label="差异项">
                  {detail.stocktake.varianceCount}
                </Descriptions.Item>
              </Descriptions>
              {editable && (uncounted > 0 || changed.length > 0) ? (
                <Alert
                  type="warning"
                  showIcon
                  message={
                    changed.length > 0
                      ? `有 ${changed.length} 项未保存，保存后才能完成盘点`
                      : `还有 ${uncounted} 项未盘点`
                  }
                />
              ) : null}
              <Table<OaStocktakeLineVo>
                rowKey="id"
                size="small"
                bordered
                pagination={false}
                dataSource={detail.lines}
                aria-label="盘点明细"
                columns={[
                  {
                    title: '类型',
                    dataIndex: 'targetType',
                    width: 70,
                    render: (value: string) =>
                      value === 'ASSET' ? (
                        <Tag color="purple">资产</Tag>
                      ) : (
                        <Tag color="cyan">用品</Tag>
                      ),
                  },
                  { title: '编号', dataIndex: 'targetCode', width: 150 },
                  { title: '名称', dataIndex: 'targetName' },
                  { title: '账面', dataIndex: 'bookQty', width: 70 },
                  {
                    title: '实盘',
                    key: 'counted',
                    width: 120,
                    render: (_, line) =>
                      editable ? (
                        <InputNumber
                          min={0}
                          max={line.targetType === 'ASSET' ? 1 : 99999}
                          precision={0}
                          value={counts[line.id] ?? null}
                          aria-label={`${line.targetName}实盘数量`}
                          onChange={(value) =>
                            setCounts((prev) => ({ ...prev, [line.id]: value }))
                          }
                        />
                      ) : (
                        (line.countedQty ?? '—')
                      ),
                  },
                  {
                    title: '差异',
                    key: 'variance',
                    width: 100,
                    render: (_, line) =>
                      varianceText({ ...line, countedQty: counts[line.id] }),
                  },
                ]}
              />
            </Space>
          ) : null}
        </Spin>
      </Drawer>
    </>
  );
};

export default StocktakeTab;
