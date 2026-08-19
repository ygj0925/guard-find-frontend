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
import {
  badgeDefaultColorArray,
  badgeStatusArray,
  dictItem,
  tagDefaultColorArray,
} from '@/services/web/system';

interface DictItemFormProps {
  visible: boolean;
  dictCode: string;
  item: SysDictItemVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const DictItemForm: React.FC<DictItemFormProps> = ({
  visible,
  dictCode,
  item,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (item) {
        form.setFieldsValue({
          ...item,
          tagColor: item.attributes?.tagColor,
          textColor: item.attributes?.textColor,
          badgeColor: item.attributes?.badgeColor,
          badgeStatus: item.attributes?.badgeStatus,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, item, form]);

  const handleSubmit = async (values: any) => {
    const { tagColor, textColor, badgeColor, badgeStatus, ...rest } = values;
    const attributes = {
      tagColor,
      textColor,
      badgeColor,
      badgeStatus,
    };

    try {
      if (item) {
        await dictItem.edit({
          ...rest,
          id: item.id,
          dictCode,
          attributes,
        });
      } else {
        await dictItem.create({
          ...rest,
          dictCode,
          attributes,
        });
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
      <ProForm form={form} onFinish={handleSubmit} initialValues={{ sort: 0 }}>
        <ProFormText
          name="name"
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
          min={0}
          fieldProps={{ precision: 0 }}
        />
        <ProFormSelect
          name="tagColor"
          label={intl.formatMessage({ id: 'system.dict.item.tag.color' })}
          options={tagDefaultColorArray.map((color) => ({
            label: color,
            value: color,
          }))}
          allowClear
        />
        <ProFormText
          name="textColor"
          label={intl.formatMessage({ id: 'system.dict.item.text.color' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.dict.item.text.color' })
          }
        />
        <ProFormSelect
          name="badgeColor"
          label={intl.formatMessage({ id: 'system.dict.item.badge.color' })}
          options={badgeDefaultColorArray.map((color) => ({
            label: color,
            value: color,
          }))}
          allowClear
        />
        <ProFormSelect
          name="badgeStatus"
          label={intl.formatMessage({ id: 'system.dict.item.badge.status' })}
          options={badgeStatusArray.map((status) => ({
            label: status,
            value: status,
          }))}
          allowClear
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

export default DictItemForm;
