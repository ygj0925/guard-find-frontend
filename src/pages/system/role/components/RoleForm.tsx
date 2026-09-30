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
import type { SysRoleVo } from '@/services/web/system';
import { role } from '@/services/web/system';

interface RoleFormProps {
  visible: boolean;
  role: SysRoleVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const RoleForm: React.FC<RoleFormProps> = ({
  visible,
  role: roleData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (roleData) {
        form.setFieldsValue(roleData);
      } else {
        form.resetFields();
      }
    }
  }, [visible, roleData, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (roleData) {
        await role.edit({ ...values, id: roleData.id });
      } else {
        await role.create(values);
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
        roleData
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.role.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.role.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ sort: 0, dataScope: 1 }}
      >
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'system.role.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.role.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.role.name' }),
            },
          ]}
        />
        <ProFormText
          name="code"
          label={intl.formatMessage({ id: 'system.role.code' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.role.code' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.role.code' }),
            },
          ]}
          disabled={!!roleData}
        />
        <ProFormSelect
          name="dataScope"
          label={intl.formatMessage({ id: 'system.role.data.scope' })}
          options={[
            {
              label: intl.formatMessage({
                id: 'system.role.data.scope.all',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'system.role.data.scope.dept.and.child',
              }),
              value: 2,
            },
            {
              label: intl.formatMessage({
                id: 'system.role.data.scope.dept',
              }),
              value: 3,
            },
            {
              label: intl.formatMessage({
                id: 'system.role.data.scope.self',
              }),
              value: 4,
            },
            {
              label: intl.formatMessage({
                id: 'system.role.data.scope.custom',
              }),
              value: 5,
            },
          ]}
          extra="后端 DataScopeEnum：1 全部 / 2 本部门及以下 / 3 本部门 / 4 仅本人 / 5 自定义"
        />
        <ProFormDigit
          name="sort"
          label={intl.formatMessage({ id: 'common.field.sort' })}
          min={0}
          fieldProps={{ precision: 0 }}
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

export default RoleForm;
