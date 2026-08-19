import {
  ProForm,
  ProFormDigit,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect } from 'react';
import type { SysOrganizationVo } from '@/services/web/system';
import { organization } from '@/services/web/system';

interface OrgFormProps {
  visible: boolean;
  org: SysOrganizationVo | null;
  parentOrg: SysOrganizationVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const OrgForm: React.FC<OrgFormProps> = ({
  visible,
  org,
  parentOrg,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();

  useEffect(() => {
    if (visible) {
      if (org) {
        form.setFieldsValue(org);
      } else {
        form.resetFields();
        if (parentOrg) {
          form.setFieldsValue({ parentId: parentOrg.id });
        }
      }
    }
  }, [visible, org, parentOrg, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (org) {
        await organization.edit({ ...values, id: org.id });
      } else {
        await organization.create(values);
      }
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const loadTreeData = async () => {
    const response = await organization.query();
    return response.data || [];
  };

  return (
    <Modal
      title={
        org
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.organization.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.organization.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      destroyOnClose
    >
      <ProForm form={form} onFinish={handleSubmit} initialValues={{ sort: 0 }}>
        <ProFormTreeSelect
          name="parentId"
          label={intl.formatMessage({ id: 'system.organization.parent' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.organization.parent' })
          }
          allowClear
          request={async () => {
            const data = await loadTreeData();
            const convertToTreeData = (items: SysOrganizationVo[]): any[] => {
              return items.map((item) => ({
                title: item.name,
                value: item.id,
                children: item.children ? convertToTreeData(item.children) : [],
              }));
            };
            return convertToTreeData(data);
          }}
          fieldProps={{
            treeDefaultExpandAll: true,
          }}
        />
        <ProFormText
          name="name"
          label={intl.formatMessage({ id: 'system.organization.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.organization.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.organization.name' }),
            },
          ]}
        />
        <ProFormDigit
          name="sort"
          label={intl.formatMessage({ id: 'common.field.sort' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'common.field.sort' })
          }
          min={0}
          fieldProps={{ precision: 0 }}
        />
        <ProFormTextArea
          name="remarks"
          label={intl.formatMessage({ id: 'common.field.remark' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'common.field.remark' })
          }
        />
      </ProForm>
    </Modal>
  );
};

export default OrgForm;
