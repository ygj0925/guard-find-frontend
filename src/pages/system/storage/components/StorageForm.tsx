import {
  ModalForm,
  ProFormDigit,
  ProFormSelect,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message } from 'antd';
import React from 'react';
import { createStorage, updateStorage } from '@/services/web/storage';
import type { StorageVo } from '@/services/web/storage/typings';

interface StorageFormProps {
  visible: boolean;
  record: StorageVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const StorageForm: React.FC<StorageFormProps> = ({
  visible,
  record,
  onCancel,
  onSuccess,
}) => {
  const handleSubmit = async (values: any) => {
    try {
      if (record) {
        await updateStorage({ ...values, id: record.id });
      } else {
        await createStorage(values);
      }
      message.success(record ? '编辑成功' : '新增成功');
      onSuccess();
      return true;
    } catch (error) {
      console.error('Submit failed:', error);
      return false;
    }
  };

  return (
    <ModalForm
      title={record ? '编辑存储' : '新增存储'}
      open={visible}
      modalProps={{
        onCancel,
        destroyOnClose: true,
      }}
      initialValues={record || {}}
      onFinish={handleSubmit}
      width={600}
    >
      <ProFormText
        name="name"
        label="名称"
        placeholder="请输入名称"
        rules={[{ required: true, message: '请输入名称' }]}
      />
      <ProFormText
        name="code"
        label="编码"
        placeholder="请输入编码"
        rules={[{ required: true, message: '请输入编码' }]}
        disabled={!!record}
      />
      <ProFormSelect
        name="type"
        label="类型"
        placeholder="请选择类型"
        rules={[{ required: true, message: '请选择类型' }]}
        options={[
          { label: '本地', value: 0 },
          { label: 'S3', value: 1 },
          { label: 'OSS', value: 2 },
          { label: 'COS', value: 3 },
          { label: 'MinIO', value: 4 },
        ]}
      />
      <ProFormText
        name="accessKey"
        label="AccessKey"
        placeholder="请输入AccessKey"
      />
      <ProFormText.Password
        name="secretKey"
        label="SecretKey"
        placeholder="请输入SecretKey"
      />
      <ProFormText
        name="endpoint"
        label="Endpoint"
        placeholder="请输入Endpoint"
      />
      <ProFormText
        name="bucketName"
        label="Bucket名称"
        placeholder="请输入Bucket名称"
      />
      <ProFormText name="domain" label="域名" placeholder="请输入自定义域名" />
      <ProFormTextArea
        name="description"
        label="描述"
        placeholder="请输入描述"
      />
      <ProFormDigit
        name="sort"
        label="排序"
        placeholder="请输入排序值"
        min={0}
        fieldProps={{ precision: 0 }}
      />
    </ModalForm>
  );
};

export default StorageForm;
