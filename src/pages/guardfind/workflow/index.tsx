import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { Button, Drawer } from 'antd';
import { useState } from 'react';
import { type Ticket, tickets } from '@/services/web/guardfind/operations';
import SupportWorkflow from '../components/SupportWorkflow';
export default function Workflow() {
  const [user, setUser] = useState<string>();
  const columns: ProColumns<Ticket>[] = [
    { title: '用户', dataIndex: 'nickname', hideInSearch: true },
    {
      title: '用户 ID',
      dataIndex: 'userId',
      hideInSearch: true,
      copyable: true,
    },
    { title: '接待客服 ID', dataIndex: 'ownerAdminId', hideInSearch: true },
    {
      title: '状态',
      dataIndex: 'state',
      valueType: 'select',
      valueEnum: { OPEN: { text: '待解决' }, RESOLVED: { text: '已解决' } },
    },
    {
      title: '操作',
      valueType: 'option',
      render: (_, row) => (
        <Button type="link" onClick={() => setUser(row.userId)}>
          查看与分配
        </Button>
      ),
    },
  ];
  return (
    <PageContainer title="客服接待工作台">
      <ProTable<Ticket>
        rowKey="userId"
        columns={columns}
        request={async ({ current, pageSize, state }) => {
          const r = await tickets({
            page: current || 1,
            size: pageSize || 10,
            state,
          });
          return { data: r.data.list, total: r.data.total, success: true };
        }}
      />
      {user && (
        <Drawer
          title="接待处理"
          open
          onClose={() => setUser(undefined)}
          width={720}
        >
          <SupportWorkflow userId={user} />
          <a href={`/guardfind/im?userId=${encodeURIComponent(user)}`}>
            进入用户沟通
          </a>
        </Drawer>
      )}
    </PageContainer>
  );
}
