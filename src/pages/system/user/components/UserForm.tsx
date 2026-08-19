import {
  ProForm,
  ProFormSelect,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import type { SysUserVo } from '@/services/web/system';
import { organization, role, user } from '@/services/web/system';

interface UserFormProps {
  visible: boolean;
  user: SysUserVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const UserForm: React.FC<UserFormProps> = ({
  visible,
  user: userData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (userData) {
        form.setFieldsValue(userData);
      } else {
        form.resetFields();
      }
    }
  }, [visible, userData, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (userData) {
        await user.edit({ ...values, userId: userData.userId });
      } else {
        await user.create(values);
      }
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const loadOrgTree = async () => {
    const response = await organization.query();
    const convertToTreeData = (items: any[]): any[] => {
      return items.map((item) => ({
        title: item.name,
        value: item.id,
        children: item.children ? convertToTreeData(item.children) : [],
      }));
    };
    return convertToTreeData(response.data || []);
  };

  const loadRoles = async () => {
    const response = await role.listSelectData();
    return response.data || [];
  };

  return (
    <Modal
      title={
        userData
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.user.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.user.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ gender: 0, status: 1, type: 1 }}
      >
        <ProFormText
          name="username"
          label={intl.formatMessage({ id: 'system.user.username' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.user.username' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.user.username' }),
            },
          ]}
          disabled={!!userData}
        />
        {!userData && (
          <ProFormText.Password
            name="pass"
            label={intl.formatMessage({ id: 'system.user.password' })}
            placeholder={
              intl.formatMessage({ id: 'common.form.placeholder.input' }) +
              intl.formatMessage({ id: 'system.user.password' })
            }
            rules={[
              {
                required: true,
                message:
                  intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                  intl.formatMessage({ id: 'system.user.password' }),
              },
              {
                pattern: /^(?=.*[a-zA-Z])(?=.*\d)[a-zA-Z\d]{6,12}$/,
                message: intl.formatMessage({
                  id: 'system.user.password.rule',
                }),
              },
            ]}
          />
        )}
        <ProFormText
          name="nickname"
          label={intl.formatMessage({ id: 'system.user.nickname' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.user.nickname' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.user.nickname' }),
            },
          ]}
        />
        <ProFormSelect
          name="gender"
          label={intl.formatMessage({ id: 'system.user.gender' })}
          options={[
            {
              label: intl.formatMessage({ id: 'common.gender.unknown' }),
              value: 0,
            },
            {
              label: intl.formatMessage({ id: 'common.gender.male' }),
              value: 1,
            },
            {
              label: intl.formatMessage({ id: 'common.gender.female' }),
              value: 2,
            },
          ]}
        />
        <ProFormText
          name="phoneNumber"
          label={intl.formatMessage({ id: 'system.user.phone' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.user.phone' })
          }
        />
        <ProFormText
          name="email"
          label={intl.formatMessage({ id: 'system.user.email' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.user.email' })
          }
        />
        <ProFormTreeSelect
          name="organizationId"
          label={intl.formatMessage({ id: 'system.user.organization' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.user.organization' })
          }
          request={loadOrgTree}
          fieldProps={{
            treeDefaultExpandAll: true,
          }}
        />
        <ProFormSelect
          name="roleCodes"
          label={intl.formatMessage({ id: 'system.role.title' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.role.title' })
          }
          mode="multiple"
          request={async () => {
            const data = await loadRoles();
            return data.map((item: any) => ({
              label: item.name,
              value: item.value,
            }));
          }}
        />
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'common.field.status' })}
          options={[
            {
              label: intl.formatMessage({ id: 'common.status.normal' }),
              value: 1,
            },
            {
              label: intl.formatMessage({ id: 'common.status.frozen' }),
              value: 0,
            },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default UserForm;
