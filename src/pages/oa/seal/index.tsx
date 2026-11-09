/**
 * 用印管理：印章档案（编码、类型、保管人、启停）、用印台账与保管人的待我用印；一键生成用印表单与流程草稿。
 * 公章/法人章或超过 10 份需总经理岗位审批；只有保管人可登记实际用印，份数不超过审批份数，请求号保证重试幂等。
 */
import { PlusOutlined, ThunderboltOutlined } from '@ant-design/icons';
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
  InputNumber,
  Modal,
  message,
  Popconfirm,
  Select,
  Space,
  Spin,
  Table,
  Tabs,
  Tag,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  createOaSeal,
  createOaSealTemplate,
  executeOaSealRequest,
  type OaLinkedFileVo,
  type OaSealRequestVo,
  type OaSealType,
  type OaSealVo,
  queryKeeperOaSealFiles,
  queryKeeperOaSealRequests,
  queryOaSealRequestFiles,
  queryOaSealRequests,
  queryOaSeals,
  updateOaSeal,
} from '@/services/web/guardfind/oa';
import {
  SEAL_REQUEST_STATUS_META,
  SEAL_STATUS_META,
  SEAL_TYPE_META,
  sealNeedsGm,
} from '@/utils/oaContract';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { OaEmployeeSelect } from '../components/OaStaffSelects';
import {
  LinkedFileList,
  sealRequestStatusTag,
} from '../contract/components/ContractDetail';
import { metaTag, TrackButton } from '../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type SealValues = {
  code: string;
  name: string;
  sealType: OaSealType;
  keeperId: string;
  status: 'ENABLED' | 'DISABLED';
  remark?: string;
};

type ExecuteValues = { usedCopies: number; usedDate: Dayjs; remark?: string };

const SEAL_TYPE_OPTIONS = Object.entries(SEAL_TYPE_META).map(
  ([value, meta]) => ({ value, label: meta.text }),
);

const SealArchiveTab: React.FC = () => {
  const [seals, setSeals] = useState<OaSealVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState<OaSealVo | 'new' | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm<SealValues>();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await queryOaSeals();
      setSeals(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openEdit = (seal: OaSealVo | 'new') => {
    form.resetFields();
    if (seal === 'new') {
      form.setFieldsValue({ status: 'ENABLED', sealType: 'CONTRACT' });
    } else {
      form.setFieldsValue({
        code: seal.code,
        name: seal.name,
        sealType: seal.sealType,
        keeperId: String(seal.keeperId),
        status: seal.status,
        remark: seal.remark ?? undefined,
      });
    }
    setEditing(seal);
  };

  const submit = async () => {
    if (!editing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    const data = {
      code: values.code.trim(),
      name: values.name.trim(),
      sealType: values.sealType,
      keeperId: values.keeperId,
      status: values.status,
      remark: values.remark?.trim() || undefined,
    };
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createOaSeal(data);
      } else {
        await updateOaSeal(editing.id, { ...data, version: editing.version });
      }
      message.success('印章已保存');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <AccessControl permission="system:oa:seal:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            新建印章
          </Button>
        </AccessControl>
      </Space>
      <Table<OaSealVo>
        rowKey="id"
        loading={loading}
        dataSource={seals}
        pagination={false}
        scroll={{ x: 820 }}
        aria-label="印章档案"
        locale={{ emptyText: '暂无印章，请先新建并启用' }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 120 },
          { title: '名称', dataIndex: 'name', width: 160 },
          {
            title: '类型',
            dataIndex: 'sealType',
            width: 90,
            render: (value: string) => metaTag(SEAL_TYPE_META, value),
          },
          {
            title: '保管人',
            key: 'keeper',
            width: 110,
            render: (_, record) => record.keeperName || record.keeperId,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (value: string) => metaTag(SEAL_STATUS_META, value),
          },
          {
            title: '审批要求',
            key: 'risk',
            width: 150,
            render: (_, record) =>
              sealNeedsGm(record.sealType, 0) ? (
                <Tag color="red">需总经理审批</Tag>
              ) : (
                '超过 10 份需总经理审批'
              ),
          },
          {
            title: '备注',
            dataIndex: 'remark',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 80,
            render: (_, record) => (
              <AccessControl permission="system:oa:seal:manage">
                <Button type="link" onClick={() => openEdit(record)}>
                  编辑
                </Button>
              </AccessControl>
            ),
          },
        ]}
      />
      <Modal
        title={
          editing === 'new'
            ? '新建印章'
            : editing
              ? `编辑印章：${editing.name}`
              : '印章'
        }
        open={Boolean(editing)}
        width={520}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void submit()}
      >
        <Form form={form} name="oaSealForm" layout="vertical">
          <Form.Item
            name="code"
            label="印章编码"
            rules={[
              { required: true, whitespace: true, message: '请输入印章编码' },
              {
                pattern: /^[A-Za-z0-9_-]+$/,
                message: '只能包含字母、数字、下划线和短横线',
              },
            ]}
          >
            <Input maxLength={32} aria-label="印章编码" />
          </Form.Item>
          <Form.Item
            name="name"
            label="印章名称"
            rules={[
              { required: true, whitespace: true, message: '请输入印章名称' },
            ]}
          >
            <Input maxLength={100} aria-label="印章名称" />
          </Form.Item>
          <Form.Item
            name="sealType"
            label="印章类型"
            rules={[{ required: true, message: '请选择印章类型' }]}
          >
            <Select aria-label="印章类型" options={SEAL_TYPE_OPTIONS} />
          </Form.Item>
          <Form.Item
            name="keeperId"
            label="保管人"
            rules={[{ required: true, message: '请选择保管人' }]}
          >
            <OaEmployeeSelect ariaLabel="保管人" />
          </Form.Item>
          <Form.Item name="status" label="状态" rules={[{ required: true }]}>
            <Select
              aria-label="印章状态"
              options={[
                { value: 'ENABLED', label: '启用' },
                { value: 'DISABLED', label: '停用' },
              ]}
            />
          </Form.Item>
          <Form.Item name="remark" label="备注">
            <Input.TextArea rows={2} maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

