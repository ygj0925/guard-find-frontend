/**
 * 表单填写页：按不可变发布版本渲染字段并做前端校验。
 * 提交/发起、附件上传与人员选择分别在 10.1、10.5 接入，本页不写入任何申请数据。
 */
import { CheckCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { history, useSearchParams } from '@umijs/max';
import {
  Alert,
  Button,
  Card,
  Collapse,
  Empty,
  message,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
  type UploadFile,
} from 'antd';
import React, { useEffect, useMemo, useState } from 'react';
import {
  getOaFormVersion,
  type OaFormVersionDetailVo,
  type OaFormVersionOptionVo,
  queryOaFormVersionOptions,
} from '@/services/web/guardfind/oa';
import {
  type OaFormField,
  parseOaFormSchema,
  validateOaFormValues,
} from '@/utils/oaForm';
import OaFormRenderer from '../components/OaFormRenderer';

function errorText(error: unknown) {
  return error instanceof Error ? error.message : '操作失败';
}

function printableValue(field: OaFormField, value: unknown) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) {
    if (!value.length) return null;
    if (field.type === 'attachment') {
      return (value as UploadFile[]).map((file) => file.name).join('、');
    }
    return value.join('、');
  }
  if (typeof value === 'object' && value && 'format' in value) {
    return String(
      (value as { format: (pattern: string) => string }).format('YYYY-MM-DD'),
    );
  }
  return String(value);
}

const FormFillPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [versionId, setVersionId] = useState<string | null>(() =>
    searchParams.get('versionId'),
  );
  const [options, setOptions] = useState<OaFormVersionOptionVo[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [detail, setDetail] = useState<OaFormVersionDetailVo | null>(null);
  const [fields, setFields] = useState<OaFormField[]>([]);
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(Boolean(versionId));
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setOptionsLoading(true);
    queryOaFormVersionOptions()
      .then((response) => {
        if (!cancelled) setOptions(response.data || []);
      })
      .catch((error) => {
        if (!cancelled) message.error(`加载表单版本失败：${errorText(error)}`);
      })
      .finally(() => {
        if (!cancelled) setOptionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!versionId) {
      setDetail(null);
      setFields([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    getOaFormVersion(versionId)
      .then((response) => {
        if (cancelled) return;
        const next = response.data;
        setDetail(next);
        setFields(parseOaFormSchema(next.schemaJson).fields);
        setValues({});
        setErrors({});
      })
      .catch((error) => {
        if (!cancelled) setLoadError(errorText(error));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [versionId]);

  const visibleFields = useMemo(
    () => fields.filter((field) => !field.hidden),
    [fields],
  );
  const hiddenCount = fields.length - visibleFields.length;

  const summary = useMemo(
    () =>
      visibleFields
        .map((field) => {
          const text = printableValue(field, values[field.key]);
          return text === null ? null : `${field.label}：${text}`;
        })
        .filter((item): item is string => Boolean(item)),
    [visibleFields, values],
  );

  const chooseVersion = (next: string) => {
    setVersionId(next);
    history.replace(`/oa/form/fill?versionId=${next}`);
  };

  const handleValidate = () => {
    const result = validateOaFormValues(fields, values);
    setErrors(result.errors);
    if (result.valid) {
      message.success(`校验通过：共 ${visibleFields.length} 个可见字段`);
    } else {
      message.error('请检查必填项与格式');
    }
  };

  const handleReset = () => {
    setValues({});
    setErrors({});
  };

  return (
    <PageContainer
      onBack={() => history.push('/oa/form')}
      header={{
        title: detail ? `填写：${detail.name}` : '表单填写',
        subTitle: detail
          ? `${detail.formKey} · v${detail.version}`
          : '按已发布版本渲染与校验',
      }}
    >
      <Space direction="vertical" size={16} style={{ width: '100%' }}>
        <Alert
          type="info"
          showIcon
          message="本页用于 9.8 表单渲染与填写校验"
          description="提交/发起、附件上传与组织人员选择尚未接入（10.1/10.5），本页不会写入申请数据。"
        />

        <Card size="small">
          <Space direction="vertical" size={8} style={{ width: '100%' }}>
            <Typography.Text strong>表单版本</Typography.Text>
            <Select
              showSearch
              aria-label="表单版本"
              optionFilterProp="label"
              style={{ width: '100%', maxWidth: 520 }}
              loading={optionsLoading}
              value={versionId ?? undefined}
              placeholder="选择已发布的表单版本"
              notFoundContent={
                optionsLoading ? '加载中…' : '暂无已发布的表单版本'
              }
              options={options.map((item) => ({
                value: String(item.versionId),
                label: `${item.name}（${item.formKey}）v${item.version}`,
              }))}
              onChange={chooseVersion}
            />
            {!optionsLoading && options.length === 0 ? (
              <Typography.Text type="secondary">
                先在表单管理发布至少一个版本，再回到本页填写。
              </Typography.Text>
            ) : null}
          </Space>
        </Card>

        {loadError ? (
          <Alert
            type="error"
            showIcon
            message="加载表单版本失败"
            description={`${loadError}。请确认版本属于当前租户且已发布。`}
          />
        ) : null}

        <Spin spinning={loading}>
          {detail ? (
            <Card
              size="small"
              title={`${detail.name} · v${detail.version}`}
              extra={
                <Space wrap>
                  <Tag>{detail.formKey}</Tag>
                  <Tag color={detail.status === 'PUBLISHED' ? 'green' : 'red'}>
                    {detail.status}
                  </Tag>
                  <Tag>字段 {detail.fieldCount}</Tag>
                  <Typography.Text code>
                    {detail.schemaDigest.slice(0, 16)}…
                  </Typography.Text>
                </Space>
              }
            >
              <Space direction="vertical" size={16} style={{ width: '100%' }}>
                {hiddenCount > 0 ? (
                  <Typography.Text type="secondary">
                    另有 {hiddenCount} 个隐藏字段未展示，也不参与校验。
                  </Typography.Text>
                ) : null}
                <OaFormRenderer
                  fields={fields}
                  values={values}
                  errors={errors}
                  onChange={(key, value) => {
                    setValues((current) => ({ ...current, [key]: value }));
                    setErrors((current) => {
                      if (!current[key]) return current;
                      const next = { ...current };
                      delete next[key];
                      return next;
                    });
                  }}
                />
                <Space wrap>
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    onClick={handleValidate}
                  >
                    校验填写
                  </Button>
                  <Button icon={<ReloadOutlined />} onClick={handleReset}>
                    重置
                  </Button>
                </Space>
                {summary.length ? (
                  <Collapse
                    size="small"
                    items={[
                      {
                        key: 'summary',
                        label: '查看当前填写值',
                        children: (
                          <Space
                            direction="vertical"
                            size={4}
                            style={{ width: '100%' }}
                          >
                            {summary.map((item) => (
                              <Typography.Text key={item}>
                                {item}
                              </Typography.Text>
                            ))}
                          </Space>
                        ),
                      },
                    ]}
                  />
                ) : null}
              </Space>
            </Card>
          ) : !loading && !loadError ? (
            <Card size="small">
              <Empty description="选择表单版本后开始填写" />
            </Card>
          ) : null}
        </Spin>
      </Space>
    </PageContainer>
  );
};

export default FormFillPage;
