import {
  ModalForm,
  ProFormRadio,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message } from 'antd';
import React from 'react';
import { createApp, updateApp } from '@/services/web/open/app';
import type { AppVo } from '@/services/web/open/typings';

interface AppFormProps {
  visible: boolean;
  record: AppVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AppForm: React.FC<AppFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const handleSubmit = async (values: any) => {
    try {
      if (record) {
        await updateApp({ ...values, id: record.id });
      } else {
        await createApp(values);
      }
      message.success('操作成功');
      onSuccess();
      return true;
    } catch (error) {
      console.error('Submit failed:', error);
      return false;
    }
  };

  return (
    <ModalForm
      title={record ? '编辑应用' : '新增应用'}
      open={visible}
      modalProps={{
        onCancel,
        destroyOnClose: true,
      }}
      initialValues={record ? { ...record } : { status: 1 }}
      onFinish={handleSubmit}
    >
      <ProFormText
        name="name"
        label="应用名称"
        placeholder="请输入应用名称"
        rules={[{ required: true, message: '请输入应用名称' }]}
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
          { label: '启用', value: 1 },
        ]}
      />
    </ModalForm>
  );
};

export default AppForm;
