import {
  CrownOutlined,
  DeleteOutlined,
  DownOutlined,
  TeamOutlined,
  UpOutlined,
} from '@ant-design/icons';
import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Input, Modal, message, Popconfirm, Space, Tag } from 'antd';
import React, { useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  deleteProperty,
  type ManagerVo,
  type PropertyVo,
  queryManagers,
  queryPropertyPage,
  setManager,
  updatePropertyStatus,
} from '@/services/web/guardfind/property';

const STATUS_META: Record<number, { text: string; color: string }> = {
  1: { text: '草稿', color: 'default' },
  2: { text: '已上架', color: 'green' },
  3: { text: '已下架', color: 'red' },
};

const TYPE_LABEL: Record<string, string> = {
  house: '住宅',
  apartment: '公寓',
  villa: '别墅',
  shop: '商铺',
};

const PropertyPage: React.FC = () => {
  const actionRef = useRef<ActionType>(null);
  const [managerModalVisible, setManagerModalVisible] = useState(false);
  const [managers, setManagers] = useState<ManagerVo[]>([]);
  const [managerUserId, setManagerUserId] = useState<string>('');

  const loadManagers = async () => {
    const response = await queryManagers({ page: 1, size: 50 });
    setManagers(response.data?.list || []);
  };

  const handleStatus = async (record: PropertyVo, status: number) => {
    await updatePropertyStatus(record.id, status);
    message.success(
      status === 2 ? '已上架' : status === 3 ? '已下架' : '已转为草稿',
    );
    actionRef.current?.reload();
  };

  const handleDelete = async (record: PropertyVo) => {
    await deleteProperty(record.id);
    message.success('已删除');
    actionRef.current?.reload();
  };

  const handleSetManager = async (isManager: boolean) => {
    const userId = Number(managerUserId);
    if (!userId) {
      message.warning('请输入用户 ID');
      return;
    }
    await setManager(userId, isManager);
    message.success(isManager ? '已设为认证管家' : '已取消管家');
    setManagerUserId('');
    await loadManagers();
    actionRef.current?.reload();
  };

  const columns: ProColumns<PropertyVo>[] = [
    { title: 'ID', dataIndex: 'id', width: 80, hideInSearch: true },
    {
      title: '标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '房东',
      dataIndex: 'ownerNickname',
      width: 120,
      ellipsis: true,
      hideInSearch: true,
      render: (_, record) =>
        record.ownerIsManager ? (
          <Space size={4}>
            <span>{record.ownerNickname}</span>
            <Tag color="blue">管家</Tag>
          </Space>
        ) : (
          record.ownerNickname
        ),
    },
    {
      title: '类型',
      dataIndex: 'propertyType',
      width: 90,
      hideInSearch: true,
      render: (_, record) =>
        TYPE_LABEL[record.propertyType] || record.propertyType,
    },
    {
      title: '价格',
      dataIndex: 'price',
      width: 120,
      hideInSearch: true,
      render: (_, record) =>
        `¥${record.price}${record.priceType === 'rent' ? '/月' : ''}`,
    },
    {
      title: '城市',
      dataIndex: 'city',
      width: 110,
      ellipsis: true,
    },
    {
      title: '租售',
      dataIndex: 'priceType',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (record.priceType === 'rent' ? '出租' : '出售'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 90,
      valueType: 'select',
      valueEnum: {
        1: { text: '草稿' },
        2: { text: '已上架' },
        3: { text: '已下架' },
      },
      render: (_, record) => {
        const meta = STATUS_META[record.status] || {
          text: '未知',
          color: 'default',
        };
        return <Tag color={meta.color}>{meta.text}</Tag>;
      },
    },
    { title: '浏览', dataIndex: 'viewCount', width: 70, hideInSearch: true },
    {
      title: '发布时间',
      dataIndex: 'createTime',
      width: 170,
      hideInSearch: true,
    },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      className: 'table-action-column',
      width: 220,
      render: (_, record) => (
        <Space wrap>
          {record.status !== 2 ? (
            <AccessControl permission="system:property:status">
              <Button
                type="link"
                size="small"
                icon={<UpOutlined />}
                onClick={() => void handleStatus(record, 2)}
              >
                上架
              </Button>
            </AccessControl>
          ) : (
            <AccessControl permission="system:property:status">
              <Button
                type="link"
                size="small"
                icon={<DownOutlined />}
                onClick={() => void handleStatus(record, 3)}
              >
                下架
              </Button>
            </AccessControl>
          )}
          <AccessControl permission="system:property:manager:set">
            <Button
              type="link"
              size="small"
              icon={<CrownOutlined />}
              onClick={() => void handleToggleManager(record)}
            >
              {record.ownerIsManager ? '取消管家' : '设为管家'}
            </Button>
          </AccessControl>
          <AccessControl permission="system:property:delete">
            <Popconfirm
              title="确定删除该房源?"
              onConfirm={() => void handleDelete(record)}
            >
              <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                删除
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];

  const handleToggleManager = async (record: PropertyVo) => {
    await setManager(record.userId, !record.ownerIsManager);
    message.success(record.ownerIsManager ? '已取消管家' : '已设为认证管家');
    actionRef.current?.reload();
  };

  return (
    <PageContainer>
      <ProTable<PropertyVo>
        headerTitle="房源管理"
        actionRef={actionRef}
        rowKey="id"
        columns={columns}
        scroll={{ x: 1400 }}
        request={async (params) => {
          const { current, pageSize, ...rest } = params;
          const response = await queryPropertyPage({
            page: (current as number) || 1,
            size: (pageSize as number) || 10,
            status: rest.status ? Number(rest.status) : undefined,
            city: rest.city || undefined,
          });
          return {
            data: response.data?.list || [],
            success: true,
            total: response.data?.total || 0,
          };
        }}
        toolBarRender={() => [
          <AccessControl
            key="managers"
            permission="system:property:manager:list"
          >
            <Button
              icon={<TeamOutlined />}
              onClick={() => {
                setManagerModalVisible(true);
                void loadManagers();
              }}
            >
              管家列表
            </Button>
          </AccessControl>,
        ]}
      />

      <Modal
        title="房源管家"
        open={managerModalVisible}
        footer={null}
        onCancel={() => setManagerModalVisible(false)}
        width={520}
      >
        <Space.Compact style={{ width: '100%', marginBottom: 16 }}>
          <Input
            placeholder="输入用户 ID"
            value={managerUserId}
            onChange={(e) => setManagerUserId(e.target.value)}
          />
          <Button type="primary" onClick={() => void handleSetManager(true)}>
            设为管家
          </Button>
          <Button danger onClick={() => void handleSetManager(false)}>
            取消管家
          </Button>
        </Space.Compact>
        {managers.length === 0 ? (
          <div style={{ color: '#999' }}>暂无认证管家</div>
        ) : (
          managers.map((m) => (
            <div
              key={m.userId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px 0',
                borderBottom: '1px solid #f0f0f0',
              }}
            >
              <span>
                {m.nickname}（ID: {m.userId}）
              </span>
              <span style={{ color: '#999' }}>{m.phone || ''}</span>
            </div>
          ))
        )}
      </Modal>
    </PageContainer>
  );
};

export default PropertyPage;
