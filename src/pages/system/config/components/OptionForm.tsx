import {
  ProForm,
  ProFormText,
  ProFormTextArea,
} from '@ant-design/pro-components';
import { message, Spin } from 'antd';
import React, { useEffect, useState } from 'react';
import { request } from 'umi';

interface Props {
  category: string;
  fields: {
    name: string;
    label: string;
    type?: 'text' | 'password' | 'textarea' | 'number';
  }[];
}

const OptionForm: React.FC<Props> = ({ category, fields }) => {
  const [loading, setLoading] = useState(false);
  const [initialValues, setInitialValues] = useState<Record<string, string>>(
    {},
  );

  useEffect(() => {
    setLoading(true);
    request('system/option', { method: 'GET', params: { category } })
      .then((res) => {
        if (res.data) {
          const values: Record<string, string> = {};
          if (Array.isArray(res.data)) {
            for (const item of res.data) {
              values[item.key || item.confKey || item.name] =
                item.value || item.confValue || '';
            }
          } else if (typeof res.data === 'object') {
            Object.assign(values, res.data);
          }
          setInitialValues(values);
        }
      })
      .finally(() => setLoading(false));
  }, [category]);

  const handleSubmit = async (values: Record<string, string>) => {
    await request('system/option', { method: 'PUT', data: values });
    message.success('保存成功');
  };

  if (loading) return <Spin />;

  return (
    <ProForm
      initialValues={initialValues}
      onFinish={handleSubmit}
      layout="horizontal"
      labelCol={{ span: 6 }}
      wrapperCol={{ span: 14 }}
    >
      {fields.map((field) => {
        if (field.type === 'textarea') {
          return (
            <ProFormTextArea
              key={field.name}
              label={field.label}
              name={field.name}
            />
          );
        }
        if (field.type === 'password') {
          return (
            <ProFormText.Password
              key={field.name}
              label={field.label}
              name={field.name}
            />
          );
        }
        return (
          <ProFormText key={field.name} label={field.label} name={field.name} />
        );
      })}
    </ProForm>
  );
};

export default OptionForm;
