import { useIntl } from '@umijs/max';
import { Button, Drawer, message, Space, Tree } from 'antd';
import React, { useCallback, useEffect, useState } from 'react';
import { menu, role } from '@/services/web/system';

interface MenuGrantProps {
  visible: boolean;
  roleCode: string;
  onCancel: () => void;
}

const MenuGrant: React.FC<MenuGrantProps> = ({
  visible,
  roleCode,
  onCancel,
}) => {
  const intl = useIntl();
  const [treeData, setTreeData] = useState<any[]>([]);
  const [checkedKeys, setCheckedKeys] = useState<number[]>([]);
  const [_loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadMenuGrant = useCallback(async () => {
    if (!roleCode) return;

    setLoading(true);
    try {
      const [menuResponse, permissionResponse] = await Promise.all([
        menu.listRoleGrant(),
        role.getPermissionIds(roleCode),
      ]);

      if (menuResponse?.data) {
        const data = convertToTreeData(menuResponse.data as any);
        setTreeData(data);
      }

      if (permissionResponse?.data) {
        setCheckedKeys(permissionResponse.data);
      }
    } catch (error) {
      console.error('Failed to load menu grant:', error);
    } finally {
      setLoading(false);
    }
  }, [roleCode]);

  const convertToTreeData = (items: any[]): any[] => {
    return items.map((item) => ({
      title: item.title,
      key: item.id,
      children: item.children ? convertToTreeData(item.children) : [],
    }));
  };

  useEffect(() => {
    if (visible) {
      loadMenuGrant();
    }
  }, [visible, loadMenuGrant]);

  const handleCheck = (checked: any) => {
    setCheckedKeys(checked as number[]);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await role.updatePermissionIds(roleCode, checkedKeys);
      message.success(intl.formatMessage({ id: 'common.operation.success' }));
      onCancel();
    } catch (error) {
      console.error('Menu grant failed:', error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Drawer
      title={intl.formatMessage({ id: 'system.role.menu.grant' })}
      open={visible}
      onClose={onCancel}
      width={400}
      extra={
        <Space>
          <Button onClick={onCancel}>
            {intl.formatMessage({ id: 'common.operation.cancel' })}
          </Button>
          <Button type="primary" loading={submitting} onClick={handleSubmit}>
            {intl.formatMessage({ id: 'common.operation.save' })}
          </Button>
        </Space>
      }
    >
      <Tree
        checkable
        checkStrictly
        defaultExpandAll
        treeData={treeData}
        checkedKeys={checkedKeys}
        onCheck={handleCheck}
      />
    </Drawer>
  );
};

export default MenuGrant;
