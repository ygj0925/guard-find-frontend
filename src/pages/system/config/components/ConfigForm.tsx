import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import { useAccess } from '@/hooks/useAccess';
import type { SysConfigVo } from '@/services/web/system';
import { config } from '@/services/web/system';
import { getOptionPermission } from '@/utils/optionAccess';

interface ConfigFormProps {
  visible: boolean;
  config: SysConfigVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const ConfigForm: React.FC<ConfigFormProps> = ({
  visible,
  config: configData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();
  const { hasPermission } = useAccess();
  const canUpdate = Boolean(
    configData?.category &&
      hasPermission(getOptionPermission(configData.category, 'update')),
  );

  useEffect(() => {
    if (visible) {
      if (configData) {
        form.setFieldsValue(configData);
      } else {
        form.resetFields();
      }
    }
  }, [visible, configData, form]);

  const handleSubmit = async (values: any) => {
    if (!configData || !canUpdate) return;
    try {
      // 后端只提供 `PUT /system/option`（批量改值），参数项不支持界面新增
      await config.edit({ ...values, id: configData.id });
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={
        configData
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.config.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.config.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        disabled={!canUpdate}
        submitter={{ submitButtonProps: { disabled: !canUpdate } }}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'system.config.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.config.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.config.name' }),
            },
          ]}
        />
        <ProFormText
          name="code"
          label={intl.formatMessage({ id: 'system.config.key' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.config.key' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.config.key' }),
            },
          ]}
          disabled={!!configData}
        />
        <ProFormText
          name="value"
          label={intl.formatMessage({ id: 'system.config.value' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.config.value' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.config.value' }),
            },
          ]}
        />
        <ProFormTextArea
          name="description"
          label={intl.formatMessage({ id: 'common.field.remark' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'common.field.remark' })
          }
        />
      </ProForm>
    </Modal>
  );
};

export default ConfigForm;
