/**
 * 合同管理：合同台账（审批通过后登记签署、归档），到期筛选与提醒；一键生成合同表单与流程草稿。
 * 修订由经办人在发起页填写原合同编号送审，台账只登记线下签署与归档结果，请求号保证重试幂等。
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
  DatePicker,
  Drawer,
  Form,
  Input,
  Modal,
  message,
  Popconfirm,
  Spin,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  archiveOaContract,
  createOaContractTemplate,
  getOaContract,
  type OaContractDetailVo,
  type OaContractVo,
  queryOaContracts,
  signOaContract,
} from '@/services/web/guardfind/oa';
import {
  CONTRACT_EXPIRING_OPTIONS,
  CONTRACT_STATUS_META,
  CONTRACT_TYPE_META,
  expiryHint,
} from '@/utils/oaContract';
import { formatAmount } from '@/utils/oaExpense';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { metaTag } from '../purchase/components/PurchaseDetail';
import {
  ContractDetailContent,
  contractStatusTag,
} from './components/ContractDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type SignValues = { signedDate: Dayjs; signatories: string; remark?: string };

type ArchiveValues = { archiveNo: string; location?: string; remark?: string };

const expiringValueEnum = Object.fromEntries(
  CONTRACT_EXPIRING_OPTIONS.map((option) => [
    option.value,
    { text: option.label },
  ]),
);

const ContractLedger: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaContractDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [signing, setSigning] = useState<OaContractVo | null>(null);
  const [archiving, setArchiving] = useState<OaContractVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [signForm] = Form.useForm<SignValues>();
  const [archiveForm] = Form.useForm<ArchiveValues>();

  const openDetail = async (record: OaContractVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaContract(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openSign = (record: OaContractVo) => {
    requestIdRef.current = newRequestId('contract-sign');
    signForm.resetFields();
    signForm.setFieldsValue({ signedDate: dayjs() });
    setSigning(record);
  };

  const openArchive = (record: OaContractVo) => {
    requestIdRef.current = newRequestId('contract-archive');
    archiveForm.resetFields();
    setArchiving(record);
  };

  const submitSign = async () => {
    if (!signing) return;
    const values = await signForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await signOaContract(signing.id, {
        requestId: requestIdRef.current,
        signedDate: values.signedDate.format('YYYY-MM-DD'),
        signatories: values.signatories.trim(),
        remark: values.remark?.trim() || undefined,
      });
      message.success('已登记签署');
      setSigning(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const submitArchive = async () => {
    if (!archiving) return;
    const values = await archiveForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await archiveOaContract(archiving.id, {
        requestId: requestIdRef.current,
        archiveNo: values.archiveNo.trim(),
        location: values.location?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success('已登记归档');
      setArchiving(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaContractVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '合同编号、名称或相对方' },
    },
    {
      title: '到期',
      dataIndex: 'expiringDays',
      hideInTable: true,
      valueType: 'select',
      valueEnum: expiringValueEnum,
    },
    { title: '合同编号', dataIndex: 'contractNo', search: false, width: 160 },
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 150,
      valueEnum: statusValueEnum(CONTRACT_STATUS_META),
      render: (_, record) => {
        const hint = expiryHint(record.status, record.endDate);
        return (
          <>
            {contractStatusTag(record.status)}
            {hint ? <Tag color="red">{hint}</Tag> : null}
          </>
        );
      },
    },
    {
      title: '合同名称',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 180,
    },
    {
      title: '类型',
      dataIndex: 'contractType',
      search: false,
      width: 80,
      render: (_, record) => metaTag(CONTRACT_TYPE_META, record.contractType),
    },
    {
      title: '相对方',
      dataIndex: 'counterparty',
      search: false,
      ellipsis: true,
      width: 150,
    },
    {
      title: '金额',
      dataIndex: 'amount',
      search: false,
      width: 120,
      render: (_, record) => formatAmount(record.amount),
    },
    {
      title: '到期日',
      dataIndex: 'endDate',
      search: false,
      width: 110,
    },
    {
      title: '经办人',
      dataIndex: 'ownerName',
      search: false,
      width: 90,
      render: (_, record) => record.ownerName || record.ownerId,
    },
    {
      title: '版本',
      dataIndex: 'currentVersion',
      search: false,
      width: 64,
      render: (_, record) => `v${record.currentVersion}`,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 180,
      render: (_, record) => [
        <Button
          key="detail"
          type="link"
          onClick={() => void openDetail(record)}
        >
          详情
        </Button>,
        record.status === 'PENDING_SIGN' ? (
          <AccessControl key="sign" permission="system:oa:contract:execute">
            <Button type="link" onClick={() => openSign(record)}>
              登记签署
            </Button>
          </AccessControl>
        ) : null,
        record.status === 'SIGNED' ? (
          <AccessControl key="archive" permission="system:oa:contract:execute">
            <Button type="link" onClick={() => openArchive(record)}>
              登记归档
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaContractVo>
        headerTitle="合同台账"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1300 }}
        request={async (params) => {
          const response = await queryOaContracts({
            page: (params.current as number) || 1,
            size: (params.pageSize as number) || 10,
            status: params.status || undefined,
            keyword: (params.keyword as string)?.trim() || undefined,
            expiringDays: params.expiringDays
              ? Number(params.expiringDays)
              : undefined,
          });
          return {
            data: response.data?.list ?? [],
            total: response.data?.total ?? 0,
            success: true,
          };
        }}
      />
      <Drawer
        title="合同详情"
        width={900}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? (
            <ContractDetailContent
              detail={detail}
              filePath={(file) =>
                `system/oa/contract/${detail.contract.id}/files/${file.fileId}`
              }
            />
          ) : null}
        </Spin>
      </Drawer>
      <Modal
        title={signing ? `登记签署：${signing.contractNo}` : '登记签署'}
        open={Boolean(signing)}
        width={520}
        confirmLoading={submitting}
        okText="确认签署"
        destroyOnHidden
        onCancel={() => setSigning(null)}
        onOk={() => void submitSign()}
      >
        {signing ? (
          <Form form={signForm} name="oaContractSignForm" layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`${signing.title}（${signing.counterparty}），金额 ${formatAmount(signing.amount)}。签署在线下完成，这里只登记结果。`}
            />
            <Form.Item
              name="signedDate"
              label="签署日期"
              rules={[{ required: true, message: '请选择签署日期' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                aria-label="签署日期"
                disabledDate={(date) => date.isAfter(dayjs(), 'day')}
              />
            </Form.Item>
            <Form.Item
              name="signatories"
              label="签署方代表"
              rules={[
                {
                  required: true,
                  whitespace: true,
                  message: '请输入签署方代表',
                },
              ]}
            >
              <Input
                maxLength={200}
                aria-label="签署方代表"
                placeholder="如：我方张三，对方李四"
              />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
      <Modal
        title={archiving ? `登记归档：${archiving.contractNo}` : '登记归档'}
        open={Boolean(archiving)}
        width={520}
        confirmLoading={submitting}
        okText="确认归档"
        destroyOnHidden
        onCancel={() => setArchiving(null)}
        onOk={() => void submitArchive()}
      >
        {archiving ? (
          <Form
            form={archiveForm}
            name="oaContractArchiveForm"
            layout="vertical"
          >
            <Form.Item
              name="archiveNo"
              label="档案号"
              rules={[
                { required: true, whitespace: true, message: '请输入档案号' },
              ]}
            >
              <Input maxLength={64} aria-label="档案号" />
            </Form.Item>
            <Form.Item name="location" label="存放位置">
              <Input maxLength={100} aria-label="存放位置" />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
    </>
  );
};

const ContractManagePage: React.FC = () => {
  const [templating, setTemplating] = useState(false);

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaContractTemplate();
      message.success(`已生成合同流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '合同管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:contract:manage">
          <Popconfirm
            title="生成合同模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                生成并发布“合同审批”表单（名称、相对方、类型、金额、期限、条款摘要、合同文本，可填原合同编号修订），并创建流程草稿：直属上级
                → 法务岗位 → 财务岗位审核，金额超过 10
                万元再由总经理岗位审批。需选择表单版本后发布。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成合同模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <ContractLedger />
    </PageContainer>
  );
};

export default ContractManagePage;
