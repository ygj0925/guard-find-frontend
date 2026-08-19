import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import * as i18nApi from '@/services/web/system/i18n';
import type { SysI18nDto, SysI18nVo } from '@/services/web/system/i18n/typings';

interface I18nDataFormProps {
  visible: boolean;
  data: SysI18nVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const I18nDataForm: React.FC<I18nDataFormProps> = ({
  visible,
  data,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (data) {
        form.setFieldsValue(data);
      } else {
        form.resetFields();
      }
    }
  }, [visible, data, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (data) {
        await i18nApi.edit({ ...values, id: data.id } as SysI18nDto);
      } else {
        await i18nApi.create(values as SysI18nDto);
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
        data
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.i18n.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.i18n.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <ProForm form={form} onFinish={handleSubmit}>
        <ProFormText
          name="code"
          label="Code"
          placeholder="Please enter code"
          rules={[{ required: true, message: 'Please enter code' }]}
          disabled={!!data}
        />
        <ProFormText
          name="languageTag"
          label={intl.formatMessage({ id: 'system.i18n.language.tag' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.i18n.language.tag' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.i18n.language.tag' }),
            },
          ]}
          disabled={!!data}
        />
        <ProFormTextArea
          name="message"
          label={intl.formatMessage({ id: 'system.i18n.message' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.i18n.message' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.i18n.message' }),
            },
          ]}
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

export default I18nDataForm;
