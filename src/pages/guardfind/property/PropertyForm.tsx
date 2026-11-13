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
import { useState } from 'react';
import type {
  PropertyInput,
  PropertyVo,
} from '@/services/web/guardfind/property';
import {
  saveProperty,
  uploadPropertyImage,
} from '@/services/web/guardfind/property';
import { getPriceUnit, RENTAL_MODE_LABELS } from './propertyPricing';

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
  const rentalMode = Form.useWatch('rentalMode', form);
  const dailyRent = getPriceUnit(priceType, rentalMode) === 'day';
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
      const { imageFiles: files, ownerId, ...rest } = values;
      await saveProperty(record?.id, {
        ...rest,
        ownerId: record ? undefined : ownerId?.trim() || undefined,
        images: files.map((file) => file.url || file.response?.url || ''),
        availableFrom: values.availableFrom || null,
        rentalMode:
          values.priceType === 'rent' ? values.rentalMode || null : null,
        priceUnit: getPriceUnit(values.priceType, values.rentalMode),
        facilities: values.facilities || [],
      });
      message.success('房源已保存');
      onSaved();
      onClose();
    } catch {
      message.error('房源保存失败，请重试');
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
        onValuesChange={(changed, values) => {
          if ('priceType' in changed || 'rentalMode' in changed) {
            form.setFieldsValue({
              rentalMode:
                values.priceType === 'rent' ? values.rentalMode : null,
              priceUnit: getPriceUnit(values.priceType, values.rentalMode),
            });
          }
        }}
        initialValues={
          record
            ? {
                ...record,
                rentalMode:
                  record.priceType === 'rent' ? record.rentalMode : null,
                priceUnit: getPriceUnit(record.priceType, record.rentalMode),
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
                priceUnit: 'month',
                rentalMode: null,
                status: 1,
                facilities: [],
                imageFiles: [],
              }
        }
      >
        <Form.Item name="priceUnit" hidden>
          <Input />
        </Form.Item>
        {!record && (
          <Form.Item
            name="ownerId"
            label="房东的小程序用户 ID"
            extra="选填，可在小程序「我的」查看；留空由后台管理，填写后房源和预约将归属该用户。"
            rules={[{ pattern: /^[1-9]\d*$/, message: '请输入有效用户 ID' }]}
          >
            <Input allowClear placeholder="选填，请输入房东的小程序用户 ID" />
          </Form.Item>
        )}
        <Form.Item
          name="title"
          label="房源标题"
          rules={[{ required: true, whitespace: true }]}
        >
          <Input
            maxLength={100}
            placeholder="请输入房源标题，如：泊之湾公寓·精装一室户"
          />
        </Form.Item>
        <Row gutter={20}>
          <Col xs={24} sm={8}>
            <Form.Item
              name="propertyType"
              label="房源类型"
              rules={[{ required: true }]}
            >
              <Select
                placeholder="请选择房源类型"
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
                placeholder="请选择出租或出售"
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
                placeholder="请选择房源状态"
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
              label={
                priceType === 'rent'
                  ? dailyRent
                    ? '日租（元）'
                    : '月租（元）'
                  : '总价（元）'
              }
              rules={[{ required: true }]}
            >
              <InputNumber
                placeholder={
                  priceType === 'rent'
                    ? dailyRent
                      ? '请输入每日租金'
                      : '请输入每月租金'
                    : '请输入出售总价'
                }
                addonAfter={
                  priceType === 'rent' ? (dailyRent ? '元/天' : '元/月') : '元'
                }
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
                placeholder="请输入房屋面积，如：45"
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
                  placeholder="请选择租赁方式（选填）"
                  allowClear
                  options={Object.entries(RENTAL_MODE_LABELS).map(
                    ([value, label]) => ({ value, label }),
                  )}
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
                  placeholder={
                    [
                      '请输入户型，如：2室1厅1卫',
                      '请输入楼层，如：5层/共18层',
                      '请输入朝向，如：朝南、南北通透',
                      '请输入装修情况，如：精装修',
                      '请输入城市，如：上海市',
                      '请输入区域，如：浦东新区',
                      '请输入小区或公寓名称',
                      '请输入联系人姓名',
                      '请输入联系电话',
                    ][i]
                  }
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
          <Input
            maxLength={200}
            placeholder="请输入详细地址，包括街道、门牌号及房间号"
          />
        </Form.Item>
        <Form.Item name="facilities" label="设施">
          <Select
            placeholder="请选择或输入设施，多个设施可用逗号分隔"
            mode="tags"
            tokenSeparators={['，', ',']}
            options={['空调', '冰箱', '洗衣机', '热水器', '宽带', '电梯'].map(
              (value) => ({ value, label: value }),
            )}
          />
        </Form.Item>
        <Form.Item name="description" label="房源描述">
          <Input.TextArea
            rows={3}
            maxLength={2000}
            showCount
            placeholder="请介绍房源亮点、周边交通、配套设施及入住要求等"
          />
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
