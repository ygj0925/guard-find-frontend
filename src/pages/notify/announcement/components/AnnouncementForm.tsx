import {
  ProForm,
  ProFormCheckbox,
  ProFormDateTimePicker,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect, useState } from 'react';
import Editor from '@/components/Editor';
import { announcement as announcementApi } from '@/services/web/notify';
import type { AnnouncementVo } from '@/services/web/notify/typings';

interface AnnouncementFormProps {
  visible: boolean;
  announcement: AnnouncementVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const AnnouncementForm: React.FC<AnnouncementFormProps> = ({
  visible,
  announcement,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();
  const [content, setContent] = useState('');

  useEffect(() => {
    if (visible) {
      if (announcement) {
        form.setFieldsValue(announcement);
        setContent(announcement.content || '');
      } else {
        form.resetFields();
        setContent('');
      }
    }
  }, [visible, announcement, form]);

  const handleSubmit = async (values: any) => {
    try {
      const data = { ...values, content };
      if (announcement) {
        await announcementApi.edit({ ...data, id: announcement.id });
      } else {
        await announcementApi.create(data);
      }
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  return (
    <Modal
      title={
        announcement
          ? intl.formatMessage({ id: 'common.operation.edit' })
          : intl.formatMessage({ id: 'common.operation.add' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{ permanent: 0, receiverType: 0, notifyType: [1] }}
      >
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'notify.announcement.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'notify.announcement.name' })
          }
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'common.form.required' }),
            },
          ]}
        />
        <div style={{ marginBottom: 16 }}>
          <div style={{ marginBottom: 8 }}>
            {intl.formatMessage({ id: 'notify.announcement.content' })}
          </div>
          <Editor value={content} onChange={setContent} height={200} />
        </div>
        <ProFormSelect
          name="receiverType"
          label={intl.formatMessage({
            id: 'notify.announcement.receiver.type',
          })}
          options={[
            {
              label: intl.formatMessage({
                id: 'notify.announcement.receiver.all',
              }),
              value: 0,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.receiver.role',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.receiver.organization',
              }),
              value: 2,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.receiver.user',
              }),
              value: 3,
            },
          ]}
        />
        <ProFormCheckbox.Group
          name="notifyType"
          label={intl.formatMessage({ id: 'notify.announcement.notify.type' })}
          options={[
            {
              label: intl.formatMessage({
                id: 'notify.announcement.notify.site',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.notify.email',
              }),
              value: 2,
            },
          ]}
        />
        <ProFormSwitch
          name="permanent"
          label={intl.formatMessage({ id: 'notify.announcement.permanent' })}
          fieldProps={{
            checkedChildren: intl.formatMessage({ id: 'common.operation.yes' }),
            unCheckedChildren: intl.formatMessage({
              id: 'common.operation.no',
            }),
          }}
        />
        <ProFormDateTimePicker
          name="expireTime"
          label={intl.formatMessage({ id: 'notify.announcement.expire.time' })}
        />
      </ProForm>
    </Modal>
  );
};

export default AnnouncementForm;
