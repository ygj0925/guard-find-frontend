/**
 * 我的合同用印：本人经办的合同（版本、签署归档进度、用印记录）与本人发起的用印申请。
 */
import {
  PageContainer,
  type ProColumns,
  ProTable,
} from '@ant-design/pro-components';
import { history } from '@umijs/max';
import { Button, Drawer, message, Space, Spin, Tabs, Tag } from 'antd';
import React, { useEffect, useState } from 'react';
import {
  getMyOaContract,
  type OaContractDetailVo,
  type OaContractVo,
  type OaLinkedFileVo,
  type OaSealRequestVo,
  queryMyOaContracts,
  queryMyOaSealFiles,
  queryMyOaSealRequests,
} from '@/services/web/guardfind/oa';
import {
  CONTRACT_STATUS_META,
  CONTRACT_TYPE_META,
  expiryHint,
  SEAL_REQUEST_STATUS_META,
  SEAL_TYPE_META,
} from '@/utils/oaContract';
import { formatAmount } from '@/utils/oaExpense';
import { statusValueEnum } from '@/utils/oaTravel';
import { metaTag, TrackButton } from '../../purchase/components/PurchaseDetail';
import {
  ContractDetailContent,
  contractStatusTag,
  LinkedFileList,
  sealRequestStatusTag,
} from '../components/ContractDetail';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '加载失败';
}

function pageResult<T>(response: { data?: { list?: T[]; total?: number } }) {
  return {
    data: response.data?.list ?? [],
    total: response.data?.total ?? 0,
    success: true,
  };
}

const launchButton = (
  <Button
    key="launch"
    type="primary"
    onClick={() => history.push('/oa/launch')}
  >
    发起合同或用印
  </Button>
);

const MyContractTab: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<OaContractDetailVo | null>(null);
  const [loading, setLoading] = useState(false);

  const show = async (id: number) => {
    setOpen(true);
    setDetail(null);
    setLoading(true);
    try {
      const response = await getMyOaContract(id);
      setDetail(response.data);
    } catch (error) {
      message.error(errorText(error));
    } finally {
      setLoading(false);
    }
  };

  const columns: ProColumns<OaContractVo>[] = [
    {
      title: '关键词',
      dataIndex: 'keyword',
      hideInTable: true,
      fieldProps: { placeholder: '合同编号、名称或相对方' },
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
    { title: '到期日', dataIndex: 'endDate', search: false, width: 110 },
    {
      title: '操作',
      valueType: 'option',
      fixed: 'right',
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => void show(record.id)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<OaContractVo>
        headerTitle="我的合同"
        rowKey="id"
        columns={columns}
        scroll={{ x: 1100 }}
        toolBarRender={() => [launchButton]}
        request={async (params) =>
          pageResult(
            await queryMyOaContracts({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
              keyword: (params.keyword as string)?.trim() || undefined,
            }),
          )
        }
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
                `system/oa/contract/mine/contracts/${detail.contract.id}/files/${file.fileId}`
              }
            />
          ) : null}
        </Spin>
      </Drawer>
    </>
  );
};

const MySealTab: React.FC = () => {
  const [viewing, setViewing] = useState<OaSealRequestVo | null>(null);
  const [files, setFiles] = useState<OaLinkedFileVo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!viewing) return;
    let active = true;
    setFiles([]);
    setLoading(true);
    queryMyOaSealFiles(viewing.id)
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
  }, [viewing]);

  const columns: ProColumns<OaSealRequestVo>[] = [
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
      width: 80,
      render: (_, record) => (
        <Button type="link" onClick={() => setViewing(record)}>
          详情
        </Button>
      ),
    },
  ];

  return (
    <>
      <ProTable<OaSealRequestVo>
        headerTitle="我的用印申请"
        rowKey="id"
        columns={columns}
        scroll={{ x: 1100 }}
        toolBarRender={() => [launchButton]}
        request={async (params) =>
          pageResult(
            await queryMyOaSealRequests({
              page: (params.current as number) || 1,
              size: (params.pageSize as number) || 10,
              status: params.status || undefined,
            }),
          )
        }
      />
      <Drawer
        title={viewing ? `用印申请：${viewing.sealName}` : '用印申请'}
        width={560}
        open={Boolean(viewing)}
        destroyOnHidden
        onClose={() => setViewing(null)}
      >
        {viewing ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <div>
              {sealRequestStatusTag(viewing.status)}
              {viewing.executorId
                ? `由 ${viewing.executorName || viewing.executorId} 于 ${viewing.usedDate} 用印 ${viewing.usedCopies} 份`
                : `申请 ${viewing.copies} 份，计划 ${viewing.useDate} 用印`}
            </div>
            <Spin spinning={loading}>
              <LinkedFileList
                files={files}
                pathOf={(file) =>
                  `system/oa/contract/mine/seal-requests/${viewing.id}/files/${file.fileId}`
                }
                emptyText="申请未附材料"
              />
            </Spin>
            <TrackButton applicationId={viewing.applicationId} />
          </Space>
        ) : null}
      </Drawer>
    </>
  );
};

const MyContractPage: React.FC = () => (
  <PageContainer header={{ title: '我的合同用印' }}>
    <Tabs
      destroyOnHidden
      items={[
        { key: 'contracts', label: '我的合同', children: <MyContractTab /> },
        { key: 'seals', label: '我的用印申请', children: <MySealTab /> },
      ]}
    />
  </PageContainer>
);

export default MyContractPage;