function sealColumns(): ProColumns<OaSealRequestVo>[] {
  return [
    {
      title: '状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 90,
      valueEnum: statusValueEnum(SEAL_REQUEST_STATUS_META),
      render: (_, record) => sealRequestStatusTag(record.status),
    },
    {
      title: '申请',
      dataIndex: 'title',
      search: false,
      ellipsis: true,
      width: 170,
      render: (_, record) => record.title || `申请 #${record.applicationId}`,
    },
    {
      title: '印章',
      dataIndex: 'sealName',
      search: false,
      width: 170,
      render: (_, record) => (
        <Space size={4}>
          {record.sealName}
          {metaTag(SEAL_TYPE_META, record.sealType)}
        </Space>
      ),
    },
    {
      title: '份数',
      dataIndex: 'copies',
      search: false,
      width: 80,
      render: (_, record) =>
        record.usedCopies === null || record.usedCopies === undefined
          ? `${record.copies}`
          : `${record.usedCopies}/${record.copies}`,
    },
    {
      title: '用印日期',
      dataIndex: 'useDate',
      search: false,
      width: 110,
      render: (_, record) => record.usedDate || record.useDate,
    },
    {
      title: '关联合同',
      dataIndex: 'contractNo',
      search: false,
      width: 150,
      render: (_, record) => record.contractNo || '—',
    },
    {
      title: '申请人',
      dataIndex: 'applicantName',
      search: false,
      width: 90,
      render: (_, record) => record.applicantName || record.applicantId,
    },
  ];
}

function pageResult<T>(response: { data?: { list?: T[]; total?: number } }) {
  return {
    data: response.data?.list ?? [],
    total: response.data?.total ?? 0,
    success: true,
  };
}

const FilesDrawer: React.FC<{
  request: OaSealRequestVo | null;
  loader: (id: number) => Promise<{ data: OaLinkedFileVo[] }>;
  pathOf: (request: OaSealRequestVo, file: OaLinkedFileVo) => string;
  onClose: () => void;
}> = ({ request, loader, pathOf, onClose }) => {
  const [files, setFiles] = useState<OaLinkedFileVo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!request) return;
    let active = true;
    setFiles([]);
    setLoading(true);
    loader(request.id)
      .then((response) => {
        if (active) setFiles(response.data ?? []);
      })
      .catch((error) => message.error(errorText(error)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [request, loader]);

  return (
    <Drawer
      title={request ? `用印材料：${request.sealName}` : '用印材料'}
      width={560}
      open={Boolean(request)}
      destroyOnHidden
      onClose={onClose}
    >
      {request ? (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {request.executeRemark ? (
            <Alert type="info" message={`用印备注：${request.executeRemark}`} />
          ) : null}
          <Spin spinning={loading}>
            <LinkedFileList
              files={files}
              pathOf={(file) => pathOf(request, file)}
              emptyText="申请未附材料"
            />
          </Spin>
          <TrackButton applicationId={request.applicationId} />
        </Space>
      ) : null}
    </Drawer>
  );
};

const SealLedgerTab: React.FC = () => {
  const [viewing, setViewing] = useState<OaSealRequestVo | null>(null);
  const columns: ProColumns<OaSealRequestVo>[] = [
    ...sealColumns(),
    {
      title: '保管人',
      dataIndex: 'keeperName',
      search: false,
      width: 90,
      render: (_, record) => record.keeperName || record.keeperId,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 90,
      render: (_, record) => (
        <Button type="link" onClick={() => setViewing(record)}>
          材料
        </Button>
      ),
    },
  ];
  return (
    <>
      <ProTable<OaSealRequestVo>
        headerTitle="用印台账"
        rowKey="id"
        columns={columns}
        scroll={{ x: 1100 }}
        request={async (params) =>
          pageResult(
            await queryOaSealRequests({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
            }),
          )
        }
      />
      <FilesDrawer
        request={viewing}
        loader={queryOaSealRequestFiles}
        pathOf={(request, file) =>
          `system/oa/seal/requests/${request.id}/files/${file.fileId}`
        }
        onClose={() => setViewing(null)}
      />
    </>
  );
};

const KeeperTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [viewing, setViewing] = useState<OaSealRequestVo | null>(null);
  const [executing, setExecuting] = useState<OaSealRequestVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [form] = Form.useForm<ExecuteValues>();

  const openExecute = (record: OaSealRequestVo) => {
    requestIdRef.current = newRequestId('seal-execute');
    form.resetFields();
    form.setFieldsValue({ usedCopies: record.copies, usedDate: dayjs() });
    setExecuting(record);
  };

  const submit = async () => {
    if (!executing) return;
    const values = await form.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await executeOaSealRequest(executing.id, {
        requestId: requestIdRef.current,
        usedCopies: values.usedCopies,
        usedDate: values.usedDate.format('YYYY-MM-DD'),
        remark: values.remark?.trim() || undefined,
      });
      message.success('已登记用印');
      setExecuting(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaSealRequestVo>[] = [
    ...sealColumns(),
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 150,
      render: (_, record) => [
        <Button key="files" type="link" onClick={() => setViewing(record)}>
          材料
        </Button>,
        record.status === 'PENDING_SEAL' ? (
          <Button key="execute" type="link" onClick={() => openExecute(record)}>
            登记用印
          </Button>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaSealRequestVo>
        headerTitle="待我用印"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        form={{ initialValues: { status: 'PENDING_SEAL' } }}
        request={async (params) =>
          pageResult(
            await queryKeeperOaSealRequests({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
            }),
          )
        }
      />
      <FilesDrawer
        request={viewing}
        loader={queryKeeperOaSealFiles}
        pathOf={(request, file) =>
          `system/oa/seal/keeper/requests/${request.id}/files/${file.fileId}`
        }
        onClose={() => setViewing(null)}
      />
      <Modal
        title={executing ? `登记用印：${executing.sealName}` : '登记用印'}
        open={Boolean(executing)}
        width={520}
        confirmLoading={submitting}
        okText="确认用印"
        destroyOnHidden
        onCancel={() => setExecuting(null)}
        onOk={() => void submit()}
      >
        {executing ? (
          <Form form={form} name="oaSealExecuteForm" layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`审批份数 ${executing.copies}，实际用印不能超过审批份数。`}
            />
            <Form.Item
              name="usedCopies"
              label="实际用印份数"
              rules={[{ required: true, message: '请填写实际用印份数' }]}
            >
              <InputNumber
                min={1}
                max={executing.copies}
                precision={0}
                style={{ width: '100%' }}
                aria-label="实际用印份数"
              />
            </Form.Item>
            <Form.Item
              name="usedDate"
              label="用印日期"
              rules={[{ required: true, message: '请选择用印日期' }]}
            >
              <DatePicker
                style={{ width: '100%' }}
                aria-label="用印日期"
                disabledDate={(date) => date.isAfter(dayjs(), 'day')}
              />
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

const SealManagePage: React.FC = () => {
  const { hasPermission } = useAccess();
  const [templating, setTemplating] = useState(false);
  const canList = hasPermission('system:oa:seal:list');
  const items = [
    ...(canList || hasPermission('system:oa:seal:manage')
      ? [{ key: 'seals', label: '印章档案', children: <SealArchiveTab /> }]
      : []),
    ...(canList
      ? [{ key: 'ledger', label: '用印台账', children: <SealLedgerTab /> }]
      : []),
    ...(hasPermission('system:oa:seal:execute')
      ? [{ key: 'keeper', label: '待我用印', children: <KeeperTab /> }]
      : []),
  ];

  const handleTemplate = async () => {
    setTemplating(true);
    try {
      const response = await createOaSealTemplate();
      message.success(`已生成用印流程草稿 ${response.data.modelKey}`);
      history.push(`/oa/process/design?id=${response.data.modelId}`);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setTemplating(false);
    }
  };

  return (
    <PageContainer
      header={{ title: '用印管理' }}
      extra={[
        <AccessControl key="template" permission="system:oa:seal:manage">
          <Popconfirm
            title="生成用印模板？"
            description={
              <div style={{ maxWidth: 360 }}>
                按当前启用的印章生成并发布“用印申请”表单（印章、份数、用印日期、事由、材料，可关联合同编号），并创建流程草稿：直属上级审批，公章/法人章或超过
                10 份再由总经理岗位审批。新增印章后需重新生成。
              </div>
            }
            okText="生成"
            cancelText="取消"
            onConfirm={() => handleTemplate()}
          >
            <Button icon={<ThunderboltOutlined />} loading={templating}>
              生成用印模板
            </Button>
          </Popconfirm>
        </AccessControl>,
      ]}
    >
      <Tabs destroyOnHidden items={items} />
    </PageContainer>
  );
};

export default SealManagePage;
