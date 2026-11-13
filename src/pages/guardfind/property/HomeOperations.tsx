import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Form,
  Input,
  Modal,
  message,
  Row,
  Select,
  Space,
  Spin,
  Switch,
} from 'antd';
import dayjs from 'dayjs';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import AccessControl from '@/components/AccessControl';
import { useAccess } from '@/hooks/useAccess';
import {
  type Banner,
  type PropertyVo,
  queryPropertyHome,
  queryPropertyPage,
  savePropertyHome,
} from '@/services/web/guardfind/property';
import {
  HOME_DATE_FORMAT,
  HOME_ID_PATTERN,
  HOME_LIMITS,
  HOME_PHONE_MAX_LENGTH,
  HOME_PHONE_MESSAGE,
  HOME_PHONE_PATTERN,
  type HomeFormValues,
  isOptionalHttpUrl,
  toHomeFormValues,
  toPropertyHome,
  validateHomeIds,
} from './homeOperationsModel';

const PAGE_SIZE = 50;
const titleRules = [
  { required: true, whitespace: true, message: '请填写标题' },
];
const idRules = [
  { required: true, message: '请填写 ID' },
  { pattern: HOME_ID_PATTERN, message: '1–40 位小写字母、数字和连字符' },
];
const imageRules = [
  {
    validator: async (_: unknown, value: string | null) => {
      if (!isOptionalHttpUrl(value))
        throw new Error('请输入无空白的 HTTP(S) 图片 URL，最多 1000 字');
    },
  },
];

