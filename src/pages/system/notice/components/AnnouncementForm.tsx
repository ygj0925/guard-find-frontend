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
import type { AnnouncementDetailVo } from '@/services/web/notify/typings';

interface AnnouncementFormProps {
  visible: boolean;
  announcement: AnnouncementDetailVo | null;
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
        initialValues={{
          noticeScope: 1,
          noticeMethods: [1],
          isTiming: false,
          isTop: false,
          status: 1,
        }}
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
        <ProFormText
          name="type"
          label={intl.formatMessage({ id: 'notify.announcement.category' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'notify.announcement.category' })
          }
          extra="公告分类，取值来自字典 notice_type"
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'common.form.required' }),
            },
          ]}
        />
        <ProFormSelect
          name="noticeScope"
          label={intl.formatMessage({ id: 'notify.announcement.scope' })}
          options={[
            {
              label: intl.formatMessage({
                id: 'notify.announcement.scope.all',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.scope.user',
              }),
              value: 2,
            },
          ]}
          rules={[
            {
              required: true,
              message: intl.formatMessage({ id: 'common.form.required' }),
            },
          ]}
        />
        <ProFormCheckbox.Group
          name="noticeMethods"
          label={intl.formatMessage({ id: 'notify.announcement.methods' })}
          options={[
            {
              label: intl.formatMessage({
                id: 'notify.announcement.method.site',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.method.popup',
              }),
              value: 2,
            },
          ]}
        />
        <ProFormSwitch
          name="isTiming"
          label={intl.formatMessage({ id: 'notify.announcement.is.timing' })}
          fieldProps={{
            checkedChildren: intl.formatMessage({ id: 'common.operation.yes' }),
            unCheckedChildren: intl.formatMessage({
              id: 'common.operation.no',
            }),
          }}
        />
        <ProFormDateTimePicker
          name="publishTime"
          label={intl.formatMessage({ id: 'notify.announcement.publish.time' })}
          extra="仅在开启定时发布时必填（后端 SpelNotNull 校验）"
        />
        <ProFormSwitch
          name="isTop"
          label={intl.formatMessage({ id: 'notify.announcement.is.top' })}
          fieldProps={{
            checkedChildren: intl.formatMessage({ id: 'common.operation.yes' }),
            unCheckedChildren: intl.formatMessage({
              id: 'common.operation.no',
            }),
          }}
        />
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'notify.announcement.status' })}
          options={[
            {
              label: intl.formatMessage({
                id: 'notify.announcement.status.draft',
              }),
              value: 1,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.status.pending',
              }),
              value: 2,
            },
            {
              label: intl.formatMessage({
                id: 'notify.announcement.status.published',
              }),
              value: 3,
            },
          ]}
        />
      </ProForm>
    </Modal>
  );
};

export default AnnouncementForm;
