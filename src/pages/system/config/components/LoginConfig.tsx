import React from 'react';
import OptionForm from './OptionForm';

/** 登录设置：category=LOGIN */
const LoginConfig: React.FC = () => (
  <OptionForm
    category="LOGIN"
    fields={[{ code: 'LOGIN_CAPTCHA_ENABLED', label: '是否启用验证码' }]}
  />
);

export default LoginConfig;
