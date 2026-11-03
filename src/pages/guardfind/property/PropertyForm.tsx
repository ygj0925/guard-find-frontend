import {
  Button,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  message,
  Row,
  Select,
  Upload,
} from 'antd';
import React, { useState } from 'react';
import {
  type PropertyInput,
  type PropertyVo,
  saveProperty,
  uploadPropertyImage,
} from '@/services/web/guardfind/property';

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
  const [form] = Form.useForm<
    PropertyInput & { ownerId?: string; imageUrls?: string }
  >();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const priceType = Form.useWatch('priceType', form);
  const upload = async (file: File) => {
    if (uploading || saving) return;
    const urls = String(form.getFieldValue('imageUrls') || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (urls.length >= 9 || file.size > 5 * 1024 * 1024) {
      message.warning('最多9张图片，每张不超过5MB');
      return;
    }
    setUploading(true);
    try {
      const response = await uploadPropertyImage(file);
      if (response.data?.url)
        form.setFieldValue(
          'imageUrls',
          [...urls, response.data.url].join('\n'),
        );
    } catch {
      message.error('图片上传失败，请重试');
    } finally {
      setUploading(false);
    }
  };
  const submit = async () => {
    if (uploading) return;
    let values: PropertyInput & { ownerId?: string; imageUrls?: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSaving(true);
    try {
      const { imageUrls, ...rest } = values;
      await saveProperty(record?.id, {
        ...rest,
        images: (imageUrls || '')
          .split(/\r?\n/)
          .map((s) => s.trim())
          .filter(Boolean),
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
            ? { ...record, imageUrls: record.images.join('\n') }
            : {
                propertyType: 'house',
                priceType: 'rent',
                status: 1,
                facilities: [],
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
            <Form.Item name="availableFrom" label="可入住日期">
              <Input type="date" />
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
        <Upload
          accept="image/jpeg,image/png"
          showUploadList={false}
          disabled={uploading || saving}
          beforeUpload={(file) => {
            void upload(file);
            return false;
          }}
        >
          <Button loading={uploading}>上传房源图片</Button>
        </Upload>
        <Form.Item
          name="imageUrls"
          label="图片链接"
          extra="每行一个 HTTP(S) 图片地址，最多 9 张；清空后移除全部图片。"
          rules={[
            {
              validator: async (_, value: string) => {
                const urls = (value || '')
                  .split(/\r?\n/)
                  .map((s) => s.trim())
                  .filter(Boolean);
                if (
                  urls.length > 9 ||
                  urls.some(
                    (s) => !/^https?:\/\/[^\s]+$/.test(s) || s.length > 1000,
                  )
                )
                  throw new Error('最多 9 个有效 HTTP(S) 图片地址');
              },
            },
          ]}
        >
          <Input.TextArea disabled={uploading} rows={3} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
