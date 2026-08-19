import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import type { SysConfigVo } from '@/services/web/system';
import { config } from '@/services/web/system';

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
    try {
      if (configData) {
        await config.edit({ ...values, id: configData.id });
      } else {
        await config.create(values);
      }
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
      <ProForm form={form} onFinish={handleSubmit}>
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
          name="confKey"
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
          name="confValue"
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
        <ProFormText
          name="category"
          label={intl.formatMessage({ id: 'system.config.category' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.config.category' })
          }
        />
        <ProFormTextArea
          name="remarks"
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
