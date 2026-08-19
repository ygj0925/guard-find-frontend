import { ProForm, ProFormText } from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React from 'react';
import type { SysUserVo } from '@/services/web/system';
import { user } from '@/services/web/system';

interface PassModalProps {
  visible: boolean;
  user: SysUserVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const PassModal: React.FC<PassModalProps> = ({
  visible,
  user: userData,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  const handleSubmit = async (values: any) => {
    if (!userData) return;
    try {
      await user.changePassword({
        userId: userData.userId,
        username: userData.username,
        pass: values.pass,
      });
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={intl.formatMessage({ id: 'system.user.change.password' })}
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm form={form} onFinish={handleSubmit}>
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
              message: intl.formatMessage({ id: 'system.user.password.rule' }),
            },
          ]}
        />
        <ProFormText.Password
          name="confirmPass"
          label={intl.formatMessage({ id: 'system.user.confirm.password' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.user.confirm.password' })
          }
          dependencies={['pass']}
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.user.confirm.password' }),
            },
            ({ getFieldValue }) => ({
              validator(_, value) {
                if (!value || getFieldValue('pass') === value) {
                  return Promise.resolve();
                }
                return Promise.reject(
                  new Error(
                    intl.formatMessage({
                      id: 'system.user.password.not.match',
                    }),
                  ),
                );
              },
            }),
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default PassModal;
