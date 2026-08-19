import React from 'react';
import OptionForm from './OptionForm';

const LoginConfig: React.FC = () => (
  <OptionForm
    category="login"
    fields={[
      { name: 'login_captcha_enabled', label: '启用验证码' },
      { name: 'login_auto_lock_enabled', label: '启用自动锁定' },
      { name: 'login_methods', label: '允许登录方式' },
    ]}
  />
);

export default LoginConfig;