export default function HomeOperations({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [form] = Form.useForm<HomeFormValues>();
  const [modal, contextHolder] = Modal.useModal();
  const { hasPermission } = useAccess();
  const canEdit = hasPermission('system:property:update');
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const savePending = useRef(false);
  const generation = useRef(0);
  const propertyGeneration = useRef(0);
  const [properties, setProperties] = useState<PropertyVo[]>([]);
  const [propertyTotal, setPropertyTotal] = useState(0);
  const [propertyPage, setPropertyPage] = useState(0);
  const [propertiesLoading, setPropertiesLoading] = useState(false);
  const [propertiesError, setPropertiesError] = useState(false);
  const propertyPending = useRef(false);
  const activities = Form.useWatch('activities', form) || [];
  const banners = Form.useWatch('banners', form) || [];

  const loadHome = useCallback(async () => {
    const requestGeneration = ++generation.current;
    setLoading(true);
    setLoaded(false);
    setLoadError(false);
    setDirty(false);
    form.resetFields();
    try {
      const response = await queryPropertyHome();
      if (!response.data) throw new Error('首页配置为空');
      if (requestGeneration !== generation.current) return;
      const values = toHomeFormValues(response.data);
      form.setFields([
        { name: 'supportPhone', value: values.supportPhone },
        { name: 'serviceHours', value: values.serviceHours },
        { name: 'banners', value: values.banners },
        { name: 'activities', value: values.activities },
      ]);
      setLoaded(true);
      setDirty(false);
    } catch {
      if (requestGeneration !== generation.current) return;
      setLoadError(true);
      message.error('首页配置加载失败，请重试');
    } finally {
      if (requestGeneration === generation.current) setLoading(false);
    }
  }, [form]);

  const loadProperties = useCallback(async (page: number) => {
    if (propertyPending.current) return;
    propertyPending.current = true;
    const requestGeneration = propertyGeneration.current;
    setPropertiesLoading(true);
    setPropertiesError(false);
    try {
      // The API has no keyword parameter; search only filters loaded options.
      const response = await queryPropertyPage({ page, size: PAGE_SIZE });
      if (!response.data) throw new Error('房源列表为空');
      if (requestGeneration !== propertyGeneration.current) return;
      setProperties((previous) => {
        const entries = new Map(
          previous.map((item) => [String(item.id), item]),
        );
        response.data.list.forEach((item) => {
          entries.set(String(item.id), item);
        });
        return Array.from(entries.values());
      });
      setPropertyTotal(response.data.total);
      setPropertyPage(page);
    } catch {
      if (requestGeneration !== propertyGeneration.current) return;
      setPropertiesError(true);
      message.error('房源选项加载失败，请重试');
    } finally {
      if (requestGeneration === propertyGeneration.current) {
        propertyPending.current = false;
        setPropertiesLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    propertyGeneration.current += 1;
    propertyPending.current = false;
    setProperties([]);
    setPropertyTotal(0);
    setPropertyPage(0);
    setPropertiesLoading(false);
    setPropertiesError(false);
    void loadHome();
    void loadProperties(1);
    return () => {
      generation.current += 1;
      propertyGeneration.current += 1;
      propertyPending.current = false;
    };
  }, [open, loadHome, loadProperties]);

  const propertyOptions = useMemo(() => {
    const options = new Map<string, { value: string; label: string }>();
    for (const activity of activities) {
      for (const id of activity.propertyIds || []) {
        const value = String(id);
        options.set(value, { value, label: `房源 #${value}（未加载）` });
      }
    }
    for (const banner of banners) {
      if (banner.targetType === 'property' && banner.targetId) {
        options.set(banner.targetId, {
          value: banner.targetId,
          label: `房源 #${banner.targetId}（未加载）`,
        });
      }
    }
    properties.forEach((item) => {
      const value = String(item.id);
      options.set(value, { value, label: `${item.title}（#${value}）` });
    });
    return Array.from(options.values());
  }, [activities, banners, properties]);
  const activityOptions = activities
    .filter((activity) => HOME_ID_PATTERN.test(activity.id || ''))
    .map((activity) => ({
      value: activity.id,
      label: `${activity.title || '未命名活动'}（${activity.id}）`,
    }));

  const close = () => {
    if (savePending.current) return;
    if (!dirty) return onClose();
    modal.confirm({
      title: '放弃未保存的首页配置？',
      content: '关闭后，本次修改不会保存。',
      okText: '放弃修改',
      cancelText: '继续编辑',
      onOk: onClose,
    });
  };

  const save = async () => {
    if (!canEdit || !loaded || savePending.current) return;
    savePending.current = true;
    setSaving(true);
    try {
      const values = await form.validateFields();
      await savePropertyHome(toPropertyHome(values));
      setDirty(false);
      message.success('首页配置已保存');
      onClose();
    } catch (error) {
      if (!(error && typeof error === 'object' && 'errorFields' in error)) {
        message.error(
          error instanceof Error ? error.message : '首页配置保存失败，请重试',
        );
      }
    } finally {
      savePending.current = false;
      setSaving(false);
    }
  };

  return (
    <Modal
      title="首页运营"
      open={open}
      width={960}
      onCancel={close}
      maskClosable={!saving}
      keyboard={!saving}
      closable={!saving}
      footer={
        <Space>
          <Button disabled={saving} onClick={close}>
            关闭
          </Button>
          <AccessControl permission="system:property:update">
            <Button
              type="primary"
              loading={saving}
              disabled={!loaded || loading || loadError}
              onClick={() => void save()}
            >
              保存首页配置
            </Button>
          </AccessControl>
        </Space>
      }
    >
      {contextHolder}
      <Spin spinning={loading}>
        {loadError && (
          <Alert
            type="error"
            showIcon
            message="首页配置加载失败"
            action={
              <Button onClick={() => void loadHome()}>重新加载配置</Button>
            }
          />
        )}
        {!canEdit && (
          <Alert
            type="info"
            showIcon
            message="当前仅可查看首页配置，无编辑权限"
          />
        )}
        <div style={{ margin: '16px 0' }}>
          <Space wrap>
            <span>
              已加载 {properties.length} / {propertyTotal} 个房源，可按标题或 ID
              搜索已加载选项
            </span>
            <Button
              size="small"
              loading={propertiesLoading}
              disabled={
                saving ||
                (!propertiesError &&
                  propertyPage > 0 &&
                  propertyPage * PAGE_SIZE >= propertyTotal)
              }
              onClick={() => void loadProperties(propertyPage + 1)}
            >
              {propertiesError ? '重试加载房源' : '加载更多房源'}
            </Button>
          </Space>
          {propertiesError && (
            <Alert
              type="warning"
              message="房源选项加载失败，已选 ID 保留；可重试后继续选择"
              showIcon
            />
          )}
        </div>
        <Form
          form={form}
          layout="vertical"
          disabled={!canEdit || saving || !loaded}
          initialValues={{ banners: [], activities: [] }}
          onValuesChange={() => setDirty(true)}
        >
          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                name="supportPhone"
                label="运营电话"
                rules={[
                  { max: HOME_PHONE_MAX_LENGTH, message: HOME_PHONE_MESSAGE },
                  { pattern: HOME_PHONE_PATTERN, message: HOME_PHONE_MESSAGE },
                ]}
              >
                <Input
                  allowClear
                  maxLength={HOME_PHONE_MAX_LENGTH}
                  placeholder="选填，不填写则不展示"
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                name="serviceHours"
                label="服务时间"
                rules={[{ max: 100 }]}
              >
                <Input
                  allowClear
                  maxLength={100}
                  placeholder="选填，不填写则不展示"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.List
            name="banners"
            rules={[
              {
                validator: async (_, entries = []) =>
                  validateHomeIds(entries, HOME_LIMITS.banners, '横幅'),
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                <h3>首页横幅（最多 5 个，按列表顺序展示）</h3>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`横幅 ${field.name + 1}`}
                    style={{ marginBottom: 16 }}
                    extra={
                      <Space>
                        <span>启用</span>
                        <Form.Item
                          name={[field.name, 'enabled']}
                          valuePropName="checked"
                          noStyle
                        >
                          <Switch aria-label={`启用横幅 ${field.name + 1}`} />
                        </Form.Item>
                        <AccessControl permission="system:property:update">
                          <Button
                            danger
                            disabled={saving}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            删除横幅
                          </Button>
                        </AccessControl>
                      </Space>
                    }
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          name={[field.name, 'id']}
                          label="横幅 ID"
                          rules={idRules}
                        >
                          <Input maxLength={40} placeholder="如 main-banner" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={16}>
                        <Form.Item
                          name={[field.name, 'title']}
                          label="横幅标题"
                          rules={titleRules}
                        >
                          <Input placeholder="请输入横幅标题" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name={[field.name, 'subtitle']}
                      label="横幅副标题"
                    >
                      <Input allowClear placeholder="选填" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'imageUrl']}
                      label="横幅图片 URL"
                      rules={imageRules}
                    >
                      <Input allowClear placeholder="选填，HTTP(S) 图片地址" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'targetType']}
                      label="跳转类型"
                      rules={[{ required: true }]}
                    >
                      <Select
                        options={[
                          { value: 'all', label: '全部房源' },
                          { value: 'recommended', label: '推荐房源' },
                          { value: 'activity', label: '活动' },
                          { value: 'property', label: '单个房源' },
                        ]}
                        onChange={() =>
                          form.setFieldValue(
                            ['banners', field.name, 'targetId'],
                            null,
                          )
                        }
                      />
                    </Form.Item>
                    {['activity', 'property'].includes(
                      banners[field.name]?.targetType,
                    ) && (
                      <Form.Item
                        name={[field.name, 'targetId']}
                        label={
                          banners[field.name]?.targetType === 'activity'
                            ? '跳转活动'
                            : '跳转房源'
                        }
                        rules={[{ required: true, message: '请选择跳转目标' }]}
                      >
                        <Select
                          showSearch
                          allowClear
                          optionFilterProp="label"
                          placeholder="请选择跳转目标"
                          loading={
                            propertiesLoading &&
                            banners[field.name]?.targetType === 'property'
                          }
                          options={
                            banners[field.name]?.targetType === 'activity'
                              ? activityOptions
                              : propertyOptions
                          }
                        />
                      </Form.Item>
                    )}
                  </Card>
                ))}
                <Form.ErrorList errors={errors} />
                <AccessControl permission="system:property:update">
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    disabled={
                      saving || !loaded || fields.length >= HOME_LIMITS.banners
                    }
                    style={{ marginBottom: 24 }}
                    onClick={() =>
                      add({
                        id: '',
                        title: '',
                        subtitle: null,
                        imageUrl: null,
                        targetType: 'all',
                        targetId: null,
                        enabled: true,
                      } satisfies Banner)
                    }
                  >
                    新增横幅
                  </Button>
                </AccessControl>
              </>
            )}
          </Form.List>
          <Form.List
            name="activities"
            rules={[
              {
                validator: async (_, entries = []) =>
                  validateHomeIds(entries, HOME_LIMITS.activities, '活动'),
              },
            ]}
          >
            {(fields, { add, remove }, { errors }) => (
              <>
                <h3>首页活动（最多 20 个）</h3>
                {fields.map((field) => (
                  <Card
                    key={field.key}
                    size="small"
                    title={`活动 ${field.name + 1}`}
                    style={{ marginBottom: 16 }}
                    extra={
                      <Space>
                        <span>启用</span>
                        <Form.Item
                          name={[field.name, 'enabled']}
                          valuePropName="checked"
                          noStyle
                        >
                          <Switch aria-label={`启用活动 ${field.name + 1}`} />
                        </Form.Item>
                        <AccessControl permission="system:property:update">
                          <Button
                            danger
                            disabled={saving}
                            icon={<DeleteOutlined />}
                            onClick={() => remove(field.name)}
                          >
                            删除活动
                          </Button>
                        </AccessControl>
                      </Space>
                    }
                  >
                    <Row gutter={16}>
                      <Col xs={24} sm={8}>
                        <Form.Item
                          name={[field.name, 'id']}
                          label="活动 ID"
                          rules={idRules}
                        >
                          <Input maxLength={40} placeholder="如 winter-stay" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={16}>
                        <Form.Item
                          name={[field.name, 'title']}
                          label="活动标题"
                          rules={titleRules}
                        >
                          <Input placeholder="请输入活动标题" />
                        </Form.Item>
                      </Col>
                    </Row>
                    <Form.Item
                      name={[field.name, 'description']}
                      label="活动说明"
                    >
                      <Input.TextArea rows={2} placeholder="选填" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'imageUrl']}
                      label="活动图片 URL"
                      rules={imageRules}
                    >
                      <Input allowClear placeholder="选填，HTTP(S) 图片地址" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'dateRange']}
                      label="活动日期范围"
                      getValueProps={(
                        value: [string | null, string | null] | null,
                      ) => ({
                        value:
                          value?.map((date) => (date ? dayjs(date) : null)) ||
                          null,
                      })}
                      normalize={(
                        value: [dayjs.Dayjs | null, dayjs.Dayjs | null] | null,
                      ) =>
                        value?.map(
                          (date) => date?.format(HOME_DATE_FORMAT) || null,
                        ) || null
                      }
                    >
                      <DatePicker.RangePicker
                        showTime
                        allowEmpty={[true, true]}
                        format={HOME_DATE_FORMAT}
                        placeholder={['开始时间（选填）', '结束时间（选填）']}
                        style={{ width: '100%' }}
                      />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, 'propertyIds']}
                      label="关联房源"
                      extra="每个活动最多 100 个；未找到时可在上方加载更多房源。"
                      rules={[
                        {
                          type: 'array',
                          max: HOME_LIMITS.propertyIds,
                          message: '最多关联 100 个房源',
                        },
                      ]}
                    >
                      <Select
                        mode="multiple"
                        showSearch
                        allowClear
                        optionFilterProp="label"
                        options={propertyOptions}
                        loading={propertiesLoading}
                        placeholder="请选择关联房源，可搜索已加载房源"
                      />
                    </Form.Item>
                  </Card>
                ))}
                <Form.ErrorList errors={errors} />
                <AccessControl permission="system:property:update">
                  <Button
                    type="dashed"
                    icon={<PlusOutlined />}
                    disabled={
                      saving ||
                      !loaded ||
                      fields.length >= HOME_LIMITS.activities
                    }
                    onClick={() =>
                      add({
                        id: '',
                        title: '',
                        description: null,
                        imageUrl: null,
                        enabled: true,
                        propertyIds: [],
                        dateRange: null,
                      })
                    }
                  >
                    新增活动
                  </Button>
                </AccessControl>
              </>
            )}
          </Form.List>
        </Form>
      </Spin>
    </Modal>
  );
}
