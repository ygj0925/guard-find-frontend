import React from 'react';
import OptionForm from './OptionForm';

/** 安全设置：后端类别为 PASSWORD（不是 security），code 见 sys_option 种子数据 */
const SecurityConfig: React.FC = () => (
  <OptionForm
    category="PASSWORD"
    fields={[
      { code: 'PASSWORD_MIN_LENGTH', label: '密码最小长度' },
      { code: 'PASSWORD_REPETITION_TIMES', label: '历史密码重复校验次数' },
      { code: 'PASSWORD_ERROR_LOCK_COUNT', label: '密码错误锁定阈值' },
      { code: 'PASSWORD_ERROR_LOCK_MINUTES', label: '账号锁定时长(分钟)' },
      { code: 'PASSWORD_EXPIRATION_DAYS', label: '密码有效期(天)' },
      { code: 'PASSWORD_EXPIRATION_WARNING_DAYS', label: '密码到期提醒(天)' },
      { code: 'PASSWORD_ALLOW_CONTAIN_USERNAME', label: '允许密码包含用户名' },
      { code: 'PASSWORD_REQUIRE_SYMBOLS', label: '必须包含特殊字符' },
    ]}
  />
);

export default SecurityConfig;
