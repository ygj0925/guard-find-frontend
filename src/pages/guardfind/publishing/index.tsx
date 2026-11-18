import {
  type ActionType,
  PageContainer,
  ProTable,
} from '@ant-design/pro-components';
import {
  Alert,
  Button,
  DatePicker,
  Drawer,
  Form,
  Image,
  Input,
  Modal,
  message,
  Select,
  Space,
  Spin,
  Steps,
  Switch,
  Table,
  Tabs,
  Tag,
  Timeline,
  Typography,
} from 'antd';
import zhCN from 'antd/es/date-picker/locale/zh_CN';
import dayjs from 'dayjs';
import { useEffect, useRef, useState } from 'react';
import { useAccess } from '@/hooks/useAccess';
import type {
  PublishingAccount,
  PublishingAccountInput,
  PublishingAction,
  PublishingCapabilities,
  PublishingContent,
  PublishingJob,
  PublishingPlatform,
  PublishingProperty,
  PublishingSettings as PublishingSettingsInput,
  PublishingStatus,
} from '@/services/web/guardfind/publishing';
import * as api from '@/services/web/guardfind/publishing';
import styles from './index.less';

const labels = api.publishingStatusLabels;
const platforms = api.publishingPlatformLabels;
const actionNames: Record<PublishingAction, string> = {
  APPROVE: '审核通过',
  REJECT: '退回',
  CANCEL: '取消任务',
  RETRY: '重试',
  CONFIRM_PUBLISHED: '登记已发布',
  CONFIRM_NOT_PUBLISHED: '核实未发布 / 审核未通过',
};
const colors: Partial<Record<PublishingStatus, string>> = {
  PUBLISHED: 'success',
  FAILED: 'error',
  UNKNOWN: 'warning',
  MANUAL_REQUIRED: 'warning',
  PROCESSING: 'processing',
  SUBMITTED: 'processing',
  QUEUED: 'blue',
};
const permission = (name: string) => `system:property:publishing:${name}`;
const creatorUrls: Partial<Record<PublishingPlatform, string>> = {
  DOUYIN: 'https://creator.douyin.com/',
  XIAOHONGSHU: 'https://creator.xiaohongshu.com/',
  WECHAT_CHANNELS: 'https://channels.weixin.qq.com/',
};
const safeUrl = (url?: string | null) => {
  try {
    const value = new URL(url || '');
    return value.protocol === 'https:' ? value.href : undefined;
  } catch {
    return undefined;
  }
};
const statusTag = (status: PublishingStatus) => (
  <Tag color={colors[status]}>{labels[status] || status}</Tag>
);

export function ContentPreview({
  title,
  body,
  images,
}: {
  title: string;
  body: string;
  images: string[];
}) {
  return (
    <section className={styles.preview} aria-label="发布内容预览">
      <Typography.Text type="secondary">内容预览</Typography.Text>
      <h3>{title || '房源标题'}</h3>
      <div className={styles.body}>
        {body || '选择房源后生成文案，发布前可修改。'}
      </div>
      <div className={styles.images}>
        <Image.PreviewGroup>
          {Array.from(new Set(images))
            .filter((url) => safeUrl(url) || url.startsWith('/'))
            .map((url, i) => (
              <Image key={url} src={url} alt={`房源素材 ${i + 1}`} />
            ))}
        </Image.PreviewGroup>
      </div>
    </section>
  );
}

