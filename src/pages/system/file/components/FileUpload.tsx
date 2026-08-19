import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Button, message, Upload } from 'antd';
import React, { useState } from 'react';
import { uploadFile } from '@/services/web/file';

interface FileUploadProps {
  onSuccess?: () => void;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onProgress, onSuccess: onUploadSuccess, onError } = options;

    try {
      onProgress?.({ percent: 30 });
      const response = await uploadFile(file as File);
      onProgress?.({ percent: 100 });
      onUploadSuccess?.(response);
      message.success('上传成功');
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
      message.error('上传失败');
    }
  };

  const handleChange: UploadProps['onChange'] = ({ fileList: newFileList }) => {
    setFileList(newFileList.filter((f) => f.status === 'uploading'));
  };

  return (
    <Upload
      customRequest={customRequest}
      fileList={fileList}
      onChange={handleChange}
      showUploadList={false}
    >
      <Button type="primary" icon={<UploadOutlined />}>
        上传文件
      </Button>
    </Upload>
  );
};

export default FileUpload;
