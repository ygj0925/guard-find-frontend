import React from 'react';
import OptionForm from './OptionForm';

const StorageConfig: React.FC = () => (
  <OptionForm
    category="storage"
    fields={[
      { name: 'storage_default_type', label: '默认存储类型' },
      { name: 'storage_local_path', label: '本地存储路径' },
      { name: 'storage_max_size', label: '最大上传大小(MB)' },
      { name: 'storage_allowed_types', label: '允许的文件类型' },
    ]}
  />
);

export default StorageConfig;
