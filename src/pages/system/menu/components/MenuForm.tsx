import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTextArea,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect, useState } from 'react';
import type { SysMenuVo } from '@/services/web/system';
import { menu } from '@/services/web/system';

interface MenuFormProps {
  visible: boolean;
  menu: SysMenuVo | null;
  parentMenu: SysMenuVo | null;
  onCancel: () => void;
  onSuccess: () => void;
}

const MenuForm: React.FC<MenuFormProps> = ({
  visible,
  menu: menuData,
  parentMenu,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();
  const [menuType, setMenuType] = useState<number>(0);

  useEffect(() => {
    if (visible) {
      if (menuData) {
        form.setFieldsValue(menuData);
        setMenuType(menuData.type);
      } else {
        form.resetFields();
        const defaultType = parentMenu ? (parentMenu.type === 0 ? 1 : 2) : 0;
        form.setFieldsValue({ type: defaultType, parentId: parentMenu?.id });
        setMenuType(defaultType);
      }
    }
  }, [visible, menuData, parentMenu, form]);

  const handleSubmit = async (values: any) => {
    try {
      if (menuData) {
        await menu.edit({ ...values, id: menuData.id });
      } else {
        await menu.create(values);
      }
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleTypeChange = (value: number) => {
    setMenuType(value);
    form.setFieldsValue({ targetType: value === 2 ? undefined : 1 });
  };

  const loadTreeData = async () => {
    const response = await menu.query({});
    const convertToTreeData = (items: SysMenuVo[]): any[] => {
      return items
        .filter((item) => item.type !== 2)
        .map((item) => ({
          title: item.title,
          value: item.id,
          children: item.children ? convertToTreeData(item.children) : [],
        }));
    };
    return convertToTreeData(response.data || []);
  };

  return (
    <Modal
      title={
        menuData
          ? intl.formatMessage({ id: 'common.operation.edit' }) +
            intl.formatMessage({ id: 'system.menu.title' })
          : intl.formatMessage({ id: 'common.operation.add' }) +
            intl.formatMessage({ id: 'system.menu.title' })
      }
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={600}
      destroyOnClose
    >
      <ProForm
        form={form}
        onFinish={handleSubmit}
        initialValues={{
          type: 0,
          sort: 0,
          keepAlive: 0,
          hidden: 0,
          targetType: 1,
        }}
      >
        <ProFormTreeSelect
          name="parentId"
          label={intl.formatMessage({ id: 'system.menu.parent' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.menu.parent' })
          }
          allowClear
          request={loadTreeData}
          fieldProps={{
            treeDefaultExpandAll: true,
          }}
        />
        <ProFormSelect
          name="type"
          label={intl.formatMessage({ id: 'system.menu.type' })}
          options={[
            {
              label: intl.formatMessage({ id: 'system.menu.type.directory' }),
              value: 0,
            },
            {
              label: intl.formatMessage({ id: 'system.menu.type.menu' }),
              value: 1,
            },
            {
              label: intl.formatMessage({ id: 'system.menu.type.button' }),
              value: 2,
            },
          ]}
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.select' }) +
                intl.formatMessage({ id: 'system.menu.type' }),
            },
          ]}
          fieldProps={{ onChange: handleTypeChange }}
        />
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'system.menu.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.menu.name' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.name' }),
            },
          ]}
        />
        <ProFormText
          name="id"
          label={intl.formatMessage({ id: 'system.menu.id' })}
          placeholder={
            menuType === 0
              ? intl.formatMessage({ id: 'system.menu.id.directory' })
              : menuType === 1
                ? intl.formatMessage({ id: 'system.menu.id.menu' })
                : intl.formatMessage({ id: 'system.menu.id.button' })
          }
          rules={[
            {
              required: true,
              message:
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.id' }),
            },
          ]}
          disabled={!!menuData}
        />
        {menuType !== 2 && (
          <>
            <ProFormText
              name="icon"
              label={intl.formatMessage({ id: 'system.menu.icon' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.icon' })
              }
            />
            <ProFormText
              name="path"
              label={intl.formatMessage({ id: 'system.menu.path' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.path' })
              }
              rules={[
                {
                  required: true,
                  message:
                    intl.formatMessage({
                      id: 'common.form.placeholder.input',
                    }) + intl.formatMessage({ id: 'system.menu.path' }),
                },
              ]}
            />
          </>
        )}
        {menuType === 1 && (
          <>
            <ProFormSelect
              name="targetType"
              label={intl.formatMessage({ id: 'system.menu.target.type' })}
              options={[
                {
                  label: intl.formatMessage({
                    id: 'system.menu.target.component',
                  }),
                  value: 1,
                },
                {
                  label: intl.formatMessage({
                    id: 'system.menu.target.iframe',
                  }),
                  value: 2,
                },
                {
                  label: intl.formatMessage({ id: 'system.menu.target.link' }),
                  value: 3,
                },
              ]}
              rules={[
                {
                  required: true,
                  message:
                    intl.formatMessage({
                      id: 'common.form.placeholder.select',
                    }) + intl.formatMessage({ id: 'system.menu.target.type' }),
                },
              ]}
            />
            <ProFormText
              name="uri"
              label={intl.formatMessage({ id: 'system.menu.uri' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.uri' })
              }
              rules={[
                {
                  required: true,
                  message:
                    intl.formatMessage({
                      id: 'common.form.placeholder.input',
                    }) + intl.formatMessage({ id: 'system.menu.uri' }),
                },
              ]}
            />
            <ProFormSwitch
              name="keepAlive"
              label={intl.formatMessage({ id: 'system.menu.keepalive' })}
              initialValue={false}
              fieldProps={{
                checkedChildren: intl.formatMessage({
                  id: 'common.operation.yes',
                }),
                unCheckedChildren: intl.formatMessage({
                  id: 'common.operation.no',
                }),
              }}
            />
          </>
        )}
        {menuType === 2 && (
          <ProFormText
            name="permission"
            label={intl.formatMessage({ id: 'system.menu.permission' })}
            placeholder={
              intl.formatMessage({ id: 'common.form.placeholder.input' }) +
              intl.formatMessage({ id: 'system.menu.permission' })
            }
            rules={[
              {
                required: true,
                message:
                  intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                  intl.formatMessage({ id: 'system.menu.permission' }),
              },
            ]}
          />
        )}
        <ProFormSwitch
          name="hidden"
          label={intl.formatMessage({ id: 'system.menu.hidden' })}
          initialValue={false}
          fieldProps={{
            checkedChildren: intl.formatMessage({ id: 'common.operation.yes' }),
            unCheckedChildren: intl.formatMessage({
              id: 'common.operation.no',
            }),
          }}
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

export default MenuForm;
