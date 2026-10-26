import {
  ProForm,
  ProFormDigit,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Modal, message } from 'antd';
import React, { useEffect, useState } from 'react';
import IconSelect from '@/components/Icon/IconSelect';
import type { SysMenuVo } from '@/services/web/system';
import { menu } from '@/services/web/system';

interface MenuFormProps {
  visible: boolean;
  menu: SysMenuVo | null;
  parentMenu: SysMenuVo | null;
  onCancel: () => void;
  onSuccess: () => void | Promise<void>;
}

/** 后端 MenuTypeEnum：1 目录 / 2 菜单 / 3 按钮 */
const TYPE_DIR = 1;
const TYPE_MENU = 2;
const TYPE_BUTTON = 3;

const MenuForm: React.FC<MenuFormProps> = ({
  visible,
  menu: menuData,
  parentMenu,
  onCancel,
  onSuccess,
}) => {
  const [form] = ProForm.useForm();
  const intl = useIntl();
  const [menuType, setMenuType] = useState<number>(TYPE_DIR);

  useEffect(() => {
    if (!visible) return;
    if (menuData) {
      form.setFieldsValue(menuData);
      setMenuType(menuData.type);
    } else {
      form.resetFields();
      // 根节点默认建目录；挂在目录下建菜单；挂在菜单下建按钮
      const defaultType = parentMenu
        ? parentMenu.type === TYPE_DIR
          ? TYPE_MENU
          : TYPE_BUTTON
        : TYPE_DIR;
      form.setFieldsValue({
        type: defaultType,
        parentId: parentMenu?.id,
        sort: 0,
        status: 1,
        isExternal: false,
        isCache: false,
        isHidden: false,
      });
      setMenuType(defaultType);
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
      await onSuccess();
    } catch (error) {
      console.error('Submit failed:', error);
    }
  };

  const handleTypeChange = (value: number) => setMenuType(value);

  const loadTreeData = async () => {
    const response = await menu.query({});
    const convertToTreeData = (items: SysMenuVo[]): any[] =>
      items
        // 按钮不能作为上级
        .filter((item) => item.type !== TYPE_BUTTON)
        .map((item) => ({
          title: item.title,
          value: item.id,
          children: item.children ? convertToTreeData(item.children) : [],
        }));
    return convertToTreeData(response.data || []);
  };

  const notEmptyRule = (labelId: string) => [
    {
      required: true,
      message:
        intl.formatMessage({ id: 'common.form.placeholder.input' }) +
        intl.formatMessage({ id: labelId }),
    },
  ];

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
      <ProForm form={form} onFinish={handleSubmit}>
        <ProFormTreeSelect
          name="parentId"
          label={intl.formatMessage({ id: 'system.menu.parent' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.select' }) +
            intl.formatMessage({ id: 'system.menu.parent' })
          }
          allowClear
          request={loadTreeData}
          fieldProps={{ treeDefaultExpandAll: true }}
        />
        <ProFormSelect
          name="type"
          label={intl.formatMessage({ id: 'system.menu.type' })}
          options={[
            {
              label: intl.formatMessage({ id: 'system.menu.type.directory' }),
              value: TYPE_DIR,
            },
            {
              label: intl.formatMessage({ id: 'system.menu.type.menu' }),
              value: TYPE_MENU,
            },
            {
              label: intl.formatMessage({ id: 'system.menu.type.button' }),
              value: TYPE_BUTTON,
            },
          ]}
          rules={notEmptyRule('system.menu.type')}
          fieldProps={{ onChange: handleTypeChange }}
        />
        <ProFormText
          name="title"
          label={intl.formatMessage({ id: 'system.menu.name' })}
          placeholder={
            intl.formatMessage({ id: 'common.form.placeholder.input' }) +
            intl.formatMessage({ id: 'system.menu.name' })
          }
          rules={notEmptyRule('system.menu.name')}
        />
        {menuType !== TYPE_BUTTON && (
          <ProForm.Item
            name="icon"
            label={intl.formatMessage({ id: 'system.menu.icon' })}
          >
            <IconSelect
              value={form.getFieldValue('icon')}
              onChange={(value) => form.setFieldValue('icon', value)}
            />
          </ProForm.Item>
        )}
        {menuType !== TYPE_BUTTON && (
          <ProFormText
            name="path"
            label={intl.formatMessage({ id: 'system.menu.path' })}
            placeholder={
              intl.formatMessage({ id: 'common.form.placeholder.input' }) +
              intl.formatMessage({ id: 'system.menu.path' })
            }
            rules={notEmptyRule('system.menu.path')}
          />
        )}
        {menuType === TYPE_MENU && (
          <>
            <ProFormText
              name="name"
              label={intl.formatMessage({ id: 'system.menu.component.name' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.component.name' })
              }
            />
            <ProFormText
              name="component"
              label={intl.formatMessage({ id: 'system.menu.component.path' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.component.path' })
              }
              extra="相对 src/pages 的约定式路由文件路径，如 system/user/index"
            />
            <ProFormText
              name="redirect"
              label={intl.formatMessage({ id: 'system.menu.redirect' })}
              placeholder={
                intl.formatMessage({ id: 'common.form.placeholder.input' }) +
                intl.formatMessage({ id: 'system.menu.redirect' })
              }
            />
            <ProFormSwitch
              name="isExternal"
              label={intl.formatMessage({ id: 'system.menu.external' })}
              fieldProps={{
                checkedChildren: intl.formatMessage({
                  id: 'common.operation.yes',
                }),
                unCheckedChildren: intl.formatMessage({
                  id: 'common.operation.no',
                }),
              }}
            />
            <ProFormSwitch
              name="isCache"
              label={intl.formatMessage({ id: 'system.menu.keepalive' })}
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
        {menuType === TYPE_BUTTON && (
          <ProFormText
            name="permission"
            label={intl.formatMessage({ id: 'system.menu.permission' })}
            placeholder={
              intl.formatMessage({ id: 'common.form.placeholder.input' }) +
              intl.formatMessage({ id: 'system.menu.permission' })
            }
            rules={notEmptyRule('system.menu.permission')}
          />
        )}
        <ProFormSwitch
          name="isHidden"
          label={intl.formatMessage({ id: 'system.menu.hidden' })}
          fieldProps={{
            checkedChildren: intl.formatMessage({ id: 'common.operation.yes' }),
            unCheckedChildren: intl.formatMessage({
              id: 'common.operation.no',
            }),
          }}
        />
        <ProFormSelect
          name="status"
          label={intl.formatMessage({ id: 'common.field.status' })}
          options={[
            {
              label: intl.formatMessage({ id: 'common.status.normal' }),
              value: 1,
            },
            {
              label: intl.formatMessage({ id: 'common.status.frozen' }),
              value: 2,
            },
          ]}
          rules={notEmptyRule('common.field.status')}
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
          rules={notEmptyRule('common.field.sort')}
        />
      </ProForm>
    </Modal>
  );
};

export default MenuForm;
