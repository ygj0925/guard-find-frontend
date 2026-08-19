import {
  ProForm,
  ProFormDateTimePicker,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import { createTenant, updateTenant } from '@/services/web/tenant/management';
import type { TenantVo } from '@/services/web/tenant/typings';
import { encryptByRsa } from '@/utils/Encrypt';

interface TenantFormProps {
  visible: boolean;
  record: TenantVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const TenantForm: React.FC<TenantFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const isEdit = !!record;

  useEffect(() => {
    if (visible) {
      if (record) {
        form.setFieldsValue(record);
      } else {
        form.resetFields();
      }
    }
  }, [visible, record, form]);

  const handleSubmit = async (values: any) => {
    try {
      const submitData = { ...values };
      if (!isEdit && submitData.adminPassword) {
        submitData.adminPassword = encryptByRsa(submitData.adminPassword);
      }
      if (record) {
        await updateTenant({ ...submitData, id: record.id });
      } else {
        await createTenant(submitData);
      }
      message.success('操作成功');
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={record ? '编辑租户' : '新增租户'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ status: 1 }}
      >
        <ProFormText
          name="name"
          label="租户名称"
          placeholder="请输入租户名称"
          rules={[{ required: true, message: '请输入租户名称' }]}
        />
        <ProFormText name="domain" label="域名" placeholder="请输入域名" />
        {!isEdit && (
          <>
            <ProFormText
              name="adminUsername"
              label="管理员账号"
              placeholder="请输入管理员账号"
              rules={[{ required: true, message: '请输入管理员账号' }]}
            />
            <ProFormText.Password
              name="adminPassword"
              label="管理员密码"
              placeholder="请输入管理员密码"
              rules={[{ required: true, message: '请输入管理员密码' }]}
            />
          </>
        )}
        <ProFormText
          name="packageId"
          label="套餐ID"
          placeholder="请输入套餐ID"
          rules={[{ required: true, message: '请输入套餐ID' }]}
          fieldProps={{ type: 'number' }}
        />
        <ProFormDateTimePicker
          name="expireTime"
          label="过期时间"
          placeholder="请选择过期时间"
          fieldProps={{ style: { width: '100%' } }}
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={[
            { label: '禁用', value: 0 },
            { label: '正常', value: 1 },
          ]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
      </ProForm>
    </Modal>
  );
};

export default TenantForm;
