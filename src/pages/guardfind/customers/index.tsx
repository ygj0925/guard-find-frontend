import {
  type ActionType,
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Avatar, Button, message, Popconfirm, Space, Tag } from 'antd';
import { useRef } from 'react';
import AccessControl from '@/components/AccessControl';
import {
  type Customer,
  customerStatus,
  customers,
} from '@/services/web/guardfind/operations';
import { setManager } from '@/services/web/guardfind/property';
export default function Customers() {
  const action = useRef<ActionType>(null);
  const columns: ProColumns<Customer>[] = [
    { title: '昵称 / 用户 ID', dataIndex: 'keyword', hideInTable: true },
    { title: '用户 ID', dataIndex: 'id', copyable: true, hideInSearch: true },
    {
      title: '头像',
      dataIndex: 'avatar',
      hideInSearch: true,
      render: (_, r) => (
        <Avatar src={r.avatar}>{r.nickname?.slice(0, 1)}</Avatar>
      ),
    },
    { title: '昵称', dataIndex: 'nickname', hideInSearch: true },
    {
      title: '账号状态',
      dataIndex: 'accountStatus',
      hideInSearch: true,
      render: (_, r) => (
        <Tag color={r.accountStatus === 1 ? 'green' : 'red'}>
          {r.accountStatus === 1 ? '启用' : '停用'}
        </Tag>
      ),
    },
    {
      title: '身份',
      hideInSearch: true,
      render: (_, r) => (r.isPropertyManager === 1 ? '认证管家' : '普通用户'),
    },
    { title: '注册时间', dataIndex: 'createTime', hideInSearch: true },
    {
      title: '操作',
      valueType: 'option',
      render: (_, r) => (
        <Space>
          <AccessControl permission="system:property:customer:update">
            <Popconfirm
              title={
                r.accountStatus === 1
                  ? '停用后该用户将无法继续使用登录服务，确定？'
                  : '重新启用该账号？'
              }
              onConfirm={async () => {
                await customerStatus(r.id, r.accountStatus === 1 ? 2 : 1);
                message.success('账号状态已更新');
                action.current?.reload();
              }}
            >
              <Button type="link">
                {r.accountStatus === 1 ? '停用' : '启用'}
              </Button>
            </Popconfirm>
          </AccessControl>
          <AccessControl permission="system:property:manager:set">
            <Popconfirm
              title={
                r.isPropertyManager === 1
                  ? '取消该用户的管家认证？'
                  : '将该用户设为认证管家？'
              }
              onConfirm={async () => {
                await setManager(r.id, r.isPropertyManager !== 1);
                message.success('管家身份已更新');
                action.current?.reload();
              }}
            >
              <Button type="link">
                {r.isPropertyManager === 1 ? '取消管家' : '设为管家'}
              </Button>
            </Popconfirm>
          </AccessControl>
        </Space>
      ),
    },
  ];
  return (
    <PageContainer title="小程序用户">
      <ProTable<Customer>
        rowKey="id"
        actionRef={action}
        columns={columns}
        pagination={{ defaultPageSize: 10 }}
        request={async ({ current, pageSize, keyword }) => {
          const r = await customers({
            page: current || 1,
            size: pageSize || 10,
            keyword,
          });
          return { data: r.data.list, total: r.data.total, success: true };
        }}
      />
    </PageContainer>
  );
}
