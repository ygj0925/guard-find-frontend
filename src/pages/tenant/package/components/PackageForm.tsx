import {
  ProForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import { createPackage, updatePackage } from '@/services/web/tenant/package';
import type { TenantPackageVo } from '@/services/web/tenant/typings';

interface PackageFormProps {
  visible: boolean;
  record: TenantPackageVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const PackageForm: React.FC<PackageFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();

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
      if (record) {
        await updatePackage({ ...values, id: record.id });
      } else {
        await createPackage(values);
      }
      message.success('操作成功');
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={record ? '编辑套餐' : '新增套餐'}
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
          label="套餐名称"
          placeholder="请输入套餐名称"
          rules={[{ required: true, message: '请输入套餐名称' }]}
        />
        <ProFormTextArea
          name="description"
          label="描述"
          placeholder="请输入描述"
        />
        <ProFormRadio.Group
          name="status"
          label="状态"
          options={[
            { label: '禁用', value: 0 },
            { label: '正常', value: 1 },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default PackageForm;
