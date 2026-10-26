import { ProForm, ProFormSelect } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect, useState } from 'react';
import type { SysUserVo } from '@/services/web/system';
import { role, user } from '@/services/web/system';

interface GrantModalProps {
  visible: boolean;
  user: SysUserVo | null;
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
}

const GrantModal: React.FC<GrantModalProps> = ({
  visible,
  user: userData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && userData) {
      loadUserScope();
    }
  }, [visible, userData]);

  const loadUserScope = async () => {
    if (!userData) return;
    setLoading(true);
    try {
      // 角色分配以用户详情为准：GET /system/user/{id} → roleIds
      const response = await user.getUser(userData.id);
      if (response?.data) {
        form.setFieldsValue({ roleIds: (response.data as any).roleIds || [] });
      }
    } catch (error) {
      console.error('Failed to load user roles:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!userData) return;
    try {
      await user.assignRoles(userData.id, values.roleIds || []);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      await onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const loadRoles = async () => {
    const response = await role.listSelectData();
    return response.data || [];
  };

  return (
    <Modal
      title={intl.formatMessage({ id: 'system.user.grant' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
      loading={loading}
    >
      <ProForm form={form} onFinish={handleSubmit}>
        <ProFormSelect
          name="roleIds"
          label={intl.formatMessage({ id: 'system.role.title' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.role.title' })
          }
          mode="multiple"
          request={async () => {
            const data = await loadRoles();
            return data.map((item: any) => ({
              label: item.label ?? item.name,
              value: item.value ?? item.id,
            }));
          }}
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.select' }) +
                intl.formatMessage({ id: 'system.role.title' }),
            },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default GrantModal;
