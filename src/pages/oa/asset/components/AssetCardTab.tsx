import { PlusOutlined } from '@ant-design/icons';
import {
  type ActionType,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
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
  Select,
  Space,
  Spin,
} from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaAsset,
  getOaAsset,
  type OaAssetAction,
  type OaAssetDetailVo,
  type OaAssetVo,
  operateOaAsset,
  queryOaAssets,
} from '@/services/web/guardfind/oa';
import {
  ASSET_ACTION_TEXT,
  ASSET_STATUS_META,
  assetActionNeedsHolder,
  assetActions,
} from '@/utils/oaAsset';
import { formatAmount } from '@/utils/oaExpense';
import { newRequestId, statusValueEnum } from '@/utils/oaTravel';
import { OaEmployeeSelect } from '../../components/OaStaffSelects';
import { AssetDetailContent, assetStatusTag } from './AssetDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type CreateValues = {
  name: string;
  category?: string;
  spec?: string;
  originalValue: number;
  location?: string;
  acquiredDate?: Dayjs;
};

type OperateValues = {
  action: OaAssetAction;
  holderId?: string;
  location?: string;
  remark?: string;
};

const AssetCardTab: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [detail, setDetail] = useState<OaAssetDetailVo | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [operating, setOperating] = useState<OaAssetVo | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [createForm] = Form.useForm<CreateValues>();
  const [operateForm] = Form.useForm<OperateValues>();
  const action = Form.useWatch('action', operateForm);

  const openDetail = async (record: OaAssetVo) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getOaAsset(record.id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    requestIdRef.current = newRequestId('asset');
    createForm.resetFields();
    createForm.setFieldsValue({ acquiredDate: dayjs() });
    setCreating(true);
  };

  const submitCreate = async () => {
    const values = await createForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      const response = await createOaAsset({
        requestId: requestIdRef.current,
        name: values.name.trim(),
        category: values.category?.trim() || undefined,
        spec: values.spec?.trim() || undefined,
        originalValue: values.originalValue,
        location: values.location?.trim() || undefined,
        acquiredDate: values.acquiredDate?.format('YYYY-MM-DD'),
      });
      message.success(`已建卡 ${response.data.assetNo}`);
      setCreating(false);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openOperate = (record: OaAssetVo) => {
    requestIdRef.current = newRequestId('asset-op');
    operateForm.resetFields();
    operateForm.setFieldsValue({
      action: assetActions(record.status)[0],
      location: record.location ?? undefined,
    });
    setOperating(record);
  };

  const submitOperate = async () => {
    if (!operating) return;
    const values = await operateForm.validateFields().catch(() => null);
    if (!values) return;
    setSubmitting(true);
    try {
      await operateOaAsset(operating.id, {
        requestId: requestIdRef.current,
        action: values.action,
        holderId:
          assetActionNeedsHolder(values.action) && values.holderId
            ? values.holderId
            : undefined,
        location: values.location?.trim() || undefined,
        remark: values.remark?.trim() || undefined,
      });
      message.success(`已登记${ASSET_ACTION_TEXT[values.action]}`);
      setOperating(null);
      actionRef.current?.reload();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ProColumns<OaAssetVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '资产编号、名称或使用人' },
    },
    { title: '资产编号', dataIndex: 'assetNo', search: false, width: 150 },
    { title: '名称', dataIndex: 'name', search: false, width: 140 },
    {
      title: '资产状态',
      dataIndex: 'status',
      valueType: 'select',
      width: 150,
      valueEnum: statusValueEnum(ASSET_STATUS_META),
      render: (_, record) => assetStatusTag(record),
    },
    {
      title: '使用人',
      dataIndex: 'holderName',
      search: false,
      width: 100,
      render: (_, record) => record.holderName || record.holderId || '—',
    },
    {
      title: '位置',
      dataIndex: 'location',
      search: false,
      ellipsis: true,
      width: 120,
      render: (_, record) => record.location || '—',
    },
    {
      title: '原值',
      dataIndex: 'originalValue',
      search: false,
      width: 110,
      render: (_, record) => formatAmount(record.originalValue),
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
        assetActions(record.status).length > 0 && !record.scrapPending ? (
          <AccessControl key="operate" permission="system:oa:asset:operate">
            <Button type="link" onClick={() => openOperate(record)}>
              登记变动
            </Button>
          </AccessControl>
        ) : null,
      ],
    },
  ];

  return (
    <>
      <ProTable<OaAssetVo>
        headerTitle="资产卡片"
        rowKey="id"
        actionRef={actionRef}
        columns={columns}
        scroll={{ x: 1100 }}
        toolBarRender={() => [
          <AccessControl key="create" permission="system:oa:asset:manage">
            <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
              手工建卡
            </Button>
          </AccessControl>,
        ]}
        request={async (params) => {
          const response = await queryOaAssets({
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
        title="资产详情"
        width={860}
        open={open}
        destroyOnHidden
        onClose={() => setOpen(false)}
      >
        <Spin spinning={loading}>
          {detail ? <AssetDetailContent detail={detail} /> : null}
        </Spin>
      </Drawer>
      <Modal
        title="手工建卡"
        open={creating}
        width={560}
        confirmLoading={submitting}
        okText="建卡"
        destroyOnHidden
        onCancel={() => setCreating(false)}
        onOk={() => void submitCreate()}
      >
        <Form form={createForm} name="oaAssetCreateForm" layout="vertical">
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="采购验收会自动建卡；手工建卡用于存量资产登记，建卡后为在库状态。"
          />
          <Space size={16} align="start" wrap>
            <Form.Item
              name="name"
              label="名称"
              rules={[
                { required: true, whitespace: true, message: '请输入名称' },
              ]}
            >
              <Input maxLength={100} aria-label="资产名称" />
            </Form.Item>
            <Form.Item name="category" label="分类">
              <Input maxLength={32} aria-label="资产分类" />
            </Form.Item>
          </Space>
          <Form.Item name="spec" label="规格">
            <Input maxLength={200} aria-label="资产规格" />
          </Form.Item>
          <Space size={16} align="start" wrap>
            <Form.Item
              name="originalValue"
              label="原值（元）"
              rules={[{ required: true, message: '请输入原值' }]}
            >
              <InputNumber min={0} precision={2} aria-label="原值" />
            </Form.Item>
            <Form.Item name="acquiredDate" label="取得日期">
              <DatePicker
                aria-label="取得日期"
                disabledDate={(date) => date.isAfter(dayjs(), 'day')}
              />
            </Form.Item>
          </Space>
          <Form.Item name="location" label="存放位置">
            <Input maxLength={100} aria-label="存放位置" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={
          operating
            ? `登记变动：${operating.assetNo} ${operating.name}`
            : '登记变动'
        }
        open={Boolean(operating)}
        width={520}
        confirmLoading={submitting}
        okText="确认登记"
        destroyOnHidden
        onCancel={() => setOperating(null)}
        onOk={() => void submitOperate()}
      >
        {operating ? (
          <Form form={operateForm} name="oaAssetOperateForm" layout="vertical">
            <Form.Item
              name="action"
              label="变动类型"
              rules={[{ required: true, message: '请选择变动类型' }]}
            >
              <Select
                aria-label="变动类型"
                options={assetActions(operating.status).map((value) => ({
                  value,
                  label: ASSET_ACTION_TEXT[value],
                }))}
              />
            </Form.Item>
            {assetActionNeedsHolder(action) ? (
              <Form.Item
                name="holderId"
                label={action === 'TRANSFER' ? '调拨给' : '使用人'}
                rules={[{ required: true, message: '请选择使用人' }]}
              >
                <OaEmployeeSelect ariaLabel="使用人" />
              </Form.Item>
            ) : null}
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

export default AssetCardTab;
