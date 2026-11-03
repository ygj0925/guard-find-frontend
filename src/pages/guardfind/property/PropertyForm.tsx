import { PlusOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import {
  Button,
  Col,
  DatePicker,
  Form,
  Image,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Select,
  Upload,
} from 'antd';
import dayjs from 'dayjs';
import React, { useState } from 'react';
import type {
  PropertyInput,
  PropertyVo,
} from '@/services/web/guardfind/property';
import {
  saveProperty,
  uploadPropertyImage,
} from '@/services/web/guardfind/property';

type ImageFile = UploadFile<{ url: string }>;
type PropertyFormValues = Omit<PropertyInput, 'images'> & {
  ownerId?: string;
  imageFiles: ImageFile[];
};

export default function PropertyForm({
  open,
  record,
  onClose,
  onSaved,
}: {
  open: boolean;
  record?: PropertyVo;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form] = Form.useForm<PropertyFormValues>();
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState({ open: false, url: '' });
  const imageFiles: ImageFile[] = Form.useWatch('imageFiles', form) || [];
  const uploading = imageFiles.some((file) => file.status === 'uploading');
  const priceType = Form.useWatch('priceType', form);
  const beforeUpload: UploadProps['beforeUpload'] = (file) => {
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      message.warning('请上传 JPG 或 PNG 格式的图片');
      return Upload.LIST_IGNORE;
    }
    if (imageFiles.length >= 9 || file.size > 5 * 1024 * 1024) {
      message.warning('最多9张图片，每张不超过5MB');
      return Upload.LIST_IGNORE;
    }
    return true;
  };
  const upload: UploadProps['customRequest'] = async ({
    file,
    onSuccess,
    onError,
  }) => {
    try {
      const response = await uploadPropertyImage(file as File);
      if (!response.data?.url) throw new Error('图片上传未返回地址');
      onSuccess?.(response.data);
    } catch (error) {
      onError?.(error instanceof Error ? error : new Error('图片上传失败'));
      message.error('图片上传失败，请重试');
    }
  };
  const submit = async () => {
    if (uploading || saving) return;
    let values: PropertyFormValues;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { imageFiles: files, ...rest } = values;
      await saveProperty(record?.id, {
        ...rest,
        images: files.map((file) => file.url || file.response?.url || ''),
        availableFrom: values.availableFrom || null,
        rentalMode: values.priceType === 'rent' ? values.rentalMode : null,
        facilities: values.facilities || [],
      });
      message.success('房源已保存');
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };
  return (
    <Modal
      title={record ? '编辑房源' : '新增房源'}
      open={open}
      width={800}
      onCancel={onClose}
      footer={
        <>
          <Button onClick={onClose}>取消</Button>
          <Button
            type="primary"
            loading={saving}
            disabled={uploading}
            onClick={() => void submit()}
          >
            保存
          </Button>
        </>
      }
      destroyOnClose
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={
          record
            ? {
                ...record,
                imageFiles: record.images.map(
                  (url, index): ImageFile => ({
                    uid: `saved-${index}`,
                    name: `房源图片 ${index + 1}`,
                    status: 'done',
                    url,
                  }),
                ),
              }
            : {
                propertyType: 'house',
                priceType: 'rent',
                status: 1,
                facilities: [],
                imageFiles: [],
              }
        }
      >
        {!record && (
          <Form.Item
            name="ownerId"
            label="房东的小程序用户 ID"
            extra="可在小程序「我的」查看；房源和预约将归属此用户。"
            rules={[
              { required: true },
              { pattern: /^[1-9]\d*$/, message: '请输入有效用户 ID' },
            ]}
          >
            <Input />
          </Form.Item>
        )}
        <Form.Item
          name="title"
          label="房源标题"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input maxLength={100} />
        </Form.Item>
        <Row gutter={20}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="propertyType"
              label="房源类型"
              rules={[{ required: true }]}
            >
              <Select
                options={Object.entries({
                  house: '住宅',
                  apartment: '公寓',
                  villa: '别墅',
                  shop: '商铺',
                }).map(([value, label]) => ({ value, label }))}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="priceType"
              label="租售"
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: 'rent', label: '出租' },
                  { value: 'sale', label: '出售' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 1, label: '草稿' },
                  { value: 2, label: '已上架' },
                  { value: 3, label: '已下架' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              name="price"
              label={priceType === 'rent' ? '月租（元）' : '总价（元）'}
              rules={[{ required: true }]}
            >
              <InputNumber
                min={1}
                max={9999999999.99}
                precision={2}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item name="areaSqm" label="面积（㎡）">
              <InputNumber
                min={1}
                max={999999.99}
                precision={2}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          {priceType === 'rent' && (
            <Col xs={24} sm={8}>
              <Form.Item name="rentalMode" label="租赁方式">
                <Select
                  allowClear
                  options={[
                    { value: 'whole', label: '整租' },
                    { value: 'shared', label: '合租' },
                  ]}
                />
              </Form.Item>
            </Col>
          )}
          {(
            [
              'layout',
              'floorInfo',
              'orientation',
              'decoration',
              'city',
              'district',
              'community',
              'contactName',
              'contactPhone',
            ] as const
          ).map((name, i) => (
            <Col xs={24} sm={8} key={name}>
              <Form.Item
                name={name}
                label={
                  [
                    '户型',
                    '楼层',
                    '朝向',
                    '装修',
                    '城市',
                    '区域',
                    '小区',
                    '联系人',
                    '联系电话',
                  ][i]
                }
              >
                <Input
                  maxLength={
                    name === 'community'
                      ? 100
                      : name === 'contactPhone'
                        ? 20
                        : name === 'layout'
                          ? 30
                          : ['floorInfo', 'orientation', 'decoration'].includes(
                                name,
                              )
                            ? 20
                            : 50
                  }
                />
              </Form.Item>
            </Col>
          ))}
          <Col xs={24} sm={8}>
            <Form.Item
              name="availableFrom"
              label="可入住日期"
              getValueProps={(value: string | null) => ({
                value: value ? dayjs(value) : null,
              })}
              normalize={(value: dayjs.Dayjs | null) =>
                value?.format('YYYY-MM-DD') || null
              }
            >
              <DatePicker
                format="YYYY-MM-DD"
                placeholder="请选择可入住日期"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item
          name="address"
          label="详细地址"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input maxLength={200} />
        </Form.Item>
        <Form.Item name="facilities" label="设施">
          <Select
            mode="tags"
            tokenSeparators={['，', ',']}
            options={['空调', '冰箱', '洗衣机', '热水器', '宽带', '电梯'].map(
              (value) => ({ value, label: value }),
            )}
          />
        </Form.Item>
        <Form.Item name="description" label="房源描述">
          <Input.TextArea rows={3} maxLength={2000} showCount />
        </Form.Item>
        <Form.Item
          name="imageFiles"
          label="房源图片"
          extra="支持 JPG、PNG，最多 9 张，每张不超过 5MB；点击缩略图可预览，首张图片用作封面。"
          valuePropName="fileList"
          getValueFromEvent={({ fileList }: { fileList: ImageFile[] }) =>
            fileList.map((file) => ({
              ...file,
              url: file.url || file.response?.url,
            }))
          }
          rules={[
            {
              validator: async (_, files: ImageFile[] = []) => {
                if (files.some((file) => file.status === 'uploading'))
                  throw new Error('请等待图片上传完成');
                if (files.some((file) => file.status === 'error'))
                  throw new Error('请移除上传失败的图片并重新上传');
                if (
                  files.length > 9 ||
                  files.some(
                    (file) =>
                      !file.url ||
                      !/^https?:\/\/[^\s]+$/.test(file.url) ||
                      file.url.length > 1000,
                  )
                )
                  throw new Error('图片无效，请移除后重新上传');
              },
            },
          ]}
        >
          <Upload<{ url: string }>
            accept="image/jpeg,image/png"
            listType="picture-card"
            maxCount={9}
            disabled={saving}
            beforeUpload={beforeUpload}
            customRequest={upload}
            showUploadList={{ showRemoveIcon: !saving }}
            onPreview={(file) => {
              const url = file.url || file.thumbUrl;
              if (url) setPreview({ open: true, url });
            }}
          >
            {imageFiles.length < 9 && (
              <button
                type="button"
                disabled={uploading || saving}
                style={{ border: 0, background: 'none', cursor: 'pointer' }}
              >
                <PlusOutlined />
                <div style={{ marginTop: 8 }}>上传图片</div>
              </button>
            )}
          </Upload>
        </Form.Item>
      </Form>
      {preview.url && (
        <Image
          src={preview.url}
          style={{ display: 'none' }}
          preview={{
            visible: preview.open,
            onVisibleChange: (visible) =>
              setPreview((current) => ({ ...current, open: visible })),
          }}
        />
      )}
    </Modal>
  );
}
