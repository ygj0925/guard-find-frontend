import {
  ProForm,
  ProFormDigit,
  ProFormRadio,
  ProFormSelect,
  ProFormSwitch,
  ProFormText,
  ProFormTreeSelect,
} from '@ant-design/pro-components';
import { useIntl } from '@umijs/max';
import { Col, Form, Modal, message, Row } from 'antd';
import React, { useId, useState } from 'react';
import IconSelect from '@/components/Icon/IconSelect';
import type { SysMenuDto, SysMenuVo } from '@/services/web/system';
import { menu } from '@/services/web/system';
import './MenuForm.less';

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
  const [form] = ProForm.useForm<SysMenuDto>();
  const formId = useId();
  const intl = useIntl();
  const [submitting, setSubmitting] = useState(false);
  const defaultType = parentMenu
    ? parentMenu.type === TYPE_DIR
      ? TYPE_MENU
      : TYPE_BUTTON
    : TYPE_DIR;
  const [menuType, setMenuType] = useState(menuData?.type ?? defaultType);
  const label = (id: string) => intl.formatMessage({ id });
  const isButton = menuType === TYPE_BUTTON;

  const handleSubmit = async (values: SysMenuDto) => {
    setSubmitting(true);
    try {
      if (menuData) {
        await menu.edit({ ...values, id: menuData.id });
      } else {
        await menu.create(values);
      }
      message.success(label('common.operation.success'));
      await onSuccess();
      return true;
    } catch (error) {
      console.error('Submit failed:', error);
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  const loadTreeData = async () => {
    const response = await menu.query({});
    type TreeOption = { title: string; value: number; children: TreeOption[] };
    const convertToTreeData = (items: SysMenuVo[]): TreeOption[] =>
      items
        // A button, the edited node and its descendants cannot be parents.
        .filter((item) => item.type !== TYPE_BUTTON && item.id !== menuData?.id)
        .map((item) => ({
          title: item.title,
          value: item.id,
          children: convertToTreeData(item.children || []),
        }));
    return [
      {
        title: '顶级菜单',
        value: 0,
        children: convertToTreeData(response.data || []),
      },
    ];
  };

  const notEmptyRule = (labelId: string) => [
    {
      required: true,
      message: label('common.form.placeholder.input') + label(labelId),
    },
  ];
  const switchProps = {
    checkedChildren: label('common.operation.yes'),
    unCheckedChildren: label('common.operation.no'),
  };

  return (
    <Modal
      title={`${label(menuData ? 'common.operation.edit' : 'common.operation.add')}${label('system.menu.title')}`}
      open={visible}
      width={800}
      centered
      destroyOnHidden
      styles={{
        body: {
          maxHeight: 'calc(100dvh - 200px)',
          overflowY: 'auto',
          paddingRight: 4,
        },
      }}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText="保存"
      cancelText="取消"
      confirmLoading={submitting}
    >
      <ProForm<SysMenuDto>
        id={formId}
        className="menu-edit-form"
        layout="vertical"
        form={form}
        submitter={false}
        onFinish={handleSubmit}
        initialValues={{
          type: defaultType,
          parentId: parentMenu?.id ?? 0,
          sort: 1,
          status: 1,
          isExternal: false,
          isCache: false,
          isHidden: false,
          ...menuData,
        }}
      >
        <section
          className="menu-edit-section"
          aria-labelledby={`${formId}-basic`}
        >
          <h3 id={`${formId}-basic`}>基本信息</h3>
          <ProFormRadio.Group
            name="type"
            label={label('system.menu.type')}
            radioType="button"
            options={[
              { label: label('system.menu.type.directory'), value: TYPE_DIR },
              { label: label('system.menu.type.menu'), value: TYPE_MENU },
              { label: label('system.menu.type.button'), value: TYPE_BUTTON },
            ]}
            rules={notEmptyRule('system.menu.type')}
            fieldProps={{
              onChange: (event) => setMenuType(event.target.value),
            }}
          />
          <Row gutter={20}>
            <Col xs={24} sm={12}>
              <ProFormTreeSelect
                name="parentId"
                label={label('system.menu.parent')}
                placeholder="请选择上级菜单，留空为顶级"
                allowClear
                request={loadTreeData}
                fieldProps={{ treeDefaultExpandAll: true }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <ProFormText
                name="title"
                label={label('system.menu.name')}
                placeholder="请输入名称"
                fieldProps={{ maxLength: 30, showCount: true }}
                rules={notEmptyRule('system.menu.name')}
              />
            </Col>
            {!isButton && (
              <Col xs={24} sm={12}>
                <Form.Item name="icon" label={label('system.menu.icon')}>
                  <IconSelect />
                </Form.Item>
              </Col>
            )}
            <Col xs={24} sm={12}>
              <ProFormDigit
                name="sort"
                label={label('common.field.sort')}
                min={1}
                fieldProps={{ precision: 0 }}
                rules={notEmptyRule('common.field.sort')}
              />
            </Col>
          </Row>
        </section>

        <section
          className="menu-edit-section"
          aria-labelledby={`${formId}-route`}
        >
          <h3 id={`${formId}-route`}>{isButton ? '权限配置' : '路由配置'}</h3>
          {isButton ? (
            <ProFormText
              name="permission"
              label={label('system.menu.permission')}
              placeholder="如 system:user:create"
              rules={notEmptyRule('system.menu.permission')}
            />
          ) : (
            <Row gutter={20}>
              <Col xs={24} sm={12}>
                <ProFormText
                  name="path"
                  label={label('system.menu.path')}
                  placeholder="如 /system/user"
                  rules={notEmptyRule('system.menu.path')}
                />
              </Col>
              {menuType === TYPE_MENU && (
                <Col xs={24} sm={12}>
                  <ProFormText
                    name="name"
                    label={label('system.menu.component.name')}
                    placeholder="如 SystemUser"
                  />
                </Col>
              )}
              {menuType === TYPE_MENU && (
                <>
                  <Col xs={24} sm={12}>
                    <ProFormText
                      name="component"
                      label={label('system.menu.component.path')}
                      placeholder="如 system/user/index"
                      tooltip="填写对应页面的组件路径，不含文件扩展名"
                    />
                  </Col>
                  <Col xs={24} sm={12}>
                    <ProFormText
                      name="redirect"
                      label={label('system.menu.redirect')}
                      placeholder="可选，填写跳转的路由地址"
                    />
                  </Col>
                </>
              )}
            </Row>
          )}
        </section>

        <section
          className="menu-edit-section"
          aria-labelledby={`${formId}-display`}
        >
          <h3 id={`${formId}-display`}>显示设置</h3>
          <Row gutter={20}>
            <Col xs={24} sm={menuType === TYPE_MENU ? 6 : 12}>
              <ProFormSelect
                name="status"
                label={label('common.field.status')}
                options={[
                  { label: label('common.status.normal'), value: 1 },
                  { label: label('common.status.frozen'), value: 2 },
                ]}
                rules={notEmptyRule('common.field.status')}
                allowClear={false}
              />
            </Col>
            <Col
              xs={menuType === TYPE_MENU ? 8 : 24}
              sm={menuType === TYPE_MENU ? 6 : 12}
            >
              <ProFormSwitch
                name="isHidden"
                label={label('system.menu.hidden')}
                fieldProps={switchProps}
              />
            </Col>
            {menuType === TYPE_MENU && (
              <>
                <Col xs={8} sm={6}>
                  <ProFormSwitch
                    name="isExternal"
                    label={label('system.menu.external')}
                    fieldProps={switchProps}
                  />
                </Col>
                <Col xs={8} sm={6}>
                  <ProFormSwitch
                    name="isCache"
                    label={label('system.menu.keepalive')}
                    fieldProps={switchProps}
                  />
                </Col>
              </>
            )}
          </Row>
        </section>
      </ProForm>
    </Modal>
  );
};

export default MenuForm;
