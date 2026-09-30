import React from 'react';
import OptionForm from './OptionForm';

/** 站点设置：category=SITE，code 取自后端 sys_option 种子数据 */
const SiteConfig: React.FC = () => (
  <OptionForm
    category="SITE"
    fields={[
      { code: 'SITE_TITLE', label: '系统名称' },
      { code: 'SITE_DESCRIPTION', label: '系统描述', type: 'textarea' },
      { code: 'SITE_COPYRIGHT', label: '版权声明' },
      { code: 'SITE_BEIAN', label: '备案号' },
      { code: 'SITE_FAVICON', label: '系统图标' },
      { code: 'SITE_LOGO', label: '系统LOGO' },
    ]}
  />
);

export default SiteConfig;
