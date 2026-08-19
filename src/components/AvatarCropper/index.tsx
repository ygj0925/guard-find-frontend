import { UploadOutlined } from '@ant-design/icons';
import { Button, Modal, message, Upload } from 'antd';
import React, { useCallback, useRef, useState } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';

interface AvatarCropperProps {
  visible: boolean;
  onCancel: () => void;
  onUpload: (file: Blob) => Promise<void>;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
}

const AvatarCropper: React.FC<AvatarCropperProps> = ({
  visible,
  onCancel,
  onUpload,
  aspectRatio = 1,
  outputWidth = 200,
  outputHeight = 200,
}) => {
  const cropperRef = useRef<HTMLImageElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const handleBeforeUpload = useCallback((file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件！');
      return false;
    }

    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error('图片大小不能超过 2MB！');
      return false;
    }

    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImage(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    return false;
  }, []);

  const handleCrop = useCallback(async () => {
    const cropper = (cropperRef.current as any)?.cropper;
    if (!cropper) return;

    setLoading(true);
    try {
      const canvas = cropper.getCroppedCanvas({
        width: outputWidth,
        height: outputHeight,
      });

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result: Blob | null) => {
            if (result) resolve(result);
            else reject(new Error('Failed to create cropped image'));
          },
          'image/jpeg',
          0.9,
        );
      });
      await onUpload(blob);
      setImage(null);
      setFileName('');
      onCancel();
    } catch (error) {
      console.error('Crop failed:', error);
      message.error('裁剪失败，请重试');
    } finally {
      setLoading(false);
    }
  }, [onCancel, onUpload, outputWidth, outputHeight]);

  const handleCancel = useCallback(() => {
    setImage(null);
    setFileName('');
    onCancel();
  }, [onCancel]);

  return (
    <Modal
      title="裁剪头像"
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          取消
        </Button>,
        <Button
          key="crop"
          type="primary"
          loading={loading}
          onClick={handleCrop}
          disabled={!image}
        >
          确认上传
        </Button>,
      ]}
      width={600}
    >
      <div style={{ textAlign: 'center' }}>
        {!image ? (
          <Upload
            beforeUpload={handleBeforeUpload}
            showUploadList={false}
            accept="image/*"
          >
            <Button icon={<UploadOutlined />}>选择图片</Button>
          </Upload>
        ) : (
          <div>
            <Cropper
              ref={cropperRef}
              src={image}
              style={{ height: 400, width: '100%' }}
              aspectRatio={aspectRatio}
              guides={true}
              cropBoxMovable={true}
              cropBoxResizable={true}
              dragMode="move"
              autoCropArea={0.8}
              restore={false}
              highlight={true}
              center={true}
              responsive={true}
              preview=".avatar-preview"
            />
            <div style={{ marginTop: 16 }}>
              <Button
                onClick={() => {
                  setImage(null);
                  setFileName('');
                }}
              >
                重新选择
              </Button>
              <span style={{ marginLeft: 16, color: '#999' }}>{fileName}</span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AvatarCropper;
