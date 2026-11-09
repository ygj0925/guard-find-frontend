import { PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Select,
  Space,
  Table,
  Typography,
} from 'antd';
import React, { useEffect, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  createOaSupplyItem,
  type OaSupplyItemVo,
  type OaSupplyLedgerVo,
  queryOaSupplyItems,
  queryOaSupplyLedger,
  stockInOaSupply,
  stockOutOaSupply,
  updateOaSupplyItem,
} from '@/services/web/guardfind/oa';
import {
  SUPPLY_LEDGER_ACTION_META,
  SUPPLY_REF_TEXT,
  SUPPLY_STATUS_META,
} from '@/utils/oaAsset';
import { newRequestId } from '@/utils/oaTravel';
import { metaTag } from '../../purchase/components/PurchaseDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

type ItemValues = {
  code: string;
  name: string;
  spec?: string;
  unit: string;
  safetyStock: number;
  status: 'ENABLED' | 'DISABLED';
};

type StockMode = { item: OaSupplyItemVo; direction: 'in' | 'out' };

const SupplyTab: React.FC = () => {
  const [items, setItems] = useState<OaSupplyItemVo[]>([]);
  const [loading, setLoading] = useState(false);
  const [keyword, setKeyword] = useState('');
  const [editing, setEditing] = useState<OaSupplyItemVo | 'new' | null>(null);
  const [stocking, setStocking] = useState<StockMode | null>(null);
  const [ledgerOf, setLedgerOf] = useState<OaSupplyItemVo | null>(null);
  const [ledger, setLedger] = useState<OaSupplyLedgerVo[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const requestIdRef = useRef('');
  const [itemForm] = Form.useForm<ItemValues>();
  const [stockForm] = Form.useForm<{ quantity: number; remark?: string }>();

  const load = async (search = keyword) => {
    setLoading(true);
    try {
      const response = await queryOaSupplyItems({
        keyword: search.trim() || undefined,
      });
      setItems(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load('');
  }, []);

  const openEdit = (item: OaSupplyItemVo | 'new') => {
    setEditing(item);
    itemForm.resetFields();
    itemForm.setFieldsValue(
      item === 'new'
        ? { unit: '个', safetyStock: 0, status: 'ENABLED' }
        : {
            code: item.code,
            name: item.name,
            spec: item.spec ?? undefined,
            unit: item.unit,
            safetyStock: item.safetyStock,
            status: item.status === 'DISABLED' ? 'DISABLED' : 'ENABLED',
          },
    );
  };

  const saveItem = async () => {
    if (!editing) return;
    const values = await itemForm.validateFields().catch(() => null);
    if (!values) return;
    const data = {
      code: values.code.trim(),
      name: values.name.trim(),
      spec: values.spec?.trim() || undefined,
      unit: values.unit.trim(),
      safetyStock: values.safetyStock,
      status: values.status,
    };
    setSubmitting(true);
    try {
      if (editing === 'new') {
        await createOaSupplyItem(data);
        message.success('用品已新建');
      } else {
        await updateOaSupplyItem(editing.id, {
          ...data,
          version: editing.version,
        });
        message.success('用品已保存');
      }
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openStock = (item: OaSupplyItemVo, direction: 'in' | 'out') => {
    requestIdRef.current = newRequestId(`stock-${direction}`);
    stockForm.resetFields();
    setStocking({ item, direction });
  };

  const submitStock = async () => {
    if (!stocking) return;
    const values = await stockForm.validateFields().catch(() => null);
    if (!values) return;
    const call =
      stocking.direction === 'in' ? stockInOaSupply : stockOutOaSupply;
    setSubmitting(true);
    try {
      await call(stocking.item.id, {
        requestId: requestIdRef.current,
        quantity: values.quantity,
        remark: values.remark?.trim() || undefined,
      });
      message.success(stocking.direction === 'in' ? '已入库' : '已出库');
      setStocking(null);
      await load();
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setSubmitting(false);
    }
  };

  const openLedger = async (item: OaSupplyItemVo) => {
    setLedgerOf(item);
    setLedger([]);
    setLedgerLoading(true);
    try {
      const response = await queryOaSupplyLedger(item.id);
      setLedger(response.data ?? []);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLedgerLoading(false);
    }
  };

  return (
    <>
      <Space style={{ marginBottom: 16 }} wrap>
        <Input.Search
          allowClear
          aria-label="搜索用品"
          placeholder="编码或名称"
          style={{ width: 240 }}
          value={keyword}
          onChange={(event) => setKeyword(event.target.value)}
          onSearch={(value) => void load(value)}
        />
        <AccessControl permission="system:oa:asset:manage">
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => openEdit('new')}
          >
            新建用品
          </Button>
        </AccessControl>
      </Space>
      <Table<OaSupplyItemVo>
        rowKey="id"
        loading={loading}
        dataSource={items}
        pagination={false}
        scroll={{ x: 1000 }}
        aria-label="用品库存"
        locale={{ emptyText: '暂无用品档案，新建并启用后才能生成领用表单' }}
        columns={[
          { title: '编码', dataIndex: 'code', width: 110 },
          { title: '名称', dataIndex: 'name', width: 140 },
          {
            title: '规格',
            dataIndex: 'spec',
            ellipsis: true,
            render: (value) => value || '—',
          },
          {
            title: '库存',
            key: 'stock',
            width: 120,
            render: (_, item) =>
              item.belowSafety ? (
                <Typography.Text type="danger">
                  {item.stock} {item.unit}（低于安全库存）
                </Typography.Text>
              ) : (
                `${item.stock} ${item.unit}`
              ),
          },
          { title: '安全库存', dataIndex: 'safetyStock', width: 90 },
          {
            title: '状态',
            dataIndex: 'status',
            width: 80,
            render: (value: string) => metaTag(SUPPLY_STATUS_META, value),
          },
          {
            title: '操作',
            key: 'action',
            fixed: 'right',
            width: 240,
            render: (_, item) => (
              <Space size={0} wrap>
                <Button type="link" onClick={() => void openLedger(item)}>
                  台账
                </Button>
                <AccessControl permission="system:oa:asset:operate">
                  <Button type="link" onClick={() => openStock(item, 'in')}>
                    入库
                  </Button>
                </AccessControl>
                <AccessControl permission="system:oa:asset:operate">
                  <Button
                    type="link"
                    disabled={item.stock <= 0}
                    onClick={() => openStock(item, 'out')}
                  >
                    出库
                  </Button>
                </AccessControl>
                <AccessControl permission="system:oa:asset:manage">
                  <Button type="link" onClick={() => openEdit(item)}>
                    编辑
                  </Button>
                </AccessControl>
              </Space>
            ),
          },
        ]}
      />
      <Modal
        title={editing === 'new' ? '新建用品' : '编辑用品'}
        open={Boolean(editing)}
        width={560}
        confirmLoading={submitting}
        okText="保存"
        destroyOnHidden
        onCancel={() => setEditing(null)}
        onOk={() => void saveItem()}
      >
        {editing ? (
          <Form form={itemForm} name="oaSupplyItemForm" layout="vertical">
            <Space size={16} align="start" wrap>
              <Form.Item
                name="code"
                label="编码"
                rules={[
                  { required: true, whitespace: true, message: '请输入编码' },
                  {
                    pattern: /^[A-Za-z0-9_-]{1,32}$/,
                    message: '只能包含字母、数字、下划线和短横线',
                  },
                ]}
              >
                <Input maxLength={32} aria-label="用品编码" />
              </Form.Item>
              <Form.Item
                name="name"
                label="名称"
                rules={[
                  { required: true, whitespace: true, message: '请输入名称' },
                ]}
              >
                <Input maxLength={100} aria-label="用品名称" />
              </Form.Item>
            </Space>
            <Form.Item name="spec" label="规格">
              <Input maxLength={200} aria-label="规格" />
            </Form.Item>
            <Space size={16} align="start" wrap>
              <Form.Item
                name="unit"
                label="单位"
                rules={[
                  { required: true, whitespace: true, message: '请输入单位' },
                ]}
              >
                <Input
                  maxLength={16}
                  style={{ width: 100 }}
                  aria-label="单位"
                />
              </Form.Item>
              <Form.Item
                name="safetyStock"
                label="安全库存"
                rules={[{ required: true, message: '请输入安全库存' }]}
              >
                <InputNumber
                  min={0}
                  max={99999}
                  precision={0}
                  aria-label="安全库存"
                />
              </Form.Item>
              <Form.Item name="status" label="状态">
                <Select
                  aria-label="用品状态"
                  style={{ width: 100 }}
                  options={[
                    { value: 'ENABLED', label: '启用' },
                    { value: 'DISABLED', label: '停用' },
                  ]}
                />
              </Form.Item>
            </Space>
          </Form>
        ) : null}
      </Modal>
      <Modal
        title={
          stocking
            ? `${stocking.direction === 'in' ? '入库' : '出库'}：${stocking.item.name}`
            : '库存变动'
        }
        open={Boolean(stocking)}
        width={460}
        confirmLoading={submitting}
        okText={stocking?.direction === 'out' ? '确认出库' : '确认入库'}
        destroyOnHidden
        onCancel={() => setStocking(null)}
        onOk={() => void submitStock()}
      >
        {stocking ? (
          <Form form={stockForm} name="oaSupplyStockForm" layout="vertical">
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message={`当前库存 ${stocking.item.stock} ${stocking.item.unit}。手工变动记入库存台账，重复提交按请求号去重。`}
            />
            <Form.Item
              name="quantity"
              label="数量"
              rules={[{ required: true, message: '请输入数量' }]}
            >
              <InputNumber
                min={1}
                max={stocking.direction === 'out' ? stocking.item.stock : 99999}
                precision={0}
                aria-label="变动数量"
              />
            </Form.Item>
            <Form.Item name="remark" label="备注">
              <Input.TextArea rows={2} maxLength={500} showCount />
            </Form.Item>
          </Form>
        ) : null}
      </Modal>
      <Drawer
        title={ledgerOf ? `库存台账：${ledgerOf.name}` : '库存台账'}
        width={760}
        open={Boolean(ledgerOf)}
        destroyOnHidden
        onClose={() => setLedgerOf(null)}
      >
        <Table<OaSupplyLedgerVo>
          rowKey="id"
          size="small"
          bordered
          loading={ledgerLoading}
          pagination={false}
          dataSource={ledger}
          aria-label="库存台账"
          locale={{ emptyText: '暂无台账记录' }}
          columns={[
            {
              title: '动作',
              dataIndex: 'action',
              width: 96,
              render: (value: string) =>
                metaTag(SUPPLY_LEDGER_ACTION_META, value),
            },
            { title: '数量', dataIndex: 'quantity', width: 80 },
            { title: '结存', dataIndex: 'balanceAfter', width: 80 },
            {
              title: '来源',
              key: 'ref',
              width: 120,
              render: (_, record) =>
                `${SUPPLY_REF_TEXT[record.refType] ?? record.refType}${
                  record.refId ? ` #${record.refId}` : ''
                }`,
            },
            {
              title: '操作人',
              key: 'operator',
              width: 90,
              render: (_, record) => record.operatorName || record.operatorId,
            },
            {
              title: '时间',
              dataIndex: 'createTime',
              width: 170,
              render: (value) => value || '—',
            },
            {
              title: '备注',
              dataIndex: 'remark',
              ellipsis: true,
              render: (value) => value || '—',
            },
          ]}
        />
      </Drawer>
    </>
  );
};

export default SupplyTab;