export default function PublishingPage() {
  const { hasPermission } = useAccess();
  const table = useRef<ActionType>(null);
  const [accounts, setAccounts] = useState<PublishingAccount[]>([]);
  const [capabilities, setCapabilities] = useState<PublishingCapabilities>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [createOpen, setCreateOpen] = useState(false);
  const [selected, setSelected] = useState<string>();
  const [accountEditor, setAccountEditor] = useState<
    PublishingAccount | 'new'
  >();
  const [status, setStatus] = useState<string>();
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    Promise.all([
      api.queryPublishingAccounts(),
      api.queryPublishingCapabilities(),
    ])
      .then(([a, c]) => {
        if (alive) {
          setAccounts(a.data);
          setCapabilities(c.data);
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [revision]);
  const canEdit = hasPermission(permission('edit'));
  return (
    <PageContainer title={false}>
      <div className={styles.workspace}>
        <div className={styles.intro}>
          <div>
            <h2>房源发布中心</h2>
            <p>
              一份房源，按账号准备内容、安排发布、跟踪结果。每个账号独立记录进度。
            </p>
          </div>
          {canEdit && (
            <Button
              type="primary"
              disabled={loading || failed}
              onClick={() => setCreateOpen(true)}
            >
              创建发布草稿
            </Button>
          )}
        </div>
        <Steps
          className={styles.workflow}
          size="small"
          current={0}
          items={[
            { title: '选房源与账号' },
            { title: '预览并审核' },
            { title: '按平台发布' },
            { title: '核对发布结果' },
          ]}
        />
        {loading ? (
          <Spin />
        ) : failed ? (
          <Alert
            type="error"
            message="发布配置加载失败"
            action={
              <Button onClick={() => setRevision((v) => v + 1)}>
                重新加载
              </Button>
            }
          />
        ) : (
          <Tabs
            className={styles.tabs}
            items={[
              {
                key: 'jobs',
                label: '发布任务',
                children: (
                  <>
                    <Alert
                      showIcon
                      type="info"
                      message="人工发布账号需下载素材后前往平台发布；提交到平台和公开发布会分别记录。"
                      style={{ marginBottom: 16 }}
                    />
                    <ProTable<PublishingJob>
                      actionRef={table}
                      rowKey="id"
                      search={false}
                      params={{ status }}
                      pagination={{ pageSize: 20 }}
                      scroll={{ x: 980 }}
                      headerTitle="按账号跟踪任务"
                      toolBarRender={() => [
                        <Select
                          key="status"
                          aria-label="任务状态"
                          placeholder="全部状态"
                          allowClear
                          value={status}
                          onChange={setStatus}
                          style={{ width: 160 }}
                          options={Object.entries(labels).map(
                            ([value, label]) => ({ value, label }),
                          )}
                        />,
                      ]}
                      request={async (params) => {
                        const r = await api.queryPublishingJobs({
                          page: params.current,
                          size: params.pageSize,
                          status: params.status,
                        });
                        return {
                          data: r.data.list,
                          total: r.data.total,
                          success: true,
                        };
                      }}
                      columns={[
                        {
                          title: '房源内容',
                          dataIndex: 'title',
                          width: 280,
                          render: (_, row) => (
                            <>
                              <div className={styles.title}>{row.title}</div>
                              <span className={styles.muted}>
                                房源 {row.propertyId} · 任务 {row.id}
                              </span>
                            </>
                          ),
                        },
                        {
                          title: '平台 / 账号',
                          dataIndex: 'accountName',
                          width: 170,
                          render: (_, row) => (
                            <>
                              {row.accountName}
                              <div className={styles.muted}>
                                {platforms[row.platform]}
                              </div>
                            </>
                          ),
                        },
                        {
                          title: '进度',
                          dataIndex: 'status',
                          width: 140,
                          render: (_, row) => statusTag(row.status),
                        },
                        {
                          title: '计划时间（北京时间）',
                          dataIndex: 'scheduledAt',
                          width: 190,
                          renderText: (value: string) => value || '审核后安排',
                        },
                        {
                          title: '操作',
                          valueType: 'option',
                          width: 110,
                          render: (_, row) => (
                            <Button
                              type="link"
                              onClick={() => setSelected(row.id)}
                            >
                              查看 / 处理
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </>
                ),
              },
              {
                key: 'accounts',
                label: '平台与账号',
                children: (
                  <div className={styles.surface}>
                    <div className={styles.heading}>
                      <Typography.Title level={5} style={{ margin: 0 }}>
                        发布账号
                      </Typography.Title>
                      {hasPermission(permission('accounts')) && (
                        <Button onClick={() => setAccountEditor('new')}>
                          添加账号
                        </Button>
                      )}
                    </div>
                    <Alert
                      type="info"
                      showIcon
                      message="添加账号用于分配任务，不代表已获得平台自动发布授权。"
                      style={{ marginBottom: 20 }}
                    />
                    <Table<PublishingAccount>
                      rowKey="id"
                      dataSource={accounts}
                      pagination={false}
                      scroll={{ x: 700 }}
                      columns={[
                        { title: '账号', dataIndex: 'name' },
                        {
                          title: '平台',
                          dataIndex: 'platform',
                          render: (value: PublishingPlatform) =>
                            platforms[value],
                        },
                        { title: '账号标识', dataIndex: 'handle' },
                        {
                          title: '发布方式',
                          dataIndex: 'mode',
                          render: (
                            value: string,
                            account: PublishingAccount,
                          ) =>
                            value === 'DOUYIN_API'
                              ? account.ready
                                ? '授权接口可用'
                                : '授权接口待配置'
                              : '人工发布',
                        },
                        {
                          title: '状态',
                          dataIndex: 'enabled',
                          render: (value: boolean) => (
                            <Tag>{value ? '启用' : '停用'}</Tag>
                          ),
                        },
                        {
                          title: '操作',
                          render: (_, account) =>
                            hasPermission(permission('accounts')) && (
                              <Button
                                type="link"
                                onClick={() => setAccountEditor(account)}
                              >
                                编辑
                              </Button>
                            ),
                        },
                      ]}
                    />
                    <Typography.Title level={5} style={{ marginTop: 28 }}>
                      平台接入情况
                    </Typography.Title>
                    {capabilities?.platforms.map((item) => (
                      <Alert
                        key={item.code}
                        style={{ marginBottom: 12 }}
                        type="info"
                        message={item.label}
                        description={item.reason}
                        action={
                          creatorUrls[item.code] && (
                            <Button
                              href={creatorUrls[item.code]}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              创作平台
                            </Button>
                          )
                        }
                      />
                    ))}
                  </div>
                ),
              },
              {
                key: 'settings',
                label: '自动建稿',
                children: (
                  <PublishingSettings
                    accounts={accounts}
                    editable={hasPermission(permission('accounts'))}
                  />
                ),
              },
            ]}
          />
        )}
        {createOpen && (
          <CreateJobs
            accounts={accounts}
            onClose={() => setCreateOpen(false)}
            onDone={(id) => {
              setCreateOpen(false);
              table.current?.reload();
              setSelected(id);
            }}
          />
        )}
        {selected && (
          <JobDrawer
            id={selected}
            capabilities={capabilities}
            onClose={() => setSelected(undefined)}
            onChanged={() => table.current?.reload()}
          />
        )}
        {accountEditor && (
          <AccountEditor
            account={accountEditor === 'new' ? undefined : accountEditor}
            capabilities={capabilities}
            onClose={() => setAccountEditor(undefined)}
            onDone={() => {
              setAccountEditor(undefined);
              setRevision((v) => v + 1);
            }}
          />
        )}
      </div>
    </PageContainer>
  );
}

export function CreateJobs({
  accounts,
  onClose,
  onDone,
}: {
  accounts: PublishingAccount[];
  onClose: () => void;
  onDone: (id?: string) => void;
}) {
  const [form] = Form.useForm();
  const [properties, setProperties] = useState<PublishingProperty[]>([]);
  const [content, setContent] = useState<PublishingContent>();
  const [busy, setBusy] = useState(false);
  const [previewBusy, setPreviewBusy] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const requestId = useRef(crypto.randomUUID());
  const lastPayload = useRef('');
  const generation = useRef(0);
  const propertyId = Form.useWatch('propertyId', form);
  useEffect(() => {
    let alive = true;
    api
      .queryPublishingProperties()
      .then((r) => {
        if (alive) setProperties(r.data.list);
      })
      .catch(() => {
        if (alive) setLookupFailed(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const current = ++generation.current;
    setContent(undefined);
    if (!propertyId) return;
    setPreviewBusy(true);
    api
      .queryPublishingPreview(propertyId)
      .then((r) => {
        if (generation.current === current) setContent(r.data);
      })
      .catch(() => {
        if (generation.current === current)
          message.error('房源文案加载失败，请重新选择房源');
      })
      .finally(() => {
        if (generation.current === current) setPreviewBusy(false);
      });
    return () => {
      generation.current++;
    };
  }, [propertyId]);
  const searchSequence = useRef(0);
  const search = async (keyword: string) => {
    const seq = ++searchSequence.current;
    try {
      const r = await api.queryPublishingProperties(keyword);
      if (seq === searchSequence.current) {
        setProperties(r.data.list);
        setLookupFailed(false);
      }
    } catch {
      if (seq === searchSequence.current) setLookupFailed(true);
    }
  };
  const save = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    if (!content || busy) return;
    setBusy(true);
    const payload = {
      propertyId: values.propertyId,
      accountIds: values.accountIds,
      scheduledAt: values.scheduledAt?.format('YYYY-MM-DD HH:mm:ss'),
    };
    const fingerprint = JSON.stringify(payload);
    if (lastPayload.current && lastPayload.current !== fingerprint)
      requestId.current = crypto.randomUUID();
    lastPayload.current = fingerprint;
    try {
      const r = await api.createPublishingJobs({
        ...payload,
        requestId: requestId.current,
      });
      message.success(`已生成 ${r.data.ids.length} 个待审核任务`);
      onDone(r.data.ids[0]);
    } catch {
      message.error('建稿结果未确认，请核对任务列表，或保留当前选择重新尝试');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      width={960}
      title="从房源创建发布草稿"
      onCancel={onClose}
      onOk={save}
      confirmLoading={busy}
      okText="生成待审核任务"
      okButtonProps={{ disabled: !content || previewBusy }}
      cancelButtonProps={{ disabled: busy }}
      closable={!busy}
      maskClosable={!busy}
      styles={{ body: { maxHeight: '70vh', overflowY: 'auto' } }}
    >
      <Alert
        showIcon
        type="info"
        message="每个账号生成一份独立草稿，审核通过前不会发布。默认文案不含电话、门牌和租客信息。"
        style={{ marginBottom: 20 }}
      />
      <div className={styles.contentGrid}>
        <Form form={form} layout="vertical">
          <Form.Item
            name="propertyId"
            label="选择房源"
            rules={[{ required: true, message: '请选择房源' }]}
          >
            <Select
              showSearch
              filterOption={false}
              onSearch={search}
              placeholder="搜索房源名称或小区"
              options={properties.map((p) => ({
                value: p.id,
                label: `${p.title}${p.community ? ` · ${p.community}` : ''}`,
              }))}
            />
          </Form.Item>
          {lookupFailed && (
            <Alert
              type="error"
              message="房源加载失败"
              action={<Button onClick={() => search('')}>重试</Button>}
            />
          )}
          <Form.Item
            name="accountIds"
            label="目标账号"
            rules={[
              {
                required: true,
                type: 'array',
                min: 1,
                message: '至少选择一个账号',
              },
            ]}
            extra="可选择多个平台、多个账号；后续分别审核和处理。"
          >
            <Select
              mode="multiple"
              placeholder="选择已启用账号"
              options={accounts
                .filter((a) => a.enabled)
                .map((a) => ({
                  value: a.id,
                  label: `${platforms[a.platform]} · ${a.name}`,
                }))}
            />
          </Form.Item>
          <Form.Item
            name="scheduledAt"
            label="计划时间（北京时间 UTC+8）"
            extra="留空表示审核后安排。人工发布任务到时进入待人工发布，不会自动操作平台网页。"
          >
            <DatePicker
              locale={zhCN}
              showTime
              format="YYYY-MM-DD HH:mm"
              style={{ width: '100%' }}
            />
          </Form.Item>
        </Form>
        <Spin spinning={previewBusy}>
          <ContentPreview
            title={content?.title || ''}
            body={content?.body || ''}
            images={content?.images || []}
          />
        </Spin>
      </div>
    </Modal>
  );
}

export function AccountEditor({
  account,
  capabilities,
  onClose,
  onDone,
}: {
  account?: PublishingAccount;
  capabilities?: PublishingCapabilities;
  onClose: () => void;
  onDone: () => void;
}) {
  const [form] = Form.useForm<PublishingAccountInput>();
  const [busy, setBusy] = useState(false);
  const platform = Form.useWatch('platform', form);
  const mode = Form.useWatch('mode', form);
  const save = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    setBusy(true);
    try {
      const data = {
        ...values,
        credentialKey:
          values.mode === 'DOUYIN_API' ? values.credentialKey : undefined,
      };
      if (account) await api.updatePublishingAccount(account.id, data);
      else await api.createPublishingAccount(data);
      message.success('账号配置已保存');
      onDone();
    } catch {
      message.error('账号保存失败，请核对配置后重试');
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open
      title={account ? '编辑发布账号' : '添加发布账号'}
      onCancel={onClose}
      onOk={save}
      confirmLoading={busy}
      cancelButtonProps={{ disabled: busy }}
      maskClosable={!busy}
      okText="保存账号"
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          account || { platform: 'XIAOHONGSHU', mode: 'MANUAL', enabled: true }
        }
      >
        <Form.Item name="platform" label="平台" rules={[{ required: true }]}>
          <Select
            disabled={Boolean(account)}
            options={Object.entries(platforms).map(([value, label]) => ({
              value,
              label,
            }))}
            onChange={() =>
              form.setFieldsValue({ mode: 'MANUAL', credentialKey: undefined })
            }
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="账号名称"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input maxLength={80} placeholder="例如：上海租房运营一号" />
        </Form.Item>
        <Form.Item
          name="handle"
          label="平台账号标识"
          rules={[{ required: true, whitespace: true }]}
          extra="填写便于核对的账号 ID 或主页标识，不填写密码。"
        >
          <Input maxLength={100} />
        </Form.Item>
        <Form.Item name="mode" label="发布方式" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'MANUAL', label: '人工发布（下载素材后自行发布）' },
              ...(platform === 'DOUYIN'
                ? [
                    {
                      value: 'DOUYIN_API',
                      label: '抖音授权接口',
                      disabled: !capabilities?.douyinConfigured,
                    },
                  ]
                : []),
            ]}
          />
        </Form.Item>
        {mode === 'DOUYIN_API' && (
          <Form.Item
            name="credentialKey"
            label="已配置的授权编号"
            rules={[{ required: true }]}
            extra="由系统部署人员提供，只引用服务端授权配置；请勿填写令牌或密码。"
          >
            <Input maxLength={100} />
          </Form.Item>
        )}
        {!capabilities?.douyinConfigured && platform === 'DOUYIN' && (
          <Alert
            type="info"
            message="自动发布接入尚未配置，当前可使用人工发布。"
            style={{ marginBottom: 16 }}
          />
        )}
        <Form.Item name="enabled" label="启用账号" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Modal>
  );
}

export function PublishingSettings({
  accounts,
  editable,
}: {
  accounts: PublishingAccount[];
  editable: boolean;
}) {
  const [form] = Form.useForm<PublishingSettingsInput>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    api
      .queryPublishingSettings()
      .then((r) => {
        if (alive) form.setFieldsValue(r.data);
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [form, revision]);
  const save = async () => {
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    if (values.autoDraft && !values.accountIds?.length) {
      message.warning('启用自动建稿时至少选择一个账号');
      return;
    }
    setBusy(true);
    try {
      await api.updatePublishingSettings({
        autoDraft: values.autoDraft,
        accountIds: values.accountIds || [],
      });
      message.success('自动建稿设置已保存');
    } catch {
      message.error('设置保存失败，请重新加载后核对');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className={styles.surface}>
      {loading ? (
        <Spin />
      ) : failed ? (
        <Alert
          type="error"
          message="自动建稿设置加载失败"
          action={
            <Button onClick={() => setRevision((v) => v + 1)}>重试</Button>
          }
        />
      ) : (
        <Form
          form={form}
          layout="vertical"
          className={styles.form}
          disabled={!editable || busy}
        >
          <Typography.Title level={5}>新房源自动准备发布任务</Typography.Title>
          <Alert
            showIcon
            type="info"
            message="开启后，新增且上架的房源自动生成待审核草稿；历史房源可手动建稿。已生成的内容不会随房源修改而静默覆盖。"
            style={{ marginBottom: 24 }}
          />
          <Form.Item
            name="autoDraft"
            label="自动生成草稿"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="accountIds"
            label="自动建稿目标账号"
            dependencies={['autoDraft']}
            rules={[
              {
                validator: (_, value) =>
                  form.getFieldValue('autoDraft') && !value?.length
                    ? Promise.reject(
                        new Error('启用自动建稿时至少选择一个账号'),
                      )
                    : Promise.resolve(),
              },
            ]}
          >
            <Select
              mode="multiple"
              options={accounts.map((a) => ({
                value: a.id,
                label: `${platforms[a.platform]} · ${a.name}${a.enabled ? '' : '（已停用）'}`,
                disabled: !a.enabled,
              }))}
            />
          </Form.Item>
          {editable && (
            <Button type="primary" loading={busy} onClick={save}>
              保存设置
            </Button>
          )}
        </Form>
      )}
    </div>
  );
}

export function JobDrawer({
  id,
  capabilities,
  onClose,
  onChanged,
}: {
  id: string;
  capabilities?: PublishingCapabilities;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { hasPermission } = useAccess();
  const [form] = Form.useForm();
  const [actionForm] = Form.useForm();
  const [job, setJob] = useState<PublishingJob>();
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [action, setAction] = useState<PublishingAction>();
  const [dirty, setDirty] = useState(false);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setFailed(false);
    setJob(undefined);
    api
      .queryPublishingJob(id)
      .then((r) => {
        if (alive) {
          setJob(r.data);
          setDirty(false);
          form.setFieldsValue({
            title: r.data.title,
            body: r.data.body,
            imageUrls: r.data.images.join('\n'),
            scheduledAt: r.data.scheduledAt ? dayjs(r.data.scheduledAt) : null,
          });
        }
      })
      .catch(() => {
        if (alive) setFailed(true);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [id, revision, form]);
  const title = Form.useWatch('title', form);
  const body = Form.useWatch('body', form);
  const imageUrls = Form.useWatch('imageUrls', form) || '';
  const editable = Boolean(
    job &&
      ['DRAFT', 'REJECTED', 'FAILED'].includes(job.status) &&
      hasPermission(permission('edit')),
  );
  const canPublish = hasPermission(permission('publish'));
  const refresh = () => {
    if (!active.current) return;
    setRevision((v) => v + 1);
    onChanged();
  };
  const save = async () => {
    if (!job || busy) return;
    const values = await form.validateFields().catch(() => undefined);
    if (!values) return;
    setBusy(true);
    try {
      await api.updatePublishingJob(job.id, {
        propertyId: job.propertyId,
        version: job.version,
        title: values.title.trim(),
        body: values.body.trim(),
        images: values.imageUrls
          .split('\n')
          .map((url: string) => url.trim())
          .filter(Boolean),
        scheduledAt: values.scheduledAt?.format('YYYY-MM-DD HH:mm:ss') || null,
      });
      message.success('草稿已保存，请重新核对后审核');
      refresh();
    } catch {
      if (active.current)
        message.error('保存未完成，当前输入已保留，请核对任务版本后重试');
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const download = async () => {
    if (!job || busy) return;
    setBusy(true);
    try {
      const r = await api.queryPublishingPackage(job.id);
      if (!active.current) return;
      const blob = new Blob([r.data.content], {
        type: 'text/markdown;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = r.data.filename;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      message.success('文案和素材清单已下载，任务状态未改变');
    } catch {
      if (active.current) message.error('素材下载失败，请重试');
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const beginAction = (next: PublishingAction) => {
    actionForm.resetFields();
    setAction(next);
  };
  const submitAction = async () => {
    if (!job || !action || busy) return;
    const values = await actionForm.validateFields().catch(() => undefined);
    if (!values) return;
    setBusy(true);
    try {
      await api.actOnPublishingJob(job.id, {
        version: job.version,
        action,
        reason: values.reason,
        resultUrl: values.resultUrl,
      });
      if (active.current) {
        setAction(undefined);
        message.success('任务记录已更新');
        refresh();
      }
    } catch {
      if (active.current) message.error('操作结果未确认，请刷新进度后核对');
    } finally {
      if (active.current) setBusy(false);
    }
  };
  const capability = capabilities?.platforms.find(
    (item) => item.code === job?.platform,
  );
  return (
    <Drawer
      open
      width={1060}
      title="发布任务详情"
      onClose={onClose}
      maskClosable={!busy}
      closable={!busy}
    >
      {loading ? (
        <Spin />
      ) : failed || !job ? (
        <Alert
          type="error"
          message="任务加载失败"
          action={
            <Button onClick={() => setRevision((v) => v + 1)}>重试</Button>
          }
        />
      ) : (
        <>
          <div className={styles.heading}>
            <Space wrap>
              {statusTag(job.status)}
              <Typography.Text strong>
                {platforms[job.platform]} · {job.accountName}
              </Typography.Text>
              <Typography.Text type="secondary">任务 {job.id}</Typography.Text>
            </Space>
            <Button disabled={busy} onClick={() => setRevision((v) => v + 1)}>
              刷新进度
            </Button>
          </div>
          <Space wrap style={{ marginBottom: 20 }}>
            <Button disabled={busy} onClick={download}>
              下载文案与素材清单
            </Button>
            {creatorUrls[job.platform] && (
              <Button
                href={creatorUrls[job.platform]}
                target="_blank"
                rel="noopener noreferrer"
              >
                打开创作平台
              </Button>
            )}
            {safeUrl(job.resultUrl) && (
              <Button
                href={safeUrl(job.resultUrl)}
                target="_blank"
                rel="noopener noreferrer"
              >
                查看发布结果
              </Button>
            )}
          </Space>
          {job.lastError && (
            <Alert
              type={job.status === 'UNKNOWN' ? 'warning' : 'error'}
              showIcon
              message={job.lastError}
              style={{ marginBottom: 16 }}
            />
          )}
          {job.status === 'UNKNOWN' && (
            <Alert
              type="warning"
              message="请先到平台核实是否已发布。此状态不能直接重试，避免重复发帖。"
              style={{ marginBottom: 16 }}
            />
          )}
          {job.status === 'MANUAL_REQUIRED' && (
            <Alert
              type="info"
              message="请下载素材并前往对应账号发布，成功后登记作品链接。导出素材不会标记为已发布。"
              style={{ marginBottom: 16 }}
            />
          )}
          {job.status === 'SUBMITTED' && (
            <Alert
              type="info"
              message="内容已提交平台，尚未确认公开发布。请到平台查看审核结果。"
              style={{ marginBottom: 16 }}
            />
          )}
          {capability && (
            <Typography.Paragraph type="secondary">
              {capability.reason}
            </Typography.Paragraph>
          )}
          <Tabs
            items={[
              {
                key: 'content',
                label: '内容与审核',
                children: (
                  <>
                    <div className={styles.contentGrid}>
                      <Form
                        form={form}
                        layout="vertical"
                        disabled={!editable || busy}
                        onValuesChange={() => setDirty(true)}
                      >
                        <Form.Item
                          name="title"
                          label="标题"
                          rules={[{ required: true, whitespace: true }]}
                        >
                          <Input
                            maxLength={
                              job.platform === 'XIAOHONGSHU' ? 20 : 100
                            }
                            showCount
                          />
                        </Form.Item>
                        <Form.Item
                          name="body"
                          label="正文"
                          rules={[{ required: true, whitespace: true }]}
                        >
                          <Input.TextArea
                            rows={10}
                            maxLength={capability?.maxTextLength || 4000}
                            showCount
                          />
                        </Form.Item>
                        <Form.Item
                          name="imageUrls"
                          label="素材图片（每行一个地址）"
                          extra="发布前核对图片使用权；仅使用公开的房源展示图片，不包含合同、证件或租客资料。"
                          rules={[
                            {
                              validator: (_, value: string) => {
                                const urls = (value || '')
                                  .split('\n')
                                  .map((s) => s.trim())
                                  .filter(Boolean);
                                if (urls.some((url) => !safeUrl(url)))
                                  return Promise.reject(
                                    new Error('图片须为 HTTPS 地址'),
                                  );
                                if (
                                  capability &&
                                  urls.length > capability.maxImages
                                )
                                  return Promise.reject(
                                    new Error(
                                      `该平台最多 ${capability.maxImages} 张图片`,
                                    ),
                                  );
                                return Promise.resolve();
                              },
                            },
                          ]}
                        >
                          <Input.TextArea rows={4} />
                        </Form.Item>
                        <Form.Item
                          name="scheduledAt"
                          label="计划时间（北京时间 UTC+8）"
                        >
                          <DatePicker
                            locale={zhCN}
                            showTime
                            format="YYYY-MM-DD HH:mm"
                            style={{ width: '100%' }}
                          />
                        </Form.Item>
                        {editable && (
                          <Button onClick={save} loading={busy}>
                            保存修改
                          </Button>
                        )}
                      </Form>
                      <ContentPreview
                        title={title || job.title}
                        body={body || job.body}
                        images={imageUrls
                          .split('\n')
                          .map((s: string) => s.trim())
                          .filter(Boolean)}
                      />
                    </div>
                    <div className={styles.controls} style={{ marginTop: 24 }}>
                      {canPublish && job.status === 'DRAFT' && (
                        <>
                          <Button
                            type="primary"
                            disabled={busy || dirty}
                            onClick={() => beginAction('APPROVE')}
                          >
                            审核通过
                          </Button>
                          <Button
                            disabled={busy}
                            onClick={() => beginAction('REJECT')}
                          >
                            退回
                          </Button>
                        </>
                      )}
                      {canPublish && job.status === 'FAILED' && (
                        <Button
                          disabled={busy || dirty}
                          onClick={() => beginAction('RETRY')}
                        >
                          重试任务
                        </Button>
                      )}
                      {canPublish &&
                        ['MANUAL_REQUIRED', 'SUBMITTED', 'UNKNOWN'].includes(
                          job.status,
                        ) && (
                          <Button
                            type="primary"
                            disabled={busy}
                            onClick={() => beginAction('CONFIRM_PUBLISHED')}
                          >
                            登记已发布
                          </Button>
                        )}
                      {canPublish &&
                        ['UNKNOWN', 'SUBMITTED'].includes(job.status) && (
                          <Button
                            disabled={busy}
                            onClick={() => beginAction('CONFIRM_NOT_PUBLISHED')}
                          >
                            核实未发布 / 审核未通过
                          </Button>
                        )}
                      {canPublish &&
                        ![
                          'PROCESSING',
                          'PUBLISHED',
                          'CANCELLED',
                          'UNKNOWN',
                          'SUBMITTED',
                        ].includes(job.status) && (
                          <Button
                            danger
                            disabled={busy}
                            onClick={() => beginAction('CANCEL')}
                          >
                            取消任务
                          </Button>
                        )}
                    </div>
                    {editable && (
                      <Typography.Paragraph
                        type="secondary"
                        style={{ marginTop: 12 }}
                      >
                        修改后请先保存，再审核当前版本。审核通过后将按账号的发布方式和计划时间执行。
                      </Typography.Paragraph>
                    )}
                  </>
                ),
              },
              {
                key: 'logs',
                label: '处理记录',
                children: (
                  <Timeline
                    items={(job.logs || []).map((log, index) => ({
                      key: index,
                      children: (
                        <>
                          <Typography.Text strong>
                            {actionNames[log.action as PublishingAction] ||
                              log.action}
                          </Typography.Text>
                          <div>{log.reason}</div>
                          <Typography.Text type="secondary">
                            {log.createdAt || log.createTime}
                          </Typography.Text>
                        </>
                      ),
                    }))}
                  />
                ),
              },
            ]}
          />
        </>
      )}
      <Modal
        open={Boolean(action)}
        title={action ? actionNames[action] : ''}
        onCancel={() => !busy && setAction(undefined)}
        onOk={submitAction}
        confirmLoading={busy}
        cancelButtonProps={{ disabled: busy }}
        okText="确认"
        maskClosable={!busy}
      >
        <Form form={actionForm} layout="vertical">
          {action === 'APPROVE' && (
            <Alert
              type="info"
              message="请核对当前账号、标题、价格与图片。通过后按计划执行；人工账号进入待人工发布。"
              style={{ marginBottom: 16 }}
            />
          )}
          {action === 'RETRY' && (
            <Alert
              type="warning"
              message="仅在已确认上次未成功发布时重试，避免平台出现重复内容。"
              style={{ marginBottom: 16 }}
            />
          )}
          {action === 'CONFIRM_NOT_PUBLISHED' && (
            <Alert
              type="warning"
              message="请先在平台核实作品未发布或审核未通过。确认后关闭此任务，如需再次发布请重新创建并审核草稿。"
              style={{ marginBottom: 16 }}
            />
          )}
          {action === 'CONFIRM_PUBLISHED' && (
            <Form.Item
              name="resultUrl"
              label="已公开发布的作品链接"
              rules={[
                { required: true, message: '请填写发布结果链接' },
                {
                  validator: (_, value) =>
                    !value || safeUrl(value)
                      ? Promise.resolve()
                      : Promise.reject(new Error('请输入 HTTPS 作品链接')),
                },
              ]}
            >
              <Input placeholder="https://…" />
            </Form.Item>
          )}
          <Form.Item
            name="reason"
            label={action === 'APPROVE' ? '审核备注' : '处理说明'}
            rules={[
              {
                required: action !== 'APPROVE',
                whitespace: true,
                message: '请填写处理说明',
              },
            ]}
          >
            <Input.TextArea rows={3} maxLength={500} />
          </Form.Item>
        </Form>
      </Modal>
    </Drawer>
  );
}
