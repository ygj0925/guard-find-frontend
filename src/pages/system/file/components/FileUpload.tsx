import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { Button, message, Upload } from 'antd';
import React, { useState } from 'react';
import { checkFile, uploadFile } from '@/services/web/file';
import { sha256Hex } from '@/utils/hash';

interface FileUploadProps {
  onSuccess?: () => void;
  /** 归档目录，留空由后端按 `/yyyy/MM/dd` 生成 */
  parentPath?: string;
}

const FileUpload: React.FC<FileUploadProps> = ({ onSuccess, parentPath }) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const customRequest: UploadProps['customRequest'] = async (options) => {
    const { file, onProgress, onSuccess: onUploadSuccess, onError } = options;
    const raw = file as File;

    try {
      // 秒传：先按 SHA-256 问一次后端有没有。
      // `system:file:check` 没有 sys_menu 行、只有超级管理员能过，所以 checkFile 是静默请求，
      // 失败（403/网络异常）时直接落到下面的普通上传，不影响主流程。
      const hash = await sha256Hex(raw);
      if (hash) {
        try {
          const { data: hit } = await checkFile(hash);
          if (hit?.id) {
            onProgress?.({ percent: 100 });
            onUploadSuccess?.(hit);
            message.success(`「${raw.name}」服务器已有相同文件，秒传成功`);
            onSuccess?.();
            return;
          }
        } catch {
          // 静默失败：继续正常上传
        }
      }

      onProgress?.({ percent: 30 });
      const response = await uploadFile(raw, parentPath);
      onProgress?.({ percent: 100 });
      onUploadSuccess?.(response);
      message.success('上传成功');
      onSuccess?.();
    } catch (error) {
      onError?.(error as Error);
      // 请求层已按后端信封提示过具体原因，这里不再叠加"上传失败"
      console.error('Upload failed:', error);
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
      multiple
    >
      <Button type="primary" icon={<UploadOutlined />}>
        上传文件
      </Button>
    </Upload>
  );
};

export default FileUpload;
