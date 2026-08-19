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
  onSuccess: () => void;
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
      const response = await user.getScope(userData);
      if (response?.data) {
        form.setFieldsValue({ roleCodes: response.data.roleCodes });
      }
    } catch (error) {
      console.error('Failed to load user scope:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    if (!userData) return;
    try {
      await user.putScope({
        userId: userData.userId,
        username: userData.username,
        roleCodes: values.roleCodes,
      });
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
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
