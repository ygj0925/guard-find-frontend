import { ProForm, ProFormDigit, ProFormText } from '@ant-design/pro-components';
import { Modal, message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { getTableConfig, saveTableConfig } from '@/services/web/code/generator';
import type { GeneratorTableDto } from '@/services/web/code/typings';

interface TableConfigProps {
  visible: boolean;
  tableName: string | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const TableConfig: React.FC<TableConfigProps> = ({
  visible,
  tableName,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && tableName) {
      fetchConfig();
    }
    if (!visible) {
      form.resetFields();
    }
  }, [visible, tableName]);

  const fetchConfig = async () => {
    if (!tableName) return;
    setLoading(true);
    try {
      const response = await getTableConfig(tableName);
      if (response.data) {
        form.setFieldsValue(response.data);
      } else {
        form.setFieldsValue({ tableName });
      }
    } catch (error) {
      console.error('Fetch config failed:', error);
      form.setFieldsValue({ tableName });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: GeneratorTableDto) => {
    if (!tableName) return;
    try {
      await saveTableConfig(tableName, values);
      message.success('配置保存成功');
      onSuccess();
    } catch (error) {
      console.error('Save config failed:', error);
    }
  };

  return (
    <Modal
      title="表配置"
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      width={600}
    >
      <Spin spinning={loading}>
        <ProForm form={form} onFinish={handleSubmit}>
          <ProFormText name="tableName" label="表名" disabled />
          <ProFormText
            name="tableComment"
            label="表注释"
            placeholder="请输入表注释"
          />
          <ProFormText
            name="className"
            label="类名"
            placeholder="请输入类名"
            rules={[{ required: true, message: '请输入类名' }]}
          />
          <ProFormText
            name="moduleName"
            label="模块名"
            placeholder="请输入模块名"
            rules={[{ required: true, message: '请输入模块名' }]}
          />
          <ProFormText
            name="packageName"
            label="包名"
            placeholder="请输入包名"
            rules={[{ required: true, message: '请输入包名' }]}
          />
          <ProFormText
            name="businessName"
            label="业务名"
            placeholder="请输入业务名"
            rules={[{ required: true, message: '请输入业务名' }]}
          />
          <ProFormText
            name="author"
            label="作者"
            placeholder="请输入作者"
            rules={[{ required: true, message: '请输入作者' }]}
          />
          <ProFormDigit
            name="parentMenuId"
            label="父菜单ID"
            placeholder="请输入父菜单ID"
            fieldProps={{ precision: 0 }}
          />
        </ProForm>
      </Spin>
    </Modal>
  );
};

export default TableConfig;
