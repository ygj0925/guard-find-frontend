import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import type { SysDictItemVo } from '@/services/web/system';
import { dictItem, tagDefaultColorArray } from '@/services/web/system';

interface DictItemFormProps {
  visible: boolean;
  dictId: number;
  item: SysDictItemVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const DictItemForm: React.FC<DictItemFormProps> = ({
  visible,
  dictId,
  item,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (item) {
        form.setFieldsValue(item);
      } else {
        form.resetFields();
      }
    }
  }, [visible, item, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (item) {
        await dictItem.edit({ ...values, id: item.id, dictId });
      } else {
        await dictItem.create({ ...values, dictId });
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
        item
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.dict.item' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.dict.item' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm form={form} onFinish={handleSubmit} initialValues={{ sort: 1 }}>
        <ProFormText
          name="label"
          label={intl.formatMessage({ id: 'system.dict.item.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.item.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.dict.item.name' }),
            },
          ]}
        />
        <ProFormText
          name="value"
          label={intl.formatMessage({ id: 'system.dict.item.value' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.item.value' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.dict.item.value' }),
            },
          ]}
        />
        <ProFormDigit
          name="sort"
          label={intl.formatMessage({ id: 'system.dict.item.sort' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.item.sort' })
          }
          min={1}
          fieldProps={{ precision: 0 }}
        />
        <ProFormSelect
          name="color"
          label={intl.formatMessage({ id: 'system.dict.item.tag.color' })}
          options={tagDefaultColorArray.map((color) => ({
            label: color,
            value: color,
          }))}
          allowClear
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

export default DictItemForm;
