import React from 'react';
import OptionForm from './OptionForm';

const SecurityConfig: React.FC = () => (
  <OptionForm
    category="security"
    fields={[
      { name: 'password_min_length', label: '密码最小长度' },
      { name: 'password_max_retry', label: '最大重试次数' },
      { name: 'password_lock_minutes', label: '锁定时长(分钟)' },
      { name: 'password_expire_days', label: '密码过期天数' },
      { name: 'password_complexity', label: '密码复杂度要求' },
    ]}
  />
);

export default SecurityConfig;
