import {
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import type { SysDictVo } from '@/services/web/system';
import { dict } from '@/services/web/system';

interface DictFormProps {
  visible: boolean;
  dict: SysDictVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const DictForm: React.FC<DictFormProps> = ({
  visible,
  dict: dictData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (dictData) {
        form.setFieldsValue(dictData);
      } else {
        form.resetFields();
      }
    }
  }, [visible, dictData, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (dictData) {
        await dict.edit({ ...values, id: dictData.id });
      } else {
        await dict.create(values);
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
        dictData
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.dict.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.dict.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ valueType: 2 }}
      >
        <ProFormText
          name="code"
          label={intl.formatMessage({ id: 'system.dict.code' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.code' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.dict.code' }),
            },
          ]}
          disabled={!!dictData}
        />
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'system.dict.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.dict.name' }),
            },
          ]}
        />
        <ProFormSelect
          name="valueType"
          label={intl.formatMessage({ id: 'system.dict.value.type' })}
          options={[
            { label: 'Number', value: 1 },
            { label: 'String', value: 2 },
            { label: 'Boolean', value: 3 },
          ]}
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.select' }) +
                intl.formatMessage({ id: 'system.dict.value.type' }),
            },
          ]}
          disabled={!!dictData}
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

export default DictForm;
