import React from 'react';
import OptionForm from './OptionForm';

const SiteConfig: React.FC = () => (
  <OptionForm
    category="site"
    fields={[
      { name: 'site_name', label: '站点名称' },
      { name: 'site_logo', label: 'Logo地址' },
      { name: 'site_favicon', label: 'Favicon地址' },
      { name: 'site_copyright', label: '版权信息' },
      { name: 'site_icp', label: 'ICP备案号' },
    ]}
  />
);

export default SiteConfig;
