/**
 * 资产用品：用品库存与台账、领用发放、资产卡片与变动、报废执行、盘点；一键生成领用与报废表单及流程草稿。
 * 审批只决定能否领用/报废，发放与报废执行由资产管理员登记，不能为本人申请登记；写操作按请求号幂等。
 */
import { ThunderboltOutlined } from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import {
  Alert,
  Button,
  Drawer,
  Input,
  Modal,
  message,
  Popconfirm,
  Spin,
  Tabs,
} from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaAssetTemplate,
  executeOaAssetScrap,
  getOaSupplyRequest,
  issueOaSupplyRequest,
  type OaAssetScrapVo,
  type OaSupplyRequestDetailVo,
  type OaSupplyRequestVo,
  queryOaAssetScraps,
  queryOaSupplyRequests,
} from '@/services/web/guardfind/oa';
import { SCRAP_STATUS_META, SUPPLY_REQUEST_STATUS_META } from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { TrackButton } from '../purchase/components/PurchaseDetail';
import AssetCardTab from './components/AssetCardTab';
import {
  SupplyRequestDetailContent,
  scrapStatusTag,
  supplyRequestStatusTag,
} from './components/AssetDetail';
import StocktakeTab from './components/StocktakeTab';
import SupplyTab from './components/SupplyTab';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

const RequestTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaSupplyRequestDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [issuing, setIssuing] = useState<OaSupplyRequestDetailVo | null>(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');

  const openDetail = async (record: OaSupplyRequestVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaSupplyRequest(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openIssue = async (record: OaSupplyRequestVo) => {
    try {
      const response = await getOaSupplyRequest(record.id);
      requestIdRef.current = newRequestId('issue');
      setRemark('');
      setIssuing(response.data);
    } catch (error) {
      message.error(errorText(error));
    }
  };

  const submitIssue = async () => {
    if (!issuing) return;
    setSubmitting(true);
    try {
      await issueOaSupplyRequest(issuing.request.id, {
        requestId: requestIdRef.current,
        remark: remark.trim() || undefined,
      });
      message.success('已发放并扣减库存');
      setIssuing(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const shortage = issuing
    ? issuing.items.filter((item) => item.stock < item.quantity)
    : [];

  const columns: ProColumns<OaSupplyRequestVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '标题或申请人' },
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 180,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '领用状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(SUPPLY_REQUEST_STATUS_META),
      render: (_, record) => supplyRequestStatusTag(record.status),
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 100,
      render: (_, record) => record.applicantName || record.applicantId,
    },
    {
      title: '明细',
      key: 'summary',
      search: false,
      width: 120,
      render: (_, record) =>
        `${record.itemCount} 种 / ${record.totalQuantity} 件`,
    },
    {
      title: '发放人',
      dataIndex: 'issuerName',
      search: false,
      width: 100,
      render: (_, record) => record.issuerName || record.issuerId || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 150,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PENDING_ISSUE' ? (
          <AccessControl key="issue" permission="system:oa:asset:operate">
            <Button type="link" onClick={() => void openIssue(record)}>
              登记发放
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaSupplyRequestVo>
        headerTitle="领用申请"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 900 }}
        request={async (params) => {
          const response = await queryOaSupplyRequests({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
            keyword: (params.keyword as string)?.trim() || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title="领用单详情"
        width={720}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? (
            <SupplyRequestDetailContent detail={detail} showStock />
          ) : null}
        </Spin>
      </Drawer>
      <Modal
        title="登记发放"
        open={Boolean(issuing)}
        width={720}
        confirmLoading={submitting}
        okText="确认发放"
        okButtonProps={{ disabled: shortage.length > 0 }}
        destroyOnHidden
        onCancel={() => setIssuing(null)}
        onOk={() => void submitIssue()}
      >
        {issuing ? (
          <>
            <Alert
              type={shortage.length > 0 ? 'error' : 'info'}
              showIcon
              style={{ marginBottom: 16 }}
              message={
                shortage.length > 0
                  ? `${shortage.map((item) => item.name).join('、')} 库存不足，请先入库再发放`
                  : '发放后按明细扣减库存并记入库存台账，整单一次发放。'
              }
            />
            <SupplyRequestDetailContent detail={issuing} showStock />
            <Input.TextArea
              style={{ marginTop: 16 }}
              rows={2}
              maxLength={500}
              showCount
              placeholder="备注（可选）"
              aria-label="发放备注"
              value={remark}
              onChange={(event) => setRemark(event.target.value)}
            />
          </>
        ) : null}
      </Modal>
    </>
  );
};

const ScrapTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [executing, setExecuting] = useState<OaAssetScrapVo | null>(null);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');

  const openExecute = (record: OaAssetScrapVo) => {
    requestIdRef.current = newRequestId('scrap');
    setRemark('');
    setExecuting(record);
  };

  const submitExecute = async () => {
    if (!executing) return;
    setSubmitting(true);
    try {
      await executeOaAssetScrap(executing.id, {
        requestId: requestIdRef.current,
        remark: remark.trim() || undefined,
      });
      message.success(`${executing.assetNo} 已报废`);
      setExecuting(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaAssetScrapVo>[] = [
    { title: '资产编号', dataIndex: 'assetNo', search: false, width: 150 },
    { title: '资产名称', dataIndex: 'assetName', search: false, width: 140 },
    {
      title: '报废状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 100,
      valueEnum: statusValueEnum(SCRAP_STATUS_META),
      render: (_, record) => scrapStatusTag(record.status),
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.originalValue),
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 100,
      render: (_, record) => record.applicantName || record.applicantId,
    },
    {
      title: '执行人',
      dataIndex: 'executorName',
      search: false,
      width: 100,
      render: (_, record) => record.executorName || record.executorId || '—',
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 200,
      render: (_, record) => [
        <TrackButton key="track" applicationId={record.applicationId} />,
        record.status === 'PENDING_SCRAP' ? (
          <AccessControl key="execute" permission="system:oa:asset:operate">
            <Button type="link" danger onClick={() => openExecute(record)}>
              执行报废
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaAssetScrapVo>
        headerTitle="报废申请"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 960 }}
        request={async (params) => {
          const response = await queryOaAssetScraps({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Modal
        title={
          executing
            ? `执行报废：${executing.assetNo} ${executing.assetName}`
            : '执行报废'
        }
        open={Boolean(executing)}
        width={480}
        confirmLoading={submitting}
        okText="确认报废"
        okButtonProps={{ danger: true }}
        destroyOnHidden
        onCancel={() => setExecuting(null)}
        onOk={() => void submitExecute()}
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="报废后资产状态变为已报废并清空使用人，不能再领用或变动。"
        />
        <Input.TextArea
          rows={2}
          maxLength={500}
          showCount
          placeholder="处置说明（可选）"
          aria-label="报废备注"
          value={remark}
          onChange={(event) => setRemark(event.target.value)}
        />
      </Modal>
    </>
  );
};

const AssetManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaAssetTemplate();
      message.success(
        `已生成领用流程草稿 ${response.data.supplyModelKey}、报废流程草稿 ${response.data.scrapModelKey}`,
      );
      history.push(`/oa/process/design?id=${response.data.supplyModelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '资产用品' }}
      extra={[
        <AccessControl key="template" permission="system:oa:asset:manage">
          <Popconfirm
            title="生成领用与报废模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                按当前启用用品生成并发布“用品领用”表单（直属上级审批）和“资产报废”表单（直属上级
                → 财务岗位，原值超过 5000
                元再由总经理岗位审批），并创建两个流程草稿。需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成领用报废模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs
        destroyOnHidden
        items={[
          { key: 'supplies', label: '用品库存', children: <SupplyTab /> },
          { key: 'requests', label: '领用发放', children: <RequestTab /> },
          { key: 'assets', label: '资产卡片', children: <AssetCardTab /> },
          { key: 'scraps', label: '资产报废', children: <ScrapTab /> },
          { key: 'stocktakes', label: '盘点', children: <StocktakeTab /> },
        ]}
      />
    </PageContainer>
  );
};

export default AssetManagePage;
